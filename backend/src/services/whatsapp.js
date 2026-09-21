let Client;
let LocalAuth;
let qrcode;

try {
  ({ Client, LocalAuth } = require('whatsapp-web.js'));
  qrcode = require('qrcode-terminal');
} catch (error) {
  console.warn('⚠️ WhatsApp automation desativada: dependências não instaladas.');
}

let client = null;
let isReady = false;

if (Client && LocalAuth) {
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', (qr) => {
    console.log('\n=========================================================');
    console.log('📲 QR CODE DO WHATSAPP GERADO!');
    console.log('Escaneie o código abaixo com o WhatsApp da Loja:');
    console.log('=========================================================\n');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('\n✅ WhatsApp conectado e pronto para automação!\n');
    isReady = true;
  });

  client.on('auth_failure', msg => {
    console.error('\n❌ Falha na autenticação do WhatsApp:', msg);
  });

  client.initialize();
}

/**
 * Envia uma mensagem automatizada para o WhatsApp
 * @param {string} telefone Apenas números (ex: 41999999999)
 * @param {string} mensagem O texto a ser enviado
 */
async function enviarMensagemWhatsApp(telefone, mensagem) {
  if (!client || !isReady) {
    throw new Error('Serviço do WhatsApp ainda não está pronto ou não está instalado.');
  }

  const numLimpo = telefone.replace(/\D/g, '');
  const numeroFormatado = numLimpo.startsWith('55') ? numLimpo : `55${numLimpo}`;
  const chatId = `${numeroFormatado}@c.us`;

  await client.sendMessage(chatId, mensagem);
}

module.exports = { enviarMensagemWhatsApp };
