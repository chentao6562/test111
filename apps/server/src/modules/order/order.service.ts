import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Order, OrderItem, Product, User } from '../../database/entities';
import { CreateOrderDto, QueryOrderDto } from './dto';
import { BusinessException } from '../../common/filters/business.exception';
import { ErrorCode } from '../../common/utils/error-code.enum';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  /**
   * 创建订单
   */
  async createOrder(userId: number, dto: CreateOrderDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 验证商品并计算金额
      let totalAmount = 0;
      const orderItems: Partial<OrderItem>[] = [];

      for (const item of dto.items) {
        const product = await this.productRepository.findOne({
          where: { id: item.productId, status: 1 },
        });

        if (!product) {
          throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND);
        }

        if (product.stock < item.quantity) {
          throw new BusinessException(ErrorCode.STOCK_NOT_ENOUGH);
        }

        const amount = parseFloat(product.price) * item.quantity;
        totalAmount += amount;

        orderItems.push({
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          productSpec: product.spec,
          productUnit: product.unit,
          price: product.price,
          quantity: item.quantity,
          amount: amount.toFixed(2),
        });

        // 扣减库存
        await queryRunner.manager.update(Product, product.id, {
          stock: () => `stock - ${item.quantity}`,
          sales: () => `sales + ${item.quantity}`,
        });
      }

      // 计算VIP锁货费（订单金额<500元收80元）
      const vipFee = totalAmount < 500 ? 80 : 0;
      const payAmount = totalAmount + vipFee;

      // 生成订单号
      const orderNo = this.generateOrderNo();

      // 创建订单
      const order = queryRunner.manager.create(Order, {
        orderNo,
        userId,
        totalAmount: totalAmount.toFixed(2),
        vipFee: vipFee.toFixed(2),
        payAmount: payAmount.toFixed(2),
        status: 0,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        address: dto.address || null,
        remark: dto.remark || null,
      });

      await queryRunner.manager.save(order);

      // 创建订单项
      for (const item of orderItems) {
        const orderItem = queryRunner.manager.create(OrderItem, {
          ...item,
          orderId: order.id,
        });
        await queryRunner.manager.save(orderItem);
      }

      await queryRunner.commitTransaction();

      return {
        orderId: order.id,
        orderNo: order.orderNo,
        totalAmount: order.totalAmount,
        vipFee: order.vipFee,
        payAmount: order.payAmount,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 获取订单列表
   */
  async getOrderList(userId: number, dto: QueryOrderDto) {
    const { status, page = 1, pageSize = 10 } = dto;

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .where('order.userId = :userId', { userId });

    if (status !== undefined) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [orders, total] = await queryBuilder.getManyAndCount();

    // 获取订单项
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await this.orderItemRepository.find({
          where: { orderId: order.id },
        });
        return {
          ...this.formatOrder(order),
          items: items.map(item => this.formatOrderItem(item)),
        };
      }),
    );

    return {
      list: ordersWithItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取订单详情
   */
  async getOrderDetail(userId: number, orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
    }

    const items = await this.orderItemRepository.find({
      where: { orderId: order.id },
    });

    return {
      ...this.formatOrder(order),
      items: items.map(item => this.formatOrderItem(item)),
    };
  }

  /**
   * 取消订单
   */
  async cancelOrder(userId: number, orderId: number, reason?: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
    }

    if (order.status !== 0) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_ERROR);
    }

    // 恢复库存
    const items = await this.orderItemRepository.find({
      where: { orderId: order.id },
    });

    for (const item of items) {
      await this.productRepository.update(item.productId, {
        stock: () => `stock + ${item.quantity}`,
        sales: () => `sales - ${item.quantity}`,
      });
    }

    // 更新订单状态
    order.status = 5;
    order.cancelledAt = new Date();
    order.cancelReason = reason || '用户取消';

    await this.orderRepository.save(order);

    return { message: '订单已取消' };
  }

  /**
   * 模拟支付（开发环境）
   */
  async payOrder(userId: number, orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
    }

    if (order.status !== 0) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_ERROR);
    }

    // 生成提货码
    const pickupCode = this.generatePickupCode();

    order.status = 1;
    order.paidAt = new Date();
    order.pickupCode = pickupCode;

    await this.orderRepository.save(order);

    return {
      message: '支付成功',
      pickupCode,
    };
  }

  /**
   * 生成订单号
   */
  private generateOrderNo(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = date.getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `FW${dateStr}${timeStr}${random}`;
  }

  /**
   * 生成提货码
   */
  private generatePickupCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 格式化订单
   */
  private formatOrder(order: Order) {
    return {
      id: order.id,
      orderNo: order.orderNo,
      totalAmount: order.totalAmount,
      vipFee: order.vipFee,
      payAmount: order.payAmount,
      status: order.status,
      statusText: this.getStatusText(order.status),
      pickupCode: order.pickupCode,
      contactName: order.contactName,
      contactPhone: order.contactPhone,
      address: order.address,
      remark: order.remark,
      paidAt: order.paidAt,
      pickedAt: order.pickedAt,
      createdAt: order.createdAt,
    };
  }

  /**
   * 格式化订单项
   */
  private formatOrderItem(item: OrderItem) {
    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      productSpec: item.productSpec,
      productUnit: item.productUnit,
      price: item.price,
      quantity: item.quantity,
      amount: item.amount,
    };
  }

  /**
   * 获取状态文本
   */
  private getStatusText(status: number): string {
    const statusMap: Record<number, string> = {
      0: '待付款',
      1: '已付款待备货',
      2: '备货中',
      3: '待提货',
      4: '已完成',
      5: '已取消',
    };
    return statusMap[status] || '未知';
  }
}
