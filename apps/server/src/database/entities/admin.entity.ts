import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 32, unique: true, comment: '用户名' })
  username!: string;

  @Column({ type: 'varchar', length: 128, comment: '密码' })
  password!: string;

  @Column({ type: 'varchar', length: 32, comment: '姓名' })
  name!: string;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: '手机号' })
  phone!: string | null;

  @Column({ type: 'tinyint', default: 2, comment: '角色 1超管 2运营 3财务' })
  role!: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态 0禁用 1正常' })
  status!: number;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true, comment: '最后登录时间' })
  lastLoginAt!: Date | null;

  @Column({ name: 'last_login_ip', type: 'varchar', length: 64, nullable: true, comment: '最后登录IP' })
  lastLoginIp!: string | null;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}
