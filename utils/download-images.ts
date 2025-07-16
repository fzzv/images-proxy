import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

interface ImageInfo {
  dirPath: string;
  fileName: string;
  fullPath: string;
}

interface JsonData {
  [key: string]: any;
}

// 读取all.json文件
function readAllJson(): JsonData | null {
  try {
    const data = fs.readFileSync('db/all.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取all.json文件失败:', (error as Error).message);
    return null;
  }
}

// 从URL中提取目录路径和文件名
function parseImageUrl(url: string): ImageInfo | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // 移除开头的空字符串和可能的'image'部分
    const cleanParts = pathParts.filter(part => part && part !== 'image');
    
    if (cleanParts.length < 2) {
      throw new Error('URL格式不正确');
    }
    
    const fileName = cleanParts[cleanParts.length - 1];
    const dirPath = cleanParts.slice(0, -1).join('/');
    
    return {
      dirPath,
      fileName,
      fullPath: path.join(dirPath, fileName)
    };
  } catch (error) {
    console.error('解析URL失败:', url, (error as Error).message);
    return null;
  }
}

// 创建目录
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// 下载文件
function downloadFile(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const fileStream = fs.createWriteStream(filePath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      
      fileStream.on('error', (error) => {
        fs.unlink(filePath, () => {}); // 删除不完整的文件
        reject(error);
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('请求超时'));
    });
  });
}

// 递归提取rawSrc
function extractRawSrc(obj: any, imageUrls: string[]): void {
  if (Array.isArray(obj)) {
    obj.forEach(item => extractRawSrc(item, imageUrls));
  } else if (typeof obj === 'object' && obj !== null) {
    if (obj.rawSrc) {
      imageUrls.push(obj.rawSrc);
    }
    Object.values(obj).forEach(value => extractRawSrc(value, imageUrls));
  }
}

// 主函数
async function downloadAllImages(): Promise<void> {
  console.log('开始下载图片...');
  
  const data = readAllJson();
  if (!data) {
    return;
  }
  
  // 提取所有rawSrc
  const imageUrls: string[] = [];
  extractRawSrc(data, imageUrls);
  
  console.log(`找到 ${imageUrls.length} 个图片URL`);
  
  // 去重
  const uniqueUrls = [...new Set(imageUrls)];
  console.log(`去重后有 ${uniqueUrls.length} 个唯一URL`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // 批量下载，控制并发数
  const batchSize = 5;
  for (let i = 0; i < uniqueUrls.length; i += batchSize) {
    const batch = uniqueUrls.slice(i, i + batchSize);
    const promises = batch.map(async (url) => {
      try {
        const parsed = parseImageUrl(url);
        if (!parsed) {
          console.error(`跳过无效URL: ${url}`);
          return;
        }
        
        const localPath = path.join('downloaded_images', parsed.fullPath);
        const localDir = path.dirname(localPath);
        
        ensureDirectoryExists(localDir);
        
        console.log(`下载: ${url} -> ${localPath}`);
        await downloadFile(url, localPath);
        console.log(`✓ 成功: ${parsed.fileName}`);
        successCount++;
        
      } catch (error) {
        console.error(`✗ 失败: ${url} - ${(error as Error).message}`);
        errorCount++;
      }
    });
    
    await Promise.all(promises);
    
    // 添加延迟避免请求过于频繁
    if (i + batchSize < uniqueUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n下载完成!');
  console.log(`成功: ${successCount} 个文件`);
  console.log(`失败: ${errorCount} 个文件`);
  console.log(`文件保存在: ${path.resolve('downloaded_images')} 目录`);
}

// 运行脚本
if (require.main === module) {
  downloadAllImages().catch(console.error);
}

export { downloadAllImages }; 
