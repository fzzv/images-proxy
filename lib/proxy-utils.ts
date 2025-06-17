// 图片代理工具函数

export interface ProxyConfig {
  baseUrl: string;
  originalDomain: string;
  proxyPath: string;
}

export const DEFAULT_PROXY_CONFIG: ProxyConfig = {
  baseUrl: 'https://your-domain.vercel.app',
  originalDomain: 'infinitypro-img.infinitynewtab.com',
  proxyPath: '/api/wallpaper'
};

// 将原始图片URL转换为代理URL
export function convertToProxyUrl(originalUrl: string, config: ProxyConfig = DEFAULT_PROXY_CONFIG): string | null {
  try {
    const url = new URL(originalUrl);
    
    // 检查域名
    if (url.hostname !== config.originalDomain) {
      return null;
    }

    // 提取wallpaper路径
    const pathMatch = url.pathname.match(/\/wallpaper\/(.+)/);
    if (!pathMatch) {
      return null;
    }

    const path = pathMatch[1];
    return `${config.baseUrl}${config.proxyPath}/${path}`;
  } catch {
    return null;
  }
}

// 从代理URL提取原始URL
export function convertToOriginalUrl(proxyUrl: string, config: ProxyConfig = DEFAULT_PROXY_CONFIG): string | null {
  try {
    const url = new URL(proxyUrl);
    
    // 检查是否是代理路径
    const pathMatch = url.pathname.match(new RegExp(`${config.proxyPath.replace(/\//g, '\\/')}\\/(.+)`));
    if (!pathMatch) {
      return null;
    }

    const path = pathMatch[1];
    return `https://${config.originalDomain}/wallpaper/${path}`;
  } catch {
    return null;
  }
}

// 批量转换图片URL
export function batchConvertUrls(
  items: Array<{ src?: { rawSrc?: string } }>, 
  config: ProxyConfig = DEFAULT_PROXY_CONFIG
): Array<{ src?: { rawSrc?: string; proxyUrl?: string } }> {
  return items.map(item => {
    if (item.src?.rawSrc) {
      const proxyUrl = convertToProxyUrl(item.src.rawSrc, config);
      return {
        ...item,
        src: {
          ...item.src,
          proxyUrl: proxyUrl || undefined
        }
      };
    }
    return item;
  });
}

// 验证图片URL格式
export function validateImageUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const urlObj = new URL(url);
    
    // 检查协议
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, reason: 'Invalid protocol' };
    }

    // 检查文件扩展名
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
    const hasValidExtension = validExtensions.some(ext => 
      urlObj.pathname.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      return { valid: false, reason: 'Invalid image extension' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

// 生成图片元数据
export function generateImageMetadata(url: string) {
  try {
    const urlObj = new URL(url);
    const filename = urlObj.pathname.split('/').pop() || 'image';
    const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
    
    return {
      filename,
      extension,
      mimeType: getMimeType(extension),
      isSupported: ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)
    };
  } catch {
    return null;
  }
}

// 获取MIME类型
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'bmp': 'image/bmp'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
}

// 构建缓存键
export function buildCacheKey(url: string): string {
  try {
    const urlObj = new URL(url);
    return `img_${Buffer.from(urlObj.pathname).toString('base64').slice(0, 32)}`;
  } catch {
    return `img_${Date.now()}`;
  }
}

// 图片优化参数
export interface ImageOptimization {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

// 构建优化后的URL（如果支持的话）
export function buildOptimizedUrl(
  originalUrl: string, 
  optimization: ImageOptimization,
  config: ProxyConfig = DEFAULT_PROXY_CONFIG
): string {
  const proxyUrl = convertToProxyUrl(originalUrl, config);
  if (!proxyUrl) return originalUrl;

  const params = new URLSearchParams();
  
  if (optimization.width) params.set('w', optimization.width.toString());
  if (optimization.height) params.set('h', optimization.height.toString());
  if (optimization.quality) params.set('q', optimization.quality.toString());
  if (optimization.format) params.set('f', optimization.format);

  const queryString = params.toString();
  return queryString ? `${proxyUrl}?${queryString}` : proxyUrl;
}

// 代理统计信息
export interface ProxyStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  averageResponseTime: number;
  lastRequestTime: string;
}

// 简单的内存统计（生产环境建议使用Redis等）
let proxyStats: ProxyStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  cacheHits: 0,
  averageResponseTime: 0,
  lastRequestTime: new Date().toISOString()
};

// 更新统计信息
export function updateProxyStats(success: boolean, responseTime: number, fromCache: boolean = false) {
  proxyStats.totalRequests++;
  proxyStats.lastRequestTime = new Date().toISOString();
  
  if (success) {
    proxyStats.successfulRequests++;
  } else {
    proxyStats.failedRequests++;
  }
  
  if (fromCache) {
    proxyStats.cacheHits++;
  }
  
  // 计算平均响应时间
  proxyStats.averageResponseTime = 
    (proxyStats.averageResponseTime * (proxyStats.totalRequests - 1) + responseTime) / proxyStats.totalRequests;
}

// 获取统计信息
export function getProxyStats(): ProxyStats {
  return { ...proxyStats };
}

// 重置统计信息
export function resetProxyStats() {
  proxyStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    averageResponseTime: 0,
    lastRequestTime: new Date().toISOString()
  };
}
