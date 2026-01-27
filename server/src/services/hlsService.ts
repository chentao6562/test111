import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

interface HlsVariant {
  name: string;
  resolution: string;
  bitrate: string;
  bandwidth: number;
}

interface HlsResult {
  success: boolean;
  playlistUrl?: string;
  variants?: { quality: string; bandwidth: number }[];
  error?: string;
}

// HLS转码变体配置（秒开优化版）
// 360p用于快速启动，然后自动升档到更高画质
const HLS_VARIANTS: HlsVariant[] = [
  { name: '360p', resolution: '640x360', bitrate: '400k', bandwidth: 400000 },   // 快速启动档
  { name: '480p', resolution: '854x480', bitrate: '600k', bandwidth: 600000 },   // 中等画质
  { name: '720p', resolution: '1280x720', bitrate: '1200k', bandwidth: 1200000 }, // 高画质
];

/**
 * 检查FFmpeg是否可用
 */
async function checkFfmpeg(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取视频信息（时长、分辨率等）
 */
async function getVideoInfo(inputPath: string): Promise<{ duration: number; width: number; height: number } | null> {
  try {
    const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${inputPath}"`;
    const { stdout } = await execAsync(cmd);
    const info = JSON.parse(stdout);

    const videoStream = info.streams?.find((s: any) => s.codec_type === 'video');
    const duration = parseFloat(info.format?.duration || '0');

    return {
      duration,
      width: videoStream?.width || 1920,
      height: videoStream?.height || 1080,
    };
  } catch (err) {
    console.warn('获取视频信息失败:', err);
    return null;
  }
}

/**
 * 将MP4转换为HLS流媒体格式
 * 生成多码率版本支持自适应播放
 */
export async function convertToHls(
  inputPath: string,
  outputDir: string,
  baseName: string
): Promise<HlsResult> {
  try {
    // 检查FFmpeg是否可用
    const ffmpegAvailable = await checkFfmpeg();
    if (!ffmpegAvailable) {
      console.warn('FFmpeg不可用，跳过HLS转码');
      return { success: false, error: 'FFmpeg不可用' };
    }

    // 确保输出目录存在
    const hlsDir = path.join(outputDir, 'hls', baseName);
    await fs.promises.mkdir(hlsDir, { recursive: true });

    // 获取视频信息
    const videoInfo = await getVideoInfo(inputPath);
    console.log(`视频信息: ${videoInfo?.width}x${videoInfo?.height}, 时长: ${videoInfo?.duration}秒`);

    const variantPlaylists: string[] = [];
    const successVariants: { quality: string; bandwidth: number }[] = [];

    for (const variant of HLS_VARIANTS) {
      const variantDir = path.join(hlsDir, variant.name);
      await fs.promises.mkdir(variantDir, { recursive: true });

      // FFmpeg HLS转码命令（秒开优化版）
      // -hls_time 2: 关键！2秒分片实现快速启动（原来10秒太长）
      // -preset ultrafast: 最快编码速度
      // -keyint_min/g: 关键帧间隔优化，确保每个分片都有关键帧
      // -sc_threshold 0: 禁用场景检测，保持稳定的关键帧间隔
      // 注意：FFmpeg的scale/pad滤镜需要用冒号分隔宽高，不是x
      const scaleRes = variant.resolution.replace('x', ':');
      const cmd = [
        'ffmpeg -y',
        `-i "${inputPath}"`,
        `-vf "scale=${scaleRes}:force_original_aspect_ratio=decrease,pad=${scaleRes}:(ow-iw)/2:(oh-ih)/2:black"`,
        '-c:v libx264',
        '-preset ultrafast',           // 【秒开】最快编码
        `-b:v ${variant.bitrate}`,
        '-c:a aac',
        '-b:a 96k',                     // 【秒开】音频降到96k节省带宽
        '-hls_time 2',                  // 【秒开核心】2秒分片（原来10秒）
        '-hls_list_size 0',
        '-hls_playlist_type vod',
        '-keyint_min 24',               // 【秒开】最小关键帧间隔
        '-g 48',                        // 【秒开】GOP大小，约2秒一个关键帧
        '-sc_threshold 0',              // 【秒开】禁用场景检测
        `-hls_segment_filename "${path.join(variantDir, 'segment_%03d.ts')}"`,
        `"${path.join(variantDir, 'playlist.m3u8')}"`,
      ].join(' ');

      console.log(`开始转码 ${variant.name}...`);

      try {
        await execAsync(cmd, { timeout: 600000 }); // 10分钟超时
        console.log(`${variant.name} 转码完成`);

        variantPlaylists.push(
          `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${variant.resolution}\n${variant.name}/playlist.m3u8`
        );
        successVariants.push({ quality: variant.name, bandwidth: variant.bandwidth });
      } catch (err: any) {
        console.error(`${variant.name} 转码失败:`, err.message);
        // 继续尝试其他分辨率
      }
    }

    // 至少需要一个变体成功
    if (successVariants.length === 0) {
      return { success: false, error: '所有分辨率转码均失败' };
    }

    // 生成主播放列表（master playlist）
    const masterPlaylist = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      ...variantPlaylists,
    ].join('\n');

    const masterPath = path.join(hlsDir, 'master.m3u8');
    await fs.promises.writeFile(masterPath, masterPlaylist);

    // 删除原始MP4文件（节省空间）
    try {
      await fs.promises.unlink(inputPath);
      console.log('已删除原始MP4文件');
    } catch {
      console.warn('删除原始MP4文件失败，可能已被移动或删除');
    }

    console.log(`HLS转码完成: ${baseName}, 变体: ${successVariants.map(v => v.quality).join(', ')}`);

    // 返回相对于uploads目录的路径
    const relativePath = path.relative(path.join(process.cwd(), 'uploads'), hlsDir);
    const playlistUrl = `/uploads/${relativePath.replace(/\\/g, '/')}/master.m3u8`;

    return {
      success: true,
      playlistUrl,
      variants: successVariants,
    };
  } catch (err: any) {
    console.error('HLS转码失败:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 删除HLS文件夹（当商品被删除时调用）
 */
export async function deleteHlsFolder(hlsUrl: string): Promise<boolean> {
  try {
    if (!hlsUrl.includes('/hls/')) {
      return false;
    }

    // 从URL解析出文件夹路径
    // /uploads/2026/01/hls/video123/master.m3u8 -> uploads/2026/01/hls/video123
    const urlPath = hlsUrl.replace(/^\/uploads\//, '').replace('/master.m3u8', '');
    const hlsDir = path.join(process.cwd(), 'uploads', urlPath);

    // 安全检查：确保是hls目录
    if (!hlsDir.includes('hls')) {
      console.warn('非法HLS路径:', hlsDir);
      return false;
    }

    // 递归删除目录
    await fs.promises.rm(hlsDir, { recursive: true, force: true });
    console.log('已删除HLS文件夹:', hlsDir);
    return true;
  } catch (err) {
    console.error('删除HLS文件夹失败:', err);
    return false;
  }
}
