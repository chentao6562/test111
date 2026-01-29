/**
 * 微信JSSDK控制器
 * @since 2026-01-28
 */

import { Request, Response } from 'express';
import { getJssdkConfig, isWechatConfigured } from '../services/wechatService';

/**
 * 获取JSSDK配置（用于分享）
 * GET /api/wechat/jssdk-config?url=xxx
 */
export async function getJssdkConfigHandler(req: Request, res: Response) {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        code: 400,
        message: '缺少url参数',
      });
    }

    // 检查配置是否可用 - 【2026-01-29】未配置时静默失败，不返回错误
    if (!isWechatConfigured()) {
      return res.json({
        code: 0,
        data: null,  // 返回空数据，前端会静默处理
      });
    }

    const config = await getJssdkConfig(url);

    return res.json({
      code: 0,
      data: config,
    });
  } catch (error: any) {
    console.error('获取JSSDK配置失败:', error);
    return res.status(500).json({
      code: 500,
      message: error.message || '获取配置失败',
    });
  }
}
