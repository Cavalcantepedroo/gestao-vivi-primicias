const { viviPool, primiciasPool } = require('./db');

const POOLS = {
  vivi: viviPool,
  primicias: primiciasPool,
};

function getPool(empresa) {
  const pool = POOLS[empresa];
  if (!pool) {
    throw new Error(`Empresa inválida: ${empresa}. Use "vivi" ou "primicias".`);
  }
  return pool;
}

async function listarProdutos(empresa) {
  const { rows } = await getPool(empresa).query(
    'SELECT * FROM produtos ORDER BY nome ASC'
  );
  return rows;
}

async function buscarProdutoPorCodigo(empresa, codigoDeBarras) {
  const { rows } = await getPool(empresa).query(
    'SELECT * FROM produtos WHERE codigo_de_barras = $1 LIMIT 1',
    [codigoDeBarras]
  );
  return rows[0] || null;
}

async function criarProduto(empresa, payload) {
  const { nome, codigo_de_barras, preco, quantidade_estoque = 0 } = payload;
  const { rows } = await getPool(empresa).query(
    `INSERT INTO produtos (nome, codigo_de_barras, preco, quantidade_estoque)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [nome, codigo_de_barras, preco, quantidade_estoque]
  );
  return rows[0];
}

async function criarVendaPdv(empresa, payload) {
  const { produto_id, quantidade, valor_total } = payload;
  const { rows } = await getPool(empresa).query(
    `INSERT INTO vendas_pdv (produto_id, quantidade, valor_total)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [produto_id, quantidade, valor_total]
  );
  return rows[0];
}

async function criarClienteLive(empresa, payload) {
  const { nome, telefone_whatsapp, status_carrinho = 'aberto' } = payload;
  const { rows } = await getPool(empresa).query(
    `INSERT INTO clientes_live (nome, telefone_whatsapp, status_carrinho)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [nome, telefone_whatsapp, status_carrinho]
  );
  return rows[0];
}

async function adicionarItemCarrinho(empresa, payload) {
  const { cliente_live_id, produto_id, quantidade, preco_unitario } = payload;
  const { rows } = await getPool(empresa).query(
    `INSERT INTO itens_carrinho_live (cliente_live_id, produto_id, quantidade, preco_unitario)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [cliente_live_id, produto_id, quantidade, preco_unitario]
  );
  return rows[0];
}

async function listarCarrinhoLive(empresa, clienteLiveId) {
  const { rows } = await getPool(empresa).query(
    `SELECT i.*, p.nome AS nome_produto, p.codigo_de_barras
     FROM itens_carrinho_live i
     JOIN produtos p ON p.id = i.produto_id
     WHERE i.cliente_live_id = $1
     ORDER BY i.criado_em DESC`,
    [clienteLiveId]
  );
  return rows;
}

module.exports = {
  getPool,
  listarProdutos,
  buscarProdutoPorCodigo,
  criarProduto,
  criarVendaPdv,
  criarClienteLive,
  adicionarItemCarrinho,
  listarCarrinhoLive,
};
