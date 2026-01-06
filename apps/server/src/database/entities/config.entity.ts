import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('configs')
export class Config {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 64, unique: true, comment: '配置键' })
  key!: string;

  @Column({ type: 'text', nullable: true, comment: '配置值' })
  value!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'basic', comment: '配置分组' })
  group!: string;

  @Column({ type: 'varchar', length: 128, nullable: true, comment: '配置名称' })
  name!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '配置描述' })
  description!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'string', comment: '值类型 string/number/boolean/json' })
  type!: string;

  @Column({ type: 'int', default: 0, comment: '排序' })
  sort!: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}
