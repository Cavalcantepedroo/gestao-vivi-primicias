/**
 * Controller de Vendas
 * Usa req.db para operar no banco correto (Vivi ou Prprimiciasimissias).
 */

// GET /api/:empresa/vendas
async function listarVendas(req, res) {
  try {
    const { rows } = await req.db.query(`
      SELECT
        v.id,
        v.produto_id,
        p.nome          AS produto_nome,
        v.quantidade,
        v.valor_total,
        v.data_venda
      FROM vendas v
      JOIN produtos p ON p.id = v.produto_id
      ORDER BY v.data_venda DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erro interno no controller de vendas:', err);
    res.status(500).json({ error: 'Não foi possível concluir a operação de venda.' });
  }
}

// GET /api/:empresa/vendas/:id
async function buscarVenda(req, res) {
  try {
    const { rows } = await req.db.query(
      `SELECT v.*, p.nome AS produto_nome
       FROM vendas v
       JOIN produtos p ON p.id = v.produto_id
       WHERE v.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Venda não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar venda:', err);
    res.status(500).json({ error: 'Não foi possível buscar a venda.' });
  }
}

async function listarCarrinhosLive(req, res) {
  try {
    const { rows } = await req.db.query(`
      SELECT
        c.id,
        c.nome,
        c.telefone_whatsapp AS whatsapp,
        c.status_carrinho,
        COALESCE(
          json_agg(
            json_build_object(
              'produto_id', i.produto_id,
              'nome', p.nome,
              'preco', i.preco_unitario,
              'quantidade', i.quantidade,
              'valor_total', (i.quantidade * i.preco_unitario)
            )
            ORDER BY i.criado_em DESC
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'::json
        ) AS itens
      FROM clientes_live c
      LEFT JOIN itens_carrinho_live i ON i.cliente_live_id = c.id
      LEFT JOIN produtos p ON p.id = i.produto_id
      WHERE c.status_carrinho = 'aberto'
      GROUP BY c.id, c.nome, c.telefone_whatsapp, c.status_carrinho
      ORDER BY c.criado_em DESC
    `);

    const clientes = rows.map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      whatsapp: cliente.whatsapp,
      status_carrinho: cliente.status_carrinho,
      itens: Array.isArray(cliente.itens) ? cliente.itens.map((item) => ({
        produto_id: item.produto_id,
        nome: item.nome,
        preco: Number(item.preco),
        quantidade: Number(item.quantidade),
        valor_total: Number(item.valor_total),
      })) : [],
    }));

    res.json(clientes);
  } catch (err) {
    console.error('Erro ao listar carrinhos:', err);
    res.status(500).json({ error: 'Não foi possível listar os carrinhos.' });
  }
}

async function criarClienteLive(req, res) {
  const { nome, telefone_whatsapp } = req.body;

  if (!nome || !telefone_whatsapp) {
    return res.status(400).json({ error: 'Nome e telefone_whatsapp são obrigatórios' });
  }

  try {
    const { rows } = await req.db.query(
      `INSERT INTO clientes_live (nome, telefone_whatsapp, status_carrinho)
       VALUES ($1, $2, 'aberto')
       RETURNING *`,
      [nome, telefone_whatsapp]
    );

    res.status(201).json({
      id: rows[0].id,
      nome: rows[0].nome,
      whatsapp: rows[0].telefone_whatsapp,
      status_carrinho: rows[0].status_carrinho,
      itens: [],
    });
  } catch (err) {
    console.error('Erro ao criar cliente da live:', err);
    res.status(500).json({ error: 'Não foi possível criar o cliente.' });
  }
}

