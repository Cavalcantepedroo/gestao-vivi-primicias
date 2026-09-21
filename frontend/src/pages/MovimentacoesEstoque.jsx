import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEmpresa } from '../context/EmpresaContext';
import { getMovimentacoesEstoque } from '../services/gestao';

const badgeClasses = {
  entrada: 'bg-green-100 text-green-700',
  saida: 'bg-red-100 text-red-700',
  ajuste: 'bg-yellow-100 text-yellow-700',
};

export default function MovimentacoesEstoque() {
  const { empresa } = useEmpresa();
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [periodoFiltro, setPeriodoFiltro] = useState('todos');

  const carregarMovimentacoes = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await getMovimentacoesEstoque(empresa);
      setMovimentacoes(data);
      setErro('');
    } catch (err) {
      setErro(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [empresa]);

  useEffect(() => {
    carregarMovimentacoes();
  }, [carregarMovimentacoes]);

  const movimentacoesFiltradas = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    const dias = periodoFiltro === 'todos' ? null : Number(periodoFiltro);
    const limite = dias ? Date.now() - dias * 24 * 60 * 60 * 1000 : null;

    return movimentacoes.filter((mov) => {
      const correspondeTexto = !termo || [mov.produto_nome, mov.motivo, mov.tipo, mov.observacao, mov.quantidade]
        .some((valor) => String(valor ?? '').toLowerCase().includes(termo));
      const correspondeTipo = tipoFiltro === 'todos' || mov.tipo === tipoFiltro;
      const correspondePeriodo = !limite || new Date(mov.created_at).getTime() >= limite;
      return correspondeTexto && correspondeTipo && correspondePeriodo;
    });
  }, [filtro, movimentacoes, periodoFiltro, tipoFiltro]);

  const exportarMovimentacoes = () => {
    const linhas = [
      ['Produto', 'Tipo', 'Quantidade', 'Motivo', 'Observação', 'Data'],
      ...movimentacoesFiltradas.map((mov) => [
        mov.produto_nome,
        mov.tipo_label,
        String(mov.quantidade),
        mov.motivo,
        mov.observacao || '',
        new Date(mov.created_at).toLocaleString('pt-BR'),
      ]),
    ];
    const csv = linhas
      .map((linha) => linha.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `movimentacoes-estoque-${empresa}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 border-b border-gray-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="page-hero__eyebrow">Gestão</div>
          <h1 className="page-hero__title">Movimentações de Estoque</h1>
          <p className="page-hero__desc">
            Acompanhe entradas, saídas e ajustes do estoque por produto.
          </p>
        </div>
        <button
          type="button"
          onClick={exportarMovimentacoes}
          className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition font-medium"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2" />
          </svg>
          Exportar para Excel
        </button>
      </div>

      {erro && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">{erro}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="flex-1">
              <label htmlFor="busca-movimentacoes" className="block text-sm font-medium text-gray-700 mb-2">Buscar movimentações</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
                <input
                  id="busca-movimentacoes"
                  type="search"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  placeholder="Produto, motivo, tipo ou quantidade"
                  className="w-full border border-gray-300 bg-white rounded-md pl-10 pr-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
            <div className="w-full xl:w-48">
              <label htmlFor="filtro-tipo" className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select id="filtro-tipo" value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="w-full border border-gray-300 bg-white rounded-md px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option value="todos">Todos os tipos</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
                <option value="ajuste">Ajuste</option>
              </select>
            </div>
            <div className="w-full xl:w-48">
              <label htmlFor="filtro-periodo" className="block text-sm font-medium text-gray-700 mb-2">Período</label>
              <select id="filtro-periodo" value={periodoFiltro} onChange={(e) => setPeriodoFiltro(e.target.value)} className="w-full border border-gray-300 bg-white rounded-md px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option value="todos">Todo o histórico</option>
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
              </select>
            </div>
          </div>
          <div className="flex justify-between items-center gap-3 mt-4">
            <span className="text-sm font-semibold text-gray-800">Histórico geral</span>
            <span className="text-xs text-gray-500">{movimentacoesFiltradas.length} registro(s)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Quantidade</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Observação</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    Carregando movimentações...
                  </td>
                </tr>
              ) : movimentacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    Nenhuma movimentação encontrada para o filtro informado.
                  </td>
                </tr>
              ) : (
                movimentacoesFiltradas.map((mov) => (
                  <tr key={mov.id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition align-top">
                    <td className="px-4 py-3 font-medium text-gray-800">{mov.produto_nome}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${badgeClasses[mov.tipo] || 'bg-gray-100 text-gray-700'}`}>
                        {mov.tipo_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {mov.quantidade}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{mov.motivo}</td>
                    <td className="px-4 py-3 text-gray-600">{mov.observacao || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(mov.created_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
