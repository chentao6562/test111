const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 尝试加载puppeteer，如果失败则设为null
let puppeteer = null;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.log('注意: Puppeteer未安装，虎城烟花视频将无法自动获取');
}

// 配置 - 使用项目根目录
const PROJECT_ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(PROJECT_ROOT, '烟花产品视频链接汇总_分类版.csv');
const OUTPUT_DIR = path.join(PROJECT_ROOT, '产品视频');
const REPORT_PATH = path.join(OUTPUT_DIR, '下载报告.txt');

// 结果统计
const results = {
  success: [],
  failed: [],
  skipped: []
};

// 解析CSV
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const videos = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // 简单CSV解析，处理逗号
    const parts = line.split(',');
    if (parts.length >= 5) {
      const seq = parts[0].trim();
      const name = parts[1].trim();
      const source = parts[2].trim();
      const linkType = parts[3].trim();
      const url = parts.slice(4).join(',').trim(); // URL可能包含逗号

      if (name && url && url.startsWith('http')) {
        videos.push({ seq, name, source, linkType, url });
      }
    }
  }

  return videos;
}

// 清理文件名（移除非法字符）
function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

// 下载文件
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);

    const request = protocol.get(url, {
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      // 处理重定向
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
        if (stats.size < 1000) {
          fs.unlinkSync(outputPath);
          reject(new Error('文件太小，可能下载失败'));
        } else {
          resolve(stats.size);
        }
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      reject(err);
    });

    request.on('timeout', () => {
      request.destroy();
      file.close();
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      reject(new Error('请求超时'));
    });
  });
}

// 获取页面内容
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const options = {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      rejectUnauthorized: false // 忽略SSL错误
    };

    const request = protocol.get(url, options, (response) => {
      // 处理重定向
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        let redirectUrl = response.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const urlObj = new URL(url);
          redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
        }
        fetchPage(redirectUrl).then(resolve).catch(reject);
        return;
      }

      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('请求超时'));
    });
  });
}

