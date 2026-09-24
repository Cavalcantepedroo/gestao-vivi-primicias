const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { viviPool } = require('../database/db');
const { getJwtSecret, SESSION_COOKIE } = require('../middleware/auth');
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

async function login(req, res) {
  const username = String(req.body.username || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');

  if (!username || !senha) return res.status(400).json({ error: 'Informe nome de usuário e senha.' });

  try {
    const { rows } = await viviPool.query(
      'SELECT id, nome, username, email, senha_hash, perfil FROM usuarios WHERE LOWER(username) = $1 AND ativo = TRUE',
      [username]
    );
    const usuario = rows[0];
    if (!usuario) return res.status(401).json({ error: 'Usuário ou senha inválidos.' });

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) return res.status(401).json({ error: 'Usuário ou senha inválidos.' });

    const payload = { id: usuario.id, nome: usuario.nome, username: usuario.username, perfil: usuario.perfil };
    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '2h', algorithm: 'HS256' });
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 2 * 60 * 60 * 1000,
      path: '/',
    });
    res.json({ usuario: payload });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Não foi possível realizar o login.' });
  }
}

function verificarSessao(req, res) {
  res.json({ usuario: req.usuario });
}

function logout(req, res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
  res.status(204).send();
}

module.exports = { login, verificarSessao, logout };