import { useEmpresa, EMPRESAS } from '../context/EmpresaContext';

// ---- Ícones SVG inline (sem dependência de lib) ----------------------
const IconPDV = () => (
  <svg className="nav-item__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="3" width="14" height="10" rx="1.5" />
    <path d="M5 3V2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
    <path d="M8 7v4M6 9h4" />
  </svg>
);

const IconEstoque = () => (
  <svg className="nav-item__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 5.5 8 2l6 3.5V11l-6 3.5L2 11V5.5Z" />
    <path d="M8 2v13M2 5.5l6 3.5 6-3.5" />
  </svg>
);

const IconDashboard = () => (
  <svg className="nav-item__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="6" height="6" rx="1" />
    <rect x="9" y="1" width="6" height="6" rx="1" />
    <rect x="1" y="9" width="6" height="6" rx="1" />
    <rect x="9" y="9" width="6" height="6" rx="1" />
  </svg>
);

const IconLives = () => (
  <svg className="nav-item__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="6" />
    <circle cx="8" cy="8" r="2" fill="currentColor" />
  </svg>
);

const IconCheck = () => (
  <svg className="company-btn__check" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2.5 7l3.5 3.5 5.5-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---- Itens de navegação por página -----------------------------------
const NAV_ITEMS = [
  { id: 'pdv',            label: 'Ponto de Venda',          Icon: IconPDV       },
  { id: 'lives',          label: 'Painel de Lives',         Icon: IconLives     },
  { id: 'estoque',        label: 'Estoque',                Icon: IconEstoque   },
  { id: 'movimentacoes',  label: 'Movimentações',          Icon: IconEstoque   },
  { id: 'dashboard',      label: 'Dashboard de Faturamento', Icon: IconDashboard },
];

// ----------------------------------------------------------------------

export default function Sidebar({ paginaAtiva, onNavegar, menuMobileAberto, onFecharMenu, usuario, onLogout }) {
  const { empresa, trocarEmpresa, info } = useEmpresa();
  const itensPermitidos = NAV_ITEMS.filter(({ id }) => usuario?.perfil === 'admin' || id !== 'dashboard');

  return (
    <aside id="menu-navegacao" className={`sidebar${menuMobileAberto ? ' sidebar--mobile-open' : ''}`}>

      {/* Logo / marca */}
      <div className="sidebar__logo">
        <button
          type="button"
          onClick={onFecharMenu}
          className="sidebar__close-button lg:hidden"
          aria-label="Fechar menu de navegação"
        >
          ×
        </button>
        <img 
          src={info.logo} 
          alt={info.nome} 
          className="w-12 h-12 rounded-lg object-cover mb-3 shadow-sm"
        />
        <div className="sidebar__logo-title">{info.nome}</div>
        <div className="sidebar__logo-sub">Gestão &amp; PDV</div>
      </div>

      {/* Seletor de empresa */}
      <div className="sidebar__switcher">
        <div className="sidebar__switcher-label">Empresa</div>
        {Object.values(EMPRESAS).map((emp) => (
          <button
            key={emp.key}
            onClick={() => trocarEmpresa(emp.key)}
            className={`company-btn${empresa === emp.key ? ' active' : ''}`}
          >
            <span className={`company-btn__dot ${emp.dotClass}`} />
            <span className="company-btn__name">{emp.nome}</span>
            <IconCheck />
          </button>
        ))}
      </div>

      {/* Navegação */}
      <nav className="sidebar__nav" aria-label="Navegação principal">
        <div className="sidebar__nav-section-label">Menu</div>
        {itensPermitidos.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onNavegar(id)}
            className={`nav-item${paginaAtiva === id ? ' active' : ''}`}
            aria-current={paginaAtiva === id ? 'page' : undefined}
          >
            <Icon />
            {label}
            <span className="nav-item__indicator" aria-hidden="true" />
          </button>
        ))}
      </nav>

      {/* Rodapé */}
      <footer className="sidebar__footer">
        <div className="mb-3 border-b border-gray-200 pb-3">
          <p className="truncate text-xs font-semibold text-gray-800">{usuario?.nome}</p>
          <p className="text-[11px] capitalize text-gray-500">Perfil: {usuario?.perfil}</p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Sair
          </button>
        </div>
        <p className="sidebar__footer-text">v1.0.0 · Vivi &amp; Primicias</p>
      </footer>
    </aside>
  );
}
