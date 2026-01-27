/**
 * 商品批量导入脚本
 *
 * 功能：
 * 1. 创建商品分类（11个）
 * 2. 从CSV文件导入商品数据（54种）
 * 3. 匹配图片和视频链接
 *
 * 执行方式：npx ts-node scripts/import-products.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// 图片基础URL
const IMAGE_BASE_URL = 'http://39.104.58.26/products';

// 商品分类定义
const CATEGORIES = [
  { name: '儿童入门', sort: 1 },
  { name: '手持喷花', sort: 2 },
  { name: '创意彩花', sort: 3 },
  { name: '礼盒套装', sort: 4 },
  { name: '旋转升空', sort: 5 },
  { name: '地面喷花', sort: 6 },
  { name: '网红加特林', sort: 7 },
  { name: '组合烟花', sort: 8 },
  { name: '大型组合', sort: 9 },
  { name: '家用礼花', sort: 10 },
  { name: '鞭炮', sort: 11 },
];

// 商品名称到分类的映射
const PRODUCT_CATEGORY_MAP: Record<string, string> = {
  // 儿童入门
  '棒棒糖': '儿童入门',
  '18寸魔法仙女棒': '儿童入门',
  '28寸魔法仙女棒': '儿童入门',
  '36寸魔法仙女棒': '儿童入门',
  '精彩四变色': '儿童入门',
  '超级变变变': '儿童入门',
  // 手持喷花
  '超级棒棒糖': '手持喷花',
  '网红棒棒糖': '手持喷花',
  '王者无敌棒棒糖': '手持喷花',
  // 创意彩花
  '精灵布布': '创意彩花',
  // 礼盒套装
  '欢乐宝盒': '礼盒套装',
  // 旋转升空
  '水母派对': '旋转升空',
  '星际水母带接驳器': '旋转升空',
  // 地面喷花
  '蘑菇精灵': '地面喷花',
  '孔雀开屏': '地面喷花',
  '飞天孔雀（大型号）': '地面喷花',
  '星空孔雀': '地面喷花',
  '喜传炫彩三分钟': '地面喷花',
  '凡美炫彩三分钟': '地面喷花',
  '黄金三分钟': '地面喷花',
  '卡通系列—西游记': '地面喷花',
  // 网红加特林
  '迷你加特林': '网红加特林',
  '极速英雄加特林': '网红加特林',
  '幻影加特林': '网红加特林',
  '七彩风暴/七彩魔方加特林': '网红加特林',
  '悟空加特林': '网红加特林',
  // 组合烟花（100发以下）
  '虎城之花20发': '组合烟花',
  '金银财宝100发': '组合烟花',
  '国色天香': '组合烟花',
  '60发一帆风顺': '组合烟花',
  '万事顺60发': '组合烟花',
  '凤舞成祥80发': '组合烟花',
  '大吉系列81发': '组合烟花',
  '抱福系列81发': '组合烟花',
  '100发蓝色海洋': '组合烟花',
  '虎啸100发': '组合烟花',
  '百花齐放100发': '组合烟花',
  '高山流水100发': '组合烟花',
  // 大型组合（138发以上）
  '258发米兰之夜': '大型组合',
  '美不胜收138发': '大型组合',
  '前程似锦168发': '大型组合',
  '顶天立地198发': '大型组合',
  '虎城花王528发': '大型组合',
  '我爱你中国308发': '大型组合',
  '心想事成228发': '大型组合',
  // 家用礼花
  '20发缤纷缢彩': '家用礼花',
  '20发富贵礼炮': '家用礼花',
  '丰运树/黄金树': '家用礼花',
  '马上有钱/来财': '家用礼花',
  '忆童年100发霸王雷': '家用礼花',
  // 鞭炮
  '富贵喜炮25公分盘炮': '鞭炮',
  '688开门红顺财神60公分盘炮': '鞭炮',
  // 加特林（份炮）
  '非凡加特林': '网红加特林',
  '超能加特林': '网红加特林',
};

// 图片文件名映射（处理特殊命名）
const IMAGE_NAME_MAP: Record<string, string> = {
  '棒棒糖': '棒棒糖.jpg',
  '18寸魔法仙女棒': '18寸仙女棒.jpg',
  '28寸魔法仙女棒': '28寸仙女棒.jpg',
  '36寸魔法仙女棒': '36寸仙女棒.jpg',
  '精彩四变色': '精彩四变色.jpg',
  '超级变变变': '超级变变变.jpg',
  '超级棒棒糖': '超级棒棒糖.jpg',
  '网红棒棒糖': '网红棒棒糖.jpg',
  '王者无敌棒棒糖': '无敌棒棒糖.jpg',
  '精灵布布': '精灵布布.jpg',
  '欢乐宝盒': '欢乐宝盒.jpg',
  '水母派对': '水母派对.jpg',
  '星际水母带接驳器': '星际水母带接驳器.jpg',
  '蘑菇精灵': '蘑菇精灵.jpg',
  '孔雀开屏': '孔雀开屏.jpg',
  '飞天孔雀（大型号）': '飞天孔雀.jpg',
  '星空孔雀': '星空孔雀.jpg',
  '喜传炫彩三分钟': '炫彩三分钟.jpg',
  '凡美炫彩三分钟': '炫彩三分钟.jpg',
  '黄金三分钟': '黄金三分钟.jpg',
  '卡通系列—西游记': '卡通西游记.jpg',
  '迷你加特林': '迷你加特林.jpg',
  '极速英雄加特林': '极速英雄加特林.jpg',
  '幻影加特林': '幻影加特林.jpg',
  '七彩风暴/七彩魔方加特林': '七彩风暴七彩魔方加特林.jpg',
  '悟空加特林': '悟空加特林.jpg',
  '虎城之花20发': '20发虎城之花.jpg',
  '金银财宝100发': '金银财宝100发.jpg',
  '国色天香': '国色天香.jpg',
  '60发一帆风顺': '60发一帆风顺.jpg',
  '万事顺60发': '60发万事顺.jpg',
  '凤舞成祥80发': '80发凤舞呈祥.jpg',
  '大吉系列81发': '大吉系列81发.jpg',
  '抱福系列81发': '抱福系列.jpg',
  '258发米兰之夜': '258发米兰之夜.jpg',
  '100发蓝色海洋': '100发蓝色海洋.jpg',
  '虎啸100发': '100发虎啸.jpg',
  '百花齐放100发': '百花齐放.jpg',
  '美不胜收138发': '美不胜收138发.jpg',
  '前程似锦168发': '前程似锦.jpg',
  '顶天立地198发': '顶天立地.jpg',
  '虎城花王528发': '虎城花王.jpg',
  '我爱你中国308发': '我爱你中国.jpg',
  '心想事成228发': '心想事成.jpg',
  '高山流水100发': '高山流水.jpg',
  '20发缤纷缢彩': '缤纷溢彩20发.jpg',
  '20发富贵礼炮': '富贵礼炮20发.jpg',
  '丰运树/黄金树': '60发发财树.jpg',
  '马上有钱/来财': '马上有钱.jpg',
  '忆童年100发霸王雷': '100发霸王蕾.jpg',
  '富贵喜炮25公分盘炮': '富贵喜炮盘炮.jpg',
  '688开门红顺财神60公分盘炮': '顺财神盘炮688型开门红.jpg',
  '非凡加特林': '非凡大师加特林.jpg',
  '超能加特林': '超能加特林.jpg',
};

// 视频链接映射
const VIDEO_URL_MAP: Record<string, string> = {
  '18寸魔法仙女棒': 'https://app.if1f.com/?p30822',
  '28寸魔法仙女棒': 'https://app.if1f.com/?p30821',
  '36寸魔法仙女棒': 'https://app.if1f.com/?p30818',
  '七彩风暴/七彩魔方加特林': 'https://app.if1f.com/?p54353',
  '卡通系列—西游记': 'https://app.if1f.com/?p204770',
  '孔雀开屏': 'https://app.if1f.com/?p191856',
  '幻影加特林': 'https://app.if1f.com/?p208842',
  '悟空加特林': 'https://app.if1f.com/?p36220',
  '王者无敌棒棒糖': 'https://app.if1f.com/?p185484',
  '星空孔雀': 'https://app.if1f.com/?p203054',
  '星际水母带接驳器': 'https://app.if1f.com/?p157317',
  '极速英雄加特林': 'https://app.if1f.com/?p212490',
  '棒棒糖': 'https://app.if1f.com/?p39611',
  '喜传炫彩三分钟': 'https://app.if1f.com/?p98483',
  '凡美炫彩三分钟': 'https://app.if1f.com/?p98483',
  '精彩四变色': 'https://app.if1f.com/?p29848',
  '精灵布布': 'https://app.if1f.com/?p216362',
  '网红棒棒糖': 'https://app.if1f.com/?p214237',
  '蘑菇精灵': 'https://app.if1f.com/?p40476',
  '超级变变变': 'https://app.if1f.com/?p36988',
  '超级棒棒糖': 'https://app.if1f.com/?p192399',
  '超能加特林': 'https://app.if1f.com/?p192296',
  '非凡加特林': 'https://app.if1f.com/?p188996',
  '飞天孔雀（大型号）': 'https://app.if1f.com/?p203053',
  '黄金三分钟': 'https://app.if1f.com/?p160530',
  '100发蓝色海洋': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=119',
  '虎啸100发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=120',
  '虎城之花20发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=295',
  '258发米兰之夜': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=121',
  '60发一帆风顺': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=567',
  '万事顺60发': 'https://app.if1f.com/?p22341',
  '凤舞成祥80发': 'https://app.if1f.com/?p22339',
  '前程似锦168发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=528',
  '国色天香': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=566',
  '大吉系列81发': 'https://app.if1f.com/?p38747',
  '心想事成228发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=550',
  '我爱你中国308发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=549',
  '抱福系列81发': 'https://app.if1f.com/?p94856',
  '百花齐放100发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=536',
  '美不胜收138发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=548',
  '虎城花王528发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=122',
  '金银财宝100发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=382',
  '顶天立地198发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=532',
  '高山流水100发': 'https://web.huchengfireworks.com/3qIEca/#/pages/media/index?id=545',
};

// 商品介绍数据映射（从用户思维版CSV提取）
interface ProductIntro {
  slogan: string;
  description: string;
  sellingPoints: object;
  usageScenes: string[];
  safetyTips: string;
  suggestedPairing: string;
  marketingTags: string;
}

const PRODUCT_INTRO_MAP: Record<string, ProductIntro> = {
  '棒棒糖': {
    slogan: '孩子人生第一支烟花，安全又好玩',
    description: '点燃后喷出金色小火花，像糖果在手中绽放。火花只有10厘米高，温度低不烫手，孩子拿着特别开心，拍照超级出片',
    sellingPoints: { duration: '约15秒', height: '10cm', feature: '低温配方不烫手' },
    usageScenes: ['除夕夜给孩子玩', '拍新年亲子照', '小区里和小朋友一起玩'],
    safetyTips: '✓低温配方不烫手 ✓无烟环保 ✓需家长陪同 ✓用完泡水再扔',
    suggestedPairing: '搭配【欢乐宝盒】一整套够玩一晚上',
    marketingTags: '儿童首选/安全无烟/抖音10w+',
  },
  '18寸魔法仙女棒': {
    slogan: '拍照自带仙气，刷爆朋友圈',
    description: '18寸黄金长度，点燃后金色火星缓缓飘落，像星星在指尖跳舞。拍慢动作视频绝美，是小红书博主最爱用的拍照道具',
    sellingPoints: { duration: '约20秒', height: '15cm', feature: '拍照神器' },
    usageScenes: ['生日派对暖场', '婚礼送客', '跨年倒计时拍照', '求婚现场'],
    safetyTips: '✓远离面部 ✓伸直手臂 ✓别对着人挥',
    suggestedPairing: '18寸+28寸+36寸组合买更划算',
    marketingTags: '小红书爆款/拍照神器/仪式感',
  },
  '28寸魔法仙女棒': {
    slogan: '婚礼出场，宾客举起仙女棒，浪漫到哭',
    description: '28寸长度更显气势，金色火星持续25秒，拍婚礼视频时背景全是星光，新娘走过来那一刻美到窒息',
    sellingPoints: { duration: '约25秒', height: '15cm', feature: '婚礼必备' },
    usageScenes: ['婚礼新人入场', '毕业典礼', '大型生日派对', '跨年活动'],
    safetyTips: '✓提前分发给宾客 ✓统一点燃时间 ✓准备灭火桶',
    suggestedPairing: '婚礼建议每桌2根，50人备100根',
    marketingTags: '婚礼必备/仪式感满满/宾客好评',
  },
  '36寸魔法仙女棒': {
    slogan: '摄影师都在用，拍出来就是大片',
    description: '36寸长度拿在手里超有范儿，金色火星持续30秒，摄影师最爱用它拍人像，随便一拍就是杂志封面效果',
    sellingPoints: { duration: '约30秒', height: '20cm', feature: '摄影师推荐' },
    usageScenes: ['婚纱照拍摄', '婚礼现场', '专业摄影棚', '大型庆典'],
    safetyTips: '✓成人使用 ✓伸直手臂 ✓注意风向',
    suggestedPairing: '摄影师建议备10根以上，可以多角度拍',
    marketingTags: '摄影师推荐/专业级/30秒超长',
  },
  '精彩四变色': {
    slogan: '一根烟花变4种颜色，孩子惊叫连连',
    description: '点燃后依次变红→绿→蓝→金四种颜色，每变一次孩子都会"哇"一声。这种神奇的变色效果让孩子对烟花充满好奇',
    sellingPoints: { duration: '约25秒', height: '15cm', feature: '神奇变色' },
    usageScenes: ['给孩子讲烟花原理', '家庭亲子时光', '小朋友聚会比谁的颜色多'],
    safetyTips: '✓家长陪同 ✓户外燃放 ✓用完泡水',
    suggestedPairing: '搭配超级变变变（10色）效果更丰富',
    marketingTags: '神奇变色/孩子最爱/一根顶四根',
  },
  '超级变变变': {
    slogan: '10种颜色像彩虹，颜色最丰富的仙女棒',
    description: '十种颜色流畅过渡，就像把彩虹握在手里。孩子们最喜欢数颜色，看谁能数出几种来',
    sellingPoints: { duration: '约25秒', height: '15cm', feature: '彩虹色' },
    usageScenes: ['儿童聚会比赛', '彩虹主题派对', '送给喜欢彩色的孩子'],
    safetyTips: '✓家长陪同 ✓户外燃放 ✓用完泡水',
    suggestedPairing: '搭配精彩四变色，从简单到复杂都体验',
    marketingTags: '颜色最多/彩虹色/小朋友比赛',
  },
  '超级棒棒糖': {
    slogan: '普通棒棒糖的升级版，效果强3倍',
    description: '喷花高度50厘米，是普通棒棒糖的3倍高，火花像喷泉一样涌出来，特别壮观。孩子玩这个比普通款开心多了',
    sellingPoints: { duration: '约20秒', height: '50cm', feature: '效果升级' },
    usageScenes: ['户外空旷处', '和朋友比谁的火花高', '拍抖音短视频'],
    safetyTips: '✓需家长陪同 ✓保持50cm距离 ✓户外燃放',
    suggestedPairing: '和网红棒棒糖一起买，对比效果',
    marketingTags: '效果升级/火花翻倍/更过瘾',
  },
  '网红棒棒糖': {
    slogan: '抖音小红书都在用，拍视频自带流量',
    description: '独特造型+渐变火花，拍出来的视频就是不一样。很多抖音博主都用这款，开头一个慢动作就能吸引眼球',
    sellingPoints: { duration: '约22秒', height: '60cm', feature: '网红同款' },
    usageScenes: ['跨年拍视频', '发朋友圈炸场', '和朋友比谁拍得好看'],
    safetyTips: '✓成人或青少年使用 ✓拍摄时注意安全 ✓别只顾拍忘了看路',
    suggestedPairing: '配合手机支架慢动作拍摄效果更好',
    marketingTags: '抖音爆款/小红书同款/播放10w+',
  },
  '王者无敌棒棒糖': {
    slogan: '手持烟花里的"王者"，效果封顶了',
    description: '80厘米超高喷花，火花密度是普通款的5倍，颜色层层叠叠特别震撼。这款一出手，其他的都是"弟弟"',
    sellingPoints: { duration: '约25秒', height: '80cm', feature: '手持天花板' },
    usageScenes: ['派对压轴', '朋友聚会显摆', '重要场合镇场'],
    safetyTips: '✓仅限成人 ✓保持1米距离 ✓空旷处燃放',
    suggestedPairing: '一般手持和这款各买一些，对比才知道差距',
    marketingTags: '手持天花板/最强效果/王者级别',
  },
  '精灵布布': {
    slogan: '造型超萌，小朋友一眼就爱上',
    description: '精灵造型的手持喷花，喷出的火花柔和细腻，像小精灵在跳舞。孩子拿着它，本身就是一个超棒的拍照道具',
    sellingPoints: { duration: '约18秒', height: '40cm', feature: '造型可爱' },
    usageScenes: ['拍新年照', '送给孩子的新年礼物', '小朋友派对'],
    safetyTips: '✓需家长陪同 ✓远离面部 ✓户外燃放',
    suggestedPairing: '搭配欢乐宝盒，造型烟花+普通烟花都有',
    marketingTags: '造型可爱/萌娃必备/拍照出片',
  },
  '欢乐宝盒': {
    slogan: '送孩子最好的新年礼物，24款够玩整个春节',
    description: '精选24款儿童安全烟花，有仙女棒、棒棒糖、小喷花各种类型。精美礼盒包装，送人有面子，自用超省心。不用一个个挑，一盒全搞定',
    sellingPoints: { duration: '多款组合', height: '多种', feature: '24款全包' },
    usageScenes: ['送给侄子侄女', '送给朋友家孩子', '自己家孩子的新年礼物'],
    safetyTips: '✓24款分类燃放 ✓家长陪同 ✓附带产品说明',
    suggestedPairing: '这个是儿童类最全套装，买它就够了',
    marketingTags: '送礼首选/24款全包/省心之选',
  },
  '水母派对': {
    slogan: '点燃自己就飞起来，孩子看呆了',
    description: '水母造型点燃后自动旋转升空，飞到3米高的位置绽放，就像真的水母在天上游。孩子看到眼睛都直了，直呼太神奇',
    sellingPoints: { duration: '约10秒', height: '3米', feature: '自动起飞' },
    usageScenes: ['户外空旷草地', '小区花园', '海洋主题派对'],
    safetyTips: '✓必须在空旷处 ✓点燃后迅速撤离 ✓远离树木和电线',
    suggestedPairing: '多买几个，第一个孩子肯定没看够',
    marketingTags: '自动起飞/太神奇了/孩子最爱',
  },
  '星际水母带接驳器': {
    slogan: '连续发射，一个接一个飞上天',
    description: '配备专业接驳器，可以实现5连发效果。砰砰砰一个接一个飞上天，比单个放过瘾多了，围观的人都鼓掌叫好',
    sellingPoints: { duration: '约30秒', height: '3米', feature: '连发升空' },
    usageScenes: ['表演给朋友看', '小区里放给大家看', '录视频发抖音'],
    safetyTips: '✓必须在空旷处 ✓按说明使用接驳器 ✓点燃后撤离',
    suggestedPairing: '先买普通水母体验，再买这个升级',
    marketingTags: '连发升空/更过瘾/围观鼓掌',
  },
  '蘑菇精灵': {
    slogan: '放地上自己喷，不用手拿更安全',
    description: '萌萌的蘑菇造型，放在地上点燃，彩色火花从蘑菇顶端喷出，像童话世界里的魔法蘑菇。孩子站在旁边看，安全又开心',
    sellingPoints: { duration: '约15秒', height: '30cm', feature: '放地上更安全' },
    usageScenes: ['院子里给孩子看', '拍照当背景', '小朋友围观'],
    safetyTips: '✓放平稳地面 ✓点燃后退2米 ✓小朋友只能看不能摸',
    suggestedPairing: '地面喷花最适合小朋友观看，多买几种',
    marketingTags: '放地上更安全/萌萌蘑菇/小朋友观赏',
  },
  '孔雀开屏': {
    slogan: '最经典的地面烟花，谁小时候没放过',
    description: '点燃后火花扇形展开，就像孔雀开屏一样漂亮。这款是最经典的地面烟花，效果稳定，从小到大都在放，品质有保证',
    sellingPoints: { duration: '约15秒', height: '40cm', feature: '经典永恒' },
    usageScenes: ['小区里放', '院子里放', '大量采购分给亲戚'],
    safetyTips: '✓放平稳地面 ✓保持2米距离 ✓远离易燃物',
    suggestedPairing: '经典款多买点不会错，实惠又好看',
    marketingTags: '经典永恒/童年回忆/性价比高',
  },
  '飞天孔雀（大型号）': {
    slogan: '1.5米高的火花柱，整个院子都亮了',
    description: '超大版孔雀喷花，火花高度达到1.5米，持续30秒不断档。金色火花冲天而起，整个院子被照亮，邻居都会出来看热闹',
    sellingPoints: { duration: '约30秒', height: '1.5米', feature: '院子必备' },
    usageScenes: ['自家院子', '农村老家', '别墅花园'],
    safetyTips: '✓需要大空间 ✓远离房屋3米 ✓远离树木',
    suggestedPairing: '大孔雀+星空孔雀组合，效果层次更丰富',
    marketingTags: '1.5米超高/院子必备/邻居围观',
  },
  '星空孔雀': {
    slogan: '火花里有闪闪的星星，浪漫到爆',
    description: '独特的星空效果，火花中点缀着闪烁的星点，就像把银河撒在地上。女孩子看到都会尖叫，是最浪漫的地面烟花',
    sellingPoints: { duration: '约20秒', height: '1米', feature: '最浪漫' },
    usageScenes: ['求婚现场', '结婚纪念日', '情人节', '女友生日'],
    safetyTips: '✓放平稳地面 ✓保持2米距离 ✓提前踩点确认安全',
    suggestedPairing: '求婚配合仙女棒，浪漫指数爆表',
    marketingTags: '最浪漫/星空效果/求婚必备',
  },
  '喜传炫彩三分钟': {
    slogan: '整整3分钟不断档，拍完整视频够了',
    description: '持续燃放3分钟，火花不间断。拍抖音视频时不用频繁换烟花，一个从头拍到尾。性价比超高的实惠款',
    sellingPoints: { duration: '约180秒', height: '40cm', feature: '超长待机' },
    usageScenes: ['当背景音持续燃放', '拍完整的新年视频', '营造持续热闹氛围'],
    safetyTips: '✓放平稳地面 ✓注意3分钟燃放时长 ✓别忘了它还在烧',
    suggestedPairing: '当背景喷花用，主角用其他造型烟花',
    marketingTags: '3分钟不断/超长待机/当背景最好用',
  },
  '凡美炫彩三分钟': {
    slogan: '3分钟喷花里的高端款，效果肉眼可见的好',
    description: '凡美品牌出品，用料扎实效果好。同样是3分钟，这个颜色更鲜艳、火花更密集、燃烧更稳定，一分钱一分货',
    sellingPoints: { duration: '约180秒', height: '50cm', feature: '凡美品质' },
    usageScenes: ['重要场合', '送给讲究的朋友', '自己家用要最好的'],
    safetyTips: '✓放平稳地面 ✓保持2米距离 ✓燃放完彻底熄灭再离开',
    suggestedPairing: '预算够就买凡美，效果真的不一样',
    marketingTags: '凡美品质/效果更好/一分钱一分货',
  },
  '黄金三分钟': {
    slogan: '全程金色火花，过年放它财运旺',
    description: '通体金色火花，象征富贵吉祥。过年放金色烟花讨个好彩头，做生意的、开店的都喜欢买这个，寓意新年财源滚滚',
    sellingPoints: { duration: '约180秒', height: '45cm', feature: '金色招财' },
    usageScenes: ['大年初一开门', '店铺开业', '做生意的朋友送礼'],
    safetyTips: '✓放平稳地面 ✓保持2米距离 ✓寓意发财不是迷信是图个喜庆',
    suggestedPairing: '金色+红色搭配，又招财又喜庆',
    marketingTags: '金色招财/生意兴隆/好彩头',
  },
  '卡通系列—西游记': {
    slogan: '孙悟空猪八戒造型，孩子一眼就认识',
    description: '经典西游记卡通形象，孙悟空、猪八戒等造型。孩子一眼就认识，放烟花的时候还能讲西游记的故事，寓教于乐',
    sellingPoints: { duration: '约15秒', height: '40cm', feature: '西游IP' },
    usageScenes: ['给孩子讲西游记', '国潮主题派对', '传统节日'],
    safetyTips: '✓需家长陪同 ✓放平稳地面 ✓保持安全距离',
    suggestedPairing: '搭配欢乐宝盒，传统+现代都有',
    marketingTags: '西游IP/孩子最认/国潮范儿',
  },
  '迷你加特林': {
    slogan: '加特林入门款，体验一下什么叫火力输出',
    description: '迷你版加特林，连续发射8-10发彩珠，让你体验什么是"火力输出"。这款适合入门，先试试自己喜不喜欢加特林的感觉',
    sellingPoints: { duration: '约8秒', height: '8米', feature: '入门首选' },
    usageScenes: ['体验加特林手感', '和朋友比谁打得准', '入门试玩'],
    safetyTips: '✓需成人在场 ✓对准空旷方向 ✓双手稳定握持',
    suggestedPairing: '先买迷你款试手感，喜欢再买大的',
    marketingTags: '入门首选/试试手感/体验火力',
  },
  '极速英雄加特林': {
    slogan: '抖音上最火的加特林，拍视频轻松上热门',
    description: '网红爆款加特林，连续发射15-20发彩珠，声光效果俱佳。拍视频的时候举着它，背景是呼啸而出的彩珠，酷到没朋友',
    sellingPoints: { duration: '约15秒', height: '12米', feature: '抖音爆款' },
    usageScenes: ['跨年拍视频', '朋友聚会耍酷', '发朋友圈炸场'],
    safetyTips: '✓仅限成人操作 ✓对准空旷上方 ✓双手稳定不要晃',
    suggestedPairing: '多买几根，一根拍视频一根自己玩',
    marketingTags: '抖音爆款/最火加特林/拍视频超酷',
  },
  '幻影加特林': {
    slogan: '彩珠颜色会变化，视觉效果更炫酷',
    description: '幻影特效加特林，发射的彩珠颜色交替变化，像变魔术一样。比普通加特林多了一层视觉惊喜，拍慢动作视频效果绝了',
    sellingPoints: { duration: '约15秒', height: '12米', feature: '幻影特效' },
    usageScenes: ['拍慢动作视频', '派对压轴表演', '朋友圈炫技'],
    safetyTips: '✓仅限成人操作 ✓对准空旷上方 ✓稳定握持',
    suggestedPairing: '幻影+极速英雄对比着买，体验不同效果',
    marketingTags: '幻影特效/颜色会变/视觉更炫',
  },
  '七彩风暴/七彩魔方加特林': {
    slogan: '红橙黄绿青蓝紫，彩虹色最好看',
    description: '七彩加特林，发射的彩珠呈现红橙黄绿青蓝紫七种颜色依次变化，像发射了一道彩虹。这款就是冲着颜值买的，太好看了',
    sellingPoints: { duration: '约18秒', height: '15米', feature: '颜值天花板' },
    usageScenes: ['彩虹主题派对', '女生聚会', '拍最美烟花视频'],
    safetyTips: '✓仅限成人操作 ✓需要大空间 ✓对准空旷上方',
    suggestedPairing: '七彩是最好看的，其他是最酷的，看需求选',
    marketingTags: '颜值天花板/七彩彩虹/最好看',
  },
  '悟空加特林': {
    slogan: '金箍棒造型，举着它你就是齐天大圣',
    description: '西游记悟空主题，金箍棒造型设计。举着它发射的那一刻，仿佛自己就是齐天大圣。国潮青年必入，这个有文化',
    sellingPoints: { duration: '约15秒', height: '12米', feature: '国潮最爱' },
    usageScenes: ['国潮主题派对', '西游记主题活动', '发朋友圈配文玩梗'],
    safetyTips: '✓仅限成人操作 ✓对准空旷上方 ✓悟空也要注意安全',
    suggestedPairing: '悟空配西游喷花，凑一套西游记主题',
    marketingTags: '金箍棒造型/国潮最爱/齐天大圣',
  },
};

// 解析价格字符串
function parsePrice(priceStr: string): number {
  if (!priceStr || priceStr === '—') return 0;
  // 处理格式如 "4/个"、"168"、"10/个" 等
  const match = priceStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

// 解析库存字符串
function parseStock(stockStr: string): number {
  if (!stockStr || stockStr === '待确认') return 50;
  // 处理格式如 "50箱"、"1478个"、"481件" 等
  const match = stockStr.match(/(\d+)/);
  if (!match) return 50;
  const value = parseInt(match[1]);
  // 如果是箱/件，需要乘以规格中的单位换算
  return value;
}

// 解析规格，提取单位信息
function parseSpec(spec: string): { unit: string; purchaseUnit: string; unitConversion: number } {
  // 默认值
  let unit = '个';
  let purchaseUnit = '件';
  let unitConversion = 1;

  if (!spec) return { unit, purchaseUnit, unitConversion };

  // 匹配不同格式
  // "42个/1件" -> unit=个, purchaseUnit=件, conversion=42
  // "8个/10包/10盒/1件" -> unit=包, purchaseUnit=件
  // "24个/礼盒" -> unit=个, purchaseUnit=礼盒
  // "1件" -> unit=件, purchaseUnit=件

  const patterns = [
    /(\d+)(个|盒|包|根|发|盘)\/.*1(件|箱)/,
    /(\d+)(个|盒|包)\/(\d+)(盒|包)\/(\d+)(盒|包)\/1(件)/,
    /1(件|套|个)/,
  ];

  const match1 = spec.match(/(\d+)(个|盒|包|根|发|盘)/);
  if (match1) {
    unitConversion = parseInt(match1[1]);
    unit = match1[2];
  }

  if (spec.includes('件')) {
    purchaseUnit = '件';
  } else if (spec.includes('箱')) {
    purchaseUnit = '箱';
  } else if (spec.includes('礼盒')) {
    purchaseUnit = '礼盒';
    unit = '套';
  }

  return { unit, purchaseUnit, unitConversion };
}

// 商品数据（从CSV解析）
interface ProductData {
  sort: number;
  type: string;
  name: string;
  spec: string;
  agentPrice: string;
  boxPrice: number;
  typeTag: string;
  marketPrice: string;
  stock: string;
}

const PRODUCTS_FROM_CSV: ProductData[] = [
  { sort: 1, type: '娱乐类', name: '棒棒糖', spec: '42个/1件', agentPrice: '4/个', boxPrice: 168, typeTag: '手持喷花类', marketPrice: '10/个', stock: '50箱' },
  { sort: 2, type: '', name: '18寸魔法仙女棒', spec: '8个/10包/10盒/1件', agentPrice: '0.75/包', boxPrice: 75, typeTag: '线香类', marketPrice: '2/包', stock: '30箱' },
  { sort: 3, type: '', name: '28寸魔法仙女棒', spec: '8个/60盒/1件', agentPrice: '1.3/盒', boxPrice: 78, typeTag: '线香类', marketPrice: '4/包', stock: '30箱' },
  { sort: 4, type: '', name: '36寸魔法仙女棒', spec: '6个/50盒/1件', agentPrice: '1.5/盒', boxPrice: 75, typeTag: '线香类', marketPrice: '5/包', stock: '30箱' },
  { sort: 5, type: '', name: '精彩四变色', spec: '18个/100盒/1件', agentPrice: '2/盒', boxPrice: 200, typeTag: '线香类', marketPrice: '10/盒', stock: '89箱' },
  { sort: 6, type: '', name: '超级变变变', spec: '10个/60盒/1件', agentPrice: '3/盒', boxPrice: 180, typeTag: '线香类', marketPrice: '9/盒', stock: '50箱' },
  { sort: 7, type: '', name: '超级棒棒糖', spec: '30个/1件', agentPrice: '5.8/个', boxPrice: 174, typeTag: '手持喷花类', marketPrice: '18/个', stock: '52箱' },
  { sort: 8, type: '', name: '网红棒棒糖', spec: '20个/1件', agentPrice: '10.5/个', boxPrice: 210, typeTag: '手持喷花类', marketPrice: '25/个', stock: '14箱' },
  { sort: 9, type: '', name: '王者无敌棒棒糖', spec: '8个/1件', agentPrice: '18.5/个', boxPrice: 148, typeTag: '手持喷花类', marketPrice: '35/个', stock: '50箱' },
  { sort: 10, type: '彩花类', name: '精灵布布', spec: '16个/1件', agentPrice: '13/个', boxPrice: 208, typeTag: '手持喷花类', marketPrice: '28/个', stock: '30箱' },
  { sort: 11, type: '', name: '欢乐宝盒', spec: '24个/礼盒', agentPrice: '270', boxPrice: 399, typeTag: '儿童礼盒套装', marketPrice: '399/套', stock: '1478个' },
  { sort: 12, type: '', name: '水母派对', spec: '10个/20盒/1件', agentPrice: '5.5', boxPrice: 110, typeTag: '旋转升空类', marketPrice: '18/盒', stock: '50箱' },
  { sort: 13, type: '', name: '星际水母带接驳器', spec: '10个/20盒/1件', agentPrice: '5.5', boxPrice: 110, typeTag: '旋转升空类', marketPrice: '15/盒', stock: '100箱' },
  { sort: 14, type: '', name: '蘑菇精灵', spec: '4个/30盒/1件', agentPrice: '10', boxPrice: 300, typeTag: '地面喷花类', marketPrice: '25/个', stock: '10箱' },
  { sort: 15, type: '', name: '孔雀开屏', spec: '24个/1件', agentPrice: '5', boxPrice: 120, typeTag: '地面喷花类', marketPrice: '15/个', stock: '100箱' },
  { sort: 16, type: '', name: '飞天孔雀（大型号）', spec: '12个/1件', agentPrice: '31.5', boxPrice: 378, typeTag: '地面喷花类', marketPrice: '70/个', stock: '50箱' },
  { sort: 17, type: '', name: '星空孔雀', spec: '20个/1件', agentPrice: '17.5', boxPrice: 350, typeTag: '地面喷花类', marketPrice: '45/个', stock: '52箱' },
  { sort: 18, type: '', name: '喜传炫彩三分钟', spec: '24个/1件', agentPrice: '7.8', boxPrice: 187, typeTag: '地面喷花类', marketPrice: '20/个', stock: '100箱' },
  { sort: 19, type: '', name: '凡美炫彩三分钟', spec: '24个/1件', agentPrice: '14.5', boxPrice: 348, typeTag: '地面喷花类', marketPrice: '30/个', stock: '100箱' },
  { sort: 20, type: '', name: '黄金三分钟', spec: '24个/1件', agentPrice: '11', boxPrice: 264, typeTag: '地面喷花类', marketPrice: '25/个', stock: '100箱' },
  { sort: 21, type: '', name: '卡通系列—西游记', spec: '24个/1件', agentPrice: '10.5', boxPrice: 252, typeTag: '地面喷花类', marketPrice: '22/个', stock: '11箱' },
  { sort: 22, type: '网红加特林类', name: '迷你加特林', spec: '30个/1件', agentPrice: '5', boxPrice: 150, typeTag: '吐珠类', marketPrice: '15/根', stock: '50箱' },
  { sort: 23, type: '', name: '极速英雄加特林', spec: '12个/1件', agentPrice: '11', boxPrice: 132, typeTag: '吐珠类', marketPrice: '25/根', stock: '110箱' },
  { sort: 24, type: '', name: '幻影加特林', spec: '12个/1件', agentPrice: '11', boxPrice: 132, typeTag: '吐珠类', marketPrice: '25/根', stock: '91箱' },
  { sort: 25, type: '', name: '七彩风暴/七彩魔方加特林', spec: '8个/1件', agentPrice: '24', boxPrice: 192, typeTag: '吐珠类', marketPrice: '35/根', stock: '112箱' },
  { sort: 26, type: '', name: '悟空加特林', spec: '12个/1件', agentPrice: '9.5', boxPrice: 114, typeTag: '吐珠类', marketPrice: '25/根', stock: '227箱' },
  { sort: 27, type: '家用烟花/精品特效', name: '虎城之花20发', spec: '1件', agentPrice: '35', boxPrice: 35, typeTag: '组合烟花', marketPrice: '78/件', stock: '待确认' },
  { sort: 28, type: '', name: '金银财宝100发', spec: '1件', agentPrice: '130', boxPrice: 130, typeTag: '组合烟花', marketPrice: '268/件', stock: '待确认' },
  { sort: 29, type: '', name: '国色天香', spec: '1件', agentPrice: '110', boxPrice: 110, typeTag: '组合烟花', marketPrice: '228/件', stock: '待确认' },
  { sort: 30, type: '', name: '60发一帆风顺', spec: '1件', agentPrice: '80', boxPrice: 80, typeTag: '组合烟花', marketPrice: '168/件', stock: '待确认' },
  { sort: 31, type: '', name: '万事顺60发', spec: '1件', agentPrice: '80', boxPrice: 80, typeTag: '组合烟花', marketPrice: '168/件', stock: '待确认' },
  { sort: 32, type: '', name: '凤舞成祥80发', spec: '1件', agentPrice: '105', boxPrice: 105, typeTag: '组合烟花', marketPrice: '218/件', stock: '待确认' },
  { sort: 33, type: '', name: '大吉系列81发', spec: '1件', agentPrice: '90', boxPrice: 90, typeTag: '组合烟花', marketPrice: '188/件', stock: '待确认' },
  { sort: 34, type: '', name: '抱福系列81发', spec: '1件', agentPrice: '90', boxPrice: 90, typeTag: '组合烟花', marketPrice: '188/件', stock: '待确认' },
  { sort: 35, type: '', name: '258发米兰之夜', spec: '1件', agentPrice: '830', boxPrice: 830, typeTag: '大型组合', marketPrice: '1688/件', stock: '待确认' },
  { sort: 36, type: '', name: '100发蓝色海洋', spec: '1件', agentPrice: '290', boxPrice: 290, typeTag: '组合烟花', marketPrice: '588/件', stock: '待确认' },
  { sort: 37, type: '', name: '虎啸100发', spec: '1件', agentPrice: '290', boxPrice: 290, typeTag: '组合烟花', marketPrice: '578/件', stock: '待确认' },
  { sort: 38, type: '', name: '百花齐放100发', spec: '1件', agentPrice: '290', boxPrice: 290, typeTag: '组合烟花', marketPrice: '598/件', stock: '待确认' },
  { sort: 39, type: '', name: '美不胜收138发', spec: '1件', agentPrice: '440', boxPrice: 440, typeTag: '组合烟花', marketPrice: '888/件', stock: '待确认' },
  { sort: 40, type: '', name: '前程似锦168发', spec: '1件', agentPrice: '540', boxPrice: 540, typeTag: '大型组合', marketPrice: '1088/件', stock: '待确认' },
  { sort: 41, type: '', name: '顶天立地198发', spec: '1件', agentPrice: '640', boxPrice: 640, typeTag: '大型组合', marketPrice: '1288/件', stock: '待确认' },
  { sort: 42, type: '', name: '虎城花王528发', spec: '1件', agentPrice: '2000', boxPrice: 2000, typeTag: '大型组合', marketPrice: '4288/件', stock: '待确认' },
  { sort: 43, type: '', name: '我爱你中国308发', spec: '1件', agentPrice: '990', boxPrice: 990, typeTag: '大型组合', marketPrice: '1988/件', stock: '待确认' },
  { sort: 44, type: '', name: '心想事成228发', spec: '1件', agentPrice: '740', boxPrice: 740, typeTag: '大型组合', marketPrice: '1488/件', stock: '待确认' },
  { sort: 45, type: '', name: '高山流水100发', spec: '1件', agentPrice: '290', boxPrice: 290, typeTag: '组合烟花', marketPrice: '598/件', stock: '待确认' },
  { sort: 46, type: '份炮(不零售)', name: '20发缤纷缢彩', spec: '6个/1件', agentPrice: '10.2/个', boxPrice: 61.2, typeTag: '家用礼花', marketPrice: '—', stock: '481件' },
  { sort: 47, type: '', name: '20发富贵礼炮', spec: '6个/1件', agentPrice: '7.8/个', boxPrice: 46.8, typeTag: '家用礼花', marketPrice: '—', stock: '484件' },
  { sort: 48, type: '', name: '丰运树/黄金树', spec: '1个/1件', agentPrice: '46.8/个', boxPrice: 46.8, typeTag: '家用礼花', marketPrice: '—', stock: '966件' },
  { sort: 49, type: '', name: '马上有钱/来财', spec: '1个/1件', agentPrice: '78/个', boxPrice: 78, typeTag: '家用礼花', marketPrice: '—', stock: '483件' },
  { sort: 50, type: '', name: '忆童年100发霸王雷', spec: '100个/1件', agentPrice: '37.5/件', boxPrice: 37.5, typeTag: '家用礼花', marketPrice: '—', stock: '483件' },
  { sort: 51, type: '鞭炮', name: '富贵喜炮25公分盘炮', spec: '10盘/1件', agentPrice: '7.5/盘', boxPrice: 75, typeTag: '盘炮', marketPrice: '—', stock: '81件' },
  { sort: 52, type: '', name: '688开门红顺财神60公分盘炮', spec: '1盘/1件', agentPrice: '52.5/盘', boxPrice: 52.5, typeTag: '盘炮', marketPrice: '—', stock: '483件' },
  { sort: 53, type: '加特林(份炮)', name: '非凡加特林', spec: '12个/1件', agentPrice: '9/个', boxPrice: 108, typeTag: '吐珠类', marketPrice: '—', stock: '30件' },
  { sort: 54, type: '', name: '超能加特林', spec: '12个/1件', agentPrice: '11/个', boxPrice: 132, typeTag: '吐珠类', marketPrice: '—', stock: '2件' },
];

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           蒙庆烟花 - 商品批量导入工具                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n开始时间:', new Date().toISOString());

  try {
    // ============ Phase 1: 创建商品分类 ============
    console.log('\n[Phase 1] 创建商品分类...');

    const categoryMap: Record<string, number> = {};

    for (const cat of CATEGORIES) {
      const created = await prisma.category.create({
        data: {
          name: cat.name,
          sort: cat.sort,
          status: 'ACTIVE',
        }
      });
      categoryMap[cat.name] = created.id;
      console.log(`  ✓ ${cat.name} (ID: ${created.id})`);
    }

    // ============ Phase 2: 创建商品 ============
    console.log('\n[Phase 2] 创建商品...');

    let successCount = 0;
    let failCount = 0;

    for (const product of PRODUCTS_FROM_CSV) {
      try {
        // 获取分类
        const categoryName = PRODUCT_CATEGORY_MAP[product.name];
        if (!categoryName) {
          console.log(`  ⚠ 跳过: ${product.name} (未找到分类映射)`);
          failCount++;
          continue;
        }
        const categoryId = categoryMap[categoryName];
        if (!categoryId) {
          console.log(`  ⚠ 跳过: ${product.name} (分类ID不存在: ${categoryName})`);
          failCount++;
          continue;
        }

        // 解析价格
        const costPrice = parsePrice(product.agentPrice);
        const retailPrice = parsePrice(product.marketPrice);
        const supplyPrice = Math.round(costPrice * 1.3 * 100) / 100;
        const suggestedPrice = retailPrice > 0 ? retailPrice : Math.round(costPrice * 2 * 100) / 100;
        const minRetailPrice = Math.round(supplyPrice * 1.1 * 100) / 100;

        // 解析库存
        const stock = parseStock(product.stock);

        // 解析规格
        const { unit, purchaseUnit, unitConversion } = parseSpec(product.spec);

        // 获取图片URL
        const imageFileName = IMAGE_NAME_MAP[product.name];
        const imageUrl = imageFileName
          ? `${IMAGE_BASE_URL}/${encodeURIComponent(imageFileName)}`
          : '';

        // 获取视频URL
        const videoUrl = VIDEO_URL_MAP[product.name] || '';

        // 获取商品介绍
        const intro = PRODUCT_INTRO_MAP[product.name];

        // 创建商品
        const created = await prisma.product.create({
          data: {
            name: product.name,
            categoryId,
            retailPrice: retailPrice > 0 ? retailPrice : suggestedPrice,
            agentPrice: costPrice,
            wholesalePrice: costPrice,
            costPrice,
            supplyPrice,
            suggestedPrice,
            minRetailPrice,
            masterRetailPrice: retailPrice > 0 ? retailPrice : suggestedPrice,
            stock,
            lockStock: 0,
            unit,
            purchaseUnit,
            unitConversion,
            images: imageUrl ? JSON.stringify([imageUrl]) : '[]',
            description: intro?.description || '',
            slogan: intro?.slogan || '',
            sellingPoints: intro?.sellingPoints ? JSON.stringify(intro.sellingPoints) : null,
            usageScenes: intro?.usageScenes ? JSON.stringify(intro.usageScenes) : null,
            videoUrl,
            status: 'ACTIVE',
            sort: product.sort,
            barcode: `YH${String(product.sort).padStart(4, '0')}`,
            sku: `SKU${String(product.sort).padStart(4, '0')}`,
          }
        });

        console.log(`  ✓ ${product.name} (ID: ${created.id}, 分类: ${categoryName})`);
        successCount++;

      } catch (err) {
        console.log(`  ✗ ${product.name}: ${err}`);
        failCount++;
      }
    }

    // ============ 打印结果 ============
    console.log('\n' + '='.repeat(60));
    console.log('导入完成！');
    console.log('='.repeat(60));
    console.log(`  分类创建: ${CATEGORIES.length} 个`);
    console.log(`  商品导入成功: ${successCount} 个`);
    console.log(`  商品导入失败: ${failCount} 个`);
    console.log('结束时间:', new Date().toISOString());

  } catch (error) {
    console.error('\n[ERROR] 导入失败！');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
