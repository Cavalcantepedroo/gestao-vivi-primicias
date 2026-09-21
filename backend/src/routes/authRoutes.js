const { Router } = require('express');
const { login, verificarSessao } = require('../controllers/authController');
const { autenticar } = require('../middleware/auth');

const router = Router();

router.post('/login', login);
router.get('/me', autenticar, verificarSessao);

module.exports = router;