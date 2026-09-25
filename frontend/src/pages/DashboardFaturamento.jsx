import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL, attachToken } from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Instância base do axios pro dashboard (sem injetar /empresa obrigatoriamente na URL)
const dashboardApi = axios.create({
  baseURL: `${API_BASE_URL}/api/dashboard`,
  withCredentials: true,
});
dashboardApi.interceptors.request.use(attachToken);

const FILTROS = [
  { id: 'vivi', label: 'Vivi Semijoias' },
  { id: 'primicias', label: 'Primicias' },
  { id: 'all', label: 'Consolidado (Ambas)' },
];

const PERIODOS = [
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: '3m', label: 'Últimos 3 meses' },
  { id: '6m', label: 'Últimos 6 meses' },
  { id: 'ano', label: 'Ano atual' },
];

function TooltipFaturamento({ active, payload, label, consolidado, formataMoeda }) {
  if (!active || !payload?.length) return null;

  const dados = payload[0]?.payload || {};
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold text-gray-900">{label}</p>
      {consolidado ? (
        <div className="space-y-1 text-sm">
          <p className="text-[#a17b3e]">Vivi Semijoias: <strong>{formataMoeda(dados.vivi)}</strong></p>
          <p className="text-[#55734e]">Primicias: <strong>{formataMoeda(dados.primicias)}</strong></p>
          <p className="border-t border-gray-100 pt-1 font-semibold text-gray-900">Total: {formataMoeda(dados.total)}</p>
        </div>
      ) : (
        <p className="text-sm font-semibold text-gray-900">Faturamento: {formataMoeda(dados.total)}</p>
      )}
    </div>
  );
}

export default function DashboardFaturamento() {
  const [filtroAtual, setFiltroAtual] = useState('all');
  const [periodoAtual, setPeriodoAtual] = useState('7d');
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    setLoading(true);
    setErro('');
    dashboardApi.get(`/faturamento?empresa=${filtroAtual}&periodo=${periodoAtual}`)
      .then(res => setDados(res.data))
      .catch((error) => {
        console.error(error);
        if (error.response?.status === 401) {
          setErro('Sua sessão expirou. Faça login novamente para continuar.');
        } else if (error.response?.status === 403) {
          setErro('Seu usuário não tem permissão para acessar o dashboard.');
        } else {
          setErro('Não foi possível carregar os dados do dashboard. Tente novamente.');
        }
      })
      .finally(() => setLoading(false));
  }, [filtroAtual, periodoAtual, tentativa]);

  const formataMoeda = (valor) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

  const formataVariacao = (valor) => {
    const numero = Number(valor || 0);
    return `${numero >= 0 ? '+' : ''}${numero.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% vs período anterior`;
  };

  const indicadorVariacao = (valor) => {
    const positivo = Number(valor || 0) >= 0;
    return (
      <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${positivo ? 'text-green-600' : 'text-red-600'}`}>
        <span aria-hidden="true">{positivo ? '↑' : '↓'}</span>
        {formataVariacao(valor)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="page-hero mb-2">
        <div className="page-hero__eyebrow">Visão Geral</div>
        <h1 className="page-hero__title">Dashboard de Faturamento</h1>
        <p className="page-hero__desc">
          Acompanhe o desempenho das vendas e a evolução da receita.
        </p>
      </div>

      {/* Tabs de Filtro Global */}
      <div className="flex p-1 bg-gray-100 rounded-lg w-max mb-6">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltroAtual(f.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filtroAtual === f.id 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 py-10 animate-pulse">Carregando métricas...</div>
      ) : erro ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{erro}</span>
          <button
            type="button"
            onClick={() => setTentativa((atual) => atual + 1)}
            className="font-semibold underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {/* Cards Principais */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-card__icon">💰</div>
              <div className="kpi-card__label">Faturamento do Dia</div>
              <div className="kpi-card__value">{formataMoeda(dados?.hoje)}</div>
              {indicadorVariacao(dados?.variacoes?.hoje)}
            </div>
            <div className="kpi-card">
              <div className="kpi-card__icon">📈</div>
              <div className="kpi-card__label">Faturamento da Semana (7d)</div>
              <div className="kpi-card__value">{formataMoeda(dados?.semana)}</div>
              {indicadorVariacao(dados?.variacoes?.semana)}
            </div>
            <div className="kpi-card">
              <div className="kpi-card__icon">📅</div>
              <div className="kpi-card__label">Faturamento do Mês</div>
              <div className="kpi-card__value">{formataMoeda(dados?.mes)}</div>
              {indicadorVariacao(dados?.variacoes?.mes)}
            </div>
          </div>

          {/* Gráfico de Evolução */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Evolução de Vendas</h2>
                <p className="mt-1 text-xs text-gray-500">
                  {dados?.agrupamento === 'mes' ? 'Valores agrupados por mês' : 'Valores agrupados por dia'}
                </p>
              </div>
              <div>
                <label htmlFor="periodo-faturamento" className="sr-only">Período do gráfico</label>
                <select
                  id="periodo-faturamento"
                  value={periodoAtual}
                  onChange={(e) => setPeriodoAtual(e.target.value)}
                  className="border border-gray-300 bg-white px-3 py-2 rounded-md text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  {PERIODOS.map((periodo) => <option key={periodo.id} value={periodo.id}>{periodo.label}</option>)}
                </select>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados?.evolucao} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E6E1" />
                  <XAxis 
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#7A786F' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    tickFormatter={(val) => `R$ ${val}`} 
                    tick={{ fontSize: 12, fill: '#7A786F' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<TooltipFaturamento consolidado={filtroAtual === 'all'} formataMoeda={formataMoeda} />} />
                  <Legend verticalAlign="top" height={36}/>
                  
                  {filtroAtual === 'all' ? (
                    <>
                      <Bar dataKey="vivi" name="Vivi Semijoias" stackId="a" fill="#dcbe8b" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="primicias" name="Primicias" stackId="a" fill="#91a38a" radius={[4, 4, 0, 0]} />
                    </>
                  ) : (
                    <Bar 
                      dataKey="total" 
                      name="Faturamento" 
                      fill={filtroAtual === 'vivi' ? '#dcbe8b' : '#91a38a'} 
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
