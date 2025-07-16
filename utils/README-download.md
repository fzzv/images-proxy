# 图片下载脚本使用说明

这个脚本用于下载 `db/all.json` 文件中所有 `rawSrc` 字段指向的图片到本地。

## 功能特点

- 自动解析 `all.json` 文件中的所有 `rawSrc` 图片地址
- 根据URL路径自动创建本地目录结构
- 支持HTTP和HTTPS下载
- 批量下载，控制并发数避免服务器压力
- 自动去重，避免重复下载
- 错误处理和重试机制
- 下载进度显示

## 使用方法

### 方法1: 使用JavaScript版本

```bash
node download-images.js
```

### 方法2: 使用TypeScript版本

```bash
# 使用tsx运行
npx tsx download-images.ts

# 或者先编译再运行
npm run build
node dist/download-images.js
```

## 目录结构

下载的图片会保存在 `downloaded_images` 目录下，目录结构根据URL路径自动创建。

例如：
- URL: `http://wallpaper.xyu.fan/image/findaphoto/bigLink/17031.jpg`
- 本地路径: `downloaded_images/findaphoto/bigLink/17031.jpg`

## 配置选项

你可以在脚本中修改以下参数：

- `batchSize`: 并发下载数量（默认5）
- 延迟时间：每批下载之间的等待时间（默认1000ms）
- 超时时间：单个下载的超时时间（默认30秒）

## 输出示例

```
开始下载图片...
找到 150 个图片URL
去重后有 120 个唯一URL
下载: http://wallpaper.xyu.fan/image/findaphoto/bigLink/17031.jpg -> downloaded_images/findaphoto/bigLink/17031.jpg
✓ 成功: 17031.jpg
下载: http://wallpaper.xyu.fan/image/findaphoto/bigLink/17021.jpg -> downloaded_images/findaphoto/bigLink/17021.jpg
✓ 成功: 17021.jpg
...

下载完成!
成功: 115 个文件
失败: 5 个文件
文件保存在: /path/to/your/project/downloaded_images 目录
```

## 注意事项

1. 确保网络连接正常
2. 确保有足够的磁盘空间
3. 下载过程中请勿中断脚本
4. 如果下载失败，可以重新运行脚本，已下载的文件会被跳过

## 错误处理

脚本会自动处理以下错误：
- 网络连接错误
- 文件写入错误
- URL格式错误
- HTTP状态码错误
- 超时错误

失败的下载会在控制台显示错误信息，但不会中断整个下载过程。 
