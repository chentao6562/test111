import { Request, Response } from 'express';
import * as agentService from '../services/agentService';
import { success, error, validationError } from '../utils/response';
import { sanitizeName } from '../utils/sanitize';
import { parsePagination, parseId } from '../utils/controllerHelper';

// 【2026-01-17】有效的代理商类型，移除LEVEL3
const VALID_TYPES = ['LEVEL1', 'LEVEL2', 'WHOLESALE'];
// 有效的状态
const VALID_STATUSES = ['PENDING', 'ACTIVE', 'DISABLED'];

/**
 * 获取代理商列表
 * GET /api/admin/agents
 */
export async function getAgentList(req: Request, res: Response) {
  try {
    const { keyword, type, status, parentId } = req.query;
    const { page, pageSize } = parsePagination(req.query as any);

    // 类型验证
    if (type && !VALID_TYPES.includes(type as string)) {
      return validationError(res, '无效的代理商类型');
    }

    // 状态验证
    if (status && !VALID_STATUSES.includes(status as string)) {
      return validationError(res, '无效的状态');
    }

    const result = await agentService.findAll({
      page,
      pageSize,
      keyword: keyword as string,
      type: type as string,
      status: status as string,
      parentId: parentId ? parseInt(parentId as string, 10) : undefined,
    });

    return success(res, result, '获取成功');
  } catch (err: any) {
    console.error('获取代理商列表失败:', err);
    return error(res, '获取代理商列表失败');
  }
}

/**
 * 获取代理商详情
 * GET /api/admin/agents/:id
 */
export async function getAgentDetail(req: Request, res: Response) {
  try {
    const agentId = parseId(req.params.id, '代理商ID');
    const agent = await agentService.getAgentDetail(agentId);

    if (!agent) {
      return error(res, '代理商不存在', 404);
    }

    return success(res, agent, '获取成功');
  } catch (err: any) {
    console.error('获取代理商详情失败:', err);
    if (err.message.includes('无效的')) {
      return validationError(res, err.message);
    }
    return error(res, '获取代理商详情失败');
  }
}

/**
 * 创建代理商
 * POST /api/admin/agents
 */
export async function createAgent(req: Request, res: Response) {
  try {
    const { phone, password, name, type, parentId } = req.body;

    // 手机号验证
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return validationError(res, '请输入有效的手机号');
    }

    // 检查手机号是否已存在
    const existingAgent = await agentService.findByPhone(phone);
    if (existingAgent) {
      return validationError(res, '该手机号已注册');
    }

    // 密码验证（可选）
    if (password && (password.length < 6 || password.length > 20)) {
      return validationError(res, '密码长度应为6-20位');
    }

    // 类型验证
    if (type && !VALID_TYPES.includes(type)) {
      return validationError(res, '无效的代理商类型');
    }

    // 上级代理商验证
    if (parentId) {
      const parent = await agentService.findById(parentId);
      if (!parent) {
        return validationError(res, '上级推销员不存在');
      }
      // 【2026-01-17】检查层级限制，只有一级可以发展二级
      if (parent.type === 'LEVEL2') {
        return validationError(res, '二级推销员不能发展下级');
      }
      if (parent.type === 'WHOLESALE') {
        return validationError(res, '普通用户不能发展下级');
      }
    }

    const agent = await agentService.create({
      phone,
      password,
      name: name ? sanitizeName(name) : undefined,
      type,
      parentId,
    });

    // 排除密码返回
    const { password: _, ...agentWithoutPassword } = agent;

    res.status(201);
    return success(res, agentWithoutPassword, '创建成功');
  } catch (err: any) {
    console.error('创建代理商失败:', err);
    return error(res, '创建代理商失败');
  }
}

// 有效的分润方式
const VALID_COMMISSION_METHODS = ['RATE', 'PRICE_DIFF'];

/**
 * 更新代理商
 * PUT /api/admin/agents/:id
 */
export async function updateAgent(req: Request, res: Response) {
  try {
    const agentId = parseId(req.params.id, '代理商ID');
    const { name, avatar, type, status, parentId, commissionMethod } = req.body;

    // 检查代理商是否存在
    const existingAgent = await agentService.findById(agentId);
    if (!existingAgent) {
      return error(res, '代理商不存在', 404);
    }

    // 类型验证
    if (type && !VALID_TYPES.includes(type)) {
      return validationError(res, '无效的代理商类型');
    }

    // 状态验证
    if (status && !VALID_STATUSES.includes(status)) {
      return validationError(res, '无效的状态');
    }

    // 分润方式验证
    if (commissionMethod && !VALID_COMMISSION_METHODS.includes(commissionMethod)) {
      return validationError(res, '无效的分润方式');
    }

    // 上级代理商验证
    if (parentId !== undefined && parentId !== null) {
      if (parentId === agentId) {
        return validationError(res, '不能将自己设为上级');
      }
      const parent = await agentService.findById(parentId);
      if (!parent) {
        return validationError(res, '上级代理商不存在');
      }
      // 【2026-01-22 性能优化】检查是否形成循环，限制最大深度防止死循环
      let current = parent;
      let depth = 0;
      const MAX_DEPTH = 10; // 系统最多3层，设置10层作为安全阈值
      while (current.parentId && depth < MAX_DEPTH) {
        if (current.parentId === agentId) {
          return validationError(res, '不能形成循环上下级关系');
        }
        const nextParent = await agentService.findById(current.parentId);
        if (!nextParent) break;
        current = nextParent;
        depth++;
      }
      if (depth >= MAX_DEPTH) {
        console.warn(`[agentController] 循环检查达到最大深度${MAX_DEPTH}，可能存在数据异常`);
      }
    }

    const agent = await agentService.update(agentId, {
      name,
      avatar,
      type,
      status,
      parentId,
      commissionMethod,
    });

    // 排除密码返回
    const { password: _, ...agentWithoutPassword } = agent;

    return success(res, agentWithoutPassword, '更新成功');
  } catch (err: any) {
    console.error('更新代理商失败:', err);
    if (err.message.includes('无效的')) {
      return validationError(res, err.message);
    }
    return error(res, '更新代理商失败');
  }
}

