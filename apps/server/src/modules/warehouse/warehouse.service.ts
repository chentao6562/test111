import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { Order, OrderItem, Product } from '../../database/entities';
import { BusinessException } from '../../common/filters/business.exception';
import { ErrorCode } from '../../common/utils/error-code.enum';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * 获取工作台统计数据
   */
  async getDashboard(): Promise<{
    pendingOrders: number;
    preparingOrders: number;
    warningStock: number;
    todayInbound: number;
  }> {
    // 待核销订单（已付款待备货 + 备货中 + 待提货）
    const pendingOrders = await this.orderRepository.count({
      where: [{ status: 1 }, { status: 2 }, { status: 3 }],
    });

    // 待备货订单
    const preparingOrders = await this.orderRepository.count({
      where: { status: 1 },
    });

    // 库存预警商品数
    const warningProducts = await this.productRepository
      .createQueryBuilder('product')
      .where('product.stock <= product.warningStock')
      .getCount();

    // 今日入库数（简化：返回0，需要结合Purchase表统计）
    const todayInbound = 0;

    return {
      pendingOrders,
      preparingOrders,
      warningStock: warningProducts,
      todayInbound,
    };
  }

  /**
   * 根据提货码查询订单
   */
  async verifyOrderByCode(pickupCode: string): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { pickupCode },
    });

    if (!order) {
      throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, '未找到该提货码对应的订单');
    }

    // 检查订单状态
    if (order.status === 4) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_ERROR, '该订单已完成核销');
    }
    if (order.status === 5) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_ERROR, '该订单已取消');
    }
    if (order.status === 0) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_ERROR, '该订单未支付');
    }

    // 获取订单商品
    const items = await this.orderItemRepository.find({
      where: { orderId: order.id },
    });

    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      totalAmount: order.totalAmount,
      vipFee: order.vipFee,
      payAmount: order.payAmount,
      contactName: order.contactName,
      contactPhone: order.contactPhone,
      createdAt: order.createdAt,
      pickedAt: order.pickedAt,
      items: items.map((item) => ({
        id: item.id,
        productName: item.productName,
        productImage: item.productImage,
        price: item.price,
        quantity: item.quantity,
      })),
    };
  }

  /**
   * 确认提货核销
   */
  async confirmPickup(orderId: number, operatorId: number): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, '订单不存在');
    }

    if (order.status === 4) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_ERROR, '该订单已完成核销');
    }
    if (order.status === 5) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_ERROR, '该订单已取消');
    }
    if (order.status === 0) {
      throw new BusinessException(ErrorCode.ORDER_STATUS_ERROR, '该订单未支付');
    }

    // 更新订单状态为已完成
    order.status = 4;
    order.pickedAt = new Date();

    await this.orderRepository.save(order);
  }

  /**
   * 获取待备货订单列表
   */
  async getPrepareList(status?: number): Promise<{
    list: any[];
    counts: { pending: number; preparing: number; ready: number };
  }> {
    // 统计各状态数量
    const pendingCount = await this.orderRepository.count({ where: { status: 1 } });
    const preparingCount = await this.orderRepository.count({ where: { status: 2 } });
    const readyCount = await this.orderRepository.count({ where: { status: 3 } });

    // 根据状态筛选
    let whereStatus: number[];
    if (status === 1) {
      whereStatus = [1]; // 待备货
    } else if (status === 2) {
      whereStatus = [2]; // 备货中
    } else if (status === 3) {
      whereStatus = [3]; // 待提货
    } else {
      whereStatus = [1, 2, 3];
    }

    const orders = await this.orderRepository.find({
      where: whereStatus.map((s) => ({ status: s })),
      order: { createdAt: 'DESC' },
      take: 50,
    });

    // 获取订单商品
    const list = await Promise.all(
      orders.map(async (order) => {
        const items = await this.orderItemRepository.find({
          where: { orderId: order.id },
        });

        return {
          id: order.id,
          orderNo: order.orderNo,
          status: order.status,
          contactName: order.contactName,
          contactPhone: order.contactPhone,
          items: items.map((item) => ({
            id: item.id,
            productName: item.productName,
            productImage: item.productImage,
            quantity: item.quantity,
          })),
        };
      }),
    );

    return {
      list,
      counts: {
        pending: pendingCount,
        preparing: preparingCount,
        ready: readyCount,
      },
    };
  }

  /**
   * 更新备货状态
   */
  async updatePrepareStatus(orderId: number, action: string, operatorId: number): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, '订单不存在');
    }

    if (action === 'start') {
      // 开始备货：状态1 -> 2
      if (order.status !== 1) {
        throw new BusinessException(ErrorCode.ORDER_STATUS_ERROR, '订单状态不允许开始备货');
      }
      order.status = 2;
    } else if (action === 'complete') {
      // 完成备货：状态2 -> 3
      if (order.status !== 2) {
        throw new BusinessException(ErrorCode.ORDER_STATUS_ERROR, '订单状态不允许完成备货');
      }
      order.status = 3;
    } else {
      throw new BusinessException(ErrorCode.PARAM_ERROR, '无效的操作');
    }

    await this.orderRepository.save(order);
  }
}
