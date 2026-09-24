const jwt = require('jsonwebtoken');
const { parse } = require('cookie');

const SESSION_COOKIE = 'vivi_session';

function getJwtSecret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET deve existir e ter pelo menos 32 caracteres.');
  }
  return process.env.JWT_SECRET;
}

function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  const cookieToken = parse(req.headers.cookie || '')[SESSION_COOKIE];
  const token = bearerToken || cookieToken;

  if (!token) return res.status(401).json({ error: 'Autenticação necessária.' });

  try {
    req.usuario = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
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

module.exports = { autenticar, exigirPerfil, getJwtSecret, SESSION_COOKIE };