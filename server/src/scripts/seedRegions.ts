/**
 * 呼和浩特市区域数据导入脚本
 * 导入区县和乡镇/街道两级数据
 * @since 2026-01-21
 */
import prisma from '../utils/prisma';

// 呼和浩特市行政区划数据
// 数据来源：国家统计局行政区划代码（2023年版）
const regionData = [
  {
    name: '回民区',
    children: [
      '新华西路街道',
      '中山西路街道',
      '光明路街道',
      '海拉尔西路街道',
      '环河街街道',
      '通道街街道',
      '钢铁路街道',
      '攸攸板镇',
    ],
  },
  {
    name: '新城区',
    children: [
      '海东路街道',
      '锡林路街道',
      '中山东路街道',
      '东街街道',
      '西街街道',
      '东风路街道',
      '迎新路街道',
      '成吉思汗大街街道',
      '保合少镇',
    ],
  },
  {
    name: '玉泉区',
    children: [
      '小召前街街道',
      '兴隆巷街道',
      '长和廊街道',
      '石东路街道',
      '大南街街道',
      '鄂尔多斯路街道',
      '西菜园街道',
      '昭君路街道',
      '小黑河镇',
    ],
  },
  {
    name: '赛罕区',
    children: [
      '人民路街道',
      '大学西路街道',
      '乌兰察布路街道',
      '大学东路街道',
      '中专路街道',
      '昭乌达路街道',
      '巴彦镇',
      '榆林镇',
      '金河镇',
      '黄合少镇',
      '敕勒川镇',
    ],
  },
  {
    name: '土默特左旗',
    children: [
      '察素齐镇',
      '毕克齐镇',
      '善岱镇',
      '台阁牧镇',
      '白庙子镇',
      '沙尔沁镇',
      '北什轴乡',
      '塔布赛乡',
      '敕勒川镇（土左）',
    ],
  },
  {
    name: '托克托县',
    children: [
      '双河镇',
      '新营子镇',
      '五申镇',
      '伍什家镇',
      '古城镇',
    ],
  },
  {
    name: '和林格尔县',
    children: [
      '城关镇',
      '盛乐镇',
      '新店子镇',
      '舍必崖乡',
      '大红城乡',
      '羊群沟乡',
      '黑老夭乡',
    ],
  },
  {
    name: '清水河县',
    children: [
      '城关镇（清水河）',
      '宏河镇',
      '喇嘛湾镇',
      '窑沟乡',
      '北堡乡',
      '韭菜庄乡',
      '五良太乡',
    ],
  },
  {
    name: '武川县',
    children: [
      '可镇',
      '哈乐镇',
      '西乌兰不浪镇',
      '大青山乡',
      '上秃亥乡',
      '得胜沟乡',
      '二份子乡',
      '耗赖山乡',
    ],
  },
];

async function seedRegions() {
  console.log('开始导入呼和浩特市区域数据...');

  // 先检查是否已有数据
  const existingCount = await prisma.region.count();
  if (existingCount > 0) {
    console.log(`区域表已有 ${existingCount} 条数据，跳过导入`);
    console.log('如需重新导入，请先清空 regions 表');
    return;
  }

  let districtOrder = 0;
  let totalTowns = 0;

  for (const district of regionData) {
    districtOrder += 1;

    // 创建区县（level=1）
    const createdDistrict = await prisma.region.create({
      data: {
        name: district.name,
        level: 1,
        sortOrder: districtOrder,
        isActive: true,
      },
    });
    console.log(`✓ 创建区县: ${district.name} (ID: ${createdDistrict.id})`);

    // 创建乡镇/街道（level=2）
    let townOrder = 0;
    for (const townName of district.children) {
      townOrder += 1;
      totalTowns += 1;

      await prisma.region.create({
        data: {
          name: townName,
          parentId: createdDistrict.id,
          level: 2,
          sortOrder: townOrder,
          isActive: true,
        },
      });
    }
    console.log(`  └─ 创建 ${district.children.length} 个乡镇/街道`);
  }

  console.log('');
  console.log('========================================');
  console.log(`导入完成！共 ${regionData.length} 个区县，${totalTowns} 个乡镇/街道`);
  console.log('========================================');
}

// 执行导入
seedRegions()
  .catch((error) => {
    console.error('导入失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
