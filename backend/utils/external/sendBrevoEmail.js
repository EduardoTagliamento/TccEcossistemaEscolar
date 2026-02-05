// Envia um e-mail transacional usando a API da Brevo
// Substitua 'YOUR_BREVO_API_KEY' pela sua chave de API
const axios = require('axios');

/**
 * Envia um e-mail transacional para o destinatário informado.
 * @param {string} toEmail - E-mail do destinatário
 * @returns {Promise<object>} - Resposta da API Brevo
 */
async function sendBrevoEmail(toEmail) {
  const apiKey = 'xsmtpsib-a26634b12a93b07082479c5eeb3eca68d4bf6e2ecd4ea25e164b37a078089d64-x5jX8ffbCHHEszuk'; // Substitua pela sua chave
  const url = 'https://api.brevo.com/v3/smtp/email';

  const data = {
    sender: { name: 'Nome do Remetente', email: 'ti.eduardotagliamento@gmail.com' },
    to: [{ email: toEmail }],
    subject: 'Assunto do E-mail',
    htmlContent: '<p>Mensagem pré-definida para o destinatário.</p>'
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    return { error: error.response ? error.response.data : error.message };
  }
}

module.exports = sendBrevoEmail;
