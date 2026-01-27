/**
 * 通用列表查询构建器
 * 【2026-01-17 代码重构】统一列表查询模式
 *
 * 用于简化 findMany + count + 分页 的重复代码
 */

/**
 * 列表查询结果
 */
export interface ListQueryResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 列表查询配置
 */
export interface ListQueryConfig {
  /** 默认页大小 */
  defaultPageSize?: number;
  /** 最大页大小 */
  maxPageSize?: number;
}

/**
 * 通用列表查询构建器
 */
export class ListQueryBuilder<TWhere extends object = any> {
  private where: TWhere;
  private orderBy: any;
  private skip: number = 0;
  private take: number = 20;
  private page: number = 1;
  private pageSize: number = 20;
  private readonly config: ListQueryConfig;

  constructor(config: ListQueryConfig = {}) {
    this.where = {} as TWhere;
    this.orderBy = { createdAt: 'desc' };
    this.config = {
      defaultPageSize: config.defaultPageSize || 20,
      maxPageSize: config.maxPageSize || 100,
    };
    this.pageSize = this.config.defaultPageSize!;
    this.take = this.pageSize;
  }

  /**
   * 设置基础查询条件
   */
  setWhere(where: TWhere): this {
    this.where = { ...where };
    return this;
  }

  /**
   * 添加查询条件
   */
  addWhere(condition: Partial<TWhere>): this {
    this.where = { ...this.where, ...condition } as TWhere;
    return this;
  }

  /**
   * 设置分页
   */
  paginate(page?: number | string, pageSize?: number | string): this {
    const parsedPage = typeof page === 'string' ? parseInt(page, 10) : page;
    const parsedPageSize = typeof pageSize === 'string' ? parseInt(pageSize, 10) : pageSize;

    this.page = Math.max(1, parsedPage || 1);
    this.pageSize = Math.min(
      Math.max(1, parsedPageSize || this.config.defaultPageSize!),
      this.config.maxPageSize!
    );
    this.skip = (this.page - 1) * this.pageSize;
    this.take = this.pageSize;
    return this;
  }

  /**
   * 添加关键词搜索（OR条件）
   */
  search(keyword: string | undefined, fields: string[]): this {
    if (!keyword?.trim() || fields.length === 0) return this;

    const trimmed = keyword.trim();
    const orConditions = fields.map(field => ({
      [field]: { contains: trimmed },
    }));

    (this.where as any).OR = orConditions;
    return this;
  }

  /**
   * 添加日期范围过滤
   */
  dateRange(
    startDate: string | undefined,
    endDate: string | undefined,
    dateField: string = 'createdAt'
  ): this {
    if (!startDate && !endDate) return this;

    const dateCondition: any = {};

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      dateCondition.gte = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateCondition.lte = end;
    }

    (this.where as any)[dateField] = dateCondition;
    return this;
  }

  /**
   * 添加状态过滤
   */
  status(status: string | number | undefined, field: string = 'status'): this {
    if (status === undefined || status === '' || status === null) return this;

    if (typeof status === 'string') {
      if (status.includes(',')) {
        // 支持多状态，如 "0,1,2"
        (this.where as any)[field] = {
          in: status.split(',').map(s => parseInt(s.trim(), 10)),
        };
      } else {
        (this.where as any)[field] = parseInt(status, 10);
      }
    } else {
      (this.where as any)[field] = status;
    }

    return this;
  }

  /**
   * 设置排序
   */
  sort(field: string, order: 'asc' | 'desc' = 'desc'): this {
    this.orderBy = { [field]: order };
    return this;
  }

  /**
   * 设置多字段排序
   */
  sortMultiple(orders: Array<{ field: string; order: 'asc' | 'desc' }>): this {
    this.orderBy = orders.map(o => ({ [o.field]: o.order }));
    return this;
  }

  /**
   * 获取构建的查询参数
   */
  build(): {
    where: TWhere;
    orderBy: any;
    skip: number;
    take: number;
  } {
    return {
      where: this.where,
      orderBy: this.orderBy,
      skip: this.skip,
      take: this.take,
    };
  }

  /**
   * 获取分页信息
   */
  getPagination(): { page: number; pageSize: number } {
    return { page: this.page, pageSize: this.pageSize };
  }

  /**
   * 构建分页结果
   */
  buildResult<T>(list: T[], total: number): ListQueryResult<T> {
    return {
      list,
      total,
      page: this.page,
      pageSize: this.pageSize,
      totalPages: Math.ceil(total / this.pageSize),
    };
  }
}

/**
 * 创建列表查询构建器的快捷函数
 */
export function createListQuery<TWhere extends object = any>(
  config?: ListQueryConfig
): ListQueryBuilder<TWhere> {
  return new ListQueryBuilder<TWhere>(config);
}

/**
 * 执行分页查询的快捷函数
 * @param model Prisma模型（需要有 findMany 和 count 方法）
 * @param builder 列表查询构建器
 * @param include 关联查询
 * @param transform 数据转换函数
 */
export async function executeListQuery<T, TModel extends { findMany: Function; count: Function }>(
  model: TModel,
  builder: ListQueryBuilder,
  options?: {
    include?: any;
    transform?: (item: any) => T;
  }
): Promise<ListQueryResult<T>> {
  const query = builder.build();
  const pagination = builder.getPagination();

  const [list, total] = await Promise.all([
    model.findMany({
      where: query.where,
      orderBy: query.orderBy,
      skip: query.skip,
      take: query.take,
      include: options?.include,
    }),
    model.count({ where: query.where }),
  ]);

  const transformedList = options?.transform ? list.map(options.transform) : list;

  return {
    list: transformedList,
    total,
    ...pagination,
    totalPages: Math.ceil(total / pagination.pageSize),
  };
}
