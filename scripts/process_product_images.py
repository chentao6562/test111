# -*- coding: utf-8 -*-
"""
产品图片处理脚本
功能：去除水印、二维码，裁剪留白，输出电商主图
"""

import os
import re
from PIL import Image
from pathlib import Path

# 配置
BASE_DIR = Path(r"c:\Users\Administrator\Desktop\烟花6")
INPUT_DIRS = [
    BASE_DIR / "产品图片" / "线上烟花图",
    BASE_DIR / "产品图片" / "解压临时",  # 递归搜索解压目录
]
OUTPUT_DIR = BASE_DIR / "修改后图片"
OUTPUT_SIZE = (800, 800)
JPEG_QUALITY = 95

# 图片扩展名
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}

def extract_product_name(filename):
    """从文件名提取商品名称，去除编号前缀"""
    name = Path(filename).stem

    # 去除常见的编号前缀模式
    # 模式1: "1棒棒糖" -> "棒棒糖"
    # 模式2: "1.棒棒糖" -> "棒棒糖"
    # 模式3: "27悟空加特林" -> "悟空加特林"
    # 模式4: "2.18寸仙女棒" -> "18寸仙女棒"
    # 模式5: "32.60发发财树" -> "60发发财树"

    # 先处理带价格的文件名: "1.门店便利贴...特价6元" -> "门店便利贴"
    name = re.sub(r'[特价售]*\s*\d+元$', '', name)

    # 去除"门店"前缀: "门店便利贴礼盒特价" -> "便利贴礼盒"
    name = re.sub(r'^门店', '', name)

    # 去除"二维码"相关后缀
    name = re.sub(r'二维码$', '', name)

    # 去除括号内容如(1)(2)等
    name = re.sub(r'\s*\(\d+\)', '', name)
    name = re.sub(r'\s*（\d+）', '', name)

    # 特殊处理：保留数字开头的尺寸信息
    # "2.18寸仙女棒" -> "18寸仙女棒"
    # "34.100发霸王蕾" -> "100发霸王蕾"
    match = re.match(r'^(\d+\.)?(\d+)(寸|发|个|根|支|盒|袋|箱)', name)
    if match:
        # 保留尺寸数字
        name = re.sub(r'^(\d+\.)+(?=\d+(寸|发|个|根|支|盒|袋|箱))', '', name)
    else:
        # 普通编号，直接去除
        name = re.sub(r'^[\d.]+\s*', '', name)

    # 去除多余空格和特殊字符
    name = re.sub(r'\s+', '', name)
    name = name.strip()

    # 如果处理后为空，使用原始文件名
    return name if name else Path(filename).stem

def detect_content_bounds(img):
    """检测图片中内容的边界，去除留白"""
    # 转换为RGB
    if img.mode != 'RGB':
        img = img.convert('RGB')

    width, height = img.size
    pixels = img.load()

    # 检测背景色（取四个角的颜色）
    corners = [
        pixels[0, 0],
        pixels[width-1, 0],
        pixels[0, height-1],
        pixels[width-1, height-1]
    ]

    # 计算平均背景色
    bg_color = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    # 颜色相似度阈值
    threshold = 30

    def is_bg_color(pixel):
        """判断像素是否为背景色"""
        return all(abs(pixel[i] - bg_color[i]) < threshold for i in range(3))

    # 从四边向内扫描，找到内容边界
    top = 0
    bottom = height - 1
    left = 0
    right = width - 1

    # 扫描顶部
    for y in range(height):
        row_has_content = False
        for x in range(0, width, 5):  # 每5像素采样
            if not is_bg_color(pixels[x, y]):
                row_has_content = True
                break
        if row_has_content:
            top = y
            break

    # 扫描底部
    for y in range(height - 1, -1, -1):
        row_has_content = False
        for x in range(0, width, 5):
            if not is_bg_color(pixels[x, y]):
                row_has_content = True
                break
        if row_has_content:
            bottom = y
            break

    # 扫描左边
    for x in range(width):
        col_has_content = False
        for y in range(0, height, 5):
            if not is_bg_color(pixels[x, y]):
                col_has_content = True
                break
        if col_has_content:
            left = x
            break

    # 扫描右边
    for x in range(width - 1, -1, -1):
        col_has_content = False
        for y in range(0, height, 5):
            if not is_bg_color(pixels[x, y]):
                col_has_content = True
                break
        if col_has_content:
            right = x
            break

    return (left, top, right + 1, bottom + 1)

