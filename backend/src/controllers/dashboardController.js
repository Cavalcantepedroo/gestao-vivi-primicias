const { viviPool, primiciasPool } = require('../database/db');

const PERIODOS = {
  '7d': { dias: 7, agrupamento: 'dia' },
  '30d': { dias: 30, agrupamento: 'dia' },
  '3m': { meses: 3, agrupamento: 'mes' },
  '6m': { meses: 6, agrupamento: 'mes' },
  ano: { agrupamento: 'mes', anoAtual: true },
};

function getPeriodoConfig(periodo) {
  return PERIODOS[periodo] || PERIODOS['7d'];
}

function getChavesPeriodo(periodo) {
  const config = getPeriodoConfig(periodo);
  const chaves = [];
  const agora = new Date();

  if (config.agrupamento === 'dia') {
    for (let i = config.dias - 1; i >= 0; i -= 1) {
      const data = new Date(agora);
      data.setHours(12, 0, 0, 0);
      data.setDate(data.getDate() - i);
      chaves.push({
        chave: data.toISOString().slice(0, 10),
        label: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      });
    }
    return chaves;
  }

  const primeiroMes = config.anoAtual ? 0 : agora.getMonth() - (config.meses - 1);
  const inicio = new Date(agora.getFullYear(), primeiroMes, 1);
  const totalMeses = config.anoAtual ? agora.getMonth() + 1 : config.meses;

  for (let i = 0; i < totalMeses; i += 1) {
    const data = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1);
    chaves.push({
      chave: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`,
      label: data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    });
  }
  return chaves;
}

async function getStatsForPool(pool, periodo) {
  const config = getPeriodoConfig(periodo);
  const client = await pool.connect();
  try {
    const agrupamento = config.agrupamento === 'dia' ? 'day' : 'month';
    const inicio = config.agrupamento === 'dia'
      ? `${config.dias - 1} days`
      : config.anoAtual ? '0 months' : `${config.meses - 1} months`;
    const filtroInicio = config.anoAtual
      ? "date_trunc('year', CURRENT_DATE)"
      : `date_trunc('${agrupamento}', CURRENT_DATE) - INTERVAL '${inicio}'`;

    const [resMetricas, resEvolucao] = await Promise.all([
      client.query(`
        SELECT
          COALESCE(SUM(valor_total) FILTER (WHERE data_venda::date = CURRENT_DATE), 0) AS hoje,
          COALESCE(SUM(valor_total) FILTER (
            WHERE data_venda >= CURRENT_DATE - INTERVAL '6 days'
              AND data_venda < CURRENT_DATE + INTERVAL '1 day'
          ), 0) AS semana,
          COALESCE(SUM(valor_total) FILTER (
            WHERE data_venda >= date_trunc('month', CURRENT_DATE)
              AND data_venda < CURRENT_DATE + INTERVAL '1 day'
          ), 0) AS mes,
          COALESCE(SUM(valor_total) FILTER (WHERE data_venda::date = (CURRENT_DATE - INTERVAL '1 day')::date), 0) AS hoje_anterior,
          COALESCE(SUM(valor_total) FILTER (
            WHERE data_venda >= CURRENT_DATE - INTERVAL '13 days'
              AND data_venda < CURRENT_DATE - INTERVAL '6 days'
          ), 0) AS semana_anterior,
          COALESCE(SUM(valor_total) FILTER (
            WHERE data_venda >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
              AND data_venda < date_trunc('month', CURRENT_DATE)
          ), 0) AS mes_anterior
        FROM vendas
      `),
      client.query(`
        SELECT
          ${config.agrupamento === 'dia' ? "to_char(date_trunc('day', data_venda), 'YYYY-MM-DD')" : "to_char(date_trunc('month', data_venda), 'YYYY-MM')"} AS chave,
          COALESCE(SUM(valor_total), 0) AS total
        FROM vendas
        WHERE data_venda >= ${filtroInicio}
          AND data_venda < CURRENT_DATE + INTERVAL '1 day'
        GROUP BY 1
        ORDER BY 1
      `),
    ]);

    const metricas = resMetricas.rows[0];
    return {
      hoje: Number(metricas.hoje),
      semana: Number(metricas.semana),
      mes: Number(metricas.mes),
      variacoes: {
        hoje: Number(metricas.hoje_anterior),
        semana: Number(metricas.semana_anterior),
        mes: Number(metricas.mes_anterior),
      },
      evolucao: Object.fromEntries(resEvolucao.rows.map((row) => [row.chave, Number(row.total)])),
    };
  } finally {
    client.release();
  }
}

function variacaoPercentual(atual, anterior) {
  if (Number(anterior) === 0) return Number(atual) === 0 ? 0 : 100;
  return Number((((Number(atual) - Number(anterior)) / Number(anterior)) * 100).toFixed(1));
}

async function getFaturamento(req, res) {
  const empresa = req.query.empresa || 'all';
  const periodo = req.query.periodo || '7d';
  const periodoValido = PERIODOS[periodo] ? periodo : '7d';

  try {
    const vazio = { hoje: 0, semana: 0, mes: 0, variacoes: { hoje: 0, semana: 0, mes: 0 }, evolucao: {} };
    const [statsVivi, statsPrimicias] = await Promise.all([
      empresa === 'primicias' ? vazio : getStatsForPool(viviPool, periodoValido),
      empresa === 'vivi' ? vazio : getStatsForPool(primiciasPool, periodoValido),
    ]);
    const chaves = getChavesPeriodo(periodoValido);

    res.json({
      periodo: periodoValido,
      agrupamento: getPeriodoConfig(periodoValido).agrupamento,
      hoje: statsVivi.hoje + statsPrimicias.hoje,
      semana: statsVivi.semana + statsPrimicias.semana,
      mes: statsVivi.mes + statsPrimicias.mes,
      variacoes: {
        hoje: variacaoPercentual(statsVivi.hoje + statsPrimicias.hoje, statsVivi.variacoes.hoje + statsPrimicias.variacoes.hoje),
        semana: variacaoPercentual(statsVivi.semana + statsPrimicias.semana, statsVivi.variacoes.semana + statsPrimicias.variacoes.semana),
        mes: variacaoPercentual(statsVivi.mes + statsPrimicias.mes, statsVivi.variacoes.mes + statsPrimicias.variacoes.mes),
      },
      evolucao: chaves.map(({ chave, label }) => ({
        data: chave,
        label,
        total: (statsVivi.evolucao[chave] || 0) + (statsPrimicias.evolucao[chave] || 0),
        vivi: statsVivi.evolucao[chave] || 0,
        primicias: statsPrimicias.evolucao[chave] || 0,
      })),
    });
  } catch (err) {
    console.error('Erro ao carregar faturamento:', err);
    res.status(500).json({ error: 'Não foi possível carregar o faturamento.' });
  }
}

module.exports = { getFaturamento };
