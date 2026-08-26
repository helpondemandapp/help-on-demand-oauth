import sql from 'mssql';
import { DbConnectionStringsSchema, fetchSecret } from '/opt/nodejs/core/secrets.js';
import { setContext } from '/opt/nodejs/logging/wideEvent.js';

let pool: sql.ConnectionPool | null = null;

export const openSql = async () => {
  if (pool !== null) return;
  const secretStart = Date.now();
  const {
    lrq_server: server,
    lrq_username: user,
    lrq_password: password,
  } = await fetchSecret('db_connection_strings', DbConnectionStringsSchema);
  const secretEnd = Date.now();
  setContext('dbSecretFetchDuration', secretEnd - secretStart);
  const connectionStart = Date.now();
  pool = await sql.connect({
    user,
    password,
    server,
    port: 1433,
    database: 'LRQ',
    requestTimeout: 15 * 60 * 1000, // 15 minutes
    pool: {
      min: 0,
      max: 100,
    },
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  });
  const connectionEnd = Date.now();
  setContext('dbConnectionDuration', connectionEnd - connectionStart);
};

export const lrq = () => {
  if (pool === null) {
    throw new Error('SQL connection pool is not initialized. Call openSql() first.');
  }
  return pool;
};
