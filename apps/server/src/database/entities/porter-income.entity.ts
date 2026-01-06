import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('porter_incomes')
export class PorterIncome {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'porter_id', type: 'int' })
  @Index()
  porterId!: number;

  @Column({ name: 'task_id', type: 'bigint' })
  taskId!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '金额' })
  amount!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'settled', 'withdrawn'],
    default: 'pending',
    comment: '状态',
  })
  @Index()
  status!: 'pending' | 'settled' | 'withdrawn';

  @Column({ name: 'settled_at', type: 'datetime', nullable: true, comment: '结算时间' })
  settledAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;
}
