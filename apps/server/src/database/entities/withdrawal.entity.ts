import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('withdrawals')
export class Withdrawal {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'withdraw_no', type: 'varchar', length: 32, unique: true, comment: '提现单号' })
  withdrawNo!: string;

  @Column({ name: 'user_type', type: 'enum', enum: ['user', 'porter'], comment: '用户类型' })
  @Index()
  userType!: 'user' | 'porter';

  @Column({ name: 'user_id', type: 'bigint', comment: '用户ID' })
  @Index()
  userId!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '提现金额' })
  amount!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '手续费' })
  fee!: string;

  @Column({ name: 'actual_amount', type: 'decimal', precision: 10, scale: 2, comment: '实际到账金额' })
  actualAmount!: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 32, nullable: true, comment: '银行名称' })
  bankName!: string | null;

  @Column({ name: 'bank_account', type: 'varchar', length: 32, nullable: true, comment: '银行账号' })
  bankAccount!: string | null;

  @Column({ name: 'bank_holder', type: 'varchar', length: 32, nullable: true, comment: '持卡人姓名' })
  bankHolder!: string | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending',
    comment: '状态',
  })
  @Index()
  status!: 'pending' | 'approved' | 'rejected' | 'completed';

  @Column({ name: 'auditor_id', type: 'int', nullable: true, comment: '审核人ID' })
  auditorId!: number | null;

  @Column({ name: 'audit_at', type: 'datetime', nullable: true, comment: '审核时间' })
  auditAt!: Date | null;

  @Column({ name: 'audit_remark', type: 'varchar', length: 255, nullable: true, comment: '审核备注' })
  auditRemark!: string | null;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true, comment: '完成时间' })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}
