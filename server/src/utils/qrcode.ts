import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * 提货二维码工具
 * 支持动态刷新防截图机制
 */

// 二维码密钥（用于签名验证）
const QR_SECRET = process.env.JWT_SECRET || 'firework-qr-secret-2026';

// 二维码有效期（秒）
const QR_EXPIRY = 60; // 60秒后需要刷新

/**
 * 生成动态提货码数据
 * 格式: orderNo:pickupCode:timestamp:signature
 * @param orderNo 订单号
 * @param pickupCode 提货码
 * @param phoneLastFour 手机尾号（用于核验）
 */
export function generateDynamicPickupData(
  orderNo: string,
  pickupCode: string,
  phoneLastFour: string
): {
  data: string;
  timestamp: number;
  expiresAt: number;
  phoneLastFour: string;
} {
  const timestamp = Math.floor(Date.now() / 1000);
  const expiresAt = timestamp + QR_EXPIRY;

  // 生成签名
  const signData = `${orderNo}:${pickupCode}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(signData)
    .digest('hex')
    .substring(0, 16); // 取前16位

  // 完整数据
  const data = `${orderNo}|${pickupCode}|${timestamp}|${signature}`;

  return {
    data,
    timestamp,
    expiresAt,
    phoneLastFour
  };
}

/**
 * 验证动态提货码
 * @param qrData 二维码数据
 * @returns 验证结果
 */
export function verifyDynamicPickupData(qrData: string): {
  valid: boolean;
  expired: boolean;
  orderNo?: string;
  pickupCode?: string;
  message?: string;
} {
  try {
    const parts = qrData.split('|');
    if (parts.length !== 4) {
      return { valid: false, expired: false, message: '二维码格式无效' };
    }

    const [orderNo, pickupCode, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    const now = Math.floor(Date.now() / 1000);

    // 验证签名
    const signData = `${orderNo}:${pickupCode}:${timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', QR_SECRET)
      .update(signData)
      .digest('hex')
      .substring(0, 16);

    if (signature !== expectedSignature) {
      return { valid: false, expired: false, message: '二维码签名无效' };
    }

    // 检查是否过期（允许5分钟的宽限期，防止网络延迟）
    const GRACE_PERIOD = 300; // 5分钟宽限期
    if (now - timestamp > QR_EXPIRY + GRACE_PERIOD) {
      return {
        valid: false,
        expired: true,
        orderNo,
        pickupCode,
        message: '二维码已过期，请让客户刷新'
      };
    }

    return {
      valid: true,
      expired: false,
      orderNo,
      pickupCode
    };
  } catch (error) {
    return { valid: false, expired: false, message: '二维码解析失败' };
  }
}

/**
 * 生成二维码图片（Base64）
 * @param data 二维码内容
 * @param options 选项
 */
export async function generateQRCodeImage(
  data: string,
  options?: {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }
): Promise<string> {
  const defaultOptions = {
    width: 280,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  };

  const qrOptions = {
    ...defaultOptions,
    ...options,
    color: {
      ...defaultOptions.color,
      ...options?.color
    }
  };

  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: qrOptions.width,
      margin: qrOptions.margin,
      color: qrOptions.color
    });
    return qrDataUrl;
  } catch (error) {
    console.error('[QRCode] 生成二维码失败:', error);
    throw new Error('生成二维码失败');
  }
}

/**
 * 生成完整的提货二维码响应数据
 * @param orderNo 订单号
 * @param pickupCode 提货码
 * @param phoneLastFour 手机尾号
 */
export async function generatePickupQRCode(
  orderNo: string,
  pickupCode: string,
  phoneLastFour: string
): Promise<{
  qrImage: string;
  data: string;
  timestamp: number;
  expiresAt: number;
  phoneLastFour: string;
  refreshInterval: number;
}> {
  // 生成动态数据
  const dynamicData = generateDynamicPickupData(orderNo, pickupCode, phoneLastFour);

  // 生成二维码图片
  const qrImage = await generateQRCodeImage(dynamicData.data);

  return {
    qrImage,
    data: dynamicData.data,
    timestamp: dynamicData.timestamp,
    expiresAt: dynamicData.expiresAt,
    phoneLastFour: dynamicData.phoneLastFour,
    refreshInterval: QR_EXPIRY * 1000 // 毫秒
  };
}

/**
 * 从二维码数据中提取提货码（用于手动输入场景）
 * 支持6位旧提货码和8位新提货码
 */
export function extractPickupCode(qrDataOrCode: string): string {
  // 如果是纯数字（6位或8位提货码），直接返回
  if (/^\d{6}$/.test(qrDataOrCode) || /^\d{8}$/.test(qrDataOrCode)) {
    return qrDataOrCode;
  }

  // 尝试从二维码数据中提取
  const parts = qrDataOrCode.split('|');
  if (parts.length >= 2) {
    return parts[1]; // pickupCode
  }

  return qrDataOrCode;
}

export default {
  generateDynamicPickupData,
  verifyDynamicPickupData,
  generateQRCodeImage,
  generatePickupQRCode,
  extractPickupCode
};
