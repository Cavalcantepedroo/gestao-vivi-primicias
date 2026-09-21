const fs = require('fs');
const path = require('path');
const { viviPool, primiciasPool } = require('./db');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

async function resetLegacySchema(client) {
  const tablesToReset = [
    'itens_carrinho_live',
    'clientes_live',
    'vendas_pdv',
    'vendas',
    'movimentacoes_estoque',
    'produtos',
  ];

  for (const table of tablesToReset) {
    await client.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
  }
}

async function applySchema(pool, bancoNome) {
  const client = await pool.connect();

  try {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');

    console.log(`\n📦 Executando migração em: ${bancoNome}`);
    await client.query('BEGIN');
    if (process.env.RESET_DATABASE === 'true') {
      console.warn('⚠️ RESET_DATABASE=true: removendo dados existentes antes da migração.');
      await resetLegacySchema(client);
    }
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    await client.query(schemaSql);
    await client.query('COMMIT');

    console.log(`   ✅ Schema validado com sucesso para ${bancoNome}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`   ❌ Erro na migração de ${bancoNome}:`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function migrate() {
  for (const { pool, name } of [
    { pool: viviPool, name: 'Vivi Semi-Joias' },
    { pool: primiciasPool, name: 'Primicias' },
  ]) {
    await applySchema(pool, name);
  }

  console.log('\n🎉 Migração concluída para os dois bancos!\n');
}

if (require.main === module) {
  require('dotenv').config();
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrate };
