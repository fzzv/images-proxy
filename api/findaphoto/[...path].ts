import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import type { Context } from 'hono'
import {
  validateImageUrl,
  generateImageMetadata,
  updateProxyStats,
  getProxyStats
} from '../../lib/proxy-utils'

export const config = {
  runtime: 'edge'
}

const app = new Hono().basePath('/api/findaphoto')

// 代理统计信息端点 - 必须在通配符路由之前
app.get('/stats', (c: Context) => {
  const stats = getProxyStats()
  return c.json({
    service: 'Findaphoto Proxy Statistics',
    stats,
    successRate: stats.totalRequests > 0
      ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2) + '%'
      : '0%',
    cacheHitRate: stats.totalRequests > 0
      ? ((stats.cacheHits / stats.totalRequests) * 100).toFixed(2) + '%'
      : '0%'
  })
})

// 健康检查端点
app.get('/health', (c: Context) => {
  return c.json({
    service: 'Findaphoto Proxy Service',
    status: 'healthy',
    usage: 'GET /api/findaphoto/{category}/{filename}',
    example: 'GET /api/findaphoto/bigLink/17021.jpg',
    timestamp: new Date().toISOString()
  })
})

// 图片代理服务 - 通配符路由必须放在最后
app.get('/*', async (c: Context) => {
  const startTime = Date.now()

  try {
    // 获取路径参数
    let path: string = c.req.param('*') || c.req.path.replace('/api/findaphoto/', '')

    // 处理路径开头的斜杠
    if (path.startsWith('/')) {
      path = path.substring(1)
    }

    if (!path || path === '') {
      updateProxyStats(false, Date.now() - startTime)
      return c.json({ error: 'Path is required' }, 400)
    }

    // 构建原始URL
    const originalUrl: string = `https://infinitypro-img.infinitynewtab.com/findaphoto/${path}`

    // 验证URL格式
    const validation = validateImageUrl(originalUrl)
    if (!validation.valid) {
      updateProxyStats(false, Date.now() - startTime)
      return c.json({
        error: 'Invalid image URL',
        reason: validation.reason
      }, 400)
    }


    // 检查条件请求头
    const ifNoneMatch: string | undefined = c.req.header('if-none-match')
    const ifModifiedSince: string | undefined = c.req.header('if-modified-since')

    // 获取原始图片
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://infinitynewtab.com/',
    }

    // 传递条件请求头
    if (ifNoneMatch) fetchHeaders['If-None-Match'] = ifNoneMatch
    if (ifModifiedSince) fetchHeaders['If-Modified-Since'] = ifModifiedSince

    const response: Response = await fetch(originalUrl, { headers: fetchHeaders })

    // 处理304 Not Modified
    if (response.status === 304) {
      updateProxyStats(true, Date.now() - startTime, true)
      return new Response(null, {
        status: 304,
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Proxy-Source': 'infinity-wallpaper-proxy',
          'X-Cache-Status': 'not-modified'
        }
      })
    }

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`)
      updateProxyStats(false, Date.now() - startTime)

      // 确保状态码是有效的HTTP状态码
      const statusCode = response.status >= 400 && response.status < 600 ? response.status : 404

      return c.json({
        error: 'Image not found',
        status: response.status,
        originalUrl
      }, statusCode as any)
    }

    // 获取图片数据和类型
    const imageBuffer: ArrayBuffer = await response.arrayBuffer()
    const contentType: string = response.headers.get('content-type') || 'image/jpeg'
    const contentLength: string | null = response.headers.get('content-length')
    const lastModified: string | null = response.headers.get('last-modified')
    const etag: string | null = response.headers.get('etag')

    // 生成图片元数据
    const metadata = generateImageMetadata(originalUrl)

    // 设置响应头
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable') // 缓存1年
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type')

    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }
    if (lastModified) {
      headers.set('Last-Modified', lastModified)
    }
    if (etag) {
      headers.set('ETag', etag)
    }

    // 添加自定义头部
    headers.set('X-Proxy-Source', 'infinity-wallpaper-proxy')
    headers.set('X-Original-URL', originalUrl)
    headers.set('X-Response-Time', `${Date.now() - startTime}ms`)
    headers.set('X-Cache-Status', 'miss')

    if (metadata) {
      headers.set('X-Image-Format', metadata.extension)
      headers.set('X-Image-Filename', metadata.filename)
    }

    updateProxyStats(true, Date.now() - startTime)

    return new Response(imageBuffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Proxy error:', error)
    updateProxyStats(false, Date.now() - startTime)
    return c.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// 处理 OPTIONS 请求 (CORS 预检)
app.options('/*', (c: Context) => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  })
})

export default handle(app)
