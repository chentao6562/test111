import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('stock_logs')
export class StockLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'product_id', type: 'bigint' })
  @Index()
  productId!: number;

  @Column({
    type: 'enum',
    enum: ['in', 'out', 'lock', 'unlock', 'adjust'],
    comment: '变动类型：in入库 out出库 lock锁定 unlock解锁 adjust调整',
  })
  @Index()
  type!: 'in' | 'out' | 'lock' | 'unlock' | 'adjust';

  @Column({ type: 'int', comment: '变动数量（正负）' })
  quantity!: number;

  @Column({ name: 'before_stock', type: 'int', comment: '变动前库存' })
  beforeStock!: number;

  @Column({ name: 'after_stock', type: 'int', comment: '变动后库存' })
  afterStock!: number;

  @Column({ type: 'varchar', length: 32, comment: '原因：purchase进货 sale销售 cancel取消 adjust调整' })
  reason!: string;

  @Column({ name: 'relation_type', type: 'varchar', length: 32, nullable: true, comment: '关联类型：order purchase' })
  relationType!: string | null;

  @Column({ name: 'relation_id', type: 'bigint', nullable: true, comment: '关联ID' })
  relationId!: number | null;

  @Column({ name: 'operator_type', type: 'varchar', length: 16, nullable: true, comment: '操作人类型：admin warehouse' })
  operatorType!: string | null;

  @Column({ name: 'operator_id', type: 'int', nullable: true, comment: '操作人ID' })
  operatorId!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '备注' })
  remark!: string | null;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  @Index()
  createdAt!: Date;
}
