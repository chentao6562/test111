/**
 * AI营销文案生成服务
 * 接入阿里云通义千问API，自动生成商品卖点和营销文案
 *
 * @created 2026-01-18
 */

import prisma from '../utils/prisma';

// AI生成结果接口
export interface AIGeneratedCopy {
  slogan: string;  // 一句话卖点
  sellingPoints: Array<{
    icon: string;
    title: string;
    desc: string;
  }>;
  usageScenes: Array<{
    icon: string;
    name: string;
  }>;
  marketingCopy?: string;  // 可选的营销长文案
}

// 商品信息接口
interface ProductInfo {
  name: string;
  categoryName: string;
  description?: string;
  retailPrice: number;
}

// 通义千问API配置
const DASHSCOPE_API_KEY = process.env.ALIYUN_DASHSCOPE_API_KEY || '';
const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

/**
 * 调用通义千问API生成文案
 */
async function callQwenAPI(prompt: string): Promise<string> {
  if (!DASHSCOPE_API_KEY) {
    throw new Error('未配置阿里云通义千问API密钥（ALIYUN_DASHSCOPE_API_KEY）');
  }

  const response = await fetch(DASHSCOPE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-turbo',  // 使用qwen-turbo模型，性价比高
      input: {
        messages: [
          {
            role: 'system',
            content: '你是一个专业的电商营销文案专家，擅长为烟花爆竹类产品撰写吸引人的卖点文案。你的文案应该简洁有力、突出产品特色、激发购买欲望。'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      parameters: {
        temperature: 0.7,
        max_tokens: 1000,
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`通义千问API调用失败: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as { output?: { text?: string } };
  return data.output?.text || '';
}

/**
 * 生成商品营销文案
 */
export async function generateProductCopy(product: ProductInfo): Promise<AIGeneratedCopy> {
  const prompt = `请为以下烟花产品生成营销文案：

商品名称：${product.name}
商品分类：${product.categoryName}
商品描述：${product.description || '暂无描述'}
零售价格：¥${product.retailPrice}

请按以下JSON格式返回（不要包含任何其他文字，直接返回JSON）：
{
  "slogan": "一句话卖点，不超过20字，要朗朗上口",
  "sellingPoints": [
    {"icon": "表情符号", "title": "4字标题", "desc": "10字内描述"},
    {"icon": "表情符号", "title": "4字标题", "desc": "10字内描述"},
    {"icon": "表情符号", "title": "4字标题", "desc": "10字内描述"}
  ],
  "usageScenes": [
    {"icon": "表情符号", "name": "场景名称"},
    {"icon": "表情符号", "name": "场景名称"},
    {"icon": "表情符号", "name": "场景名称"},
    {"icon": "表情符号", "name": "场景名称"}
  ]
}

注意：
1. slogan要突出产品的核心卖点，如持续时间、颜色效果、安全性等
2. sellingPoints的icon使用贴切的emoji表情
3. usageScenes应包含春节团圆、生日派对、婚礼庆典、乔迁开业等常见场景
4. 所有文案要积极正面，突出产品价值`;

  try {
    const responseText = await callQwenAPI(prompt);

    // 尝试解析JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI返回内容不包含有效JSON');
    }

    const result = JSON.parse(jsonMatch[0]) as AIGeneratedCopy;

    // 验证必要字段
    if (!result.slogan || !result.sellingPoints || !result.usageScenes) {
      throw new Error('AI返回内容缺少必要字段');
    }

    return result;
  } catch (error) {
    console.error('AI生成文案失败:', error);
    // 返回基于分类的默认文案
    return generateDefaultCopy(product);
  }
}

/**
 * 生成默认文案（当AI不可用时使用）
 */
function generateDefaultCopy(product: ProductInfo): AIGeneratedCopy {
  const categoryDefaults: Record<string, AIGeneratedCopy> = {
    '组合烟花': {
      slogan: '多彩连发，惊艳全场',
      sellingPoints: [
        { icon: '⏱️', title: '持续燃放', desc: '60-120秒超长表演' },
        { icon: '🎨', title: '多彩效果', desc: '红黄蓝绿多色变幻' },
        { icon: '🔊', title: '震撼音效', desc: '噼啪声响喜庆热闹' }
      ],
      usageScenes: [
        { icon: '🎊', name: '春节团圆' },
        { icon: '🎂', name: '生日派对' },
        { icon: '💒', name: '婚礼庆典' },
        { icon: '🏠', name: '乔迁开业' }
      ]
    },
    '喷花类': {
      slogan: '绚丽喷涌，安全可靠',
      sellingPoints: [
        { icon: '💫', title: '安全喷射', desc: '无飞火花安全可靠' },
        { icon: '✨', title: '绚丽火花', desc: '金色银色火树银花' },
        { icon: '⏱️', title: '时长适中', desc: '30-60秒持续燃放' }
      ],
      usageScenes: [
        { icon: '🎊', name: '春节团圆' },
        { icon: '🎂', name: '生日派对' },
        { icon: '💒', name: '婚礼庆典' },
        { icon: '🏠', name: '乔迁开业' }
      ]
    },
    '儿童安全类': {
      slogan: '安全无忧，童趣满满',
      sellingPoints: [
        { icon: '🛡️', title: '安全认证', desc: '通过儿童安全检测' },
        { icon: '👶', title: '小手可握', desc: '适合5岁以上儿童' },
        { icon: '🎉', title: '趣味十足', desc: '五彩缤纷欢乐无限' }
      ],
      usageScenes: [
        { icon: '🎊', name: '春节团圆' },
        { icon: '🎂', name: '生日派对' },
        { icon: '🎈', name: '儿童乐园' },
        { icon: '🏕️', name: '户外野营' }
      ]
    },
    '旋转升空类': {
      slogan: '旋转升空，流光溢彩',
      sellingPoints: [
        { icon: '🚀', title: '高空绽放', desc: '升空高度可达20米' },
        { icon: '🌀', title: '旋转效果', desc: '螺旋上升美轮美奂' },
        { icon: '⭐', title: '绚烂夺目', desc: '璀璨光芒照亮夜空' }
      ],
      usageScenes: [
        { icon: '🎊', name: '春节团圆' },
        { icon: '🎂', name: '生日派对' },
        { icon: '💒', name: '婚礼庆典' },
        { icon: '🏠', name: '乔迁开业' }
      ]
    },
    '礼花弹': {
      slogan: '高空绽放，气势恢宏',
      sellingPoints: [
        { icon: '💥', title: '爆发力强', desc: '震撼视觉冲击' },
        { icon: '🎆', title: '大面积覆盖', desc: '绽放直径超10米' },
        { icon: '🏆', title: '专业级别', desc: '庆典活动首选' }
      ],
      usageScenes: [
        { icon: '🎊', name: '春节团圆' },
        { icon: '💒', name: '婚礼庆典' },
        { icon: '🏠', name: '乔迁开业' },
        { icon: '🎉', name: '大型庆典' }
      ]
    },
    '造型烟花': {
      slogan: '创意造型，独特设计',
      sellingPoints: [
        { icon: '🎨', title: '创意造型', desc: '独特设计吸睛' },
        { icon: '📸', title: '适合拍照', desc: '社交分享神器' },
        { icon: '🎁', title: '送礼佳品', desc: '精美包装有面子' }
      ],
      usageScenes: [
        { icon: '🎊', name: '春节团圆' },
        { icon: '🎂', name: '生日派对' },
        { icon: '📸', name: '网红打卡' },
        { icon: '🎁', name: '节日送礼' }
      ]
    }
  };

  // 返回分类对应的默认文案，或通用默认文案
  return categoryDefaults[product.categoryName] || {
    slogan: '品质保证，春节必备',
    sellingPoints: [
      { icon: '✅', title: '品质保证', desc: '正规厂家生产' },
      { icon: '🏷️', title: '价格实惠', desc: '厂家直供省中间商' },
      { icon: '📦', title: '安全包装', desc: '专业防护运输无忧' }
    ],
    usageScenes: [
      { icon: '🎊', name: '春节团圆' },
      { icon: '🎂', name: '生日派对' },
      { icon: '💒', name: '婚礼庆典' },
      { icon: '🏠', name: '乔迁开业' }
    ]
  };
}

/**
 * 为商品生成并保存AI文案
 */
export async function generateAndSaveProductCopy(productId: number): Promise<AIGeneratedCopy | null> {
  try {
    // 获取商品信息
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true }
    });

    if (!product) {
      throw new Error(`商品不存在: ${productId}`);
    }

    const productInfo: ProductInfo = {
      name: product.name,
      categoryName: product.category?.name || '其他',
      description: product.description || undefined,
      retailPrice: Number(product.retailPrice)
    };

    // 生成文案
    const copy = await generateProductCopy(productInfo);

    // 保存到数据库
    await prisma.product.update({
      where: { id: productId },
      data: {
        slogan: copy.slogan,
        sellingPoints: JSON.stringify(copy.sellingPoints),
        usageScenes: JSON.stringify(copy.usageScenes),
        aiCopyUpdatedAt: new Date()
      }
    });

    console.log(`商品 ${productId} AI文案生成成功`);
    return copy;
  } catch (error) {
    console.error(`商品 ${productId} AI文案生成失败:`, error);
    return null;
  }
}

/**
 * 批量生成商品AI文案
 */
export async function batchGenerateProductCopy(productIds?: number[]): Promise<{
  success: number;
  failed: number;
  errors: Array<{ productId: number; error: string }>;
}> {
  const result = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ productId: number; error: string }>
  };

  // 获取需要生成文案的商品
  const products = await prisma.product.findMany({
    where: productIds ? { id: { in: productIds } } : { status: 'ACTIVE' },
    select: { id: true, name: true }
  });

  for (const product of products) {
    try {
      await generateAndSaveProductCopy(product.id);
      result.success++;
      // 添加延迟避免API限流
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      result.failed++;
      result.errors.push({
        productId: product.id,
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  return result;
}

/**
 * 检查商品是否需要更新AI文案
 */
export function needsAICopyUpdate(aiCopyUpdatedAt: Date | null, daysThreshold: number = 7): boolean {
  if (!aiCopyUpdatedAt) return true;

  const now = new Date();
  const diffDays = (now.getTime() - aiCopyUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > daysThreshold;
}
