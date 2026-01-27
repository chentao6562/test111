import { smsConfig, getTemplateCode } from '../config/sms';

// 动态导入阿里云SDK（避免在未安装时报错）
let Dysmsapi20170525: any = null;
let OpenApi: any = null;

// 【2026-01-22 线程安全修复】使用Promise确保初始化只执行一次
let clientPromise: Promise<any> | null = null;

// 【2026-01-22 重试配置】
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,  // 初始延迟1秒
  maxDelayMs: 5000,   // 最大延迟5秒
};

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 计算重试延迟（指数退避）
 */
function getRetryDelay(attempt: number): number {
  const delayMs = Math.min(
    RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
    RETRY_CONFIG.maxDelayMs
  );
  // 添加随机抖动（±20%）
  const jitter = delayMs * 0.2 * (Math.random() - 0.5);
  return Math.floor(delayMs + jitter);
}

/**
 * 初始化阿里云SMS客户端（线程安全）
 */
async function initClient(): Promise<any> {
  // 如果已经有初始化Promise，直接返回
  if (clientPromise) {
    return clientPromise;
  }

  // 创建初始化Promise
  clientPromise = (async () => {
    if (!Dysmsapi20170525 || !OpenApi) {
      try {
        Dysmsapi20170525 = await import('@alicloud/dysmsapi20170525');
        OpenApi = await import('@alicloud/openapi-client');
      } catch (error) {
        console.warn('[AliSMS] 阿里云短信SDK未安装，将使用测试模式');
        return null;
      }
    }

    const config = new OpenApi.Config({
      accessKeyId: smsConfig.accessKeyId,
      accessKeySecret: smsConfig.accessKeySecret,
    });
    config.endpoint = 'dysmsapi.aliyuncs.com';

    return new Dysmsapi20170525.default(config);
  })();

  return clientPromise;
}

let client: any = null;

/**
 * 发送短信验证码
 * @param phone 手机号
 * @param code 验证码
 * @param type 场景类型（LOGIN/REGISTER/RESET_PASSWORD）
 * @returns 是否发送成功
 */
export async function sendSms(phone: string, code: string, type: string = 'LOGIN'): Promise<{ success: boolean; message: string }> {
  // 测试模式（安全起见不打印验证码）
  if (!smsConfig.enabled) {
    console.log(`[AliSMS] 测试模式 - 手机号: ${maskPhone(phone)}, 场景: ${type}`);
    return { success: true, message: '验证码已发送（测试模式）' };
  }

  // 获取对应场景的模板CODE
  const templateCode = getTemplateCode(type);

  // 检查配置
  if (!smsConfig.accessKeyId || !smsConfig.accessKeySecret || !templateCode) {
    console.error(`[AliSMS] 配置不完整，场景: ${type}, 模板CODE: ${templateCode || '未配置'}`);
    return { success: false, message: '短信服务配置错误' };
  }

  // 【2026-01-22 重试机制】带重试的发送逻辑
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // 初始化客户端（线程安全）
      if (!client) {
        client = await initClient();
        if (!client) {
          console.error('[AliSMS] 无法初始化客户端');
          return { success: false, message: '短信服务初始化失败' };
        }
      }

      // 构建请求
      const request = new Dysmsapi20170525.SendSmsRequest({
        phoneNumbers: phone,
        signName: smsConfig.signName,
        templateCode: templateCode,
        templateParam: JSON.stringify({ code }),
      });

      if (attempt > 0) {
        console.log(`[AliSMS] 重试发送(${attempt}/${RETRY_CONFIG.maxRetries}) - 手机号: ${maskPhone(phone)}, 场景: ${type}`);
      } else {
        console.log(`[AliSMS] 发送短信 - 手机号: ${maskPhone(phone)}, 场景: ${type}, 模板: ${templateCode}`);
      }

      // 发送短信
      const response = await client.sendSms(request);

      if (response.body.code === 'OK') {
        console.log(`[AliSMS] 发送成功 - 手机号: ${maskPhone(phone)}, 场景: ${type}`);
        return { success: true, message: '验证码已发送' };
      } else {
        // 业务错误不重试
        console.error(`[AliSMS] 发送失败: ${response.body.message}, 场景: ${type}`);
        return { success: false, message: response.body.message || '短信发送失败' };
      }
    } catch (error: any) {
      lastError = error;
      console.error(`[AliSMS] 发送异常(尝试${attempt + 1}): ${error.message}`);

      // 如果还有重试机会，等待后重试
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delayMs = getRetryDelay(attempt);
        console.log(`[AliSMS] ${delayMs}ms后重试...`);
        await delay(delayMs);
      }
    }
  }

  // 所有重试都失败
  console.error(`[AliSMS] 发送失败（已重试${RETRY_CONFIG.maxRetries}次）:`, lastError?.message);
  return { success: false, message: '短信服务异常，请稍后重试' };
}

