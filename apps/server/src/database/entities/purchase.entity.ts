import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'purchase_no', type: 'varchar', length: 32, unique: true, comment: '进货单号' })
  purchaseNo!: string;

  @Column({ name: 'supplier_name', type: 'varchar', length: 64, nullable: true, comment: '供应商名称' })
  supplierName!: string | null;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, comment: '总金额' })
  totalAmount!: string;

  @Column({ name: 'total_quantity', type: 'int', comment: '总数量' })
  totalQuantity!: number;

  @Column({
    type: 'enum',
    enum: ['draft', 'pending', 'completed', 'cancelled'],
    default: 'draft',
    comment: '状态：draft草稿 pending待确认 completed已完成 cancelled已取消',
  })
  status!: 'draft' | 'pending' | 'completed' | 'cancelled';

  @Column({ name: 'operator_id', type: 'int', nullable: true, comment: '操作人ID' })
  operatorId!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark!: string | null;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true, comment: '完成时间' })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}
