const { app, initialize } = require('../src/server');

module.exports = async (req, res) => {
  // O navegador envia OPTIONS antes do login. Esse preflight não precisa
  // esperar conexão ou migração dos bancos para receber os headers CORS.
  if (req.method === 'OPTIONS') return app(req, res);

  await initialize();
  return app(req, res);
};