// 从 app.if1f.com 页面提取视频URL
async function extractIf1fVideo(pageUrl) {
  try {
    const html = await fetchPage(pageUrl);

    // 查找 DATA.video 变量
    const videoMatch = html.match(/["']video["']\s*:\s*["']([^"']+\.mp4)["']/i) ||
                       html.match(/video\s*=\s*["']([^"']+\.mp4)["']/i) ||
                       html.match(/src=["']([^"']*j\.if1f\.com[^"']*\.mp4)["']/i) ||
                       html.match(/(https?:\/\/[^"'\s]*\.mp4)/i);

    if (videoMatch) {
      return videoMatch[1];
    }

    return null;
  } catch (err) {
    console.error(`  获取页面失败: ${err.message}`);
    return null;
  }
}

// 使用Puppeteer获取虎城烟花视频
async function extractHuchengVideo(browser, pageUrl) {
  if (!browser) {
    console.log('  Puppeteer不可用，跳过');
    return null;
  }

  let page = null;
  try {
    page = await browser.newPage();

    // 监听网络请求捕获视频URL
    let videoUrl = null;
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.mp4') || url.includes('video')) {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('video') || url.endsWith('.mp4')) {
          videoUrl = url;
        }
      }
    });

    await page.goto(pageUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // 等待视频元素加载
    await new Promise(r => setTimeout(r, 3000));

    // 尝试从DOM获取视频源
    if (!videoUrl) {
      videoUrl = await page.evaluate(() => {
        const video = document.querySelector('video');
        if (video) {
          return video.src || video.querySelector('source')?.src;
        }
        // 查找可能的视频链接
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const match = script.textContent?.match(/(https?:\/\/[^"'\s]*\.mp4)/);
          if (match) return match[1];
        }
        return null;
      });
    }

    await page.close();
    return videoUrl;
  } catch (err) {
    console.error(`  Puppeteer错误: ${err.message}`);
    if (page) await page.close().catch(() => {});
    return null;
  }
}

// 处理单个视频
async function processVideo(video, browser) {
  const { name, url, source, linkType } = video;
  const safeName = sanitizeFileName(name);
  const outputPath = path.join(OUTPUT_DIR, `${safeName}.mp4`);

  console.log(`\n处理: ${name}`);
  console.log(`  链接: ${url}`);

  // 如果文件已存在，跳过
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    if (stats.size > 10000) {
      console.log(`  ✓ 已存在，跳过`);
      results.skipped.push({ name, reason: '已存在' });
      return;
    }
  }

  let videoUrl = null;

  // 根据来源类型选择提取方法
  if (url.includes('app.if1f.com') || url.includes('cs.if1f.com')) {
    console.log(`  [if1f] 解析页面...`);
    videoUrl = await extractIf1fVideo(url);
  } else if (url.includes('huchengfireworks.com')) {
    console.log(`  [虎城] 使用Puppeteer...`);
    videoUrl = await extractHuchengVideo(browser, url);
  } else if (url.includes('fwmall.com.cn')) {
    console.log(`  [烟花商城] 解析页面...`);
    videoUrl = await extractIf1fVideo(url);
  } else if (url.includes('qr28.cn') || url.includes('nextzs.com')) {
    console.log(`  [短链] 跟踪重定向...`);
    try {
      const html = await fetchPage(url);
      const match = html.match(/(https?:\/\/[^"'\s]*\.mp4)/i);
      if (match) videoUrl = match[1];
    } catch (e) {
      console.log(`  短链跟踪失败: ${e.message}`);
    }
  } else {
    console.log(`  [未知来源] 尝试通用解析...`);
    videoUrl = await extractIf1fVideo(url);
  }

  if (!videoUrl) {
    console.log(`  ✗ 无法获取视频地址`);
    results.failed.push({ name, url, reason: '无法获取视频地址' });
    return;
  }

  console.log(`  视频地址: ${videoUrl}`);
  console.log(`  下载中...`);

  try {
    const size = await downloadFile(videoUrl, outputPath);
    console.log(`  ✓ 下载成功 (${(size / 1024 / 1024).toFixed(2)} MB)`);
    results.success.push({ name, size });
  } catch (err) {
    console.log(`  ✗ 下载失败: ${err.message}`);
    results.failed.push({ name, url: videoUrl, reason: err.message });
  }
}

// 生成报告
function generateReport() {
  const lines = [
    '========================================',
    '     烟花产品视频下载报告',
    `     生成时间: ${new Date().toLocaleString('zh-CN')}`,
    '========================================',
    '',
    `总计: ${results.success.length + results.failed.length + results.skipped.length} 个视频`,
    `成功: ${results.success.length} 个`,
    `失败: ${results.failed.length} 个`,
    `跳过: ${results.skipped.length} 个`,
    '',
    '--- 成功列表 ---'
  ];

  results.success.forEach(item => {
    lines.push(`✓ ${item.name} (${(item.size / 1024 / 1024).toFixed(2)} MB)`);
  });

  if (results.failed.length > 0) {
    lines.push('', '--- 失败列表 ---');
    results.failed.forEach(item => {
      lines.push(`✗ ${item.name}`);
      lines.push(`  原因: ${item.reason}`);
      lines.push(`  链接: ${item.url}`);
    });
  }

  if (results.skipped.length > 0) {
    lines.push('', '--- 跳过列表 ---');
    results.skipped.forEach(item => {
      lines.push(`- ${item.name}: ${item.reason}`);
    });
  }

  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
  console.log(`\n报告已保存到: ${REPORT_PATH}`);
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('     烟花产品视频下载工具');
  console.log('========================================');

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 读取CSV
  console.log('\n读取CSV文件...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const videos = parseCSV(csvContent);
  console.log(`找到 ${videos.length} 个视频链接`);

  // 启动浏览器（用于虎城烟花）
  let browser = null;
  if (puppeteer) {
    console.log('\n启动浏览器...');
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } catch (e) {
      console.log('浏览器启动失败，虎城烟花视频将跳过:', e.message);
    }
  } else {
    console.log('\nPuppeteer不可用，虎城烟花视频将跳过');
  }

  try {
    // 逐个处理
    for (let i = 0; i < videos.length; i++) {
      console.log(`\n[${i + 1}/${videos.length}]`);
      await processVideo(videos[i], browser);

      // 每处理5个休息一下
      if ((i + 1) % 5 === 0) {
        console.log('\n休息2秒...');
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  } finally {
    if (browser) await browser.close();
  }

  // 生成报告
  generateReport();

  console.log('\n========================================');
  console.log('     下载完成！');
  console.log(`     成功: ${results.success.length}`);
  console.log(`     失败: ${results.failed.length}`);
  console.log(`     跳过: ${results.skipped.length}`);
  console.log('========================================');
}

main().catch(err => {
  console.error('运行出错:', err);
  process.exit(1);
});
