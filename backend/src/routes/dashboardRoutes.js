const { Router } = require('express');
const { getFaturamento } = require('../controllers/dashboardController');

const router = Router();

// /api/dashboard/faturamento
router.get('/faturamento', getFaturamento);

module.exports = router;
