import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('transfer_tasks')
export class TransferTask {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'task_no', type: 'varchar', length: 32, unique: true, comment: '任务编号' })
  taskNo!: string;

  @Column({ name: 'order_id', type: 'bigint', comment: '关联订单ID' })
  @Index()
  orderId!: number;

  @Column({ name: 'porter_id', type: 'int', nullable: true, comment: '货管ID' })
  @Index()
  porterId!: number | null;

  @Column({ name: 'assigned_at', type: 'datetime', nullable: true, comment: '分配时间' })
  assignedAt!: Date | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'assigned', 'picking', 'transferring', 'completed', 'cancelled'],
    default: 'pending',
    comment: '状态',
  })
  @Index()
  status!: 'pending' | 'assigned' | 'picking' | 'transferring' | 'completed' | 'cancelled';

  @Column({ name: 'transfer_fee', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '搬运费' })
  transferFee!: string;

  @Column({ name: 'fee_status', type: 'tinyint', default: 0, comment: '费用状态 0待结算 1已结算' })
  feeStatus!: number;

  @Column({ name: 'from_location', type: 'varchar', length: 64, nullable: true, comment: '取货位置' })
  fromLocation!: string | null;

  @Column({ name: 'to_location', type: 'varchar', length: 64, default: 'VIP库房', comment: '目标位置' })
  toLocation!: string;

  @Column({ name: 'picked_at', type: 'datetime', nullable: true, comment: '取货时间' })
  pickedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true, comment: '完成时间' })
  completedAt!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark!: string | null;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}
