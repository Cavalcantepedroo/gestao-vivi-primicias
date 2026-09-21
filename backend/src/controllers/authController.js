const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { viviPool } = require('../database/db');
const { getJwtSecret } = require('../middleware/auth');

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
    if (!usuario) return res.status(401).json({ error: 'Usuário não encontrado.' });

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) return res.status(401).json({ error: 'Senha incorreta.' });

    const payload = { id: usuario.id, nome: usuario.nome, username: usuario.username, perfil: usuario.perfil };
    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '8h' });
    res.json({ token, usuario: payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function verificarSessao(req, res) {
  res.json({ usuario: req.usuario });
}

module.exports = { login, verificarSessao };