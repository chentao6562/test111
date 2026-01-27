/**
 * 图片处理工具类
 * 统一处理图片JSON解析、验证
 * Phase 3 Task 3.3
 */

export class ImageHelper {
  /**
   * 对文件名中的特殊字符进行URL编码
   * 保留路径分隔符，只编码文件名部分的特殊字符
   * 【2026-01-17】修复：文件名包含&、=等特殊字符导致URL被截断
   */
  static encodeImageUrl(url: string): string {
    if (!url) return '';

    // 已经是完整URL（http开头）- 需要检查是否已编码
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // 分离路径和文件名
    const lastSlash = url.lastIndexOf('/');
    if (lastSlash === -1) {
      // 没有路径分隔符，整个就是文件名
      return encodeURIComponent(url);
    }

    const path = url.substring(0, lastSlash + 1);
    const filename = url.substring(lastSlash + 1);

    // 只编码文件名部分（如果文件名包含特殊字符）
    // 注意：如果已经编码过，不要重复编码
    if (filename.includes('%')) {
      // 可能已经编码过，直接返回
      return url;
    }

    return path + encodeURIComponent(filename);
  }

  /**
   * 解析图片JSON（安全处理）
   * @param imagesJson JSON字符串或已解析的数组
   * @returns 图片URL数组（已编码，可直接用于img src）
   */
  static parseImages(imagesJson: string | string[] | null | undefined): string[] {
    if (!imagesJson) {
      return [];
    }

    let urls: string[] = [];

    // 如果已经是数组，直接使用
    if (Array.isArray(imagesJson)) {
      urls = imagesJson.filter((url) => typeof url === 'string' && url.length > 0);
    } else if (typeof imagesJson === 'string') {
      // 如果是字符串，尝试解析
      const trimmed = imagesJson.trim();
      if (!trimmed) return [];

      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          urls = parsed.filter((url) => typeof url === 'string' && url.length > 0);
        } else if (typeof parsed === 'string' && parsed.length > 0) {
          // 如果解析结果是单个字符串，包装为数组
          urls = [parsed];
        }
      } catch {
        // JSON解析失败，尝试处理非标准格式
        // 格式如：[/uploads/xxx.jpg] 或 [/uploads/a.jpg,/uploads/b.jpg]
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          const inner = trimmed.slice(1, -1).trim();
          if (!inner) return [];
          urls = inner.split(',').map(s => s.trim()).filter(s => s && s.length > 0);
        } else if (trimmed.startsWith('http') || trimmed.startsWith('/') || trimmed.startsWith('uploads/')) {
          // 如果解析失败，检查是否是单个URL或路径
          urls = [trimmed];
        }
      }
    }

    // 对所有URL进行编码处理，确保特殊字符被正确编码
    return urls.map(url => this.encodeImageUrl(url));
  }

  /**
   * 获取第一张图片
   */
  static getFirstImage(imagesJson: string | string[] | null | undefined): string | null {
    const images = this.parseImages(imagesJson);
    return images.length > 0 ? images[0] : null;
  }

  /**
   * 获取指定位置的图片
   */
  static getImageAt(imagesJson: string | string[] | null | undefined, index: number): string | null {
    const images = this.parseImages(imagesJson);
    return images[index] ?? null;
  }

  /**
   * 验证图片URL格式
   */
  static validateImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // 支持相对路径（以/开头）和绝对路径（http/https）
    if (url.startsWith('/')) {
      return true;
    }

    // 检查是否是有效的URL
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 序列化图片数组为JSON
   */
  static stringifyImages(images: string[]): string {
    const validImages = images.filter((url) => this.validateImageUrl(url));
    return JSON.stringify(validImages);
  }

  /**
   * 添加图片到列表
   */
  static addImage(
    imagesJson: string | string[] | null | undefined,
    newImage: string
  ): string {
    const images = this.parseImages(imagesJson);
    if (this.validateImageUrl(newImage) && !images.includes(newImage)) {
      images.push(newImage);
    }
    return this.stringifyImages(images);
  }

  /**
   * 从列表删除图片
   */
  static removeImage(
    imagesJson: string | string[] | null | undefined,
    imageToRemove: string
  ): string {
    const images = this.parseImages(imagesJson);
    const filtered = images.filter((img) => img !== imageToRemove);
    return this.stringifyImages(filtered);
  }

  /**
   * 获取图片数量
   */
  static getImageCount(imagesJson: string | string[] | null | undefined): number {
    return this.parseImages(imagesJson).length;
  }

  /**
   * 判断是否有图片
   */
  static hasImages(imagesJson: string | string[] | null | undefined): boolean {
    return this.getImageCount(imagesJson) > 0;
  }

  /**
   * 获取默认占位图
   */
  static getPlaceholderImage(): string {
    return '/images/placeholder.png';
  }

  /**
   * 获取图片URL（如果没有则返回占位图）
   */
  static getImageOrPlaceholder(imagesJson: string | string[] | null | undefined): string {
    const firstImage = this.getFirstImage(imagesJson);
    return firstImage || this.getPlaceholderImage();
  }
}
