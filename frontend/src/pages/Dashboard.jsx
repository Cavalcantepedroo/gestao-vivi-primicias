import { useEffect, useState } from 'react';
import { useEmpresa } from '../context/EmpresaContext';
import { getProdutos, getResumoVendas } from '../services/gestao';

/**
 * Painel de resumo com KPIs da empresa ativa.
 */
export default function Dashboard() {
  const { empresa, info } = useEmpresa();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getProdutos(empresa), getResumoVendas(empresa)])
      .then(([prodRes, vendRes]) => {
        const produtos = prodRes.data;
        const resumo   = vendRes.data;
        setKpis({
          totalProdutos:  produtos.length,
          totalEstoque:   produtos.reduce((s, p) => s + p.quantidade_estoque, 0),
          valorEstoque:   produtos.reduce((s, p) => s + p.preco * p.quantidade_estoque, 0),
          receitaTotal:   resumo.reduce((s, v) => s + Number(v.receita_total), 0),
          totalUnidades:  resumo.reduce((s, v) => s + Number(v.total_unidades), 0),
          topProdutos:    resumo.slice(0, 3),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [empresa]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Carregando dados de {info.nome}…
      </div>
    );
  }

  const cards = [
    { label: 'Produtos Cadastrados', value: kpis.totalProdutos,                         icon: '🏷️'  },
    { label: 'Unidades em Estoque',  value: kpis.totalEstoque.toLocaleString('pt-BR'),   icon: '📦'  },
    { label: 'Valor em Estoque',     value: `R$ ${kpis.valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: '💰' },
    { label: 'Receita Total',        value: `R$ ${kpis.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: '📈' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{info.nome}</h1>
        <p className="text-sm text-gray-500">Visão geral do negócio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{card.value}</p>
              </div>
              <span className="text-2xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Top produtos por receita */}
      {kpis.topProdutos.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Top Produtos por Receita</h2>
          <ul className="space-y-3">
            {kpis.topProdutos.map((p, i) => (
              <li key={p.produto_id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-800">{p.produto_nome}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  R$ {Number(p.receita_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
