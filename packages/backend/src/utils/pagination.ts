import { Knex } from 'knex';

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export async function paginate<T>(
  query: Knex.QueryBuilder,
  options: PaginationOptions,
): Promise<PaginatedResult<T>> {
  const { page, limit, sortBy, sortOrder = 'desc' } = options;
  const offset = (page - 1) * limit;

  // Clone query for count
  const countQuery = query.clone().clearSelect().clearOrder().count('* as total').first();
  const countResult = await countQuery as any;
  const total = parseInt(countResult?.total || '0', 10);

  // Apply sorting
  if (sortBy) {
    query.orderBy(sortBy, sortOrder);
  }

  // Apply pagination
  const data = await query.limit(limit).offset(offset) as T[];

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
