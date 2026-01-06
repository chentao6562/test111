import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from '../../common/filters/business.exception';
import { ErrorCode } from '../../common/utils/error-code.enum';
import * as OSS from 'ali-oss';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private ossClient: OSS | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initOSS();
  }

  private initOSS(): void {
    const accessKeyId = this.configService.get<string>('OSS_ACCESS_KEY_ID');
    const accessKeySecret = this.configService.get<string>('OSS_ACCESS_KEY_SECRET');
    const bucket = this.configService.get<string>('OSS_BUCKET');
    const region = this.configService.get<string>('OSS_REGION');

    if (accessKeyId && accessKeySecret && bucket && region) {
      this.ossClient = new OSS({
        accessKeyId,
        accessKeySecret,
        bucket,
        region,
      });
    }
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    this.validateFile(file);

    // 如果没有配置OSS，使用本地存储模拟
    if (!this.ossClient) {
      return this.uploadToLocal(file);
    }

    return this.uploadToOSS(file);
  }

  async uploadImages(files: Express.Multer.File[]): Promise<string[]> {
    const urls: string[] = [];

    for (const file of files) {
      const url = await this.uploadImage(file);
      urls.push(url);
    }

    return urls;
  }

  private validateFile(file: Express.Multer.File): void {
    // 检查文件大小 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BusinessException(ErrorCode.PARAM_ERROR, '文件大小不能超过10MB');
    }

    // 检查文件类型
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BusinessException(ErrorCode.PARAM_ERROR, '只允许上传jpg、png、gif、webp格式的图片');
    }
  }

  private async uploadToOSS(file: Express.Multer.File): Promise<string> {
    const ext = file.originalname.split('.').pop() || 'jpg';
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const filename = `uploads/${year}/${month}/${day}/${uuidv4()}.${ext}`;

    try {
      const result = await this.ossClient!.put(filename, file.buffer);
      return result.url;
    } catch (error) {
      throw new BusinessException(ErrorCode.UPLOAD_ERROR, '上传文件失败');
    }
  }

  private uploadToLocal(file: Express.Multer.File): string {
    // 本地存储模拟，实际返回一个模拟URL
    const ext = file.originalname.split('.').pop() || 'jpg';
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const filename = `${uuidv4()}.${ext}`;

    // 返回模拟的本地URL
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return `${baseUrl}/uploads/${year}/${month}/${day}/${filename}`;
  }
}
