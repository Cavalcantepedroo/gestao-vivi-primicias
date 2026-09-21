CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  username VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  senha_hash TEXT NOT NULL,
  perfil VARCHAR(20) NOT NULL DEFAULT 'vendedor' CHECK (perfil IN ('admin', 'vendedor')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_email ON usuarios (LOWER(email));

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username VARCHAR(100);

UPDATE usuarios
SET username = split_part(email, '@', 1)
WHERE username IS NULL OR username = '';

ALTER TABLE usuarios ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_username ON usuarios (LOWER(username));

CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  codigo_de_barras VARCHAR(255) NOT NULL,
  preco NUMERIC(12,2) NOT NULL CHECK (preco >= 0),
  quantidade_estoque INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_estoque >= 0),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_produtos_codigo_de_barras
  ON produtos (codigo_de_barras);

CREATE INDEX IF NOT EXISTS idx_produtos_nome
  ON produtos (nome);

CREATE INDEX IF NOT EXISTS idx_produtos_codigo_de_barras_lookup
  ON produtos (codigo_de_barras);

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  motivo VARCHAR(255) NOT NULL DEFAULT 'manual',
  observacao TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_movimentacoes_estoque_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_produto_id
  ON movimentacoes_estoque (produto_id);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_created_at
  ON movimentacoes_estoque (created_at DESC);

CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  valor_total NUMERIC(12,2) NOT NULL CHECK (valor_total >= 0),
  data_venda TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_vendas_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS vendas_pdv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  valor_total NUMERIC(12,2) NOT NULL CHECK (valor_total >= 0),
  data_venda TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_vendas_pdv_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_vendas_produto_id
  ON vendas (produto_id);

CREATE INDEX IF NOT EXISTS idx_vendas_data_venda
  ON vendas (data_venda DESC);

CREATE INDEX IF NOT EXISTS idx_vendas_pdv_produto_id
  ON vendas_pdv (produto_id);

CREATE INDEX IF NOT EXISTS idx_vendas_pdv_data_venda
  ON vendas_pdv (data_venda DESC);

CREATE TABLE IF NOT EXISTS clientes_live (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  telefone_whatsapp VARCHAR(30) NOT NULL,
  status_carrinho VARCHAR(20) NOT NULL DEFAULT 'aberto',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_live_status
  ON clientes_live (status_carrinho);

CREATE TABLE IF NOT EXISTS itens_carrinho_live (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_live_id UUID NOT NULL,
  produto_id UUID NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario >= 0),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_itens_carrinho_cliente
    FOREIGN KEY (cliente_live_id) REFERENCES clientes_live(id) ON DELETE CASCADE,
  CONSTRAINT fk_itens_carrinho_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_itens_carrinho_cliente
  ON itens_carrinho_live (cliente_live_id);

CREATE INDEX IF NOT EXISTS idx_itens_carrinho_produto
  ON itens_carrinho_live (produto_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_itens_carrinho_live_cliente_produto
  ON itens_carrinho_live (cliente_live_id, produto_id);

CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_produtos_updated_at'
  ) THEN
    CREATE TRIGGER trigger_produtos_updated_at
    BEFORE UPDATE ON produtos
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_clientes_live_updated_at'
  ) THEN
    CREATE TRIGGER trigger_clientes_live_updated_at
    BEFORE UPDATE ON clientes_live
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_usuarios_updated_at'
  ) THEN
    CREATE TRIGGER trigger_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_updated_at();
  END IF;
END $$;
