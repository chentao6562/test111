import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual } from 'typeorm';
import { Product } from '../../database/entities/product.entity';
import { StockLog } from '../../database/entities/stock-log.entity';
import { Purchase } from '../../database/entities/purchase.entity';
import { PurchaseItem } from '../../database/entities/purchase-item.entity';
import { QueryStockDto, QueryStockLogDto } from './dto/query-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateInboundDto } from './dto/create-inbound.dto';
import { BusinessException } from '../../common/filters/business.exception';
import { ErrorCode } from '../../common/utils/error-code.enum';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(StockLog)
    private readonly stockLogRepository: Repository<StockLog>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(PurchaseItem)
    private readonly purchaseItemRepository: Repository<PurchaseItem>,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== 库管端方法 ====================

  /**
   * 获取库存列表（库管端）
   */
  async getStockList(dto: QueryStockDto): Promise<{
    list: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page = 1, pageSize = 20, categoryId, keyword, warning } = dto;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .select([
        'product.id',
        'product.name',
        'product.cover',
        'product.stock',
        'product.lockStock',
        'product.warningStock',
        'product.categoryId',
        'product.unit',
      ]);

    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (keyword) {
      queryBuilder.andWhere('product.name LIKE :keyword', { keyword: `%${keyword}%` });
    }

    if (warning === 1) {
      queryBuilder.andWhere('product.stock <= product.warningStock');
    }

    queryBuilder
      .orderBy('product.stock', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();

    // 计算可用库存
    const result = list.map((item) => ({
      ...item,
      availableStock: item.stock - item.lockStock,
    }));

    return {
      list: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取单个商品库存详情
   */
  async getStockDetail(productId: number): Promise<any> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      select: ['id', 'name', 'cover', 'stock', 'lockStock', 'warningStock', 'categoryId', 'unit', 'price'],
    });

    if (!product) {
      throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, '商品不存在');
    }

    // 获取最近的库存流水
    const recentLogs = await this.stockLogRepository.find({
      where: { productId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      ...product,
      availableStock: product.stock - product.lockStock,
      recentLogs,
    };
  }

  /**
   * 创建入库单
   */
  async createInbound(dto: CreateInboundDto, operatorId: number): Promise<{ purchaseId: number; purchaseNo: string }> {
    // 验证所有商品存在
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.productRepository.findByIds(productIds);

    if (products.length !== productIds.length) {
      throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, '部分商品不存在');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 生成进货单号
    const purchaseNo = this.generatePurchaseNo();

    // 计算总金额和总数量
    let totalAmount = 0;
    let totalQuantity = 0;
    const items: Partial<PurchaseItem>[] = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      const amount = item.costPrice * item.quantity;
      totalAmount += amount;
      totalQuantity += item.quantity;

      items.push({
        productId: item.productId,
        productName: product.name,
        costPrice: item.costPrice.toFixed(2),
        quantity: item.quantity,
        amount: amount.toFixed(2),
        batchNo: item.batchNo,
        productionDate: item.productionDate ? new Date(item.productionDate) : null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      });
    }

    // 创建进货单
    const purchase = this.purchaseRepository.create({
      purchaseNo,
      supplierName: dto.supplierName,
      totalAmount: totalAmount.toFixed(2),
      totalQuantity,
      status: 'pending',
      operatorId,
      remark: dto.remark,
    });

    const savedPurchase = await this.purchaseRepository.save(purchase);

    // 创建进货单明细
    for (const item of items) {
      item.purchaseId = savedPurchase.id;
    }
    await this.purchaseItemRepository.save(items as PurchaseItem[]);

    return {
      purchaseId: savedPurchase.id,
      purchaseNo: savedPurchase.purchaseNo,
    };
  }

  /**
   * 确认入库
   */
  async confirmInbound(purchaseId: number, operatorId: number): Promise<void> {
    const purchase = await this.purchaseRepository.findOne({ where: { id: purchaseId } });
    if (!purchase) {
      throw new BusinessException(ErrorCode.INVENTORY_NOT_FOUND, '进货单不存在');
    }
    if (purchase.status !== 'pending') {
      throw new BusinessException(ErrorCode.INVENTORY_LOCKED, '进货单状态不允许确认入库');
    }

    // 获取进货单明细
    const items = await this.purchaseItemRepository.find({ where: { purchaseId } });

    // 使用事务
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of items) {
        // 获取当前商品库存
        const product = await queryRunner.manager.findOne(Product, { where: { id: item.productId } });
        if (!product) continue;

        const beforeStock = product.stock;
        const afterStock = beforeStock + item.quantity;

        // 更新商品库存
        await queryRunner.manager.update(Product, item.productId, { stock: afterStock });

        // 记录库存流水
        await queryRunner.manager.save(StockLog, {
          productId: item.productId,
          type: 'in',
          quantity: item.quantity,
          beforeStock,
          afterStock,
          reason: 'purchase',
          relationType: 'purchase',
          relationId: purchaseId,
          operatorType: 'warehouse',
          operatorId,
        });
      }

      // 更新进货单状态
      await queryRunner.manager.update(Purchase, purchaseId, {
        status: 'completed',
        completedAt: new Date(),
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 获取入库单列表
   */
  async getInboundList(page: number = 1, pageSize: number = 20): Promise<{
    list: Purchase[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const [list, total] = await this.purchaseRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ==================== 管理后台方法 ====================

  /**
   * 库存概览
   */
  async getInventoryOverview(): Promise<{
    totalProducts: number;
    totalStock: number;
    totalLockStock: number;
    warningCount: number;
    totalValue: number;
  }> {
    const products = await this.productRepository.find({
      select: ['id', 'stock', 'lockStock', 'warningStock', 'price'],
    });

    let totalStock = 0;
    let totalLockStock = 0;
    let warningCount = 0;
    let totalValue = 0;

    for (const product of products) {
      totalStock += product.stock;
      totalLockStock += product.lockStock;
      if (product.stock <= product.warningStock) {
        warningCount++;
      }
      totalValue += product.stock * parseFloat(product.price);
    }

    return {
      totalProducts: products.length,
      totalStock,
      totalLockStock,
      warningCount,
      totalValue: Math.round(totalValue * 100) / 100,
    };
  }

  /**
   * 获取库存流水列表
   */
  async getStockLogs(dto: QueryStockLogDto): Promise<{
    list: StockLog[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page = 1, pageSize = 20, productId, type, startDate, endDate } = dto;

    const queryBuilder = this.stockLogRepository.createQueryBuilder('log');

    if (productId) {
      queryBuilder.andWhere('log.productId = :productId', { productId });
    }

    if (type) {
      queryBuilder.andWhere('log.type = :type', { type });
    }

    if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate: new Date(endDate + ' 23:59:59') });
    }

    queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 库存调整
   */
  async adjustStock(productId: number, dto: AdjustStockDto, operatorId: number): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, '商品不存在');
    }

    const beforeStock = product.stock;
    const afterStock = beforeStock + dto.quantity;

    if (afterStock < 0) {
      throw new BusinessException(ErrorCode.STOCK_NOT_ENOUGH, '调整后库存不能为负数');
    }

    // 使用事务
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 更新库存
      await queryRunner.manager.update(Product, productId, { stock: afterStock });

      // 记录库存流水
      await queryRunner.manager.save(StockLog, {
        productId,
        type: 'adjust',
        quantity: dto.quantity,
        beforeStock,
        afterStock,
        reason: dto.reason,
        operatorType: 'admin',
        operatorId,
        remark: dto.remark,
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 库存预警列表
   */
  async getWarningList(): Promise<any[]> {
    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.stock <= product.warningStock')
      .orderBy('product.stock', 'ASC')
      .getMany();

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      cover: p.cover,
      stock: p.stock,
      lockStock: p.lockStock,
      warningStock: p.warningStock,
      availableStock: p.stock - p.lockStock,
    }));
  }

  /**
   * 获取进货单详情
   */
  async getPurchaseDetail(purchaseId: number): Promise<{ purchase: Purchase; items: PurchaseItem[] }> {
    const purchase = await this.purchaseRepository.findOne({ where: { id: purchaseId } });
    if (!purchase) {
      throw new BusinessException(ErrorCode.INVENTORY_NOT_FOUND, '进货单不存在');
    }

    const items = await this.purchaseItemRepository.find({ where: { purchaseId } });

    return { purchase, items };
  }

  /**
   * 生成进货单号
   */
  private generatePurchaseNo(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');
    return `PO${dateStr}${random}`;
  }
}
