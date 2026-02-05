const sendBrevoEmail = require('./sendBrevoEmail');

// Substitua pelo e-mail que deseja testar
const emailTeste = 'ti.eduardotagliamento@gmail.com';

sendBrevoEmail(emailTeste)
  .then(response => {
    console.log('Resposta da API Brevo:', response);
  })
  .catch(error => {
    console.error('Erro ao enviar e-mail:', error);
  });
