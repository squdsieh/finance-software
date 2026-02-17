import { config } from '../config';

const knexConfig = {
  development: {
    client: 'pg',
    connection: {
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
    },
    pool: { min: config.db.poolMin, max: config.db.poolMax },
    migrations: {
      directory: './migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
    },
  },
  production: {
    client: 'pg',
    connection: {
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: config.db.poolMin, max: config.db.poolMax },
    migrations: {
      directory: './migrations',
      extension: 'ts',
    },
  },
};

export default knexConfig;
module.exports = knexConfig;
