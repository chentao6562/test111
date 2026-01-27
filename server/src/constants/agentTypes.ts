/**
 * 代理商类型常量
 *
 * 用于统一管理代理商类型字符串，避免硬编码
 * Phase 1 Task 1.3
 */

// 代理商类型枚举
// 【2026-01-17】清理LEVEL3，系统只保留三个层级：总代理、一级推销员、二级推销员
export const AGENT_TYPE = {
  LEVEL1: 'LEVEL1',
  LEVEL2: 'LEVEL2',
  WHOLESALE: 'WHOLESALE',
} as const;

export type AgentType = typeof AGENT_TYPE[keyof typeof AGENT_TYPE];

// 代理商类型显示名称
export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  [AGENT_TYPE.LEVEL1]: '一级推销员',
  [AGENT_TYPE.LEVEL2]: '二级推销员',
  [AGENT_TYPE.WHOLESALE]: '普通用户',
};

// 代理商等级（数值表示，用于比较）
export const AGENT_LEVEL: Record<AgentType, number> = {
  [AGENT_TYPE.LEVEL1]: 1,
  [AGENT_TYPE.LEVEL2]: 2,
  [AGENT_TYPE.WHOLESALE]: 0, // 普通用户不参与代理体系
};

// 可以发展下级的代理商类型（只有一级推销员可以发展二级）
export const CAN_DEVELOP_SUBORDINATES: AgentType[] = [
  AGENT_TYPE.LEVEL1,
];

// 参与分润体系的代理商类型
export const COMMISSION_ELIGIBLE_TYPES: AgentType[] = [
  AGENT_TYPE.LEVEL1,
  AGENT_TYPE.LEVEL2,
];

/**
 * 检查代理商是否可以发展下级
 */
export function canDevelopSubordinates(type: AgentType): boolean {
  return CAN_DEVELOP_SUBORDINATES.includes(type);
}

/**
 * 检查代理商是否参与分润
 */
export function isCommissionEligible(type: AgentType): boolean {
  return COMMISSION_ELIGIBLE_TYPES.includes(type);
}

/**
 * 根据上级代理商类型推断下级类型
 * 【2026-01-17】系统只保留两级推销员，一级可发展二级，二级不能发展下级
 */
export function inferSubordinateType(parentType: AgentType | null): AgentType {
  if (!parentType) {
    return AGENT_TYPE.WHOLESALE; // 无上级视为普通用户
  }

  switch (parentType) {
    case AGENT_TYPE.LEVEL1:
      return AGENT_TYPE.LEVEL2;
    case AGENT_TYPE.LEVEL2:
    case AGENT_TYPE.WHOLESALE:
      throw new Error('该代理商类型不能发展下级');
    default:
      return AGENT_TYPE.WHOLESALE;
  }
}

/**
 * 获取代理商等级差
 */
export function getAgentLevelDiff(type1: AgentType, type2: AgentType): number {
  return AGENT_LEVEL[type1] - AGENT_LEVEL[type2];
}
