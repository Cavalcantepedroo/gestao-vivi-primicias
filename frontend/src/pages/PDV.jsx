import { useState, useCallback, useMemo, useEffect } from 'react';
import { useEmpresa } from '../context/EmpresaContext';
import { getProdutoByCodigo, getProdutos } from '../services/gestao';
import { getApi } from '../services/api';
import BarcodeScanner from '../components/BarcodeScanner';
import toast from 'react-hot-toast';

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />;
}

export default function PDV() {
  const { empresa } = useEmpresa();
  const [carrinho, setCarrinho] = useState([]);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [finalizando, setFinalizando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState('1');

  useEffect(() => {
    const carregarProdutos = async () => {
      try {
        const { data } = await getProdutos(empresa);
        setProdutosDisponiveis(data.filter((produto) => Number(produto.quantidade_estoque) > 0));
      } catch (err) {
        console.error('Erro ao carregar produtos do PDV:', err);
      }
    };

    carregarProdutos();
  }, [empresa]);

  const handleScan = useCallback(async (codigo) => {
    setErro('');
    setSucesso('');
    setBuscando(true);

    try {
      const { data: produto } = await getProdutoByCodigo(empresa, codigo);
      
      setCarrinho((prev) => {
        const itemExistente = prev.find(item => item.produto_id === produto.id);
        if (itemExistente) {
          // Se já está no carrinho, verifica se o estoque permite mais 1
          if (itemExistente.quantidade + 1 > produto.quantidade_estoque) {
            setErro(`Estoque insuficiente para "${produto.nome}". Apenas ${produto.quantidade_estoque} disponíveis.`);
            return prev;
          }
          return prev.map(item => 
            item.produto_id === produto.id 
              ? { ...item, quantidade: item.quantidade + 1, valor_total: (item.quantidade + 1) * produto.preco }
              : item
          );
        } else {
          if (produto.quantidade_estoque < 1) {
            setErro(`Produto "${produto.nome}" sem estoque.`);
            return prev;
          }
          return [...prev, {
            produto_id: produto.id,
            nome: produto.nome,
            preco: produto.preco,
            quantidade: 1,
            estoque_maximo: produto.quantidade_estoque,
            valor_total: produto.preco * 1
          }];
        }
      });
    } catch (err) {
      const mensagem = `Produto não encontrado (Código: ${codigo})`;
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setBuscando(false);
    }
  }, [empresa]);

  const adicionarProdutoAoCarrinho = useCallback((produto, quantidadeAdicionar = 1) => {
    if (!produto) return;
    const quantidadeInformada = Number(quantidadeAdicionar);
    if (!Number.isInteger(quantidadeInformada) || quantidadeInformada < 1) {
      setErro('Informe uma quantidade inteira maior que zero.');
      return;
    }

    setCarrinho((prev) => {
      const itemExistente = prev.find((item) => item.produto_id === produto.id);
      const quantidadeMaxima = Number(produto.quantidade_estoque || 0);

      if (itemExistente) {
        const novaQuantidade = itemExistente.quantidade + quantidadeInformada;
        if (novaQuantidade > quantidadeMaxima) {
          setErro(`Estoque insuficiente para "${produto.nome}". Apenas ${quantidadeMaxima} disponíveis.`);
          return prev;
        }

        return prev.map((item) =>
          item.produto_id === produto.id
            ? { ...item, quantidade: novaQuantidade, valor_total: novaQuantidade * Number(produto.preco) }
            : item
        );
      }

      if (quantidadeMaxima < 1) {
        setErro(`Produto "${produto.nome}" sem estoque.`);
        return prev;
      }

      return [
        ...prev,
        {
          produto_id: produto.id,
          nome: produto.nome,
          preco: Number(produto.preco),
            quantidade: quantidadeInformada,
          estoque_maximo: quantidadeMaxima,
            valor_total: quantidadeInformada * Number(produto.preco),
        },
      ];
    });
  }, []);

  const handleAdicionarProdutoSelecionado = () => {
    if (!produtoSelecionado) {
      setErro('Selecione um produto antes de adicionar ao carrinho.');
      return;
    }

    const produto = produtosDisponiveis.find((item) => String(item.id) === String(produtoSelecionado));
    if (!produto) {
      setErro('Produto não encontrado no estoque.');
      return;
    }

    setErro('');
    const quantidade = Number(quantidadeSelecionada);
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      setErro('Informe uma quantidade inteira maior que zero.');
      return;
    }

    adicionarProdutoAoCarrinho(produto, quantidade);
    setProdutoSelecionado('');
    setQuantidadeSelecionada('1');
  };

  const handleRemoverItem = (produto_id) => {
    setCarrinho(prev => prev.filter(item => item.produto_id !== produto_id));
  };

  const handleAlterarQuantidade = (produto_id, qtd) => {
    const q = parseInt(qtd, 10);
    if (isNaN(q) || q < 1) return;
    
    setCarrinho(prev => prev.map(item => {
      if (item.produto_id === produto_id) {
        if (q > item.estoque_maximo) {
          setErro(`Estoque insuficiente para "${item.nome}". Máximo: ${item.estoque_maximo}.`);
          return item;
        }
        return { ...item, quantidade: q, valor_total: q * item.preco };
      }
      return item;
    }));
  };

  const totalVenda = useMemo(() => {
    return carrinho.reduce((acc, item) => acc + item.valor_total, 0);
  }, [carrinho]);

  const handleFinalizarVenda = async () => {
    if (carrinho.length === 0) return;
    setFinalizando(true);
    setErro('');
    
    try {
      // Formata payload conforme o backend espera: { itens: [{produto_id, quantidade}] }
      const payload = {
        origem: 'pdv',
        itens: carrinho.map(item => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade
        }))
      };

      await getApi(empresa).post('/vendas', payload);
      
      setSucesso('Venda finalizada com sucesso!');
      toast.success('Venda finalizada com sucesso!');
      setCarrinho([]);
      
      // Limpa sucesso após alguns segundos
      setTimeout(() => setSucesso(''), 4000);
    } catch (err) {
      const mensagem = err.response?.data?.error || err.message;
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setFinalizando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Coluna Esquerda: Scanner e Avisos */}
      <div className="lg:col-span-2 space-y-6">
        <div className="page-hero">
          <div className="page-hero__eyebrow">Operação</div>
          <h1 className="page-hero__title">Ponto de Venda</h1>
          <p className="page-hero__desc">Bipe o código do produto para adicioná-lo à venda atual.</p>
        </div>

        {erro && <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">{erro}</div>}
        {sucesso && <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-100">{sucesso}</div>}
        {buscando && <p className="text-gray-500 animate-pulse">Buscando produto...</p>}

        <BarcodeScanner onScan={handleScan} placeholder="Bipe o código de barras ou digite..." />

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Entrada alternativa</div>
            <h2 className="mt-1 text-lg font-bold text-gray-900">Busca Manual</h2>
            <p className="mt-1 text-sm text-gray-500">Selecione um produto cadastrado para adicionar à venda.</p>
          </div>

          <div>
            <label htmlFor="produto-pdv" className="block text-sm font-medium text-gray-700 mb-2">Produto</label>
            <select
              id="produto-pdv"
              value={produtoSelecionado}
              onChange={(e) => setProdutoSelecionado(e.target.value)}
              className="w-full border border-gray-300 bg-white px-3 py-2.5 rounded-md text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Selecione pelo nome</option>
              {produtosDisponiveis.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} - Estoque: {produto.quantidade_estoque}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="quantidade-pdv" className="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantidadeSelecionada((prev) => String(Math.max(1, Number(prev || 1) - 1)))}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md transition font-semibold"
                aria-label="Diminuir quantidade"
              >
                -
              </button>
              <input
                id="quantidade-pdv"
                type="number"
                min="1"
                value={quantidadeSelecionada}
                onChange={(e) => setQuantidadeSelecionada(e.target.value)}
                className="w-24 border border-gray-300 px-3 py-2.5 rounded-md text-center text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={() => setQuantidadeSelecionada((prev) => String(Number(prev || 1) + 1))}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md transition font-semibold"
                aria-label="Aumentar quantidade"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdicionarProdutoSelecionado}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition font-semibold md:w-auto md:ml-auto md:block"
          >
            Adicionar
          </button>
        </div>
      </div>

      {/* Coluna Direita: Resumo da Venda */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[560px] lg:h-[calc(100vh-140px)] lg:sticky lg:top-6">
        <div className="p-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Venda Atual</h2>
          <p className="text-sm text-gray-500 mt-1">Itens adicionados ao carrinho</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5">
          {carrinho.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p>Carrinho vazio</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {carrinho.map(item => (
                <li key={item.produto_id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 leading-tight">{item.nome}</h3>
                    <div className="text-xs text-gray-500 mt-1">R$ {Number(item.preco).toFixed(2)} por unidade</div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center bg-white rounded-md border border-gray-300">
                      <button
                        type="button"
                        onClick={() => handleAlterarQuantidade(item.produto_id, item.quantidade - 1)}
                        disabled={item.quantidade <= 1}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:text-gray-300 transition"
                        aria-label={`Diminuir quantidade de ${item.nome}`}
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        min="1" 
                        max={item.estoque_maximo}
                        value={item.quantidade} 
                        onChange={(e) => handleAlterarQuantidade(item.produto_id, e.target.value)}
                        className="w-12 text-center text-sm py-1 border-0 outline-none focus:ring-0"
                      />
                      <button
                        type="button"
                        onClick={() => handleAlterarQuantidade(item.produto_id, item.quantidade + 1)}
                        disabled={item.quantidade >= item.estoque_maximo}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:text-gray-300 transition"
                        aria-label={`Aumentar quantidade de ${item.nome}`}
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">R$ {Number(item.valor_total).toFixed(2)}</span>
                    <button 
                      type="button"
                      onClick={() => handleRemoverItem(item.produto_id)}
                      className="bg-white hover:bg-red-50 text-red-600 border border-gray-300 hover:border-red-300 px-2 py-1 rounded-md transition text-xs font-medium"
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-5 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-base font-semibold text-gray-700">Total da venda</span>
            <span className="text-3xl font-bold text-gray-900">R$ {totalVenda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
          </div>
          <button 
            type="button"
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold px-4 py-4 rounded-md transition text-base"
            disabled={carrinho.length === 0 || finalizando}
            onClick={handleFinalizarVenda}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {finalizando && <Spinner />}
              {finalizando ? 'Processando...' : 'Finalizar Venda'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
