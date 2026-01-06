import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id', type: 'bigint', comment: '订单ID' })
  @Index()
  orderId!: number;

  @Column({ name: 'product_id', type: 'int', comment: '商品ID' })
  productId!: number;

  @Column({ name: 'product_name', type: 'varchar', length: 100, comment: '商品名称(快照)' })
  productName!: string;

  @Column({ name: 'product_image', type: 'varchar', length: 255, nullable: true, comment: '商品图片(快照)' })
  productImage!: string | null;

  @Column({ name: 'product_spec', type: 'varchar', length: 32, nullable: true, comment: '商品规格(快照)' })
  productSpec!: string | null;

  @Column({ name: 'product_unit', type: 'varchar', length: 16, nullable: true, comment: '商品单位(快照)' })
  productUnit!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '商品单价' })
  price!: string;

  @Column({ type: 'int', comment: '数量' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '小计金额' })
  amount!: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;
}
