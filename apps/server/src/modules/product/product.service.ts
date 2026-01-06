import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';

import { Product, Category } from '../../database/entities';
import { QueryProductDto } from './dto';
import { BusinessException } from '../../common/filters/business.exception';
import { ErrorCode } from '../../common/utils/error-code.enum';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  /**
   * 获取商品列表
   */
  async getProductList(dto: QueryProductDto) {
    const { categoryId, keyword, isHot, isNew, page = 1, pageSize = 10 } = dto;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .where('product.status = :status', { status: 1 });

    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (keyword) {
      queryBuilder.andWhere('product.name LIKE :keyword', { keyword: `%${keyword}%` });
    }

    if (isHot !== undefined) {
      queryBuilder.andWhere('product.isHot = :isHot', { isHot });
    }

    if (isNew !== undefined) {
      queryBuilder.andWhere('product.isNew = :isNew', { isNew });
    }

    queryBuilder
      .orderBy('product.sort', 'ASC')
      .addOrderBy('product.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();

    return {
      list: list.map(item => this.formatProduct(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取商品详情
   */
  async getProductDetail(id: number) {
    const product = await this.productRepository.findOne({
      where: { id, status: 1 },
    });

    if (!product) {
      throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND);
    }

    // 获取分类信息
    const category = await this.categoryRepository.findOne({
      where: { id: product.categoryId },
    });

    return {
      ...this.formatProduct(product),
      description: product.description,
      categoryName: category?.name || null,
    };
  }

  /**
   * 获取热销商品
   */
  async getHotProducts(limit: number = 10) {
    const products = await this.productRepository.find({
      where: { status: 1, isHot: 1 },
      order: { sales: 'DESC', sort: 'ASC' },
      take: limit,
    });

    return products.map(item => this.formatProduct(item));
  }

  /**
   * 获取新品推荐
   */
  async getNewProducts(limit: number = 10) {
    const products = await this.productRepository.find({
      where: { status: 1, isNew: 1 },
      order: { createdAt: 'DESC', sort: 'ASC' },
      take: limit,
    });

    return products.map(item => this.formatProduct(item));
  }

  /**
   * 搜索商品
   */
  async searchProducts(keyword: string, page: number = 1, pageSize: number = 10) {
    if (!keyword || keyword.trim() === '') {
      return {
        list: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    const [list, total] = await this.productRepository.findAndCount({
      where: {
        status: 1,
        name: Like(`%${keyword}%`),
      },
      order: { sales: 'DESC', sort: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      list: list.map(item => this.formatProduct(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取分类列表
   */
  async getCategoryList() {
    const categories = await this.categoryRepository.find({
      where: { status: 1 },
      order: { sort: 'ASC', id: 'ASC' },
    });

    return categories.map(item => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
    }));
  }

  /**
   * 获取分类下的商品
   */
  async getCategoryProducts(categoryId: number, page: number = 1, pageSize: number = 10) {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, status: 1 },
    });

    if (!category) {
      throw new BusinessException(ErrorCode.CATEGORY_NOT_FOUND);
    }

    const [list, total] = await this.productRepository.findAndCount({
      where: { categoryId, status: 1 },
      order: { sort: 'ASC', id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      category: {
        id: category.id,
        name: category.name,
        icon: category.icon,
      },
      list: list.map(item => this.formatProduct(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 格式化商品数据
   */
  private formatProduct(product: Product) {
    return {
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      image: product.image,
      spec: product.spec,
      unit: product.unit,
      price: product.price,
      stock: product.stock,
      sales: product.sales,
      isHot: product.isHot,
      isNew: product.isNew,
    };
  }
}
