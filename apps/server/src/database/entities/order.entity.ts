import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'order_no', type: 'varchar', length: 32, unique: true, comment: '订单号' })
  orderNo!: string;

  @Column({ name: 'user_id', type: 'bigint', comment: '用户ID' })
  @Index()
  userId!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, comment: '订单总金额' })
  totalAmount!: string;

  @Column({ name: 'vip_fee', type: 'decimal', precision: 10, scale: 2, default: 0, comment: 'VIP锁货费' })
  vipFee!: string;

  @Column({ name: 'pay_amount', type: 'decimal', precision: 10, scale: 2, comment: '实付金额' })
  payAmount!: string;

  @Column({ type: 'tinyint', default: 0, comment: '状态 0待付款 1已付款待备货 2备货中 3待提货 4已完成 5已取消' })
  @Index()
  status!: number;

  @Column({ name: 'pickup_code', type: 'varchar', length: 8, nullable: true, comment: '提货码' })
  pickupCode!: string | null;

  @Column({ name: 'contact_name', type: 'varchar', length: 32, comment: '联系人' })
  contactName!: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 20, comment: '联系电话' })
  contactPhone!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '收货地址' })
  address!: string | null;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark!: string | null;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true, comment: '支付时间' })
  paidAt!: Date | null;

  @Column({ name: 'picked_at', type: 'datetime', nullable: true, comment: '提货时间' })
  pickedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true, comment: '取消时间' })
  cancelledAt!: Date | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true, comment: '取消原因' })
  cancelReason!: string | null;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}
