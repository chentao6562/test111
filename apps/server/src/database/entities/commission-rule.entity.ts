import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('commission_rules')
export class CommissionRule {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 50, default: '', comment: '规则名称' })
  name!: string;

  @Column({ name: 'min_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '最低金额(含)' })
  minAmount!: string;

  @Column({ name: 'max_amount', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '最高金额(不含), null表示无上限' })
  maxAmount!: string | null;

  @Column({ name: 'level1_rate', type: 'decimal', precision: 5, scale: 4, default: 0, comment: '一级分润比例(小数)' })
  level1Rate!: string;

  @Column({ name: 'level2_rate', type: 'decimal', precision: 5, scale: 4, default: 0, comment: '二级分润比例(小数)' })
  level2Rate!: string;

  @Column({ type: 'int', default: 0, comment: '排序(越小越优先)' })
  sort!: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态 0禁用 1启用' })
  status!: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}
