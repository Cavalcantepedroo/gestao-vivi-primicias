require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const { testConnections }  = require('./database/db');
const { initializeDatabase } = require('./database/initDatabase');
const produtosRoutes       = require('./routes/produtosRoutes');
const vendasRoutes         = require('./routes/vendasRoutes');
const dashboardRoutes      = require('./routes/dashboardRoutes');
const authRoutes           = require('./routes/authRoutes');
const { autenticar, exigirPerfil } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3001;
let initializationPromise;

// ---------------------------------------------------------------------------
// Middlewares globais
// ---------------------------------------------------------------------------
app.use(cors({
  origin(origin, callback) {
    const permitidas = (process.env.FRONTEND_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (!origin || permitidas.includes(origin)) return callback(null, true);
    return callback(new Error('Origem não permitida pelo CORS.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet());
app.use(express.json({ limit: '100kb' }));

app.use('/api/auth', authRoutes);

// ---------------------------------------------------------------------------
// Rotas Globais (Cross-Empresa)
// ---------------------------------------------------------------------------
app.use('/api/dashboard', autenticar, exigirPerfil('admin'), dashboardRoutes);

// ---------------------------------------------------------------------------
// Rotas de Empresa Específica (Injeta pool no req.db)
// Exemplos:
//   GET  /api/vivi/produtos
//   POST /api/primicias/vendas
// ---------------------------------------------------------------------------
app.use('/api/:empresa/produtos', autenticar, produtosRoutes);
app.use('/api/:empresa/vendas',   autenticar, vendasRoutes);

// Rota de health-check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handler de rotas não encontradas
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Handler de erros globais
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------
async function initialize() {
  if (!initializationPromise) {
    initializationPromise = testConnections().then(() => initializeDatabase());
  }
  return initializationPromise;
}

if (require.main === module) {
  initialize()
    .then(() => {
      app.listen(PORT, () => console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}\n`));
    })
    .catch((err) => {
      console.error('Falha ao iniciar o servidor:', err.message);
      process.exit(1);
    });
}

module.exports = { app, initialize };
