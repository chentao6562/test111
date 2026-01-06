import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('commissions')
export class Commission {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'user_id', type: 'bigint', comment: '受益人（代理商）' })
  @Index()
  userId!: number;

  @Column({ name: 'order_id', type: 'bigint', comment: '来源订单' })
  @Index()
  orderId!: number;

  @Column({ name: 'order_no', type: 'varchar', length: 32, comment: '订单编号' })
  orderNo!: string;

  @Column({ name: 'from_user_id', type: 'bigint', comment: '订单创建人' })
  @Index()
  fromUserId!: number;

  @Column({ name: 'order_amount', type: 'decimal', precision: 10, scale: 2, comment: '订单金额' })
  orderAmount!: string;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 4, comment: '分润比例' })
  commissionRate!: string;

  @Column({ name: 'commission_amount', type: 'decimal', precision: 10, scale: 2, comment: '分润金额' })
  commissionAmount!: string;

  @Column({ type: 'tinyint', comment: '分润层级 1直接 2间接' })
  level!: number;

  @Column({ type: 'tinyint', default: 0, comment: '状态 0待结算 1已结算 2已取消' })
  @Index()
  status!: number;

  @Column({ name: 'settled_at', type: 'datetime', nullable: true, comment: '结算时间' })
  settledAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;
}
