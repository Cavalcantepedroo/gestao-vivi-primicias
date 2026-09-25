/**
 * Controller de Produtos
 * Todas as operações usam req.db (pool injetado pelo middleware resolveDb),
 * por isso o mesmo controller serve para Vivi e primicias.
 */

// GET /api/:empresa/produtos
async function listarProdutos(req, res) {
  try {
    const { rows } = await req.db.query(
      'SELECT * FROM produtos ORDER BY nome ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro interno no controller de produtos:', err);
    res.status(500).json({ error: 'Não foi possível concluir a operação com o produto.' });
  }
}

// GET /api/:empresa/produtos/:id
async function buscarProduto(req, res) {
  try {
    const { rows } = await req.db.query(
      'SELECT * FROM produtos WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar produto:', err);
    res.status(500).json({ error: 'Não foi possível buscar o produto.' });
  }
}

// GET /api/:empresa/produtos/codigo/:codigo_de_barras
async function buscarProdutoPorCodigo(req, res) {
  try {
    const { rows } = await req.db.query(
      'SELECT * FROM produtos WHERE codigo_de_barras = $1',
      [req.params.codigo_de_barras]
    );
    if (!rows.length) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar produto por código:', err);
    res.status(500).json({ error: 'Não foi possível buscar o produto.' });
  }
}

// POST /api/:empresa/produtos
async function criarProduto(req, res) {
  const { nome, codigo_de_barras, preco, quantidade_estoque = 0 } = req.body;

  if (!nome || preco == null) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, preco' });
  }

  const client = await req.db.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO produtos (nome, codigo_de_barras, preco, quantidade_estoque)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nome, codigo_de_barras, preco, quantidade_estoque]
    );

    if (Number(quantidade_estoque) > 0) {
      await client.query(
        `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, observacao)
         VALUES ($1, 'entrada', $2, 'cadastro_inicial', 'Produto cadastrado com estoque inicial')`,
        [rows[0].id, Number(quantidade_estoque)]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Código de barras já cadastrado' });
    }
    console.error('Erro ao criar produto:', err);
    res.status(500).json({ error: 'Não foi possível criar o produto.' });
  } finally {
    client.release();
  }
}

// PUT /api/:empresa/produtos/:id
async function atualizarProduto(req, res) {
  const { nome, codigo_de_barras, preco, quantidade_estoque, motivo = 'ajuste_manual' } = req.body;

  const client = await req.db.connect();

  try {
    await client.query('BEGIN');

    const produtoAntes = await client.query(
      'SELECT id, nome, codigo_de_barras, preco, quantidade_estoque FROM produtos WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );

    if (!produtoAntes.rows.length) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const produtoAtual = produtoAntes.rows[0];
    const quantidadeAnterior = Number(produtoAtual.quantidade_estoque || 0);
    const novaQuantidade = quantidade_estoque == null ? quantidadeAnterior : Number(quantidade_estoque);

    const { rows } = await client.query(
      `UPDATE produtos
       SET nome = COALESCE($1, nome),
           codigo_de_barras = COALESCE($2, codigo_de_barras),
           preco = COALESCE($3, preco),
           quantidade_estoque = $4,
           atualizado_em = NOW()
       WHERE id = $5
       RETURNING *`,
      [nome, codigo_de_barras, preco, novaQuantidade, req.params.id]
    );

    if (quantidade_estoque != null && Number(quantidade_estoque) !== quantidadeAnterior) {
      const diferenca = novaQuantidade - quantidadeAnterior;
      if (diferenca > 0) {
        await client.query(
          `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, observacao)
           VALUES ($1, 'entrada', $2, $3, 'Entrada registrada por ajuste manual')`,
          [req.params.id, diferenca, motivo]
        );
      } else if (diferenca < 0) {
        await client.query(
          `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, observacao)
           VALUES ($1, 'saida', $2, $3, 'Saída registrada por ajuste manual')`,
          [req.params.id, Math.abs(diferenca), motivo]
        );
      }
    }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar produto:', err);
    res.status(500).json({ error: 'Não foi possível atualizar o produto.' });
  } finally {
    client.release();
  }
}

// DELETE /api/:empresa/produtos/:id
async function deletarProduto(req, res) {
  try {
    const { rowCount } = await req.db.query(
      'DELETE FROM produtos WHERE id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Produto não encontrado' });
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Produto possui vendas vinculadas e não pode ser excluído' });
    }
    console.error('Erro ao excluir produto:', err);
    res.status(500).json({ error: 'Não foi possível excluir o produto.' });
  }
}

async function listarMovimentacoes(req, res) {
  try {
    const { rows } = await req.db.query(`
      SELECT
        m.id,
        m.produto_id,
        p.nome AS produto_nome,
        m.tipo,
        m.quantidade,
        m.motivo,
        m.observacao,
        m.venda_id,
        m.created_at
      FROM movimentacoes_estoque m
      JOIN produtos p ON p.id = m.produto_id
      ORDER BY m.created_at DESC
    `);

    res.json(rows.map((mov) => ({
      ...mov,
      tipo_label: mov.tipo === 'entrada' ? 'Entrada' : mov.tipo === 'saida' ? 'Saída' : 'Ajuste',
      created_at: mov.created_at,
    })));
  } catch (err) {
    console.error('Erro ao listar movimentações:', err);
    res.status(500).json({ error: 'Não foi possível listar as movimentações.' });
  }
}

async function deletarMovimentacao(req, res) {
  const client = await req.db.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id, produto_id, tipo, quantidade, venda_id
       FROM movimentacoes_estoque
       WHERE id = $1
       FOR UPDATE`,
      [req.params.id]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Movimentação não encontrada.' });
    }

    const movimentacao = rows[0];
    if (!['entrada', 'saida'].includes(movimentacao.tipo)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Não é possível reverter este tipo de movimentação.' });
    }

    const estoqueAtualizado = movimentacao.tipo === 'entrada'
      ? await client.query(
        `UPDATE produtos
         SET quantidade_estoque = quantidade_estoque - $1, atualizado_em = NOW()
         WHERE id = $2 AND quantidade_estoque >= $1
         RETURNING id`,
        [movimentacao.quantidade, movimentacao.produto_id]
      )
      : await client.query(
        `UPDATE produtos
         SET quantidade_estoque = quantidade_estoque + $1, atualizado_em = NOW()
         WHERE id = $2
         RETURNING id`,
        [movimentacao.quantidade, movimentacao.produto_id]
      );

    if (!estoqueAtualizado.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Não é possível apagar esta entrada porque o estoque atual ficaria negativo.',
      });
    }

    if (movimentacao.venda_id) {
      await client.query('DELETE FROM vendas WHERE id = $1', [movimentacao.venda_id]);
    }

    await client.query('DELETE FROM movimentacoes_estoque WHERE id = $1', [movimentacao.id]);
    await client.query('COMMIT');
    return res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao excluir movimentação:', err);
    return res.status(500).json({ error: 'Não foi possível excluir a movimentação.' });
  } finally {
    client.release();
  }
}

module.exports = {
  listarProdutos,
  buscarProduto,
  buscarProdutoPorCodigo,
  criarProduto,
  atualizarProduto,
  deletarProduto,
  listarMovimentacoes,
  deletarMovimentacao,
};
