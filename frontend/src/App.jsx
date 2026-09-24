import { useState } from 'react';
import './index.css';
import { EmpresaProvider } from './context/EmpresaContext';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import TopBar  from './components/TopBar';

import PDV from './pages/PDV';
import Lives from './pages/Lives';
import Estoque from './pages/Estoque';
import MovimentacoesEstoque from './pages/MovimentacoesEstoque';
import DashboardFaturamento from './pages/DashboardFaturamento';

const AUTH_STORAGE_KEY = 'auth-session';

function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    if (!session?.token || !session?.usuario) return null;
    const payload = JSON.parse(atob(session.token.split('.')[1]));
    if (!payload.exp || payload.exp * 1000 <= Date.now()) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return session;
  } catch (_err) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

const PAGES = {
  pdv: PDV,
  lives: Lives,
  estoque: Estoque,
  movimentacoes: MovimentacoesEstoque,
  dashboard: DashboardFaturamento,
};

// Componente interno para acessar o contexto e renderizar o layout
function AppLayout({ session, onLogout }) {
  const [pagina, setPagina] = useState('pdv');
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const paginaPermitida = session.usuario.perfil === 'admin' || pagina !== 'dashboard' ? pagina : 'pdv';
  const PaginaAtual = PAGES[paginaPermitida] || PDV;

  const navegar = (proximaPagina) => {
    setPagina(proximaPagina);
    setMenuMobileAberto(false);
  };

  return (
    <>
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 4000,
          className: 'border border-gray-200 shadow-lg',
          success: { duration: 4000 },
          error: { duration: 5000 },
        }}
      />
      {menuMobileAberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMenuMobileAberto(false)}
          className="fixed inset-0 z-30 bg-gray-900/30 lg:hidden"
        />
      )}
      <div className="app-shell">
        <Sidebar
          paginaAtiva={paginaPermitida}
          onNavegar={navegar}
          menuMobileAberto={menuMobileAberto}
          onFecharMenu={() => setMenuMobileAberto(false)}
          usuario={session.usuario}
          onLogout={onLogout}
        />
        
        <main className="main">
          <TopBar paginaAtiva={paginaPermitida} onAbrirMenu={() => setMenuMobileAberto(true)} />
          
          <div className="page-content">
            <PaginaAtual />
          </div>
        </main>
      </div>
    </>
  );
}

export default function App() {
  const [session, setSession] = useState(() => readSession());

  const handleLogin = (data) => {
    const nextSession = { token: data.token, usuario: data.usuario };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
  };

  return (
    <EmpresaProvider>
      {session ? <AppLayout session={session} onLogout={handleLogout} /> : <Login onLogin={handleLogin} />}
    </EmpresaProvider>
  );
}
