import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import type { Context } from 'hono'
import { getWallpaperList, getAvailableSources } from '../../lib/wallpaper-utils'



const app = new Hono().basePath('/api/v1')

/**
 * 从db/all.json中获取数据
 * path: /v1/getWallpaperList
 * 
 * params:
 * - page: number (可选，默认为1)
 * - source: string (可选，按来源过滤)
 * - pageSize: number (可选，默认为20)
 * 
 * response:
 * - code: number
 * - data:
 *   - list: []
 *   - total: number
 *   - page: number
 *   - totalPage: number
 * - message: string
 */
app.get('/getWallpaperList', async (c: Context) => {
  const { page, source, pageSize } = c.req.query()
  
  // 解析pageSize参数
  const parsedPageSize = pageSize ? parseInt(pageSize, 10) : 20
  
  const data = await getWallpaperList(page, source, parsedPageSize)
  
  // 根据返回的code设置正确的HTTP状态码
  if (data.code === 200) {
    return c.json(data)
  } else if (data.code === 400) {
    return c.json(data, 400)
  } else {
    return c.json(data, 500)
  }
})

// 获取可用的来源列表
app.get('/getSources', async (c: Context) => {
  try {
    const sources = await getAvailableSources()
    return c.json({
      code: 200,
      data: sources,
      message: 'Success'
    })
  } catch (error) {
    return c.json({
      code: 500,
      data: [],
      message: 'Failed to get sources'
    }, 500)
  }
})

// 健康检查端点
app.get('/health', (c: Context) => {
  return c.json({
    code: 200,
    data: {
      service: 'Wallpaper API v1',
      status: 'healthy',
      endpoints: [
        'GET /api/v1/getWallpaperList?page=1&source=Unsplash',
        'GET /api/v1/getSources',
        'GET /api/v1/health'
      ],
      timestamp: new Date().toISOString()
    },
    message: 'Service is running'
  })
})

export default handle(app)
