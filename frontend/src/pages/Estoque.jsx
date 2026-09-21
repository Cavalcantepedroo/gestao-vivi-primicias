import { useState, useCallback, useEffect } from 'react';
import { useEmpresa } from '../context/EmpresaContext';
import { getProdutoByCodigo, updateProduto, createProduto, getProdutos, deleteProduto } from '../services/gestao';
import BarcodeScanner from '../components/BarcodeScanner';
import toast from 'react-hot-toast';

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />;
}

export default function Estoque() {
  const { empresa } = useEmpresa();
  const [produtoEncontrado, setProdutoEncontrado] = useState(null);
  const [quantidadeAdicionar, setQuantidadeAdicionar] = useState('1');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [estoque, setEstoque] = useState([]);
  const [mostrarEstoque, setMostrarEstoque] = useState(false);
  const [produtoNovo, setProdutoNovo] = useState(null);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [produtoExcluindo, setProdutoExcluindo] = useState(null);
  const [filtroEstoque, setFiltroEstoque] = useState('');
  const [produtoSelecionadoAdicionar, setProdutoSelecionadoAdicionar] = useState('');
  const [quantidadeSelecionadaAdicionar, setQuantidadeSelecionadaAdicionar] = useState(1);

  const carregarEstoque = useCallback(async () => {
    try {
      const { data } = await getProdutos(empresa);
      setEstoque(data);
    } catch (err) {
      console.error('Erro ao carregar estoque:', err);
    }
  }, [empresa]);

  useEffect(() => {
    carregarEstoque();
  }, [empresa, carregarEstoque]);

  const handleScan = useCallback(async (codigo) => {
    setErro('');
    setSucesso('');
    setProdutoEncontrado(null);
    setProdutoNovo(null);
    setLoading(true);

    try {
      const { data } = await getProdutoByCodigo(empresa, codigo);
      setProdutoEncontrado(data);
      setQuantidadeAdicionar('1');
    } catch (err) {
      setProdutoNovo({
        codigo_de_barras: codigo,
        nome: '',
        preco: '',
        quantidade_estoque: '1',
      });
      setErro(`Produto com código ${codigo} não encontrado. Cadastre agora.`);
      toast.error(`Código de barras não encontrado: ${codigo}`);
    } finally {
      setLoading(false);
    }
  }, [empresa]);

  const handleConfirmarEntrada = async (e) => {
    e.preventDefault();
    if (!produtoEncontrado) return;

    const qtd = parseInt(quantidadeAdicionar, 10);
    if (isNaN(qtd) || qtd <= 0) {
      setErro('Quantidade inválida.');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      const novoEstoque = produtoEncontrado.quantidade_estoque + qtd;
      await updateProduto(empresa, produtoEncontrado.id, { quantidade_estoque: novoEstoque });

      setSucesso(`${qtd} unidade(s) adicionada(s) ao produto "${produtoEncontrado.nome}".`);
      toast.success('Produto adicionado ao estoque.');
      setProdutoEncontrado(null);
      await carregarEstoque();
    } catch (err) {
      const mensagem = err.response?.data?.error || err.message;
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  };

  const handleCriarProduto = async (e) => {
    e.preventDefault();
    if (!produtoNovo) return;

    const nome = produtoNovo.nome.trim();
    const preco = Number(produtoNovo.preco);
    const qtd = Number(produtoNovo.quantidade_estoque);

    if (!nome || Number.isNaN(preco) || preco <= 0) {
      setErro('Informe nome e preço válidos para o novo produto.');
      return;
    }

    if (Number.isNaN(qtd) || qtd < 0) {
      setErro('Quantidade inicial inválida.');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      await createProduto(empresa, {
        nome,
        codigo_de_barras: produtoNovo.codigo_de_barras,
        preco,
        quantidade_estoque: qtd,
      });

      setSucesso(`Produto "${nome}" cadastrado com sucesso e estoque inicial registrado.`);
      setProdutoNovo(null);
      await carregarEstoque();
    } catch (err) {
      const mensagem = err.response?.data?.error || err.message;
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  };

  const fecharModal = () => {
    setProdutoEncontrado(null);
    setProdutoNovo(null);
    setProdutoEditando(null);
    setProdutoExcluindo(null);
    setErro('');
  };

  const handleExcluirProduto = async () => {
    if (!produtoExcluindo) return;

    setLoading(true);
    setErro('');

    try {
      await deleteProduto(empresa, produtoExcluindo.id);
      setSucesso(`Produto "${produtoExcluindo.nome}" removido com sucesso.`);
      setProdutoExcluindo(null);
      await carregarEstoque();
    } catch (err) {
      setErro(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    if (!produtoEditando) return;

    const nome = produtoEditando.nome.trim();
    const preco = Number(produtoEditando.preco);
    const quantidade = Number(produtoEditando.quantidade_estoque);

    if (!nome) {
      setErro('Informe o nome do produto.');
      return;
    }

    if (Number.isNaN(preco) || preco < 0) {
      setErro('Preço inválido.');
      return;
    }

    if (Number.isNaN(quantidade) || quantidade < 0) {
      setErro('Quantidade em estoque inválida.');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      await updateProduto(empresa, produtoEditando.id, {
        nome,
        codigo_de_barras: produtoEditando.codigo_de_barras,
        preco,
        quantidade_estoque: quantidade,
      });

      setSucesso(`Produto "${nome}" atualizado com sucesso.`);
      setProdutoEditando(null);
      await carregarEstoque();
    } catch (err) {
      setErro(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const produtosFiltrados = [...estoque]
    .filter((item) => {
      const termo = filtroEstoque.trim().toLowerCase();
      if (!termo) return true;
      return (
        item.nome?.toLowerCase().includes(termo) ||
        String(item.codigo_de_barras || '').toLowerCase().includes(termo)
      );
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const produtosParaAdicionar = [...estoque].sort((a, b) => a.nome.localeCompare(b.nome));

  const exportarEstoqueParaExcel = () => {
    const linhas = [
      ['Produto', 'Código de Barras', 'Preço', 'Estoque'],
      ...estoque.map((item) => {
        const codigo = String(item.codigo_de_barras ?? '').trim();
        return [
          item.nome,
          codigo ? `'${codigo}` : '',
          Number(item.preco).toFixed(2),
          String(item.quantidade_estoque),
        ];
      }),
    ];

    const csv = linhas
      .map((linha) => linha.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `estoque-${empresa}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSucesso('Estoque exportado com sucesso em formato CSV/Excel.');
  };

  const handleAdicionarPorEstoque = async () => {
    const produtoId = produtoSelecionadoAdicionar;
    const quantidade = Number(quantidadeSelecionadaAdicionar) || 0;

    if (!produtoId) {
      setErro('Selecione um produto para adicionar ao estoque.');
      return;
    }

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      setErro('Informe uma quantidade válida para adicionar ao estoque.');
      return;
    }

    const produto = estoque.find((item) => String(item.id) === String(produtoId));
    if (!produto) {
      setErro('Produto não encontrado no estoque.');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      const novoEstoque = Number(produto.quantidade_estoque) + quantidade;
      await updateProduto(empresa, produto.id, {
        nome: produto.nome,
        codigo_de_barras: produto.codigo_de_barras,
        preco: produto.preco,
        quantidade_estoque: novoEstoque,
      });

      setSucesso(`${quantidade} unidade(s) adicionada(s) ao produto "${produto.nome}".`);
      toast.success('Produto adicionado ao estoque.');
      setProdutoSelecionadoAdicionar('');
      setQuantidadeSelecionadaAdicionar(1);
      await carregarEstoque();
    } catch (err) {
      setErro(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 border-b border-gray-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="page-hero__eyebrow">Gestão</div>
          <h1 className="page-hero__title">Estoque</h1>
          <p className="page-hero__desc">
            Busque, edite, remova e registre entradas de produtos em um só lugar.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportarEstoqueParaExcel}
            className="inline-flex items-center justify-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-md transition font-medium"
          >
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => setMostrarEstoque(!mostrarEstoque)}
            className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-md transition font-medium"
          >
            {mostrarEstoque ? 'Ocultar Estoque' : 'Ver Estoque Atual'}
          </button>
        </div>
      </div>

      {erro && !produtoEncontrado && !produtoNovo && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 mb-6">{erro}</div>
      )}
      {sucesso && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-100 mb-6">{sucesso}</div>
      )}

      {loading && !produtoEncontrado && !produtoNovo && <p className="text-gray-500 animate-pulse mb-6">Buscando produto...</p>}

      <BarcodeScanner
        onScan={handleScan}
        placeholder="Bipe o código de barras ou digite..."
      />

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="mb-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Entrada manual</div>
          <h2 className="mt-1 text-xl font-bold text-gray-900">Buscar produto e adicionar ao estoque</h2>
          <p className="mt-1 text-sm text-gray-500">Selecione um produto cadastrado e informe a quantidade recebida.</p>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="estoque-produto-selecionado" className="block text-sm font-medium text-gray-700 mb-2">
              Produto cadastrado
            </label>
            <select
              id="estoque-produto-selecionado"
              value={produtoSelecionadoAdicionar}
              onChange={(e) => setProdutoSelecionadoAdicionar(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-gray-900 bg-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Selecione um produto</option>
              {produtosParaAdicionar.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} - Estoque: {produto.quantidade_estoque}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div>
              <label htmlFor="estoque-quantidade-selecionada" className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade
              </label>
              <input
                id="estoque-quantidade-selecionada"
                type="number"
                min="1"
                value={quantidadeSelecionadaAdicionar}
                onChange={(e) => setQuantidadeSelecionadaAdicionar(Math.max(1, Number(e.target.value) || 1))}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">Atalhos</span>
              <div className="flex gap-2">
                {[1, 5, 10].map((incremento) => (
                  <button
                    key={incremento}
                    type="button"
                    onClick={() => setQuantidadeSelecionadaAdicionar((prev) => Number(prev || 1) + incremento)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md transition font-medium text-sm"
                  >
                    +{incremento}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdicionarPorEstoque}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-3 rounded-md transition font-semibold"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {loading && <Spinner />}
              {loading ? 'Salvando entrada...' : 'Confirmar Entrada no Estoque'}
            </span>
          </button>
        </div>
      </div>

      {mostrarEstoque && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 font-semibold text-gray-800 flex items-center justify-between gap-3">
            <span>Estoque atual</span>
            <div className="flex-1 max-w-xs">
              <input
                type="text"
                value={filtroEstoque}
                onChange={(e) => setFiltroEstoque(e.target.value)}
                placeholder="Buscar produto ou código"
                className="input w-full text-sm py-2"
              />
            </div>
          </div>
          <div className="max-h-[400px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Estoque</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-6 text-center text-gray-500">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  produtosFiltrados.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-3 font-medium text-gray-800">{item.nome}</td>
                      <td className="px-4 py-3 text-gray-600">{item.codigo_de_barras}</td>
                      <td className="px-4 py-3 text-gray-600">R$ {Number(item.preco).toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{item.quantidade_estoque}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setProdutoEditando(item)}
                            className="btn-secondary px-3 py-1.5 text-xs"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setProdutoExcluindo(item)}
                            className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg text-xs font-medium"
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {produtoEncontrado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Registrar Entrada</h2>
              <p className="text-sm text-gray-500 mb-6">Confirme a quantidade recebida deste item.</p>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 mb-6">
                <p className="text-sm font-semibold text-gray-900">{produtoEncontrado.nome}</p>
                <div className="flex justify-between mt-2 text-sm text-gray-600">
                  <span>Preço: R$ {Number(produtoEncontrado.preco).toFixed(2)}</span>
                  <span>Estoque Atual: <strong>{produtoEncontrado.quantidade_estoque}</strong></span>
                </div>
              </div>

              {erro && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg mb-4">{erro}</div>
              )}

              <form onSubmit={handleConfirmarEntrada}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade a Adicionar</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="input text-lg py-3"
                    value={quantidadeAdicionar}
                    onChange={(e) => setQuantidadeAdicionar(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={fecharModal} className="btn-secondary" disabled={loading}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    <span className="inline-flex items-center justify-center gap-2">
                      {loading && <Spinner />}
                      {loading ? 'Salvando...' : 'Confirmar Entrada'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {produtoExcluindo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Confirmar exclusão</h2>
              <p className="text-sm text-gray-500 mb-6">
                Tem certeza que deseja remover este produto do estoque?
              </p>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 mb-6">
                <p className="text-sm font-semibold text-gray-900">{produtoExcluindo.nome}</p>
                <p className="text-sm text-gray-600 mt-1">Código: {produtoExcluindo.codigo_de_barras}</p>
                <p className="text-sm text-gray-600">Estoque atual: {produtoExcluindo.quantidade_estoque}</p>
              </div>

              {erro && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg mb-4">{erro}</div>
              )}

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={fecharModal} className="btn-secondary" disabled={loading}>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExcluirProduto}
                  className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg font-medium disabled:opacity-70"
                  disabled={loading}
                >
                  {loading ? 'Excluindo...' : 'Excluir Produto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {produtoNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Produto não cadastrado</h2>
              <p className="text-sm text-gray-500 mb-6">
                O código lido precisa ser cadastrado antes de registrar a entrada no estoque.
              </p>

              <form onSubmit={handleCriarProduto} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Código de barras</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none bg-gray-50 text-gray-600"
                    value={produtoNovo.codigo_de_barras}
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome do produto</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                    value={produtoNovo.nome}
                    onChange={(e) => setProdutoNovo((prev) => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Brinco Argola Dourada"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preço</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                      value={produtoNovo.preco}
                      onChange={(e) => setProdutoNovo((prev) => ({ ...prev, preco: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estoque</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                      value={produtoNovo.quantidade_estoque}
                      onChange={(e) => setProdutoNovo((prev) => ({ ...prev, quantidade_estoque: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={fecharModal}
                    className="text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-md transition-colors"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-md font-medium transition-colors"
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Cadastrar Produto'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {produtoEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Editar estoque</h2>
              <p className="text-sm text-gray-500 mb-6">Ajuste os dados do produto e a quantidade em estoque.</p>

              {erro && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg mb-4">{erro}</div>
              )}

              <form onSubmit={handleSalvarEdicao} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Código de barras</label>
                  <input
                    type="text"
                    className="input"
                    value={produtoEditando.codigo_de_barras}
                    onChange={(e) => setProdutoEditando((prev) => ({ ...prev, codigo_de_barras: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome do produto</label>
                  <input
                    type="text"
                    className="input"
                    value={produtoEditando.nome}
                    onChange={(e) => setProdutoEditando((prev) => ({ ...prev, nome: e.target.value }))}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preço</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input"
                      value={produtoEditando.preco}
                      onChange={(e) => setProdutoEditando((prev) => ({ ...prev, preco: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estoque</label>
                    <input
                      type="number"
                      min="0"
                      className="input"
                      value={produtoEditando.quantidade_estoque}
                      onChange={(e) => setProdutoEditando((prev) => ({ ...prev, quantidade_estoque: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={fecharModal} className="btn-secondary" disabled={loading}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
