import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'category_id', type: 'int', comment: '分类ID' })
  @Index()
  categoryId!: number;

  @Column({ type: 'varchar', length: 100, comment: '商品名称' })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '封面图' })
  cover!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '商品图片' })
  image!: string | null;

  @Column({ type: 'text', nullable: true, comment: '商品详情(HTML)' })
  description!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true, comment: '规格' })
  spec!: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true, comment: '单位' })
  unit!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '售价(元)' })
  price!: string;

  @Column({ name: 'cost_price', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '成本价(元)' })
  costPrice!: string | null;

  @Column({ type: 'int', default: 0, comment: '库存数量' })
  stock!: number;

  @Column({ name: 'lock_stock', type: 'int', default: 0, comment: '锁定库存（未支付订单）' })
  lockStock!: number;

  @Column({ name: 'warning_stock', type: 'int', default: 10, comment: '预警库存' })
  warningStock!: number;

  @Column({ type: 'int', default: 0, comment: '销量' })
  sales!: number;

  @Column({ type: 'int', default: 0, comment: '排序(越小越前)' })
  sort!: number;

  @Column({ name: 'is_hot', type: 'tinyint', default: 0, comment: '是否热销 0否 1是' })
  isHot!: number;

  @Column({ name: 'is_new', type: 'tinyint', default: 0, comment: '是否新品 0否 1是' })
  isNew!: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态 0下架 1上架' })
  status!: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}
