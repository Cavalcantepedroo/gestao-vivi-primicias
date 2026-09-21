import { useEmpresa } from '../context/EmpresaContext';

const PAGE_LABELS = {
  pdv:           'Ponto de Venda',
  lives:         'Painel de Lives',
  estoque:       'Estoque',
  movimentacoes: 'Movimentações de Estoque',
  dashboard:     'Dashboard de Faturamento',
};

export default function TopBar({ paginaAtiva, onAbrirMenu }) {
  const { info } = useEmpresa();

  return (
    <header className="topbar">
      <button
        type="button"
        onClick={onAbrirMenu}
        className="topbar__menu-button lg:hidden"
        aria-label="Abrir menu de navegação"
        aria-controls="menu-navegacao"
      >
        <span />
        <span />
        <span />
      </button>
      <nav className="topbar__breadcrumb" aria-label="Breadcrumb">
        <span>{info.nome}</span>
        <span className="topbar__breadcrumb-sep" aria-hidden="true">›</span>
        <span className="topbar__breadcrumb-current">
          {PAGE_LABELS[paginaAtiva] ?? '—'}
        </span>
      </nav>

      <div className="topbar__company-badge" aria-label={`Empresa ativa: ${info.nome}`}>
        <span className="topbar__badge-dot" aria-hidden="true" />
        {info.apelido}
      </div>
    </header>
  );
}
