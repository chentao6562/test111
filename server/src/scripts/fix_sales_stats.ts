import prisma from "../utils/prisma";

async function fixSalesStats() {
  console.log("修复推销员销售统计数据...\n");

  // 获取所有已完成的预约
  const completedReservations = await prisma.reservation.findMany({
    where: {
      status: 3,
      salespersonLevel: { gt: 0 }
    },
    select: {
      id: true,
      reservationNo: true,
      totalAmount: true,
      salespersonId: true,
      salespersonLevel: true,
      parentSalespersonId: true,
    }
  });

  console.log("找到已完成预约:", completedReservations.length, "单\n");

  // 统计每个推销员的销售数据
  const agentStats = new Map<number, { totalSales: number; totalOrderCount: number }>();
  const teamStats = new Map<number, { teamSales: number; monthlyTeamSales: number }>();

  for (const r of completedReservations) {
    if (!r.salespersonId) continue;

    const amount = Number(r.totalAmount);
    const spId: number = r.salespersonId as number;

    // 更新来源推销员统计
    const current = agentStats.get(spId) || { totalSales: 0, totalOrderCount: 0 };
    current.totalSales += amount;
    current.totalOrderCount += 1;
    agentStats.set(spId, current);

    // 如果是二级推销员，更新一级的团队统计
    if (r.salespersonLevel === 2 && r.parentSalespersonId) {
      const parentId: number = r.parentSalespersonId as number;
      const teamCurrent = teamStats.get(parentId) || { teamSales: 0, monthlyTeamSales: 0 };
      teamCurrent.teamSales += amount;
      teamCurrent.monthlyTeamSales += amount;
      teamStats.set(parentId, teamCurrent);
    }
  }

  // 更新数据库
  console.log("更新推销员个人销售统计:");
  for (const entry of agentStats.entries()) {
    const agentId = entry[0];
    const stats = entry[1];
    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { name: true } });
    console.log("  " + (agent?.name || "未知") + "(ID:" + agentId + "): 销售额=" + stats.totalSales + ", 订单数=" + stats.totalOrderCount);

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        totalSales: stats.totalSales,
        totalOrderCount: stats.totalOrderCount,
      }
    });
  }

  console.log("\n更新一级推销员团队销售统计:");
  for (const entry of teamStats.entries()) {
    const agentId = entry[0];
    const stats = entry[1];
    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { name: true } });
    console.log("  " + (agent?.name || "未知") + "(ID:" + agentId + "): 团队销售额=" + stats.teamSales);

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        teamSales: stats.teamSales,
        monthlyTeamSales: stats.monthlyTeamSales,
      }
    });
  }

  console.log("\n修复完成!");

  // 验证
  console.log("\n验证推销员统计:");
  const agents = await prisma.agent.findMany({
    where: {
      OR: [{ type: "LEVEL1" }, { type: "LEVEL2" }],
      totalSales: { gt: 0 }
    },
    select: { name: true, type: true, totalSales: true, totalOrderCount: true, teamSales: true }
  });
  for (const a of agents) {
    console.log(a.name + "(" + a.type + "): 个人销售=" + Number(a.totalSales) + " 订单数=" + a.totalOrderCount + " 团队销售=" + Number(a.teamSales));
  }

  await prisma.$disconnect();
}

fixSalesStats().catch(console.error);
