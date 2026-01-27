const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const puppeteer = require('puppeteer');

const OUTPUT_DIR = path.join(__dirname, '..', '产品视频');

// 剩余待处理的视频
const remainingVideos = [
  { name: '悟空加特林', url: 'https://app.if1f.com/?p36220', type: 'redirect' },
  { name: '月20日 (1)(13)', url: 'http://www.fwmall.com.cn/shop/index.php?act=goods&op=index&goods_id=65381', type: 'fwmall' },
  { name: '月20日 (1)(24)', url: 'http://www.fwmall.com.cn/shop/index.php?act=goods&op=index&goods_id=73170', type: 'fwmall' },
  { name: '月20日 (1)(6)', url: 'https://api.nextzs.com/qtool/qr1/app/?id=69149babd9e1c5394e651037', type: 'shortlink' },
  { name: '礼炮发财蕾36发24元', url: 'https://qr28.cn/EN6w1h', type: 'shortlink' }
];

// 下载文件
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);

    protocol.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      rejectUnauthorized: false
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(outputPath);
        if (stats.size < 1000) {
          fs.unlinkSync(outputPath);
          reject(new Error('文件太小'));
        } else {
          resolve(stats.size);
        }
      });
    }).on('error', reject);
  });
}

async function extractVideoWithPuppeteer(browser, pageUrl) {
  const page = await browser.newPage();
  let videoUrl = null;

  try {
    // 监听网络请求
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.mp4') || url.includes('.m4v')) {
        videoUrl = url;
      }
    });

    // 忽略SSL错误
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' });

    await page.goto(pageUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // 等待页面加载
    await new Promise(r => setTimeout(r, 5000));

    // 尝试从DOM获取
    if (!videoUrl) {
      videoUrl = await page.evaluate(() => {
        const video = document.querySelector('video');
        if (video && video.src) return video.src;
        const source = document.querySelector('video source');
        if (source && source.src) return source.src;

        // 查找页面中所有可能的视频链接
        const html = document.documentElement.innerHTML;
        const match = html.match(/(https?:\/\/[^"'\s<>]*\.mp4[^"'\s<>]*)/i);
        return match ? match[1] : null;
      });
    }

    return videoUrl;
  } catch (err) {
    console.log(`  错误: ${err.message}`);
    return null;
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('========================================');
  console.log('   处理剩余视频下载');
  console.log('========================================\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
    ignoreHTTPSErrors: true
  });

  const results = { success: [], failed: [] };

  try {
    for (let i = 0; i < remainingVideos.length; i++) {
      const { name, url, type } = remainingVideos[i];
      const safeName = name.replace(/[<>:"/\\|?*]/g, '_');
      const outputPath = path.join(OUTPUT_DIR, `${safeName}.mp4`);

      console.log(`\n[${i + 1}/${remainingVideos.length}] ${name}`);
      console.log(`  URL: ${url}`);
      console.log(`  类型: ${type}`);

      // 检查是否已存在
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        if (stats.size > 10000) {
          console.log(`  ✓ 已存在，跳过`);
          continue;
        }
      }

      const videoUrl = await extractVideoWithPuppeteer(browser, url);

      if (videoUrl) {
        console.log(`  视频地址: ${videoUrl}`);
        console.log(`  下载中...`);
        try {
          const size = await downloadFile(videoUrl, outputPath);
          console.log(`  ✓ 下载成功 (${(size / 1024 / 1024).toFixed(2)} MB)`);
          results.success.push(name);
        } catch (err) {
          console.log(`  ✗ 下载失败: ${err.message}`);
          results.failed.push({ name, reason: err.message });
        }
      } else {
        console.log(`  ✗ 无法获取视频地址`);
        results.failed.push({ name, reason: '无法获取视频地址' });
      }

      await new Promise(r => setTimeout(r, 2000));
    }
  } finally {
    await browser.close();
  }

  console.log('\n========================================');
  console.log(`   完成！成功: ${results.success.length}, 失败: ${results.failed.length}`);
  console.log('========================================');

  if (results.failed.length > 0) {
    console.log('\n失败列表（这些视频需要手动下载）:');
    results.failed.forEach(f => {
      const video = remainingVideos.find(v => v.name === f.name);
      console.log(`  - ${f.name}`);
      console.log(`    链接: ${video?.url}`);
      console.log(`    原因: ${f.reason}`);
    });
  }
}

main().catch(console.error);
