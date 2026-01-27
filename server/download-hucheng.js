const fs = require('fs');
const path = require('path');
const https = require('https');
const puppeteer = require('puppeteer');

const OUTPUT_DIR = path.join(__dirname, '..', '产品视频');

// 虎城烟花视频列表
const huchengVideos = [
  { name: '100发蓝色海洋', url: 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=119' },
  { name: '100发虎啸', url: 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=120' },
  { name: '20发虎城之花', url: 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=295' },
  { name: '258发米兰之夜', url: 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=121' },
  { name: '60发一帆风顺', url: 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=567' },
  { name: '前程似锦', url: 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=528' },
  { name: '国色天香', url: 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=566' },
  { name: '心想事成', url: 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=550' },
  { name: '我爱你中国', url: 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=549' },
  { name: '百花齐放', url: 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=536' },
  { name: '美不胜收', url: 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=548' },
  { name: '虎城花王', url: 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=122' },
  { name: '金银财宝100发', url: 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=382' },
  { name: '顶天立地', url: 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=532' },
  { name: '高山流水', url: 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=545' }
];

// 下载文件
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(outputPath);
        downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(outputPath);
        resolve(stats.size);
      });
    }).on('error', reject);
  });
}

async function extractVideoUrl(page, pageUrl) {
  let videoUrl = null;

  // 监听网络请求
  const responseHandler = (response) => {
    const url = response.url();
    if (url.endsWith('.mp4') || url.includes('video')) {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('video') || url.endsWith('.mp4')) {
        videoUrl = url;
      }
    }
  };

  page.on('response', responseHandler);

  try {
    await page.goto(pageUrl, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // 等待页面加载
    await new Promise(r => setTimeout(r, 5000));

    // 尝试从DOM获取
    if (!videoUrl) {
      videoUrl = await page.evaluate(() => {
        // 查找video元素
        const video = document.querySelector('video');
        if (video && video.src) return video.src;

        // 查找source元素
        const source = document.querySelector('video source');
        if (source && source.src) return source.src;

        // 查找uni-video组件
        const uniVideo = document.querySelector('uni-video');
        if (uniVideo) {
          const v = uniVideo.querySelector('video');
          if (v && v.src) return v.src;
        }

        // 查找所有可能的视频链接
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const attrs = el.attributes;
          for (let i = 0; i < attrs.length; i++) {
            const val = attrs[i].value;
            if (val && (val.includes('.mp4') || val.includes('video')) && val.startsWith('http')) {
              return val;
            }
          }
        }

        return null;
      });
    }

    // 点击播放按钮尝试触发视频加载
    if (!videoUrl) {
      await page.click('video').catch(() => {});
      await new Promise(r => setTimeout(r, 2000));

      videoUrl = await page.evaluate(() => {
        const video = document.querySelector('video');
        return video ? video.src : null;
      });
    }

    return videoUrl;
  } finally {
    page.off('response', responseHandler);
  }
}

async function main() {
  console.log('========================================');
  console.log('   虎城烟花视频下载工具');
  console.log('========================================\n');

  console.log('启动浏览器...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const results = { success: [], failed: [] };

  try {
    for (let i = 0; i < huchengVideos.length; i++) {
      const { name, url } = huchengVideos[i];
      const outputPath = path.join(OUTPUT_DIR, `${name}.mp4`);

      console.log(`\n[${i + 1}/${huchengVideos.length}] ${name}`);
      console.log(`  URL: ${url}`);

      // 检查是否已存在
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        if (stats.size > 10000) {
          console.log(`  ✓ 已存在，跳过`);
          continue;
        }
      }

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      try {
        const videoUrl = await extractVideoUrl(page, url);

        if (videoUrl) {
          console.log(`  视频地址: ${videoUrl}`);
          console.log(`  下载中...`);
          const size = await downloadFile(videoUrl, outputPath);
          console.log(`  ✓ 下载成功 (${(size / 1024 / 1024).toFixed(2)} MB)`);
          results.success.push(name);
        } else {
          console.log(`  ✗ 无法获取视频地址`);
          results.failed.push({ name, reason: '无法获取视频地址' });
        }
      } catch (err) {
        console.log(`  ✗ 错误: ${err.message}`);
        results.failed.push({ name, reason: err.message });
      } finally {
        await page.close();
      }

      // 休息一下
      await new Promise(r => setTimeout(r, 2000));
    }
  } finally {
    await browser.close();
  }

  console.log('\n========================================');
  console.log(`   完成！成功: ${results.success.length}, 失败: ${results.failed.length}`);
  console.log('========================================');

  if (results.failed.length > 0) {
    console.log('\n失败列表:');
    results.failed.forEach(f => console.log(`  - ${f.name}: ${f.reason}`));
  }
}

main().catch(console.error);
