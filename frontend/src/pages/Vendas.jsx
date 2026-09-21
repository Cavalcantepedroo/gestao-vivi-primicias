import { useEffect, useState } from 'react';
import { useEmpresa } from '../context/EmpresaContext';
import { getVendas, getProdutos, createVenda } from '../services/gestao';

/**
 * Página de registro e listagem de vendas.
 */
export default function Vendas() {
  const { empresa, info } = useEmpresa();
  const [vendas, setVendas]       = useState([]);
  const [produtos, setProdutos]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [form, setForm]           = useState({ produto_id: '', quantidade: '1' });
  const [salvando, setSalvando]   = useState(false);
  const [erro, setErro]           = useState('');

  const carregar = () => {
    setLoading(true);
    Promise.all([getVendas(empresa), getProdutos(empresa)])
      .then(([vRes, pRes]) => {
        setVendas(vRes.data);
        setProdutos(pRes.data.filter((p) => p.quantidade_estoque > 0));
      })
      .catch((e) => setErro(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
    setErro('');
    setForm({ produto_id: '', quantidade: '1' });
  }, [empresa]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await createVenda(empresa, {
        produto_id: Number(form.produto_id),
        quantidade: Number(form.quantidade),
      });
      setForm({ produto_id: '', quantidade: '1' });
      carregar();
    } catch (e) {
      setErro(e.response?.data?.error || e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
        <p className="text-sm text-gray-500">{info.nome}</p>
      </div>

      {erro && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      )}

      {/* Formulário de nova venda */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Registrar Venda</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-600 mb-1">Produto *</label>
            <select
              className="input"
              value={form.produto_id}
              onChange={(e) => setForm({ ...form, produto_id: e.target.value })}
              required
            >
              <option value="">Selecione…</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — R$ {Number(p.preco).toFixed(2)} (estoque: {p.quantidade_estoque})
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade *</label>
            <input
              className="input"
              type="number"
              min="1"
              value={form.quantidade}
              onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={salvando} className="btn-primary">
            {salvando ? 'Registrando…' : '✓ Registrar Venda'}
          </button>
        </form>
      </div>

      {/* Tabela de vendas */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'Produto', 'Qtd', 'Valor Total', 'Data'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-400">Carregando…</td></tr>
              ) : vendas.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-400">Nenhuma venda registrada</td></tr>
              ) : vendas.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400">{v.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.produto_nome}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{v.quantidade}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-700">
                    R$ {Number(v.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(v.data_venda).toLocaleString('pt-BR')}
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
