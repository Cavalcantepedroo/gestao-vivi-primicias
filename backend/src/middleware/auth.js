const jwt = require('jsonwebtoken');

function getJwtSecret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET deve existir e ter pelo menos 32 caracteres.');
  }
  return process.env.JWT_SECRET;
}

function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Autenticação necessária.' });

  try {
    req.usuario = jwt.verify(token, getJwtSecret());
    next();
  } catch (_err) {
    return res.status(401).json({ error: 'Sessão expirada ou token inválido.' });
  }
}

function exigirPerfil(...perfis) {
  return (req, res, next) => {
    if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar este recurso.' });
    }
    next();
  };
}

module.exports = { autenticar, exigirPerfil, getJwtSecret };