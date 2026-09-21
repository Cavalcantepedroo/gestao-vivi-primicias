const { Pool } = require('pg');
require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.includes('sua_senha_aqui')) {
    throw new Error(`Variável de ambiente ausente ou não configurada: ${name}`);
  }
  return value;
}

function getDatabaseConfig(urlName, prefix) {
  if (process.env[urlName]) return { connectionString: requireEnv(urlName), ssl: { rejectUnauthorized: false } };

  return {
    host: requireEnv(`${prefix}_HOST`),
    port: Number(requireEnv(`${prefix}_PORT`)),
    user: requireEnv(`${prefix}_USER`),
    password: requireEnv(`${prefix}_PASSWORD`),
    database: requireEnv(`${prefix}_DATABASE`),
  };
}

const viviConfig = getDatabaseConfig('DATABASE_URL_VIVI', 'DB_VIVI');
const primiciasConfig = getDatabaseConfig('DATABASE_URL_PRIMICIAS', 'DB_PRIMICIAS');

/**
 * Pool de conexão com o banco de dados da Vivi Semi-Joias.
 * Utiliza variáveis de ambiente prefixadas com DB_VIVI_.
 */
const viviPool = new Pool({
  ...viviConfig,
  // Configurações de pool recomendadas para produção
  max: 10,               // máximo de clientes simultâneos
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Pool de conexão com o banco de dados da primicias.
 * Utiliza variáveis de ambiente prefixadas com DB_PRIMICIAS_.
 */
const primiciasPool = new Pool({
  ...primiciasConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Testa a conectividade com os dois bancos de dados.
 * Lança um erro se qualquer uma das conexões falhar.
 */
async function testConnections() {
  try {
    const viviClient = await viviPool.connect();
    console.log('✅ Banco Vivi Semi-Joias: conectado com sucesso');
    viviClient.release();
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco Vivi Semi-Joias:', err.message);
    throw err;
  }

  try {
    const primiciasClient = await primiciasPool.connect();
    console.log('✅ Banco Primicias: conectado com sucesso');
    primiciasClient.release();
  } catch (err) {
    console.error('❌ Erro ao conectar ao banco Primicias:', err.message);
    throw err;
  }
}

module.exports = { viviPool, primiciasPool, testConnections };