async function adicionarItemLive(req, res) {
  const { cliente_live_id, produto_id, quantidade, preco_unitario } = req.body;

  if (!cliente_live_id || !produto_id || !quantidade || quantidade <= 0) {
    return res.status(400).json({ error: 'cliente_live_id, produto_id e quantidade são obrigatórios' });
  }

  try {
    const { rows } = await req.db.query(
      `INSERT INTO itens_carrinho_live (cliente_live_id, produto_id, quantidade, preco_unitario)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cliente_live_id, produto_id)
       DO UPDATE SET quantidade = itens_carrinho_live.quantidade + EXCLUDED.quantidade,
                    preco_unitario = EXCLUDED.preco_unitario
       RETURNING *`,
      [cliente_live_id, produto_id, quantidade, preco_unitario || 0]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erro ao adicionar item ao carrinho:', err);
    res.status(500).json({ error: 'Não foi possível adicionar o item.' });
  }
}

async function removerItemLive(req, res) {
  const { clienteLiveId, produtoId } = req.params;

  try {
    const { rowCount } = await req.db.query(
      `DELETE FROM itens_carrinho_live
       WHERE cliente_live_id = $1 AND produto_id = $2`,
      [clienteLiveId, produtoId]
    );

    if (!rowCount) {
      return res.status(404).json({ error: 'Item do carrinho não encontrado' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Erro ao remover item do carrinho:', err);
    res.status(500).json({ error: 'Não foi possível remover o item.' });
  }
}

async function atualizarStatusCarrinho(req, res) {
  const { clienteId } = req.params;
  const { status_carrinho } = req.body;

  if (!status_carrinho) {
    return res.status(400).json({ error: 'status_carrinho é obrigatório' });
  }

  try {
    const { rows } = await req.db.query(
      `UPDATE clientes_live
       SET status_carrinho = $1, atualizado_em = NOW()
       WHERE id = $2
       RETURNING *`,
      [status_carrinho, clienteId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Cliente da live não encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar carrinho:', err);
    res.status(500).json({ error: 'Não foi possível atualizar o carrinho.' });
  }
}

// POST /api/:empresa/vendas
// Registra uma venda com múltiplos itens (carrinho) e decrementa o estoque atomicamente.
async function criarVenda(req, res) {
  const { itens, origem = 'pdv' } = req.body;
  const motivoVenda = origem === 'live' ? 'Venda Live' : 'Venda PDV';

  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: 'É necessário informar um array de itens' });
  }

  const client = await req.db.connect();
  try {
    await client.query('BEGIN');

    const vendasRegistradas = [];

    // Processa cada item do carrinho
    for (const item of itens) {
      const { produto_id, quantidade } = item;
      
      if (!produto_id || !quantidade || quantidade <= 0) {
        throw new Error(`Item inválido: produto_id=${produto_id}, quantidade=${quantidade}`);
      }

      // Busca o produto com lock para evitar race condition no estoque
      const { rows: produtos } = await client.query(
        'SELECT id, preco, quantidade_estoque, nome FROM produtos WHERE id = $1 FOR UPDATE',
        [produto_id]
      );

      if (!produtos.length) {
        throw new Error(`Produto não encontrado (ID: ${produto_id})`);
      }

      const produto = produtos[0];
      if (produto.quantidade_estoque < quantidade) {
        throw new Error(
          `Estoque insuficiente para "${produto.nome}". Solicitado: ${quantidade}, Disponível: ${produto.quantidade_estoque}`
        );
      }

      const valor_total = (produto.preco * quantidade).toFixed(2);

      // Registra a venda do item
      const { rows: vendas } = await client.query(
        `INSERT INTO vendas (produto_id, quantidade, valor_total)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [produto_id, quantidade, valor_total]
      );

      // Decrementa o estoque
      await client.query(
        `UPDATE produtos
         SET quantidade_estoque = quantidade_estoque - $1,
             atualizado_em = NOW()
         WHERE id = $2`,
        [quantidade, produto_id]
      );

      await client.query(
        `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, observacao)
         VALUES ($1, 'saida', $2, $3, $4)`,
        [produto_id, quantidade, motivoVenda, `Saída registrada automaticamente por ${motivoVenda}`]
      );

      vendasRegistradas.push(vendas[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Venda registrada com sucesso', vendas: vendasRegistradas });
  } catch (err) {
    await client.query('ROLLBACK');
    // Se for nosso erro validado acima, passamos 400. Se for de banco, 500.
    const isValidationError = err.message.includes('Estoque insuficiente') || err.message.includes('Item inválido') || err.message.includes('não encontrado');
    console.error('Erro ao registrar venda:', err);
    res.status(isValidationError ? 400 : 500).json({
      error: isValidationError ? err.message : 'Não foi possível registrar a venda.',
    });
  } finally {
    client.release();
  }
}

// POST /api/:empresa/vendas/live
// Fecha o carrinho da live, dá baixa no estoque e envia cobrança no WhatsApp
async function fecharVendaLive(req, res) {
  const { cliente, itens } = req.body;
  const { enviarMensagemWhatsApp } = require('../services/whatsapp');

  if (!cliente || !cliente.nome || !cliente.whatsapp) {
    return res.status(400).json({ error: 'Dados do cliente incompletos (nome, whatsapp).' });
  }

  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: 'O carrinho está vazio.' });
  }

  const client = await req.db.connect();
  try {
    await client.query('BEGIN');
    let valorTotalPedido = 0;
    const resumoItens = [];

    // Mesma lógica segura de transação e bloqueio de estoque
    for (const item of itens) {
      const { produto_id, quantidade } = item;
      
      const { rows: produtos } = await client.query(
        'SELECT id, preco, quantidade_estoque, nome FROM produtos WHERE id = $1 FOR UPDATE',
        [produto_id]
      );

      if (!produtos.length) throw new Error(`Produto não encontrado (ID: ${produto_id})`);
      
      const produto = produtos[0];
      if (produto.quantidade_estoque < quantidade) {
        throw new Error(`Estoque insuficiente para "${produto.nome}".`);
      }

      const valorItem = Number(produto.preco) * quantidade;
      valorTotalPedido += valorItem;

      await client.query(
        `INSERT INTO vendas (produto_id, quantidade, valor_total) VALUES ($1, $2, $3)`,
        [produto_id, quantidade, valorItem.toFixed(2)]
      );

      await client.query(
        `UPDATE produtos SET quantidade_estoque = quantidade_estoque - $1, atualizado_em = NOW() WHERE id = $2`,
        [quantidade, produto_id]
      );

      await client.query(
        `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, observacao)
         VALUES ($1, 'saida', $2, 'Venda Live', 'Saída registrada automaticamente por Venda Live')`,
        [produto_id, quantidade]
      );

      resumoItens.push(`- ${quantidade}x ${produto.nome} (R$ ${Number(produto.preco).toFixed(2)})`);
    }

    await client.query('COMMIT');

    // Montar texto da cobrança
    const nomeEmpresa = req.empresa === 'vivi' ? 'Vivi Semi-Joias' : 'Primícias Acessórios';
    const totalFormatado = valorTotalPedido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const chavePix = req.empresa === 'vivi' ? 'cnpj-vivi@email.com' : 'cnpj-primicias@email.com'; // Exemplo fictício

    const mensagem = `Olá, *${cliente.nome}*! Tudo bem? \u{1F496}\n` +
      `Aqui é da ${nomeEmpresa}. Seu pedido na nossa live foi separado com muito carinho!\n\n` +
      `*Resumo do Pedido:*\n` +
      resumoItens.join('\n') + `\n\n` +
      `*Total da Compra: ${totalFormatado}*\n\n` +
      `Para finalizar, sua chave PIX para pagamento é:\n` +
      `${chavePix}\n\n` +
      `Por favor, nos envie o comprovante por aqui assim que efetuar o pagamento. Muito obrigada por comprar conosco! \u{1F970}\u{1F6CD}\u{FE0F}`;

    // Disparar WhatsApp em background (não bloqueia a resposta se demorar uns ms a mais)
    enviarMensagemWhatsApp(cliente.whatsapp, mensagem).catch(err => {
      console.error(`Falha ao notificar ${cliente.nome} (${cliente.whatsapp}):`, err.message);
    });

    res.status(200).json({ message: 'Venda finalizada e notificação agendada com sucesso!' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao fechar venda da live:', err);
    res.status(500).json({ error: 'Não foi possível finalizar a venda da live.' });
  } finally {
    client.release();
  }
}

// GET /api/:empresa/vendas/relatorio/resumo
// Retorna o total de vendas e receita agrupado por produto.
async function resumoVendas(req, res) {
  try {
    const { rows } = await req.db.query(`
      SELECT
        p.id            AS produto_id,
        p.nome          AS produto_nome,
        SUM(v.quantidade)  AS total_unidades,
        SUM(v.valor_total) AS receita_total
      FROM vendas v
      JOIN produtos p ON p.id = v.produto_id
      GROUP BY p.id, p.nome
      ORDER BY receita_total DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao gerar resumo de vendas:', err);
    res.status(500).json({ error: 'Não foi possível gerar o resumo de vendas.' });
  }
}

module.exports = {
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
};
