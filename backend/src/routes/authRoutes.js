const { Router } = require('express');
const { login, verificarSessao, logout } = require('../controllers/authController');
const { autenticar } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = Router();

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 6,
	standardHeaders: 'draft-7',
	legacyHeaders: false,
	message: { error: 'Muitas tentativas de login. Tente novamente mais tarde.' },
});

router.post('/login', loginLimiter, login);
router.get('/me', autenticar, verificarSessao);
router.post('/logout', logout);

module.exports = router;