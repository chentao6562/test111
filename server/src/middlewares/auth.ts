import { Request, Response, NextFunction } from 'express';
import { extractToken, verifyToken, DecodedToken } from '../utils/jwt';
import { unauthorized, forbidden } from '../utils/response';

// 扩展Express Request类型
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

/**
 * 基础认证中间件
 * 验证token并将用户信息挂载到req.user
 */
function baseAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = extractToken(authHeader);

  if (!token) {
    unauthorized(res, '请先登录');
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    unauthorized(res, 'Token无效或已过期');
    return;
  }

  req.user = decoded;
  next();
}

/**
 * 代理商认证中间件
 * 验证token且类型必须是agent
 */
export function authAgent(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  baseAuth(req, res, () => {
    if (req.user?.type !== 'agent') {
      forbidden(res, '仅代理商可访问');
      return;
    }
    next();
  });
}

/**
 * 员工认证中间件（库管/货管）
 * 验证token且类型必须是staff，可选限制特定角色
 */
export function authStaff(allowedRoles?: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    baseAuth(req, res, () => {
      if (req.user?.type !== 'staff') {
        forbidden(res, '仅员工可访问');
        return;
      }

      // 如果指定了允许的角色，检查角色
      if (allowedRoles && allowedRoles.length > 0) {
        if (!req.user.role || !allowedRoles.includes(req.user.role)) {
          forbidden(res, '没有访问权限');
          return;
        }
      }

      next();
    });
  };
}

/**
 * 管理员认证中间件
 * 验证token且类型必须是admin
 */
export function authAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  baseAuth(req, res, () => {
    if (req.user?.type !== 'admin') {
      forbidden(res, '仅管理员可访问');
      return;
    }
    next();
  });
}

/**
 * 管理员认证中间件（支持角色限制）
 * 验证token且类型必须是admin，可选限制特定角色
 * 【2026-01-23】新增：用于客服等角色的权限控制
 */
export function authAdminWithRoles(allowedRoles?: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    baseAuth(req, res, () => {
      if (req.user?.type !== 'admin') {
        forbidden(res, '仅管理员可访问');
        return;
      }

      // 如果指定了允许的角色，检查角色
      if (allowedRoles && allowedRoles.length > 0) {
        if (!req.user.role || !allowedRoles.includes(req.user.role)) {
          forbidden(res, '没有访问权限');
          return;
        }
      }

      next();
    });
  };
}

/**
 * 通用认证中间件
 * 仅验证token有效性，不限制用户类型
 */
export function authRequired(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  baseAuth(req, res, next);
}

/**
 * 可选认证中间件
 * 如果提供了token则验证，但不强制要求
 */
export function authOptional(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = extractToken(authHeader);

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
}

export default {
  authAgent,
  authStaff,
  authAdmin,
  authAdminWithRoles,
  authRequired,
  authOptional,
};
