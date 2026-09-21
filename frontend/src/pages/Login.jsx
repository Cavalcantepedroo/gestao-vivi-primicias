import { useState } from 'react';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErro('');
    if (!username.trim() || !senha) {
      const mensagem = 'Informe seu nome de usuário e senha.';
      setErro(mensagem);
      toast(mensagem, { icon: '⚠️' });
      return;
    }

    try {
      setLoading(true);
      const { data } = await authApi.post('/login', { username, senha });
      onLogin(data);
      toast.success('Login realizado com sucesso.');
    } catch (err) {
      const mensagem = err.response?.data?.error || 'Não foi possível entrar no sistema.';
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f3ef] px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-[#e5dfd4] bg-[#fffdfa] p-8 shadow-[0_18px_50px_rgba(64,52,35,0.08)]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#ead9b8] text-2xl font-semibold text-[#735d39]">
            V
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9a8056]">Gestão &amp; PDV</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Acessar painel</h1>
          <p className="mt-2 text-sm text-gray-500">Entre com suas credenciais para continuar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {erro && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {erro}
            </div>
          )}
          <div>
            <label htmlFor="login-username" className="mb-2 block text-sm font-medium text-gray-700">Nome de usuário</label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-md border border-[#d8d0c2] bg-white px-3 py-3 text-gray-900 outline-none transition focus:border-[#b7965e] focus:ring-2 focus:ring-[#ead9b8]"
              placeholder="Ex.: admin"
              required
            />
          </div>
          <div>
            <label htmlFor="login-senha" className="mb-2 block text-sm font-medium text-gray-700">Senha</label>
            <div className="relative">
              <input
                id="login-senha"
                type={senhaVisivel ? 'text' : 'password'}
                autoComplete="current-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                className="w-full rounded-md border border-[#d8d0c2] bg-white px-3 py-3 pr-10 text-gray-900 outline-none transition focus:border-[#b7965e] focus:ring-2 focus:ring-[#ead9b8]"
                placeholder="Digite sua senha"
                required
              />
              <button
                type="button"
                onClick={() => setSenhaVisivel((visivel) => !visivel)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-500 transition hover:bg-[#f5f3ef] hover:text-gray-700"
                aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {senhaVisivel ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 8.5 4 9.5 6-.4.8-1.3 2.1-2.7 3.3M6.2 6.2C4.7 7.2 3.6 8.6 3 10c1 2 4.5 6 9 6 1 0 2-.2 2.9-.6" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#8c7048] px-4 py-3 font-semibold text-white transition hover:bg-[#735b39] disabled:cursor-not-allowed disabled:bg-[#c8b99e]"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}