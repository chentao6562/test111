/**
 * 微信JSSDK服务
 * 用于生成分享配置签名
 * @since 2026-01-28
 */

import crypto from 'crypto';

// 微信API响应类型
interface WxAccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface WxJsapiTicketResponse {
  ticket?: string;
  expires_in?: number;
  errcode: number;
  errmsg?: string;
}

// 缓存access_token和jsapi_ticket
let accessTokenCache: { token: string; expireAt: number } | null = null;
let jsapiTicketCache: { ticket: string; expireAt: number } | null = null;

const WX_APPID = process.env.WX_APPID || '';
const WX_APPSECRET = process.env.WX_APPSECRET || '';

/**
 * 获取access_token（带缓存）
 */
async function getAccessToken(): Promise<string> {
  // 检查缓存是否有效
  if (accessTokenCache && Date.now() < accessTokenCache.expireAt) {
    return accessTokenCache.token;
  }

  if (!WX_APPID || !WX_APPSECRET) {
    throw new Error('微信公众号配置缺失');
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APPID}&secret=${WX_APPSECRET}`;

  const response = await fetch(url);
  const data = (await response.json()) as WxAccessTokenResponse;

  if (data.errcode) {
    throw new Error(`获取access_token失败: ${data.errmsg}`);
  }

  if (!data.access_token || !data.expires_in) {
    throw new Error('获取access_token失败: 响应数据不完整');
  }

  // 缓存，提前5分钟过期
  accessTokenCache = {
    token: data.access_token,
    expireAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  return data.access_token;
}

/**
 * 获取jsapi_ticket（带缓存）
 */
async function getJsapiTicket(): Promise<string> {
  // 检查缓存是否有效
  if (jsapiTicketCache && Date.now() < jsapiTicketCache.expireAt) {
    return jsapiTicketCache.ticket;
  }

  const accessToken = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${accessToken}&type=jsapi`;

  const response = await fetch(url);
  const data = (await response.json()) as WxJsapiTicketResponse;

  if (data.errcode !== 0) {
    throw new Error(`获取jsapi_ticket失败: ${data.errmsg}`);
  }

  if (!data.ticket || !data.expires_in) {
    throw new Error('获取jsapi_ticket失败: 响应数据不完整');
  }

  // 缓存，提前5分钟过期
  jsapiTicketCache = {
    ticket: data.ticket,
    expireAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  return data.ticket;
}

/**
 * 生成JSSDK配置签名
 */
export async function getJssdkConfig(url: string): Promise<{
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
}> {
  if (!WX_APPID || !WX_APPSECRET) {
    throw new Error('微信公众号配置缺失，请联系管理员');
  }

  const jsapiTicket = await getJsapiTicket();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);

  // 生成签名
  const str = `jsapi_ticket=${jsapiTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  const signature = crypto.createHash('sha1').update(str).digest('hex');

  return {
    appId: WX_APPID,
    timestamp,
    nonceStr,
    signature,
  };
}

/**
 * 检查微信配置是否可用
 */
export function isWechatConfigured(): boolean {
  return !!(WX_APPID && WX_APPSECRET);
}
