const { viviPool, primiciasPool } = require('./db');

// ---------------------------------------------------------------------------
// Produtos de exemplo para a Vivi Semi-Joias (semi-joias)
// ---------------------------------------------------------------------------
const viviProdutos = [
  { nome: 'Brinco Argola Dourada P',      codigo: '7891234560001', preco: 25.90,  estoque: 50 },
  { nome: 'Colar Riviera Cristal',        codigo: '7891234560002', preco: 79.90,  estoque: 30 },
  { nome: 'Pulseira Escapulário Ouro',    codigo: '7891234560003', preco: 45.00,  estoque: 40 },
  { nome: 'Anel Solitário Zircônia',      codigo: '7891234560004', preco: 35.50,  estoque: 60 },
  { nome: 'Tornozeleira Coração',         codigo: '7891234560005', preco: 29.90,  estoque: 45 },
  { nome: 'Pingente Lua Crescente',       codigo: '7891234560006', preco: 32.00,  estoque: 35 },
  { nome: 'Bracelete Estrela do Norte',   codigo: '7891234560007', preco: 54.00,  estoque: 22 },
  { nome: 'Conjunto Mini Joias',          codigo: '7891234560008', preco: 68.50,  estoque: 18 },
  { nome: 'Acessório Mensagem de Amor',   codigo: '7891234560009', preco: 19.90,  estoque: 72 },
  { nome: 'Brinco Folheado Ouro',         codigo: '7891234560010', preco: 27.90,  estoque: 41 },
];

// ---------------------------------------------------------------------------
// Produtos de exemplo para a Primicias (acessórios de cabelo)
// ---------------------------------------------------------------------------
const primiciasProdutos = [
  { nome: 'Tiara Veludo Rosa',          codigo: '7899876540001', preco: 18.90,  estoque: 80 },
  { nome: 'Presilha Maxi Flor',         codigo: '7899876540002', preco: 12.50,  estoque: 100 },
  { nome: 'Scrunchie Cetim Colorido',    codigo: '7899876540003', preco: 8.90,   estoque: 150 },
  { nome: 'Faixa Boho Trançada',        codigo: '7899876540004', preco: 22.00,  estoque: 70 },
  { nome: 'Grampo Pérola Cluster',      codigo: '7899876540005', preco: 15.90,  estoque: 90 },
  { nome: 'Pente de Cabelo Floral',     codigo: '7899876540006', preco: 14.50,  estoque: 110 },
  { nome: 'Elástico Vintage',           codigo: '7899876540007', preco: 9.80,   estoque: 130 },
  { nome: 'Kit de Presilhas Neon',      codigo: '7899876540008', preco: 24.90,  estoque: 64 },
  { nome: 'Cabeça de Boneca de Seda',  codigo: '7899876540009', preco: 17.40,  estoque: 88 },
  { nome: 'Ponteira de Laço Renda',    codigo: '7899876540010', preco: 11.00,  estoque: 98 },
];

/**
 * Insere produtos de exemplo em um pool de banco de dados.
 */
async function seedProdutos(pool, produtos, empresaNome) {
  const client = await pool.connect();
  try {
    console.log(`\n🌱 Populando produtos em: ${empresaNome}`);
    await client.query('BEGIN');

    for (const p of produtos) {
      await client.query(
        `INSERT INTO produtos (nome, codigo_de_barras, preco, quantidade_estoque)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (codigo_de_barras) DO NOTHING`,
        [p.nome, p.codigo, p.preco, p.estoque]
      );
    }

    await client.query('COMMIT');
    console.log(`   ✅ ${produtos.length} produto(s) inseridos (ou ignorados se já existiam)`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`   ❌ Erro ao popular ${empresaNome}:`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function seed() {
  await seedProdutos(viviPool,       viviProdutos,       'Vivi Semi-Joias');
  await seedProdutos(primiciasPool, primiciasProdutos, 'Primicias');
  console.log('\n🎉 Seed concluído!\n');
}

if (require.main === module) {
  require('dotenv').config();
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seed };
