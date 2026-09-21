/**
 * Middleware que resolve qual pool de banco de dados usar
 * com base no parâmetro de rota :empresa.
 *
 * Rotas devem incluir /:empresa/ no prefixo, ex.:
 *   GET /api/vivi/produtos
 *   GET /api/primicias/vendas
 *
 * O pool resolvido fica disponível em req.db para os controllers.
 */
const { viviPool, primiciasPool } = require('../database/db');

const POOLS = {
  vivi:       viviPool,
  primicias: primiciasPool,
};

function resolveDb(req, res, next) {
  const empresa = req.params.empresa?.toLowerCase();

  if (!POOLS[empresa]) {
    return res.status(400).json({
      error: `Empresa inválida: "${empresa}". Use "vivi" ou "primicias".`,
    });
  }

  req.db     = POOLS[empresa];
  req.empresa = empresa;
  next();
}

module.exports = { resolveDb };
