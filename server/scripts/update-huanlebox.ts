/**
 * 更新欢乐宝盒产品描述
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const description = `精选24款儿童安全烟花，送人有面子，自用超省心。

【套餐内容】
1. 欢乐三分钟x1个
2. 孔雀开屏x1个
3. 238型儿童加特林x1根
4. 银色喷泉x1盒
5. 欢乐双层组合飞机x1盒
6. 俄罗斯转盘x1盒
7. 小金玉满堂x1盒
8. 欢乐霸王花x1盒
9. 欢乐开心果x1盒
10. 时光灯笼x1盒
11. 牛屎盆（网红）x1包
12. 欢乐冒险x1盒
13. 手持魔法棒x1包
14. 银丝瀑布x1盒
15. 让子弹飞x1盒
16. 50克锥形欢乐季x1盒
17. 欢乐四变色/财神棒x1排
18. 舞动红莲x1盒
19. 欢乐旋风x1盒
20. 乖乖宝贝x1盒
21. 甜蜜告白/欢乐恋曲x1枚
22. 欢乐童心x1个
23. 欢乐萌娃x1个
24. 欢乐糖果烟花x1盒

适用个人、孩子娱乐`;

  const result = await prisma.product.update({
    where: { id: 1122 },
    data: { description }
  });

  console.log('欢乐宝盒描述已更新:', result.name);
  await prisma.$disconnect();
}

main().catch(console.error);
