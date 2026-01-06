import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 32, comment: '分类名称' })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '分类图标' })
  icon!: string | null;

  @Column({ type: 'int', default: 0, comment: '排序(越小越前)' })
  sort!: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态 0禁用 1启用' })
  status!: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}
