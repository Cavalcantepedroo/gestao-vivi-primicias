const { Router } = require('express');
const { resolveDb } = require('../middleware/resolveDb');
const {
  listarProdutos,
  buscarProduto,
  buscarProdutoPorCodigo,
  criarProduto,
  atualizarProduto,
  deletarProduto,
  listarMovimentacoes,
  deletarMovimentacao,
} = require('../controllers/produtosController');

const router = Router({ mergeParams: true });

// O middleware resolveDb é aplicado em todas as rotas deste router
router.use(resolveDb);

router.get('/',        listarProdutos);
router.get('/movimentacoes', listarMovimentacoes);
router.delete('/movimentacoes/:id', deletarMovimentacao);
router.get('/codigo/:codigo_de_barras', buscarProdutoPorCodigo); // Deve vir antes de /:id
router.get('/:id',     buscarProduto);
router.post('/',       criarProduto);
router.put('/:id',     atualizarProduto);
router.delete('/:id',  deletarProduto);

module.exports = router;
