import { registerAs } from '@nestjs/config';

/**
 * 应用配置
 */
export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  // uniCloud配置
  unicloud: {
    spaceId: process.env.UNICLOUD_SPACE_ID || '',
    clientSecret: process.env.UNICLOUD_CLIENT_SECRET || '',
    requestUrl: process.env.UNICLOUD_REQUEST_URL || 'https://api.next.bspapp.com',
  },

  // OSS配置
  oss: {
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    bucket: process.env.OSS_BUCKET || '',
    region: process.env.OSS_REGION || '',
    endpoint: process.env.OSS_ENDPOINT || '',
  },
}));
