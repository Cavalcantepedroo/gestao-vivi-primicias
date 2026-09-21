const { app, initialize } = require('../src/server');

module.exports = async (req, res) => {
  await initialize();
  return app(req, res);
};