/**
 * 更新代理商状态
 * PUT /api/admin/agents/:id/status
 */
export async function updateAgentStatus(req: Request, res: Response) {
  try {
    const agentId = parseId(req.params.id, '代理商ID');
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return validationError(res, '无效的状态');
    }

    // 检查代理商是否存在
    const existingAgent = await agentService.findById(agentId);
    if (!existingAgent) {
      return error(res, '代理商不存在', 404);
    }

    const agent = await agentService.updateStatus(agentId, status);

    // 排除密码返回
    const { password: _, ...agentWithoutPassword } = agent;

    return success(res, agentWithoutPassword, '状态更新成功');
  } catch (err: any) {
    console.error('更新代理商状态失败:', err);
    if (err.message.includes('无效的')) {
      return validationError(res, err.message);
    }
    return error(res, '更新代理商状态失败');
  }
}

/**
 * 获取代理商下级团队
 * GET /api/admin/agents/:id/team
 */
export async function getAgentTeam(req: Request, res: Response) {
  try {
    const agentId = parseId(req.params.id, '代理商ID');
    const { type } = req.query;
    const { page, pageSize } = parsePagination(req.query as any);

    // 检查代理商是否存在
    const existingAgent = await agentService.findById(agentId);
    if (!existingAgent) {
      return error(res, '代理商不存在', 404);
    }

    const result = await agentService.getTeam(agentId, {
      page,
      pageSize,
      type: type as string,
    });

    return success(res, result, '获取成功');
  } catch (err: any) {
    console.error('获取代理商团队失败:', err);
    if (err.message.includes('无效的')) {
      return validationError(res, err.message);
    }
    return error(res, '获取代理商团队失败');
  }
}

/**
 * 删除代理商
 * DELETE /api/admin/agents/:id
 */
export async function deleteAgent(req: Request, res: Response) {
  try {
    const agentId = parseId(req.params.id, '代理商ID');

    // 检查代理商是否存在
    const existingAgent = await agentService.findById(agentId);
    if (!existingAgent) {
      return error(res, '代理商不存在', 404);
    }

    await agentService.remove(agentId);

    return success(res, null, '删除成功');
  } catch (err: any) {
    console.error('删除代理商失败:', err);
    // 返回具体错误信息
    if (err.message.includes('下级成员') || err.message.includes('未完成订单') || err.message.includes('无效的')) {
      return validationError(res, err.message);
    }
    return error(res, '删除代理商失败');
  }
}

/**
 * 获取代理商统计数据
 * GET /api/admin/agents/statistics
 */
export async function getAgentStatistics(req: Request, res: Response) {
  try {
    const statistics = await agentService.getStatistics();
    return success(res, statistics, '获取成功');
  } catch (err: any) {
    console.error('获取代理商统计失败:', err);
    return error(res, '获取代理商统计失败');
  }
}

/**
 * 重置代理商密码
 * PUT /api/admin/agents/:id/password
 */
export async function resetAgentPassword(req: Request, res: Response) {
  try {
    const agentId = parseId(req.params.id, '代理商ID');
    const { password } = req.body;

    if (!password || password.length < 6 || password.length > 20) {
      return validationError(res, '密码长度应为6-20位');
    }

    // 检查代理商是否存在
    const existingAgent = await agentService.findById(agentId);
    if (!existingAgent) {
      return error(res, '代理商不存在', 404);
    }

    await agentService.updatePassword(agentId, password);

    return success(res, null, '密码重置成功');
  } catch (err: any) {
    console.error('重置代理商密码失败:', err);
    if (err.message.includes('无效的')) {
      return validationError(res, err.message);
    }
    return error(res, '重置代理商密码失败');
  }
}

export default {
  getAgentList,
  getAgentDetail,
  createAgent,
  updateAgent,
  updateAgentStatus,
  getAgentTeam,
  deleteAgent,
  getAgentStatistics,
  resetAgentPassword,
};
