const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 商品数据（包含精美产品介绍）
const products = [
  // 娱乐类（9个）
  {
    name: '棒棒糖',
    category: '娱乐类',
    spec: '42个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 42,
    costPrice: 4.0,
    supplyPrice: 5.6,
    suggestedPrice: 6.4,
    retailPrice: 8,
    image: '1棒棒糖.jpg',
    description: '经典造型，绚烂多彩，安全易燃。适合各种庆祝场合，点燃瞬间绽放迷人光芒，为节日增添欢乐气氛。',
    detail: '<p>🎉 <b>经典棒棒糖烟花</b></p><p>✨ 造型可爱，色彩绚丽</p><p>✨ 燃放安全，火花柔和</p><p>✨ 适合亲子互动，节日庆典</p><p>✨ 每件42个，量大实惠</p>'
  },
  {
    name: '18寸魔法仙女棒',
    category: '娱乐类',
    spec: '8个/10包/10盒/1件',
    unit: '盒',
    purchaseUnit: '件',
    unitConversion: 800,
    costPrice: 0.8,
    supplyPrice: 1.1,
    suggestedPrice: 1.2,
    retailPrice: 2,
    image: '2.18寸仙女棒.jpg',
    description: '小巧精致的魔法仙女棒，金色火花缓缓流淌，如梦似幻。儿童最爱的手持烟花，安全无烟，适合室内外使用。',
    detail: '<p>✨ <b>18寸魔法仙女棒</b></p><p>🌟 金色火花，柔和美丽</p><p>🌟 小巧便携，安全易用</p><p>🌟 儿童最爱，亲子同乐</p><p>🌟 每盒8个，超值装</p>'
  },
  {
    name: '28寸魔法仙女棒',
    category: '娱乐类',
    spec: '8个/60盒/1件',
    unit: '盒',
    purchaseUnit: '件',
    unitConversion: 60,
    costPrice: 1.3,
    supplyPrice: 1.8,
    suggestedPrice: 2.0,
    retailPrice: 3,
    image: '3.28寸仙女棒.jpg',
    description: '加长版仙女棒，燃放时间更长，火花更加绚烂。婚礼、生日派对必备神器，营造浪漫温馨氛围。',
    detail: '<p>✨ <b>28寸魔法仙女棒</b></p><p>💫 加长设计，燃放更久</p><p>💫 金银交织，光芒四射</p><p>💫 婚礼派对，浪漫必备</p><p>💫 每盒8个，经济实惠</p>'
  },
  {
    name: '36寸魔法仙女棒',
    category: '娱乐类',
    spec: '6个/50盒/1件',
    unit: '盒',
    purchaseUnit: '件',
    unitConversion: 50,
    costPrice: 1.5,
    supplyPrice: 2.1,
    suggestedPrice: 2.4,
    retailPrice: 3,
    image: '4.36寸仙女棒.jpg',
    description: '超长款仙女棒，专业级燃放效果。火花飞舞时间长达30秒，适合大型活动、婚庆典礼使用。',
    detail: '<p>✨ <b>36寸魔法仙女棒</b></p><p>⭐ 超长尺寸，持久燃放</p><p>⭐ 专业品质，效果震撼</p><p>⭐ 大型活动，婚庆首选</p><p>⭐ 每盒6个，品质之选</p>'
  },
  {
    name: '精彩四变色',
    category: '娱乐类',
    spec: '18个/100盒/1件',
    unit: '盒',
    purchaseUnit: '件',
    unitConversion: 100,
    costPrice: 2.0,
    supplyPrice: 2.8,
    suggestedPrice: 3.2,
    retailPrice: 4,
    image: '5精彩四变色.jpg',
    description: '一根烟花四种颜色，红黄蓝绿依次绽放。创新变色技术，让每一次燃放都充满惊喜，视觉效果极佳。',
    detail: '<p>🌈 <b>精彩四变色</b></p><p>🔴 红色开场，热情似火</p><p>🟡 金黄闪耀，灿烂夺目</p><p>🔵 蓝光梦幻，神秘优雅</p><p>🟢 翠绿收尾，清新自然</p><p>每盒18个，色彩缤纷</p>'
  },
  {
    name: '超级变变变',
    category: '娱乐类',
    spec: '10个/60盒/1件',
    unit: '盒',
    purchaseUnit: '件',
    unitConversion: 60,
    costPrice: 3.0,
    supplyPrice: 4.2,
    suggestedPrice: 4.8,
    retailPrice: 6,
    image: '6超级变变变.png',
    description: '升级版变色烟花，颜色更丰富，变化更神奇。多达六种颜色流畅切换，如彩虹般绚烂，派对必备单品。',
    detail: '<p>🎨 <b>超级变变变</b></p><p>🌟 六色渐变，流光溢彩</p><p>🌟 升级配方，更加绚烂</p><p>🌟 派对神器，人群焦点</p><p>🌟 每盒10个，超值享受</p>'
  },
  {
    name: '超级棒棒糖',
    category: '娱乐类',
    spec: '30个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 30,
    costPrice: 5.8,
    supplyPrice: 8.3,
    suggestedPrice: 9.5,
    retailPrice: 12,
    image: '7超级棒棒糖.jpg',
    description: '超大号棒棒糖造型，火花更旺更持久。独特的螺旋喷射效果，点燃后如糖果般甜蜜绽放，深受大小朋友喜爱。',
    detail: '<p>🍭 <b>超级棒棒糖</b></p><p>💥 超大尺寸，震撼效果</p><p>💥 螺旋喷射，独特造型</p><p>💥 燃放持久，乐趣无穷</p><p>💥 每件30个，派对首选</p>'
  },
  {
    name: '网红棒棒糖',
    category: '娱乐类',
    spec: '20个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 20,
    costPrice: 10.5,
    supplyPrice: 14.3,
    suggestedPrice: 16.1,
    retailPrice: 20,
    image: '8网红棒棒糖.jpg',
    description: '抖音同款网红烟花，高颜值外观+绝美燃放效果。社交媒体爆款，拍照打卡必备，点亮你的朋友圈！',
    detail: '<p>📱 <b>网红棒棒糖</b></p><p>🔥 抖音爆款，全网热销</p><p>🔥 高颜值设计，出片神器</p><p>🔥 燃放绚丽，朋友圈必备</p><p>🔥 每件20个，时尚之选</p>'
  },
  {
    name: '王者无敌棒棒糖',
    category: '娱乐类',
    spec: '8个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 8,
    costPrice: 18.5,
    supplyPrice: 25.5,
    suggestedPrice: 28.8,
    retailPrice: 36,
    image: '9无敌棒棒糖.png',
    description: '顶配版棒棒糖，燃放效果无与伦比。超大火花，超长时间，超炫效果！专为追求极致体验的你打造。',
    detail: '<p>👑 <b>王者无敌棒棒糖</b></p><p>🏆 顶配品质，王者风范</p><p>🏆 超大火花，震撼视觉</p><p>🏆 燃放时长，傲视群雄</p><p>🏆 每件8个，尊享体验</p>'
  },

  // 彩花类（10个）
  {
    name: '精灵布布',
    category: '彩花类',
    spec: '16个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 16,
    costPrice: 13.0,
    supplyPrice: 17.8,
    suggestedPrice: 20.1,
    retailPrice: 25,
    image: '10精灵布布.png',
    description: '可爱精灵造型，喷射七彩火花。独特的旋转飞舞效果，如小精灵在空中跳舞，梦幻十足，儿童最爱！',
    detail: '<p>🧚 <b>精灵布布</b></p><p>✨ 可爱造型，萌趣十足</p><p>✨ 七彩喷射，梦幻飞舞</p><p>✨ 旋转效果，如精灵起舞</p><p>✨ 每件16个，童趣满满</p>'
  },
  {
    name: '水母派对',
    category: '彩花类',
    spec: '10个/20盒/1件',
    unit: '盒',
    purchaseUnit: '件',
    unitConversion: 20,
    costPrice: 5.5,
    supplyPrice: 7.7,
    suggestedPrice: 8.7,
    retailPrice: 11,
    image: '12水母派对.jpg',
    description: '海洋水母造型，蓝紫色火花优雅绽放。模拟水母在海中漂浮的姿态，浪漫唯美，适合海洋主题派对。',
    detail: '<p>🪼 <b>水母派对</b></p><p>🌊 海洋主题，浪漫唯美</p><p>🌊 蓝紫火花，优雅绽放</p><p>🌊 水母造型，独特创意</p><p>🌊 每盒10个，派对必备</p>'
  },
  {
    name: '星际水母带接驳器',
    category: '彩花类',
    spec: '10个/20盒/1件',
    unit: '盒',
    purchaseUnit: '件',
    unitConversion: 20,
    costPrice: 5.5,
    supplyPrice: 7.7,
    suggestedPrice: 8.7,
    retailPrice: 11,
    image: '13星际水母带接驳器.png',
    description: '升级版水母烟花，配备专属接驳器。可串联多个一起燃放，效果更加壮观，打造属于你的星际水母群！',
    detail: '<p>🛸 <b>星际水母带接驳器</b></p><p>⚡ 配专属接驳器</p><p>⚡ 可串联燃放</p><p>⚡ 效果加倍震撼</p><p>⚡ 每盒10个，科技感满满</p>'
  },
  {
    name: '蘑菇精灵',
    category: '彩花类',
    spec: '4个/30盒/1件',
    unit: '盒',
    purchaseUnit: '件',
    unitConversion: 30,
    costPrice: 10.0,
    supplyPrice: 13.6,
    suggestedPrice: 15.3,
    retailPrice: 19,
    image: '14 蘑菇精灵.jpg',
    description: '可爱蘑菇造型，顶部喷射彩色火花。如童话森林中的魔法蘑菇，五彩缤纷，充满奇幻色彩。',
    detail: '<p>🍄 <b>蘑菇精灵</b></p><p>🌈 童话造型，奇幻可爱</p><p>🌈 顶部喷射，五彩缤纷</p><p>🌈 魔法氛围，梦幻十足</p><p>🌈 每盒4个，品质之选</p>'
  },
  {
    name: '孔雀开屏',
    category: '彩花类',
    spec: '24个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 24,
    costPrice: 5.0,
    supplyPrice: 7.0,
    suggestedPrice: 7.9,
    retailPrice: 10,
    image: '15孔雀开屏.png',
    description: '模拟孔雀开屏的扇形喷射效果。金蓝绿三色火花交织，如孔雀羽毛般华丽绽放，优雅高贵。',
    detail: '<p>🦚 <b>孔雀开屏</b></p><p>💎 扇形喷射，华丽绽放</p><p>💎 金蓝绿三色交织</p><p>💎 如孔雀开屏，优雅高贵</p><p>💎 每件24个，超值装</p>'
  },
  {
    name: '飞天孔雀',
    category: '彩花类',
    spec: '12个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 12,
    costPrice: 31.5,
    supplyPrice: 42.9,
    suggestedPrice: 48.3,
    retailPrice: 60,
    image: '16飞天孔雀.png',
    description: '升级版孔雀烟花，带有升空效果。火花先升空再散开，如孔雀振翅高飞，气势磅礴，效果震撼！',
    detail: '<p>🦚 <b>飞天孔雀</b></p><p>🚀 升空绽放，气势磅礴</p><p>🚀 高空散开，如翅膀展开</p><p>🚀 效果震撼，众人瞩目</p><p>🚀 每件12个，高端之选</p>'
  },
  {
    name: '星空孔雀',
    category: '彩花类',
    spec: '20个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 20,
    costPrice: 17.5,
    supplyPrice: 24.1,
    suggestedPrice: 27.2,
    retailPrice: 34,
    image: '17星空孔雀.png',
    description: '夜空中最亮的星！银色火花如繁星点点，配合孔雀造型效果，打造专属你的璀璨星空。',
    detail: '<p>⭐ <b>星空孔雀</b></p><p>🌟 银色火花，繁星点点</p><p>🌟 星空主题，浪漫唯美</p><p>🌟 孔雀造型，优雅大方</p><p>🌟 每件20个，星光闪耀</p>'
  },
  {
    name: '炫彩三分钟',
    category: '彩花类',
    spec: '24个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 24,
    costPrice: 7.8,
    supplyPrice: 10.7,
    suggestedPrice: 12.1,
    retailPrice: 15,
    image: '18炫彩三分钟.png',
    description: '超长燃放时间，整整三分钟的精彩表演！多种颜色轮番登场，让快乐延续，适合大型庆典活动。',
    detail: '<p>⏱️ <b>炫彩三分钟</b></p><p>🎊 燃放时长3分钟</p><p>🎊 多色轮番绽放</p><p>🎊 持久精彩，乐趣无穷</p><p>🎊 每件24个，庆典首选</p>'
  },
  {
    name: '黄金三分钟',
    category: '彩花类',
    spec: '24个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 24,
    costPrice: 11.0,
    supplyPrice: 15.0,
    suggestedPrice: 16.9,
    retailPrice: 21,
    image: '19黄金三分钟.png',
    description: '尊贵金色火花，持续燃放三分钟。金光闪闪，富贵吉祥，新年春节、开业庆典的最佳选择！',
    detail: '<p>🌟 <b>黄金三分钟</b></p><p>👑 尊贵金色，富贵吉祥</p><p>👑 燃放时长3分钟</p><p>👑 新年开业，喜庆首选</p><p>👑 每件24个，金光闪耀</p>'
  },
  {
    name: '卡通系列—西游记',
    category: '彩花类',
    spec: '24个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 24,
    costPrice: 10.5,
    supplyPrice: 14.3,
    suggestedPrice: 16.1,
    retailPrice: 20,
    image: '20卡通西游记.png',
    description: '经典西游记卡通造型，孙悟空、唐僧、猪八戒、沙僧齐聚！陪伴孩子的童年，传承中华经典文化。',
    detail: '<p>🐵 <b>卡通系列—西游记</b></p><p>🎭 孙悟空造型，英勇无敌</p><p>🎭 经典IP，童年回忆</p><p>🎭 传承文化，寓教于乐</p><p>🎭 每件24个，收藏必备</p>'
  },

  // 网红加特林类（5个）
  {
    name: '迷你加特林',
    category: '网红加特林类',
    spec: '30个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 30,
    costPrice: 5.0,
    supplyPrice: 7.0,
    suggestedPrice: 7.9,
    retailPrice: 10,
    image: '23迷你加特林.jpg',
    description: '小巧便携的迷你加特林，抖音超火爆款！连续喷射效果如机关枪扫射，帅气十足，男孩最爱！',
    detail: '<p>🔫 <b>迷你加特林</b></p><p>💥 抖音爆款，超火单品</p><p>💥 连续喷射，帅气十足</p><p>💥 小巧便携，随时燃放</p><p>💥 每件30个，超值量贩</p>'
  },
  {
    name: '极速英雄加特林',
    category: '网红加特林类',
    spec: '12个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 12,
    costPrice: 11.0,
    supplyPrice: 15.0,
    suggestedPrice: 16.9,
    retailPrice: 21,
    image: '24极速英雄加特林.png',
    description: '超快喷射速度，火花如子弹般飞射而出！英雄主题设计，化身超级英雄，守护你的节日！',
    detail: '<p>🦸 <b>极速英雄加特林</b></p><p>⚡ 极速喷射，火花飞舞</p><p>⚡ 英雄主题，酷炫造型</p><p>⚡ 速度与激情的完美结合</p><p>⚡ 每件12个，英雄之选</p>'
  },
  {
    name: '幻影加特林',
    category: '网红加特林类',
    spec: '12个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 12,
    costPrice: 11.0,
    supplyPrice: 15.0,
    suggestedPrice: 16.9,
    retailPrice: 21,
    image: '25幻影加特林.png',
    description: '神秘幻影效果，火花颜色不断变换。如魔法般的视觉体验，让你沉浸在梦幻的烟花世界中。',
    detail: '<p>👻 <b>幻影加特林</b></p><p>🔮 幻影效果，神秘莫测</p><p>🔮 颜色变换，如梦似幻</p><p>🔮 魔法体验，沉浸其中</p><p>🔮 每件12个，梦幻之选</p>'
  },
  {
    name: '七彩加特林',
    category: '网红加特林类',
    spec: '8个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 8,
    costPrice: 24.0,
    supplyPrice: 32.8,
    suggestedPrice: 37.0,
    retailPrice: 46,
    image: '26 七彩风暴七彩魔方加特林.jpg',
    description: '七种颜色轮番喷射，如彩虹风暴席卷夜空！顶级加特林配置，燃放效果无与伦比，震撼全场！',
    detail: '<p>🌈 <b>七彩加特林</b></p><p>🎆 七色喷射，彩虹风暴</p><p>🎆 顶级配置，效果震撼</p><p>🎆 全场焦点，众人瞩目</p><p>🎆 每件8个，尊享品质</p>'
  },
  {
    name: '悟空加特林',
    category: '网红加特林类',
    spec: '12个/1件',
    unit: '个',
    purchaseUnit: '件',
    unitConversion: 12,
    costPrice: 9.5,
    supplyPrice: 13.3,
    suggestedPrice: 15.1,
    retailPrice: 19,
    image: '27悟空加特林.jpg',
    description: '齐天大圣主题加特林，金箍棒造型设计。大闹天宫般的火花效果，让你化身孙悟空，称霸夜空！',
    detail: '<p>🐒 <b>悟空加特林</b></p><p>🔥 齐天大圣，霸气登场</p><p>🔥 金箍棒造型，经典IP</p><p>🔥 大闹天宫，火花四射</p><p>🔥 每件12个，猴王之选</p>'
  },

  // 儿童套餐（1个）
  {
    name: '欢乐宝盒',
    category: '儿童套餐',
    spec: '24个/礼盒',
    unit: '礼盒',
    purchaseUnit: '礼盒',
    unitConversion: 1,
    costPrice: 270.0,
    supplyPrice: 368.0,
    suggestedPrice: 414.5,
    retailPrice: 515,
    image: '11 欢乐宝盒.png',
    description: '精选24款儿童安全烟花，礼盒装送礼佳品。包含多种造型，让孩子体验完整的烟花乐趣，安全放心！',
    detail: '<p>🎁 <b>欢乐宝盒</b></p><p>📦 精选24款，种类丰富</p><p>📦 礼盒包装，送礼佳品</p><p>📦 儿童安全，家长放心</p><p>📦 一盒搞定，欢乐无限</p>'
  },

  // 家用礼花（1个）
  {
    name: '20发缤纷溢彩',
    category: '家用礼花',
    spec: '1份/箱',
    unit: '箱',
    purchaseUnit: '箱',
    unitConversion: 1,
    costPrice: 370.0,
    supplyPrice: 504.0,
    suggestedPrice: 567.6,
    retailPrice: 705,
    image: '28.缤纷溢彩20发.jpg',
    description: '专业级20发组合烟花，璀璨夜空的终极选择！连续升空绽放，五彩缤纷，适合新年、婚庆等大型庆典。',
    detail: '<p>🎆 <b>20发缤纷溢彩</b></p><p>💫 专业级组合烟花</p><p>💫 20发连续升空</p><p>💫 五彩缤纷，璀璨夺目</p><p>💫 大型庆典，震撼全场</p>'
  }
];

