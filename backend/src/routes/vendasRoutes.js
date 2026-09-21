const { Router } = require('express');
const { resolveDb } = require('../middleware/resolveDb');
const {
  listarVendas,
  buscarVenda,
  criarVenda,
  resumoVendas,
  fecharVendaLive,
  listarCarrinhosLive,
  criarClienteLive,
  adicionarItemLive,
  removerItemLive,
  atualizarStatusCarrinho,
} = require('../controllers/vendasController');

const router = Router({ mergeParams: true });

router.use(resolveDb);

router.get('/relatorio/resumo', resumoVendas);   // antes de /:id para não colidir
router.get('/live', listarCarrinhosLive);
router.post('/live/clientes', criarClienteLive);
router.post('/live/itens', adicionarItemLive);
router.delete('/live/itens/:clienteLiveId/:produtoId', removerItemLive);
router.patch('/live/:clienteId/status', atualizarStatusCarrinho);
router.get('/', listarVendas);
router.get('/:id', buscarVenda);
router.post('/', criarVenda);
router.post('/live', fecharVendaLive);

module.exports = router;
