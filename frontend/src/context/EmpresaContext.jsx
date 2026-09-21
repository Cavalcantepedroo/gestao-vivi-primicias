import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'empresa-ativa';

export const EMPRESAS = {
  vivi: {
    key:    'vivi',
    nome:   'Vivi Semijoias',
    apelido:'Vivi',
    logo:   '/img/vivi-logo.jpg',
    dotClass: 'company-btn__dot--vivi',
  },
  primicias: {
    key:    'primicias',
    nome:   'Primicias',
    apelido:'Primicias',
    logo:   '/img/primicias-logo.jpg',
    dotClass: 'company-btn__dot--primicias',
  },
};

function normalizeEmpresa(value) {
  return value && EMPRESAS[value] ? value : 'vivi';
}

const EmpresaContext = createContext(null);

export function EmpresaProvider({ children }) {
  const [empresa, setEmpresa] = useState(() => {
    if (typeof window === 'undefined') return 'vivi';

    const salva = localStorage.getItem(STORAGE_KEY);
    return normalizeEmpresa(salva);
  });

  // Sincroniza o data-empresa no <html> para que os CSS tokens atualizem
  const trocarEmpresa = (key) => {
    const empresaValida = normalizeEmpresa(key);
    setEmpresa(empresaValida);
    localStorage.setItem(STORAGE_KEY, empresaValida);
    document.documentElement.setAttribute('data-empresa', empresaValida);
  };

  useEffect(() => {
    const empresaValida = normalizeEmpresa(empresa);
    if (empresaValida !== empresa) {
      setEmpresa(empresaValida);
      return;
    }

    document.documentElement.setAttribute('data-empresa', empresaValida);
    localStorage.setItem(STORAGE_KEY, empresaValida);
  }, [empresa]);

  return (
    <EmpresaContext.Provider value={{
      empresa,
      trocarEmpresa,
      info: EMPRESAS[empresa],
    }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error('useEmpresa deve estar dentro de <EmpresaProvider>');
  return ctx;
}