async function reuploadProducts() {
  try {
    console.log('=== 开始重新上架商品 ===\n');

    // 1. 删除现有商品
    const deleteResult = await prisma.product.deleteMany();
    console.log('删除现有商品:', deleteResult.count, '个');

    // 2. 获取或创建分类
    const neededCategories = ['娱乐类', '彩花类', '网红加特林类', '儿童套餐', '家用礼花'];
    const categoryMap = {};

    // 删除不需要的旧分类
    for (let i = 0; i < neededCategories.length; i++) {
      const name = neededCategories[i];
      let category = await prisma.category.findFirst({ where: { name } });
      if (!category) {
        category = await prisma.category.create({
          data: { name, sort: i + 1 }
        });
        console.log('创建分类:', name, '- ID:', category.id);
      } else {
        console.log('分类已存在:', name, '- ID:', category.id);
      }
      categoryMap[name] = category.id;
    }

    console.log('\n开始创建商品...\n');

    // 3. 创建商品
    let created = 0;
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      // 图片URL使用正确的编码
      const imageUrl = `/uploads/products/${encodeURIComponent(p.image)}`;

      const product = await prisma.product.create({
        data: {
          name: p.name,
          categoryId: categoryMap[p.category],
          description: p.description,
          images: JSON.stringify([imageUrl]),
          // 必填价格字段
          retailPrice: p.retailPrice,
          agentPrice: p.supplyPrice,
          wholesalePrice: p.supplyPrice,
          // 可选价格字段
          costPrice: p.costPrice,
          supplyPrice: p.supplyPrice,
          suggestedPrice: p.suggestedPrice,
          masterRetailPrice: p.retailPrice,
          minRetailPrice: p.supplyPrice,
          // 库存
          stock: 100,
          lockStock: 0,
          status: 'ACTIVE',
          // 单位
          unit: p.unit,
          sort: i + 1,
        }
      });

      console.log(`[${i + 1}/${products.length}] ${p.name} - ¥${p.retailPrice}/${p.unit} - ID:${product.id}`);
      created++;
    }

    console.log(`\n=== 商品上架完成 ===`);
    console.log(`创建商品: ${created} 个`);

    // 4. 验证
    const totalProducts = await prisma.product.count();
    const productsByCategory = await prisma.product.groupBy({
      by: ['categoryId'],
      _count: { id: true }
    });

    console.log(`\n数据库中商品总数: ${totalProducts}`);
    console.log('\n按分类统计:');
    for (const stat of productsByCategory) {
      const cat = await prisma.category.findUnique({ where: { id: stat.categoryId } });
      console.log(`  - ${cat.name}: ${stat._count.id} 个`);
    }

    await prisma.$disconnect();
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

reuploadProducts();
