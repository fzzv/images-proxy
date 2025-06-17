// 壁纸数据接口定义
export interface WallpaperItem {
  src: {
    rawSrc: string
  }
  colors: string[]
  rate: number
  like: number
  _id: string
  imgId: string
  dimensions: string
  source: string
}

// API响应接口定义
export interface WallpaperListResponse {
  code: number
  data: {
    list: WallpaperItem[]
    total: number
    page: number
    totalPage: number
  }
  message: string
}

// 缓存数据以避免重复读取文件
let cachedData: WallpaperItem[] | null = null
let lastCacheTime: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

/**
 * 从JSON文件加载壁纸数据
 */
async function loadWallpaperData(): Promise<WallpaperItem[]> {
  const now = Date.now()
  
  // 如果缓存有效，直接返回缓存数据
  if (cachedData && (now - lastCacheTime) < CACHE_DURATION) {
    return cachedData
  }
  
  try {
    const response = await fetch('https://wallpaper.xyu.fan/all.json')
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`)
    }
    
    const data = await response.json() as WallpaperItem[]
    
    // 更新缓存
    cachedData = data
    lastCacheTime = now
    
    return data
  } catch (error) {
    console.error('Error loading wallpaper data:', error)
    throw new Error('Failed to load wallpaper data')
  }
}

/**
 * 获取壁纸列表
 * @param page 页码（从1开始）
 * @param source 来源过滤（可选）
 * @param pageSize 每页数量
 */
export async function getWallpaperList(
  page: string | undefined,
  source: string | undefined,
  pageSize: number = 20
): Promise<WallpaperListResponse> {
  try {
    // 加载数据
    const allData = await loadWallpaperData()
    
    // 过滤数据（如果指定了source）
    let filteredData = allData
    if (source && source.trim() !== '') {
      filteredData = allData.filter(item => 
        item.source.toLowerCase().includes(source.toLowerCase())
      )
    }
    
    // 解析页码
    const currentPage = parseInt(page || '1', 10)
    if (isNaN(currentPage) || currentPage < 1) {
      return {
        code: 400,
        data: {
          list: [],
          total: 0,
          page: 1,
          totalPage: 0
        },
        message: 'Invalid page number'
      }
    }
    
    // 计算分页
    const total = filteredData.length
    const totalPage = Math.ceil(total / pageSize)
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    
    // 获取当前页数据
    const list = filteredData.slice(startIndex, endIndex)
    
    return {
      code: 200,
      data: {
        list,
        total,
        page: currentPage,
        totalPage
      },
      message: 'Success'
    }
    
  } catch (error) {
    console.error('Error in getWallpaperList:', error)
    return {
      code: 500,
      data: {
        list: [],
        total: 0,
        page: 1,
        totalPage: 0
      },
      message: 'Internal server error'
    }
  }
}

/**
 * 获取可用的来源列表
 */
export async function getAvailableSources(): Promise<string[]> {
  try {
    const allData = await loadWallpaperData()
    const sources = [...new Set(allData.map(item => item.source))]
    return sources.sort()
  } catch (error) {
    console.error('Error getting available sources:', error)
    return []
  }
} 
