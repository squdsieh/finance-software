import knex, { Knex } from 'knex';
import { config } from '../config';
import { logger } from '../config/logger';

let db: Knex;

export function getDatabase(): Knex {
  if (!db) {
    db = knex({
      client: 'pg',
      connection: {
        host: config.db.host,
        port: config.db.port,
        database: config.db.name,
        user: config.db.user,
        password: config.db.password,
      },
      pool: {
        min: config.db.poolMin,
        max: config.db.poolMax,
        afterCreate: (conn: any, done: any) => {
          conn.query('SET timezone = "UTC"', (err: Error) => {
            done(err, conn);
          });
        },
      },
    });
  }
  return db;
}

export function getTenantDatabase(tenantSchema: string): Knex {
  const tenantDb = getDatabase();
  return tenantDb.withSchema(tenantSchema);
}

export async function testConnection(): Promise<boolean> {
  try {
    const db = getDatabase();
    await db.raw('SELECT 1');
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    return false;
  }
}

export async function closeConnection(): Promise<void> {
  if (db) {
    await db.destroy();
    logger.info('Database connection closed');
  }
}
