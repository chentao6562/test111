import { Router } from 'express';
import {
  sendCodeHandler,
  phoneLoginHandler,
  passwordLoginHandler,
  registerHandler,
  getMeHandler,
  applyAgentHandler,
  bindSalespersonHandler,
} from '../controllers/authController';
import { authAgent } from '../middlewares/auth';
// 【P1-12修复】导入速率限制中间件
import { loginRateLimiter, smsRateLimiter } from '../middlewares/rateLimit';

const router = Router();

// 发送验证码（每分钟1次）
router.post('/send-code', smsRateLimiter, sendCodeHandler);

// 手机号验证码登录（每分钟5次）
router.post('/phone-login', loginRateLimiter, phoneLoginHandler);

// 密码登录（每分钟5次）
router.post('/password-login', loginRateLimiter, passwordLoginHandler);

// 注册（每分钟5次）
router.post('/register', loginRateLimiter, registerHandler);

// 获取当前用户信息（需要认证）
router.get('/me', authAgent, getMeHandler);

// 批发商申请成为代理商（需要认证）
router.post('/apply-agent', authAgent, applyAgentHandler);

// 【2026-01-20新增】已登录WHOLESALE用户绑定推销员（需要认证）
router.post('/bind-salesperson', authAgent, bindSalespersonHandler);

export default router;
