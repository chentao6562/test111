import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'uni_id', type: 'varchar', length: 64, nullable: true, comment: 'uniCloud用户ID' })
  @Index()
  uniId!: string | null;

  @Column({ name: 'openid', type: 'varchar', length: 64, nullable: true, comment: '微信openid' })
  @Index()
  openid!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true, comment: '手机号' })
  @Index()
  phone!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, comment: '昵称' })
  nickname!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '头像URL' })
  avatar!: string | null;

  @Column({ name: 'real_name', type: 'varchar', length: 32, nullable: true, comment: '真实姓名' })
  realName!: string | null;

  @Column({ name: 'id_card', type: 'varchar', length: 18, nullable: true, comment: '身份证号' })
  idCard!: string | null;

  @Column({ name: 'is_verified', type: 'tinyint', default: 0, comment: '是否实名认证 0否 1是' })
  isVerified!: number;

  @Column({ name: 'agent_level', type: 'tinyint', default: 0, comment: '代理等级 0普通 1一级 2二级' })
  agentLevel!: number;

  @Column({ name: 'agent_status', type: 'tinyint', default: 0, comment: '代理状态 0未申请 1待审核 2已通过 3已拒绝' })
  agentStatus!: number;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true, comment: '上级代理ID' })
  @Index()
  parentId!: number | null;

  @Column({ name: 'invite_code', type: 'varchar', length: 16, nullable: true, unique: true, comment: '邀请码' })
  inviteCode!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '余额' })
  balance!: string;

  @Column({ name: 'frozen_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '冻结金额' })
  frozenAmount!: string;

  @Column({ name: 'total_income', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '累计收入' })
  totalIncome!: string;

  @Column({ type: 'tinyint', default: 1, comment: '状态 0禁用 1正常' })
  status!: number;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true, comment: '最后登录时间' })
  lastLoginAt!: Date | null;

  @Column({ name: 'agent_at', type: 'datetime', nullable: true, comment: '成为代理时间' })
  agentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}
