const { viviPool, primiciasPool } = require('./db');
const { migrate } = require('./migrate');
const bcrypt = require('bcryptjs');

async function ensureDefaultUsers() {
  const users = [
    {
      nome: 'Administrador',
      username: process.env.AUTH_ADMIN_USERNAME || 'admin',
      email: process.env.AUTH_ADMIN_EMAIL || 'admin@vivi.local',
      senha: process.env.AUTH_ADMIN_PASSWORD || 'Admin@123456',
      perfil: 'admin',
    },
    {
      nome: 'Vendedor',
      username: process.env.AUTH_VENDEDOR_USERNAME || 'vendedor',
      email: process.env.AUTH_VENDEDOR_EMAIL || 'vendedor@vivi.local',
      senha: process.env.AUTH_VENDEDOR_PASSWORD || 'Vendedor@123456',
      perfil: 'vendedor',
    },
  ];
  const client = await viviPool.connect();
  try {
    for (const user of users) {
      const senhaHash = await bcrypt.hash(user.senha, 12);
      await client.query(
        `INSERT INTO usuarios (nome, username, email, senha_hash, perfil)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ((LOWER(username))) DO UPDATE SET
           nome = EXCLUDED.nome,
           email = EXCLUDED.email,
           senha_hash = EXCLUDED.senha_hash,
           perfil = EXCLUDED.perfil,
           ativo = TRUE,
           atualizado_em = NOW()`,
        [user.nome, user.username.toLowerCase(), user.email.toLowerCase(), senhaHash, user.perfil]
      );
    }
  } finally {
    client.release();
  }
}

async function initializeDatabase() {
  console.log('🚀 Inicializando banco de dados...');
  await migrate();
  await ensureDefaultUsers();

  console.log('✅ Estrutura verificada em todos os bancos.');
}

if (require.main === module) {
  require('dotenv').config();
  initializeDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Falha ao inicializar o banco:', err.message);
      process.exit(1);
    });
}

module.exports = { initializeDatabase, ensureDefaultUsers };