/**
 * 发送通知短信（支持多参数模板）
 * @param phone 手机号
 * @param type 场景类型
 * @param params 模板参数对象
 * @returns 是否发送成功
 */
export async function sendNotifySms(
  phone: string,
  type: string,
  params: Record<string, string>
): Promise<{ success: boolean; message: string }> {
  // 测试模式
  if (!smsConfig.enabled) {
    console.log(`[AliSMS] 测试模式 - 通知短信 - 手机号: ${maskPhone(phone)}, 场景: ${type}, 参数:`, params);
    return { success: true, message: '短信已发送（测试模式）' };
  }

  // 获取对应场景的模板CODE
  const templateCode = getTemplateCode(type);

  // 检查配置
  if (!smsConfig.accessKeyId || !smsConfig.accessKeySecret || !templateCode) {
    console.error(`[AliSMS] 配置不完整，场景: ${type}, 模板CODE: ${templateCode || '未配置'}`);
    return { success: false, message: '短信服务配置错误' };
  }

  // 【2026-01-22 重试机制】带重试的发送逻辑
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // 初始化客户端（线程安全）
      if (!client) {
        client = await initClient();
        if (!client) {
          console.error('[AliSMS] 无法初始化客户端');
          return { success: false, message: '短信服务初始化失败' };
        }
      }

      // 构建请求
      const request = new Dysmsapi20170525.SendSmsRequest({
        phoneNumbers: phone,
        signName: smsConfig.signName,
        templateCode: templateCode,
        templateParam: JSON.stringify(params),
      });

      if (attempt > 0) {
        console.log(`[AliSMS] 重试发送通知(${attempt}/${RETRY_CONFIG.maxRetries}) - 手机号: ${maskPhone(phone)}, 场景: ${type}`);
      } else {
        console.log(`[AliSMS] 发送通知短信 - 手机号: ${maskPhone(phone)}, 场景: ${type}, 模板: ${templateCode}`);
      }

      // 发送短信
      const response = await client.sendSms(request);

      if (response.body.code === 'OK') {
        console.log(`[AliSMS] 发送成功 - 手机号: ${maskPhone(phone)}, 场景: ${type}`);
        return { success: true, message: '短信已发送' };
      } else {
        // 业务错误不重试
        console.error(`[AliSMS] 发送失败: ${response.body.message}, 场景: ${type}`);
        return { success: false, message: response.body.message || '短信发送失败' };
      }
    } catch (error: any) {
      lastError = error;
      console.error(`[AliSMS] 发送异常(尝试${attempt + 1}): ${error.message}`);

      // 如果还有重试机会，等待后重试
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delayMs = getRetryDelay(attempt);
        console.log(`[AliSMS] ${delayMs}ms后重试...`);
        await delay(delayMs);
      }
    }
  }

  // 所有重试都失败
  console.error(`[AliSMS] 发送失败（已重试${RETRY_CONFIG.maxRetries}次）:`, lastError?.message);
  return { success: false, message: '短信服务异常，请稍后重试' };
}

/**
 * 手机号脱敏
 */
function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return phone.substring(0, 3) + '****' + phone.substring(7);
}

export default {
  sendSms,
  sendNotifySms,
};