def process_image(input_path, output_path):
    """处理单张图片"""
    try:
        img = Image.open(input_path)

        # 转换为RGB（处理PNG透明通道等）
        if img.mode in ('RGBA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[3])
            else:
                background.paste(img)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        width, height = img.size

        # 根据图片比例判断裁剪策略
        aspect_ratio = height / width

        if aspect_ratio > 1.3:
            # 竖长图片（如产品详情图），需要裁剪顶部和底部
            # 顶部裁剪约8%（去除水印logo）
            # 底部裁剪约25%（去除产品信息和二维码）
            top_crop = int(height * 0.08)
            bottom_crop = int(height * 0.25)

            # 裁剪
            img = img.crop((0, top_crop, width, height - bottom_crop))

        # 检测并裁剪留白
        bounds = detect_content_bounds(img)
        content_width = bounds[2] - bounds[0]
        content_height = bounds[3] - bounds[1]

        # 只有当留白超过5%时才裁剪
        if content_width < img.size[0] * 0.95 or content_height < img.size[1] * 0.95:
            # 添加一些边距
            margin = 10
            left = max(0, bounds[0] - margin)
            top = max(0, bounds[1] - margin)
            right = min(img.size[0], bounds[2] + margin)
            bottom = min(img.size[1], bounds[3] + margin)
            img = img.crop((left, top, right, bottom))

        # 调整为正方形（居中裁剪）
        width, height = img.size
        if width != height:
            # 取较短边作为正方形边长
            size = min(width, height)
            left = (width - size) // 2
            top = (height - size) // 2
            img = img.crop((left, top, left + size, top + size))

        # 调整大小
        img = img.resize(OUTPUT_SIZE, Image.LANCZOS)

        # 保存
        img.save(output_path, 'JPEG', quality=JPEG_QUALITY, optimize=True)
        return True

    except Exception as e:
        print(f"  [错误] 处理失败: {e}")
        return False

def collect_images():
    """收集所有需要处理的图片（递归搜索）"""
    images = []
    seen_names = set()

    def scan_directory(dir_path):
        """递归扫描目录"""
        if not dir_path.exists():
            print(f"[跳过] 目录不存在: {dir_path}")
            return

        for item in dir_path.iterdir():
            if item.is_dir():
                # 递归搜索子目录
                scan_directory(item)
            elif item.suffix.lower() in IMAGE_EXTENSIONS:
                # 跳过纯二维码图片
                if '二维码' in item.name:
                    print(f"[跳过] 二维码图片: {item.name}")
                    continue

                # 提取商品名称
                product_name = extract_product_name(item.name)

                # 避免重复处理同名商品
                if product_name in seen_names:
                    print(f"[跳过] 已存在同名商品: {product_name}")
                    continue

                seen_names.add(product_name)
                images.append((item, product_name))

    for input_dir in INPUT_DIRS:
        scan_directory(input_dir)

    return images

def main():
    print("=" * 60)
    print("产品图片处理脚本")
    print("=" * 60)

    # 确保输出目录存在
    OUTPUT_DIR.mkdir(exist_ok=True)

    # 收集图片
    print("\n[1/3] 收集图片...")
    images = collect_images()
    print(f"共找到 {len(images)} 张图片需要处理")

    # 处理图片
    print("\n[2/3] 处理图片...")
    success_count = 0
    fail_count = 0

    for i, (input_path, product_name) in enumerate(images, 1):
        output_path = OUTPUT_DIR / f"{product_name}.jpg"
        print(f"[{i}/{len(images)}] {product_name}")

        if process_image(input_path, output_path):
            success_count += 1
        else:
            fail_count += 1

    # 输出统计
    print("\n[3/3] 处理完成")
    print("=" * 60)
    print(f"成功: {success_count} 张")
    print(f"失败: {fail_count} 张")
    print(f"输出目录: {OUTPUT_DIR}")
    print("=" * 60)

if __name__ == "__main__":
    main()
