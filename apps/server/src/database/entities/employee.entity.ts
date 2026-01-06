import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'uni_id', type: 'varchar', length: 64, nullable: true, comment: 'uniCloud用户ID' })
  @Index()
  uniId!: string | null;

  @Column({ type: 'varchar', length: 32, comment: '姓名' })
  name!: string;

  @Column({ type: 'varchar', length: 20, unique: true, comment: '手机号' })
  phone!: string;

  @Column({ type: 'varchar', length: 16, comment: '角色 warehouse库管 porter货管' })
  role!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '余额（货管）' })
  balance!: string;

  @Column({ name: 'frozen_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '冻结金额' })
  frozenAmount!: string;

  @Column({ name: 'total_income', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '累计收入' })
  totalIncome!: string;

  @Column({ type: 'tinyint', default: 1, comment: '状态 0禁用 1正常' })
  status!: number;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true, comment: '最后登录时间' })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}
