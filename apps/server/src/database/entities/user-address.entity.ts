import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_addresses')
export class UserAddress {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'bigint', comment: '用户ID' })
  @Index()
  userId!: number;

  @Column({ type: 'varchar', length: 32, comment: '联系人' })
  name!: string;

  @Column({ type: 'varchar', length: 20, comment: '手机号' })
  phone!: string;

  @Column({ type: 'varchar', length: 32, nullable: true, comment: '省份' })
  province!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true, comment: '城市' })
  city!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true, comment: '区县' })
  district!: string | null;

  @Column({ type: 'varchar', length: 255, comment: '详细地址' })
  detail!: string;

  @Column({ name: 'is_default', type: 'tinyint', default: 0, comment: '是否默认 0否 1是' })
  isDefault!: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}
