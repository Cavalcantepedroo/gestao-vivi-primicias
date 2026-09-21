# Vivi Semi-Joias & Primicias — Sistema de Gestão

Sistema full-stack de gestão comercial para duas empresas independentes com bancos de dados PostgreSQL separados.

## 🏗️ Estrutura do Projeto

```
vivi e primicias/
├── backend/                  # Node.js + Express
│   ├── src/
│   │   ├── database/
│   │   │   ├── db.js         # Conexão com os dois PostgreSQL
│   │   │   ├── migrate.js    # Criação das tabelas
│   │   │   └── seed.js       # Dados de exemplo
│   │   ├── middleware/
│   │   │   └── resolveDb.js  # Seleciona o banco pelo parâmetro :empresa
│   │   ├── controllers/
│   │   │   ├── produtosController.js
│   │   │   └── vendasController.js
│   │   ├── routes/
│   │   │   ├── produtosRoutes.js
│   │   │   └── vendasRoutes.js
│   │   └── server.js         # Ponto de entrada
│   ├── .env.example
│   └── package.json
│
└── frontend/                 # React + Vite + Tailwind CSS v4
    └── src/
        ├── context/
        │   └── EmpresaContext.jsx  # Estado global da empresa ativa
        ├── services/
        │   ├── api.js              # Instâncias Axios por empresa
        │   └── gestao.js           # Funções de chamada à API
        ├── components/
        │   └── Sidebar.jsx
        └── pages/
            ├── Dashboard.jsx
            ├── Produtos.jsx
            └── Vendas.jsx
```

## ⚡ Como Começar

### 1. Configurar os Bancos de Dados

Crie dois bancos PostgreSQL:
```sql
CREATE DATABASE vivi_semi_joias;
CREATE DATABASE primicias;
```

### 2. Configurar o Backend

```bash
cd backend
cp .env.example .env
# Edite o .env com suas credenciais PostgreSQL
npm install
npm run migrate    # Cria as tabelas nos dois bancos
npm run seed       # Popula dados de exemplo (opcional)
npm run dev        # Inicia o servidor em http://localhost:3001
```

### 3. Configurar o Frontend

```bash
cd frontend
npm install        # Já executado pelo scaffold
npm run dev        # Inicia o app em http://localhost:3000
```

## 🔌 Endpoints da API

O parâmetro `:empresa` aceita `vivi` ou `primicias`.

| Método | Endpoint                                | Descrição                     |
|--------|-----------------------------------------|-------------------------------|
| GET    | `/api/:empresa/produtos`                | Listar produtos                |
| POST   | `/api/:empresa/produtos`                | Criar produto                  |
| PUT    | `/api/:empresa/produtos/:id`            | Atualizar produto              |
| DELETE | `/api/:empresa/produtos/:id`            | Excluir produto                |
| GET    | `/api/:empresa/vendas`                  | Listar vendas                  |
| POST   | `/api/:empresa/vendas`                  | Registrar venda (decrementa estoque automaticamente) |
| GET    | `/api/:empresa/vendas/relatorio/resumo` | Resumo de receita por produto  |

## 🗄️ Modelagem do Banco

```sql
-- Tabela: produtos
CREATE TABLE produtos (
  id                 SERIAL PRIMARY KEY,
  nome               VARCHAR(255) NOT NULL,
  codigo_de_barras   VARCHAR(50) UNIQUE,
  preco              NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
  quantidade_estoque INTEGER NOT NULL DEFAULT 0,
  criado_em          TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela: vendas
CREATE TABLE vendas (
  id          SERIAL PRIMARY KEY,
  produto_id  INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade  INTEGER NOT NULL CHECK (quantidade > 0),
  valor_total NUMERIC(10,2) NOT NULL CHECK (valor_total >= 0),
  data_venda  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 🏢 Isolamento entre Empresas

Cada empresa possui seu próprio banco PostgreSQL. O middleware `resolveDb` injeta o pool correto em `req.db` baseado no prefixo da URL, mantendo os controllers completamente agnósticos sobre qual empresa está operando.

```
GET /api/vivi/produtos        → pool da Vivi Semi-Joias (DB: vivi_semi_joias)
GET /api/primicias/produtos  → pool da Primicias      (DB: primicias)
```

## 🚀 Supabase e Vercel

O backend aceita as URIs PostgreSQL do Supabase nestas variáveis:

```env
DATABASE_URL_VIVI=postgresql://...
DATABASE_URL_PRIMICIAS=postgresql://...
JWT_SECRET=uma-chave-com-pelo-menos-32-caracteres
```

Copie as URIs em **Supabase > Connect > URI**. Se aparecer `password authentication failed`, redefina a senha do banco em **Supabase > Project Settings > Database** e copie a URI novamente. Senhas com caracteres especiais devem permanecer codificadas na URI.

Depois de corrigir as credenciais, inicialize os dois bancos:

```bash
cd backend
npm run migrate
```

Faça dois projetos na Vercel, usando o mesmo repositório:

1. Projeto backend: **Root Directory** `backend`. Adicione `DATABASE_URL_VIVI`, `DATABASE_URL_PRIMICIAS`, `JWT_SECRET`, `AUTH_ADMIN_USERNAME`, `AUTH_ADMIN_EMAIL`, `AUTH_ADMIN_PASSWORD`, `AUTH_VENDEDOR_USERNAME`, `AUTH_VENDEDOR_EMAIL` e `AUTH_VENDEDOR_PASSWORD`. O endereço será a URL da API.
2. Projeto frontend: **Root Directory** `frontend`. Adicione `VITE_API_URL` com a URL do projeto backend, sem barra no final. O build é `npm run build` e o output é `dist`.

Não publique o arquivo `.env` no GitHub nem na Vercel; cadastre os valores no painel de Environment Variables. Se uma senha real foi compartilhada fora do Supabase, redefina-a antes da publicação.
