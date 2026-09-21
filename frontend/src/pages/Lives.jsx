import { useState, useCallback, useEffect } from 'react';
import { useEmpresa } from '../context/EmpresaContext';
import { getProdutoByCodigo, getProdutos, getApi } from '../services/gestao';
import BarcodeScanner from '../components/BarcodeScanner';
import toast from 'react-hot-toast';

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />;
}

export default function Lives() {
  const { empresa } = useEmpresa();
  const storageKey = `live-carrinhos-${empresa}`;
  const activeKey = `${storageKey}-ativo`;

  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [clienteAtivoId, setClienteAtivoId] = useState(null);
  const [carregandoClientes, setCarregandoClientes] = useState(true);

  const carregarCarrinhos = useCallback(async () => {
    try {
      setCarregandoClientes(true);
      const [{ data }, { data: produtosData }] = await Promise.all([
        getApi(empresa).get('/vendas/live'),
        getProdutos(empresa),
      ]);
      setClientes(data);
      setProdutos(produtosData);

      const salvo = typeof window !== 'undefined' ? localStorage.getItem(activeKey) : null;
      const clienteValido = salvo && data.some((cliente) => cliente.id === salvo);
      const proximoCliente = clienteValido ? salvo : data[0]?.id ?? null;
      setClienteAtivoId(proximoCliente);

      if (proximoCliente) {
        localStorage.setItem(activeKey, proximoCliente);
      } else {
        localStorage.removeItem(activeKey);
      }
    } catch (err) {
      console.error('Erro ao carregar carrinhos da live:', err.response?.data || err.message);
      setClientes([]);
      setClienteAtivoId(null);
      localStorage.removeItem(activeKey);
    } finally {
      setCarregandoClientes(false);
    }
  }, [empresa, activeKey]);

  useEffect(() => {
    setClientes([]);
    setClienteAtivoId(null);
    setErro('');
    setSucesso('');

    if (typeof window !== 'undefined') {
      localStorage.removeItem(activeKey);
      const salvo = localStorage.getItem(activeKey);
      if (salvo) {
        setClienteAtivoId(salvo);
      }
    }

    carregarCarrinhos();
  }, [empresa, activeKey, carregarCarrinhos]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (clienteAtivoId) {
      localStorage.setItem(activeKey, clienteAtivoId);
    } else {
      localStorage.removeItem(activeKey);
    }
  }, [clienteAtivoId, activeKey]);
  
  // Form da esquerda
  const [novoCliente, setNovoCliente] = useState({ nome: '', whatsapp: '' });
  
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [loading, setLoading] = useState(false);
  const [produtoManualId, setProdutoManualId] = useState('');
  const [quantidadeManual, setQuantidadeManual] = useState(1);

  // Cliente atual
  const clienteAtivo = clientes.find(c => c.id === clienteAtivoId);

  // Adiciona novo cliente na lista de carrinhos abertos
  const handleAdicionarCliente = async (e) => {
    e.preventDefault();
    if (!novoCliente.nome || !novoCliente.whatsapp) return;

    try {
      const { data } = await getApi(empresa).post('/vendas/live/clientes', {
        nome: novoCliente.nome,
        telefone_whatsapp: novoCliente.whatsapp,
      });

      setClientes(prev => [data, ...prev]);
      setClienteAtivoId(data.id);
      setNovoCliente({ nome: '', whatsapp: '' });
      toast.success('Carrinho da cliente aberto.');
    } catch (err) {
      const mensagem = err.response?.data?.error || 'Não foi possível abrir o carrinho.';
      setErro(mensagem);
      toast.error(mensagem);
    }
  };

  // Lógica do bip
  const handleScan = useCallback(async (codigo) => {
    setErro('');
    if (!clienteAtivoId) {
      setErro('Selecione uma cliente primeiro para bipar peças no carrinho dela.');
      toast('Selecione uma cliente antes de ler o código.', { icon: '⚠️' });
      return;
    }

    try {
      const { data: produto } = await getProdutoByCodigo(empresa, codigo);

      if (produto.quantidade_estoque < 1) {
        setErro(`Produto "${produto.nome}" sem estoque.`);
        return;
      }

      const payload = {
        cliente_live_id: clienteAtivoId,
        produto_id: produto.id,
        quantidade: 1,
        preco_unitario: produto.preco,
      };

      const { data: itemSalvo } = await getApi(empresa).post('/vendas/live/itens', payload);

      setClientes(prevClientes => prevClientes.map(cliente => {
        if (cliente.id !== clienteAtivoId) return cliente;

        const itens = [...cliente.itens];
        const itemExistente = itens.find(i => i.produto_id === produto.id);

        if (itemExistente) {
          itemExistente.quantidade = Number(itemSalvo.quantidade);
          itemExistente.valor_total = Number(itemSalvo.quantidade) * Number(produto.preco);
          itemExistente.preco = Number(produto.preco);
        } else {
          itens.push({
            produto_id: produto.id,
            nome: produto.nome,
            preco: Number(produto.preco),
            quantidade: 1,
            estoque_maximo: produto.quantidade_estoque,
            valor_total: Number(produto.preco),
          });
        }

        return { ...cliente, itens };
      }));
    } catch (err) {
      const mensagem = err.response?.data?.error || `Produto não encontrado (Código: ${codigo})`;
      setErro(mensagem);
      toast.error(`Erro ao ler código de barras: ${mensagem}`);
    }
  }, [empresa, clienteAtivoId]);

  const handleAdicionarProdutoManual = async (e) => {
    e.preventDefault();
    setErro('');

    if (!clienteAtivoId) {
      setErro('Selecione uma cliente primeiro para adicionar produtos ao carrinho.');
      toast('Selecione uma cliente antes de adicionar o produto.', { icon: '⚠️' });
      return;
    }

    const produto = produtos.find((item) => String(item.id) === String(produtoManualId));
    const quantidade = Number(quantidadeManual);

    if (!produto) {
      setErro('Selecione um produto para adicionar ao carrinho.');
      return;
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      setErro('Informe uma quantidade inteira maior que zero.');
      return;
    }

    const itemAtual = clienteAtivo.itens.find((item) => item.produto_id === produto.id);
    const quantidadeFinal = Number(itemAtual?.quantidade || 0) + quantidade;
    if (quantidadeFinal > Number(produto.quantidade_estoque)) {
      setErro(`A quantidade solicitada ultrapassa o estoque disponível de ${produto.nome}.`);
      return;
    }

    try {
      setLoading(true);
      const { data: itemSalvo } = await getApi(empresa).post('/vendas/live/itens', {
        cliente_live_id: clienteAtivoId,
        produto_id: produto.id,
        quantidade,
        preco_unitario: produto.preco,
      });

      setClientes((prevClientes) => prevClientes.map((cliente) => {
        if (cliente.id !== clienteAtivoId) return cliente;

        const itens = [...cliente.itens];
        const itemExistente = itens.find((item) => item.produto_id === produto.id);
        const itemAtualizado = {
          produto_id: produto.id,
          nome: produto.nome,
          preco: Number(produto.preco),
          quantidade: Number(itemSalvo.quantidade),
          estoque_maximo: produto.quantidade_estoque,
          valor_total: Number(itemSalvo.quantidade) * Number(produto.preco),
        };

        if (itemExistente) {
          Object.assign(itemExistente, itemAtualizado);
        } else {
          itens.push(itemAtualizado);
        }

        return { ...cliente, itens };
      }));
      setProdutoManualId('');
      setQuantidadeManual(1);
    } catch (err) {
      const mensagem = err.response?.data?.error || 'Não foi possível adicionar o produto ao carrinho.';
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoverItem = async (produto_id) => {
    if (!clienteAtivoId) return;

    try {
      await getApi(empresa).delete(`/vendas/live/itens/${clienteAtivoId}/${produto_id}`);
      setClientes(prev => prev.map(c => {
        if (c.id !== clienteAtivoId) return c;
        return { ...c, itens: c.itens.filter(i => i.produto_id !== produto_id) };
      }));
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível remover o item do carrinho.');
    }
  };

  const calcularTotal = (itens) => itens.reduce((acc, i) => acc + i.valor_total, 0);

  const handleCheckout = async () => {
    if (!clienteAtivo || clienteAtivo.itens.length === 0) return;
    setLoading(true);
    setErro('');

    try {
      const payload = {
        origem: 'live',
        itens: clienteAtivo.itens.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade })),
      };
      await getApi(empresa).post('/vendas', payload);

      const nomeEmpresa = empresa === 'vivi' ? 'Vivi Semi-Joias' : 'Primícias Acessórios';
      const chavePix = empresa === 'vivi' ? 'cnpj-vivi@email.com' : 'cnpj-primicias@email.com';
      const totalFormatado = calcularTotal(clienteAtivo.itens).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      let msg = `Olá, *${clienteAtivo.nome}*! Tudo bem? \u{1F496}\n`;
      msg += `Aqui é da ${nomeEmpresa}. Seu pedido na nossa live foi separado com muito carinho!\n\n`;
      msg += `*Resumo do Pedido:*\n`;

      clienteAtivo.itens.forEach(i => {
         msg += `- ${i.quantidade}x ${i.nome} (R$ ${Number(i.preco).toFixed(2)})\n`;
      });

      msg += `\n*Total da Compra: ${totalFormatado}*\n\n`;
      msg += `Para finalizar, sua chave PIX para pagamento é:\n${chavePix}\n\n`;
      msg += `Por favor, nos envie o comprovante por aqui assim que efetuar o pagamento. Muito obrigada por comprar conosco! \u{1F970}\u{1F6CD}\u{FE0F}`;

      const textoEncoded = encodeURIComponent(msg);
      let foneFormat = clienteAtivo.whatsapp.replace(/\D/g, '');
      if (foneFormat.length <= 11) foneFormat = '55' + foneFormat;

      window.open(`https://wa.me/${foneFormat}?text=${textoEncoded}`, '_blank');

      setSucesso('WhatsApp aberto. O carrinho continua salvo até o envio real da mensagem ser confirmado.');
      toast.success('Mensagem preparada para o WhatsApp.');
      setTimeout(() => setSucesso(''), 6000);

    } catch (err) {
      const mensagem = err.response?.data?.error || err.message;
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarComoEnviado = async () => {
    if (!clienteAtivo) return;

    try {
      setLoading(true);
      await getApi(empresa).patch(`/vendas/live/${clienteAtivo.id}/status`, { status_carrinho: 'pago' });
      setClientes(prev => prev.filter(c => c.id !== clienteAtivoId));
      setClienteAtivoId(null);
      setSucesso('Mensagem enviada e carrinho fechado com sucesso.');
      toast.success('Mensagem enviada para o WhatsApp. Carrinho fechado.');
      setTimeout(() => setSucesso(''), 5000);
    } catch (err) {
      const mensagem = err.response?.data?.error || 'Não foi possível encerrar o carrinho após o envio.';
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-[calc(100vh-120px)]">
      
      {/* COLUNA ESQUERDA: CLIENTES (1/3) */}
      <div className="col-span-1 lg:col-span-4 space-y-6 flex flex-col lg:border-r border-gray-200 lg:pr-4">
        
        <div className="page-hero">
          <div className="page-hero__eyebrow">Operação</div>
          <h1 className="page-hero__title" style={{ fontSize: '20px' }}>Painel de Lives</h1>
        </div>

        {/* Form para adicionar cliente novo */}
        <form onSubmit={handleAdicionarCliente} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900">Nova Cliente na Live</h2>
          <div>
            <label htmlFor="nova-cliente-nome" className="block text-sm font-medium text-gray-700 mb-2">Nome da Cliente</label>
            <input
              id="nova-cliente-nome"
              className="w-full border border-gray-300 px-3 py-2.5 rounded-md text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Ex.: Maria Silva"
              required
              value={novoCliente.nome}
              onChange={e => setNovoCliente({...novoCliente, nome: e.target.value})}
            />
          </div>
          <div>
            <label htmlFor="nova-cliente-whatsapp" className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
            <input
              id="nova-cliente-whatsapp"
              className="w-full border border-gray-300 px-3 py-2.5 rounded-md text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Ex.: 41999999999"
              required
              value={novoCliente.whatsapp}
              onChange={e => setNovoCliente({...novoCliente, whatsapp: e.target.value})}
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-md transition font-semibold">
            Abrir Carrinho
          </button>
        </form>

        {/* Lista de Carrinhos Abertos */}
        <div className="flex-1 overflow-y-auto space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-4">Carrinhos Abertos ({clientes.length})</h2>
          
          {clientes.map(c => (
            <div 
              key={c.id} 
              onClick={() => setClienteAtivoId(c.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                clienteAtivoId === c.id 
                ? 'border-indigo-500 border-l-4 bg-gray-50 shadow-sm' 
                : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <h3 className="font-semibold text-gray-900 text-sm">{c.nome}</h3>
              <p className="text-xs text-gray-500 mb-2">{c.whatsapp}</p>
              
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-indigo-600">{c.itens.reduce((a,b)=>a+b.quantidade,0)} itens</span>
                <span className="text-gray-900">R$ {calcularTotal(c.itens).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* COLUNA DIREITA: CARRINHO DA CLIENTE (2/3) */}
      <div className="col-span-1 lg:col-span-8 flex flex-col bg-gray-50/30 rounded-2xl">
        
        {erro && <div className="p-4 mx-4 mt-4 bg-red-50 text-red-700 rounded-lg border border-red-100">{erro}</div>}
        {sucesso && <div className="p-4 mx-4 mt-4 bg-green-50 text-green-700 rounded-lg border border-green-100">{sucesso}</div>}

        {!clienteAtivoId ? (
           <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3 p-10 text-center">
             <svg className="w-16 h-16 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
             <p className="text-lg">Selecione uma cliente na coluna ao lado para abrir o carrinho.</p>
           </div>
        ) : (
           <div className="flex flex-col h-full">
              
              {/* Topo do Carrinho */}
              <div className="p-6 border-b border-gray-200 bg-white rounded-t-2xl flex justify-between items-center">
                 <div>
                   <h2 className="text-lg font-bold text-gray-900">Carrinho de {clienteAtivo.nome}</h2>
                   <p className="text-sm text-gray-500">{clienteAtivo.whatsapp}</p>
                 </div>
                 <span className="text-2xl font-bold text-gray-900">
                    R$ {calcularTotal(clienteAtivo.itens).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                 </span>
              </div>

              {/* Scanner Space */}
              <div className="p-6 pb-0 space-y-4">
                 <BarcodeScanner onScan={handleScan} placeholder="Bipe o código para adicionar ao carrinho..." />

                 <form onSubmit={handleAdicionarProdutoManual} className="border border-gray-200 rounded-xl bg-gray-50 p-4">
                   <div className="flex items-center justify-between gap-3 mb-3">
                     <div>
                       <h3 className="text-sm font-bold text-gray-900">Busca Manual</h3>
                       <p className="text-xs text-gray-500 mt-1">Selecione um produto quando não usar o leitor.</p>
                     </div>
                   </div>
                   <div className="flex flex-col gap-3 md:flex-row md:items-end">
                     <div className="flex-1">
                       <label htmlFor="produto-live-manual" className="block text-sm font-medium text-gray-700 mb-2">Produto</label>
                       <select
                         id="produto-live-manual"
                         value={produtoManualId}
                         onChange={(e) => setProdutoManualId(e.target.value)}
                         className="w-full border border-gray-300 bg-white px-3 py-2.5 rounded-md text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                       >
                         <option value="">Selecione pelo nome</option>
                         {[...produtos].sort((a, b) => a.nome.localeCompare(b.nome)).map((produto) => (
                           <option key={produto.id} value={produto.id}>
                             {produto.nome} - Estoque: {produto.quantidade_estoque}
                           </option>
                         ))}
                       </select>
                     </div>
                     <div className="w-full md:w-28">
                       <label htmlFor="quantidade-live-manual" className="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
                       <input
                         id="quantidade-live-manual"
                         type="number"
                         min="1"
                         value={quantidadeManual}
                         onChange={(e) => setQuantidadeManual(e.target.value)}
                         className="w-full border border-gray-300 bg-white px-3 py-2.5 rounded-md text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                       />
                     </div>
                     <button
                       type="submit"
                       disabled={loading}
                       className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-2.5 rounded-md transition font-semibold"
                     >
                       <span className="inline-flex items-center justify-center gap-2">
                         {loading && <Spinner />}
                         {loading ? 'Adicionando...' : 'Adicionar'}
                       </span>
                     </button>
                   </div>
                 </form>
              </div>

              {/* Itens do Carrinho */}
              <div className="flex-1 overflow-y-auto p-6">
                 {clienteAtivo.itens.length === 0 ? (
                      <div className="border border-dashed border-gray-300 rounded-xl text-center text-gray-500 py-12 px-4">Carrinho vazio. Bipe ou adicione um produto manualmente.</div>
                 ) : (
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                       <div className="hidden md:grid grid-cols-[minmax(0,1fr)_100px_130px_130px_44px] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <span>Produto</span><span>Quantidade</span><span>Valor unitário</span><span>Valor total</span><span></span>
                       </div>
                       <ul className="divide-y divide-gray-100">
                       {clienteAtivo.itens.map(item => (
                          <li key={item.produto_id} className="grid grid-cols-2 md:grid-cols-[minmax(0,1fr)_100px_130px_130px_44px] gap-3 md:gap-4 items-center p-4">
                           <div className="col-span-2 md:col-span-1">
                             <h3 className="text-sm font-semibold text-gray-900">{item.nome}</h3>
                             <div className="text-xs text-gray-500 md:hidden mt-1">Produto no carrinho</div>
                           </div>
                           <span className="text-sm text-gray-700"><span className="md:hidden text-xs text-gray-500 block">Quantidade</span>{item.quantidade}x</span>
                           <span className="text-sm text-gray-700"><span className="md:hidden text-xs text-gray-500 block">Valor unitário</span>R$ {Number(item.preco).toFixed(2)}</span>
                           <span className="font-semibold text-gray-900"><span className="md:hidden text-xs text-gray-500 block">Total da linha</span>R$ {Number(item.valor_total).toFixed(2)}</span>
                           <button type="button" onClick={() => handleRemoverItem(item.produto_id)} aria-label={`Remover ${item.nome}`} className="justify-self-end bg-white hover:bg-red-50 text-red-600 border border-gray-300 hover:border-red-300 p-2 rounded-md transition">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"></path></svg>
                            </button>
                          </li>
                       ))}
                       </ul>
                      </div>
                 )}
              </div>

              {/* Footer Fechar Compra */}
                <div className="p-6 bg-white border-t border-gray-200 rounded-b-2xl space-y-3">
                 <button 
                    type="button"
                    onClick={handleCheckout}
                    disabled={loading || clienteAtivo.itens.length === 0}
                    className="w-full bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 border border-gray-300 px-4 py-3 rounded-md transition font-medium"
                 >
                    <span className="inline-flex items-center justify-center gap-2">
                      {loading && <Spinner />}
                      {loading ? 'Processando...' : 'Abrir WhatsApp Web'}
                    </span>
                 </button>

                 <button
                    type="button"
                    onClick={handleMarcarComoEnviado}
                    disabled={loading || clienteAtivo.itens.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold px-4 py-4 rounded-md transition"
                 >
                    <span className="inline-flex items-center justify-center gap-2">
                      {loading && <Spinner />}
                      {loading ? 'Fechando carrinho...' : 'Marcar como enviado e fechar carrinho'}
                    </span>
                 </button>
              </div>

           </div>
        )}

      </div>
    </div>
  );
}
