import { useEffect, useState } from 'react';
import { useEmpresa } from '../context/EmpresaContext';
import { getProdutos, createProduto, deleteProduto } from '../services/gestao';

const EMPTY_FORM = { nome: '', codigo_de_barras: '', preco: '', quantidade_estoque: '' };

/**
 * Página de gestão de produtos.
 */
export default function Produtos() {
  const { empresa, info } = useEmpresa();
  const [produtos, setProdutos]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [salvando, setSalvando]   = useState(false);
  const [erro, setErro]           = useState('');

  const carregar = () => {
    setLoading(true);
    getProdutos(empresa)
      .then((r) => setProdutos(r.data))
      .catch((e) => setErro(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
    setErro('');
  }, [empresa]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await createProduto(empresa, {
        nome: form.nome,
        codigo_de_barras: form.codigo_de_barras || undefined,
        preco: Number(form.preco),
        quantidade_estoque: Number(form.quantidade_estoque) || 0,
      });
      setForm(EMPTY_FORM);
      carregar();
    } catch (e) {
      setErro(e.response?.data?.error || e.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este produto?')) return;
    try {
      await deleteProduto(empresa, id);
      carregar();
    } catch (e) {
      setErro(e.response?.data?.error || e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
        <p className="text-sm text-gray-500">{info.nome}</p>
      </div>

      {erro && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      )}

      {/* Formulário de novo produto */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Novo Produto</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
            <input
              className="input"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Brinco Argola"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Código de Barras</label>
            <input
              className="input"
              value={form.codigo_de_barras}
              onChange={(e) => setForm({ ...form, codigo_de_barras: e.target.value })}
              placeholder="EAN-13"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Preço (R$) *</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: e.target.value })}
              placeholder="0,00"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estoque</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.quantidade_estoque}
              onChange={(e) => setForm({ ...form, quantidade_estoque: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="col-span-2 lg:col-span-4 flex justify-end">
            <button type="submit" disabled={salvando} className="btn-primary">
              {salvando ? 'Salvando…' : '+ Adicionar Produto'}
            </button>
          </div>
        </form>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'Nome', 'Código de Barras', 'Preço', 'Estoque', 'Ações'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan={6} className="py-10 text-center text-gray-400">Carregando…</td></tr>
              ) : produtos.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-gray-400">Nenhum produto cadastrado</td></tr>
              ) : produtos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400">{p.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.nome}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.codigo_de_barras || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    R$ {Number(p.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                      ${p.quantidade_estoque === 0
                        ? 'bg-red-100 text-red-700'
                        : p.quantidade_estoque < 10
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                      }`}>
                      {p.quantidade_estoque} un
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
