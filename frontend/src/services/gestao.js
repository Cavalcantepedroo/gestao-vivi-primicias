import { getApi, viviApi, primiciasApi } from './api';

export { getApi, viviApi, primiciasApi };

// ---- Produtos ---------------------------------------------------------------

export function getProdutos(empresa) {
  return getApi(empresa).get('/produtos');
}

export function getMovimentacoesEstoque(empresa) {
  return getApi(empresa).get('/produtos/movimentacoes');
}

export function deleteMovimentacaoEstoque(empresa, id) {
  return getApi(empresa).delete(`/produtos/movimentacoes/${id}`);
}

export function getProduto(empresa, id) {
  return getApi(empresa).get(`/produtos/${id}`);
}

export function getProdutoByCodigo(empresa, codigo) {
  return getApi(empresa).get(`/produtos/codigo/${codigo}`);
}

export function createProduto(empresa, data) {
  return getApi(empresa).post('/produtos', data);
}

export function updateProduto(empresa, id, data) {
  return getApi(empresa).put(`/produtos/${id}`, data);
}

export function deleteProduto(empresa, id) {
  return getApi(empresa).delete(`/produtos/${id}`);
}

// ---- Vendas -----------------------------------------------------------------

export function getVendas(empresa) {
  return getApi(empresa).get('/vendas');
}

export function createVenda(empresa, data) {
  return getApi(empresa).post('/vendas', data);
}

export function getResumoVendas(empresa) {
  return getApi(empresa).get('/vendas/relatorio/resumo');
}
