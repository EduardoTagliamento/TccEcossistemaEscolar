/**
 * Helper: Geração de Senhas Aleatórias
 * Descrição: Gera senhas amigáveis para novos usuários
 * Formato: PrimeiroNome + 2 dígitos aleatórios
 * Exemplo: "João Silva" → "joao47"
 */

/**
 * Gera uma senha aleatória baseada no nome do usuário
 * @param nomeCompleto - Nome completo do usuário
 * @returns Senha gerada (ex: "joao47")
 */
export function gerarSenhaAleatoria(nomeCompleto: string): string {
  // Pegar primeiro nome
  const primeiroNome = nomeCompleto.trim().split(' ')[0];
  
  // Normalizar: remover acentos e converter para minúsculas
  const nomeNormalizado = primeiroNome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
  
  // Gerar 2 dígitos aleatórios
  const digitos = Math.floor(Math.random() * 90 + 10); // Entre 10 e 99
  
  return `${nomeNormalizado}${digitos}`;
}

/**
 * Gera uma senha forte aleatória (alternativa para maior segurança)
 * @param tamanho - Tamanho da senha (padrão: 10)
 * @returns Senha forte gerada
 */
export function gerarSenhaForte(tamanho: number = 10): string {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
  let senha = '';
  
  for (let i = 0; i < tamanho; i++) {
    senha += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  
  return senha;
}

/**
 * Gera uma senha temporária para recuperação
 * @returns Código de 6 dígitos
 */
export function gerarCodigoTemporario(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
