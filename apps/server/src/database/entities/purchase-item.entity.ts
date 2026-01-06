import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('purchase_items')
export class PurchaseItem {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'purchase_id', type: 'bigint' })
  @Index()
  purchaseId!: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId!: number;

  @Column({ name: 'product_name', type: 'varchar', length: 128, comment: '商品名称' })
  productName!: string;

  @Column({ name: 'cost_price', type: 'decimal', precision: 10, scale: 2, comment: '成本价' })
  costPrice!: string;

  @Column({ type: 'int', comment: '数量' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '金额' })
  amount!: string;

  @Column({ name: 'batch_no', type: 'varchar', length: 32, nullable: true, comment: '批次号' })
  batchNo!: string | null;

  @Column({ name: 'production_date', type: 'date', nullable: true, comment: '生产日期' })
  productionDate!: Date | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true, comment: '过期日期' })
  expiryDate!: Date | null;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;
}
