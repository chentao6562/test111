// 阿里云SDK类型声明（简化版）
declare module '@alicloud/dysmsapi20170525' {
  export class Config {
    accessKeyId?: string;
    accessKeySecret?: string;
    endpoint?: string;
    constructor(config?: any);
  }

  export class SendSmsRequest {
    constructor(params: {
      phoneNumbers: string;
      signName: string;
      templateCode: string;
      templateParam: string;
    });
  }

  export default class Client {
    constructor(config: Config);
    sendSms(request: SendSmsRequest): Promise<{
      body: {
        code: string;
        message: string;
      };
    }>;
  }
}

declare module '@alicloud/openapi-client' {
  export class Config {
    accessKeyId?: string;
    accessKeySecret?: string;
    endpoint?: string;
    constructor(config?: any);
  }
}
