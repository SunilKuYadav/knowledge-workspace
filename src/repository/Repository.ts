/**
 * Generic repository interface for CRUD operations.
 * All data access layers implement this interface to enable
 * implementation swapping without changing application logic.
 */
export interface Repository<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
