/**
 * 视频预加载工具 - 实现"秒开"体验
 *
 * 策略：
 * 1. 预加载m3u8主清单（告诉浏览器有哪些分片）
 * 2. 预加载360p子清单（最低质量，用于快速启动）
 * 3. 预加载首个ts分片（真正的视频数据）
 */

// 已预加载的URL缓存，避免重复请求
const preloadedUrls = new Set<string>()

/**
 * 预加载视频m3u8清单（使用link preload）
 * 浏览器会在空闲时提前下载，不阻塞主线程
 */
export function preloadVideoManifest(videoUrl: string): void {
  if (!videoUrl || !videoUrl.endsWith('.m3u8')) return
  if (preloadedUrls.has(videoUrl)) return

  preloadedUrls.add(videoUrl)

  // 使用link preload预加载清单文件
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'fetch'
  link.href = videoUrl
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)

  console.log('[视频预加载] 清单:', videoUrl)
}

/**
 * 预加载视频首分片（解析m3u8获取真实的ts文件）
 * 这是实现"秒开"的关键 - 用户点击播放时首分片已在缓存中
 */
export async function preloadFirstSegment(videoUrl: string): Promise<void> {
  if (!videoUrl?.endsWith('.m3u8')) return

  const cacheKey = `${videoUrl}:segment`
  if (preloadedUrls.has(cacheKey)) return

  preloadedUrls.add(cacheKey)

  try {
    // 1. 先获取主清单
    const masterRes = await fetch(videoUrl, { mode: 'cors' })
    if (!masterRes.ok) return

    const masterM3u8 = await masterRes.text()
    const baseUrl = videoUrl.substring(0, videoUrl.lastIndexOf('/'))

    // 2. 解析主清单，找到360p子清单（最低质量，用于快速启动）
    const lines = masterM3u8.split('\n')
    let subPlaylistUrl = ''

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() || ''
      // 优先找360p，其次480p
      if (line.includes('360p') || (line.includes('480p') && !subPlaylistUrl)) {
        const nextLine = (lines[i + 1] || '').trim()
        if (nextLine && nextLine.endsWith('.m3u8')) {
          subPlaylistUrl = `${baseUrl}/${nextLine}`
          if (line.includes('360p')) break // 找到360p就停止
        }
      }
    }

    if (!subPlaylistUrl) {
      console.log('[视频预加载] 未找到子清单')
      return
    }

    // 3. 获取子清单
    const subRes = await fetch(subPlaylistUrl, { mode: 'cors' })
    if (!subRes.ok) return

    const subM3u8 = await subRes.text()
    const subBaseUrl = subPlaylistUrl.substring(0, subPlaylistUrl.lastIndexOf('/'))

    // 4. 找到首个ts分片
    const subLines = subM3u8.split('\n')
    const firstSegment = subLines.find(l => l.trim().endsWith('.ts'))

    if (firstSegment) {
      const segmentUrl = `${subBaseUrl}/${firstSegment.trim()}`

      // 5. 预加载首分片（使用fetch让浏览器缓存）
      fetch(segmentUrl, { mode: 'cors' }).catch(() => {})
      console.log('[视频预加载] 首分片:', segmentUrl)
    }
  } catch (err) {
    // 预加载失败不影响正常播放
    console.warn('[视频预加载] 失败:', err)
  }
}

/**
 * 一键预加载视频（清单+首分片）
 * 在商品详情加载完成后调用
 */
export function preloadVideo(videoUrl: string): void {
  if (!videoUrl?.endsWith('.m3u8')) return

  // 先预加载清单（同步，使用link preload）
  preloadVideoManifest(videoUrl)

  // 异步预加载首分片（不阻塞）
  preloadFirstSegment(videoUrl)
}

/**
 * 清除预加载缓存（页面切换时调用）
 */
export function clearPreloadCache(): void {
  preloadedUrls.clear()
}
