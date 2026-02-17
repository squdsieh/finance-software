/**
 * CloudBooks Pro - Backend Test Setup
 *
 * This file runs before all test suites. It mocks external dependencies
 * (database, Redis, email) and sets test environment variables so that
 * unit tests can run in complete isolation without any infrastructure.
 */

// ---------------------------------------------------------------------------
// Environment variables for tests
// ---------------------------------------------------------------------------
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-signing';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'cloudbooks_test';
process.env.DB_USER = 'cloudbooks_test';
process.env.DB_PASSWORD = 'cloudbooks_test_password';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-lo!';
process.env.APP_URL = 'http://localhost:5173';
process.env.API_URL = 'http://localhost:3001';
process.env.EMAIL_FROM = 'test@cloudbooks.pro';

// ---------------------------------------------------------------------------
// Mock: Database (knex)
// ---------------------------------------------------------------------------
const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  first: jest.fn().mockResolvedValue(null),
  insert: jest.fn().mockResolvedValue([]),
  update: jest.fn().mockResolvedValue(1),
  delete: jest.fn().mockResolvedValue(1),
  del: jest.fn().mockResolvedValue(1),
  join: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  count: jest.fn().mockResolvedValue([{ count: '0' }]),
  raw: jest.fn().mockResolvedValue({}),
  withSchema: jest.fn().mockReturnThis(),
  table: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  whereNot: jest.fn().mockReturnThis(),
  whereNull: jest.fn().mockReturnThis(),
  whereNotNull: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  having: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  transacting: jest.fn().mockReturnThis(),
};

const mockTransaction = {
  ...mockQueryBuilder,
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};

// The mock database callable: db('table_name') returns query builder
const mockDb = jest.fn().mockReturnValue(mockQueryBuilder);

// Also attach query builder methods to the db itself (for db.raw, db.withSchema, etc.)
Object.assign(mockDb, {
  ...mockQueryBuilder,
  raw: jest.fn().mockResolvedValue({}),
  transaction: jest.fn().mockImplementation(async (callback: (trx: any) => Promise<any>) => {
    const trx = jest.fn().mockReturnValue(mockTransaction);
    Object.assign(trx, mockTransaction);
    return callback(trx);
  }),
  destroy: jest.fn().mockResolvedValue(undefined),
});

jest.mock('@/database/connection', () => ({
  getDatabase: jest.fn(() => mockDb),
  getTenantDatabase: jest.fn(() => mockDb),
  testConnection: jest.fn().mockResolvedValue(true),
  closeConnection: jest.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Mock: Redis / ioredis
// ---------------------------------------------------------------------------
const mockRedisClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(-1),
  exists: jest.fn().mockResolvedValue(0),
  incr: jest.fn().mockResolvedValue(1),
  decr: jest.fn().mockResolvedValue(0),
  hget: jest.fn().mockResolvedValue(null),
  hset: jest.fn().mockResolvedValue(1),
  hdel: jest.fn().mockResolvedValue(1),
  hgetall: jest.fn().mockResolvedValue({}),
  keys: jest.fn().mockResolvedValue([]),
  flushdb: jest.fn().mockResolvedValue('OK'),
  subscribe: jest.fn().mockResolvedValue(undefined),
  publish: jest.fn().mockResolvedValue(0),
  on: jest.fn(),
  status: 'ready',
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisClient);
});

// ---------------------------------------------------------------------------
// Mock: Email (nodemailer)
// ---------------------------------------------------------------------------
jest.mock('@/utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  compileTemplate: jest.fn().mockReturnValue('<html>Test email</html>'),
  EMAIL_TEMPLATES: {
    verifyEmail: 'verify-email',
    resetPassword: 'reset-password',
    invoiceEmail: 'invoice-email',
    inviteUser: 'invite-user',
  },
}));

// ---------------------------------------------------------------------------
// Mock: Winston logger
// ---------------------------------------------------------------------------
jest.mock('@/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock: Audit log utility
// ---------------------------------------------------------------------------
jest.mock('@/utils/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Export mocks so individual tests can configure them
// ---------------------------------------------------------------------------
export { mockDb, mockQueryBuilder, mockTransaction, mockRedisClient };

// ---------------------------------------------------------------------------
// Global hooks
// ---------------------------------------------------------------------------
beforeAll(() => {
  // Silence console output during tests unless debugging
  if (!process.env.DEBUG_TESTS) {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  }
});

afterAll(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  // Clear all mock call counts between tests to ensure isolation
  jest.clearAllMocks();
});
