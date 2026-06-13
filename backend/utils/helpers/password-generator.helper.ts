/**
 * Helper para geração de senhas temporárias
 * Padrão: PrimeiroNome + 2 dígitos aleatórios
 * Exemplo: "João Silva" → "Joao42"
 */

/**
 * Remove acentos de uma string
 */
function removerAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Gera uma senha temporária baseada no nome do usuário
 * @param nomeCompleto - Nome completo do usuário
 * @returns Senha temporária no formato: PrimeiroNome + 2 dígitos
 * @example gerarSenhaTemporaria("João Silva") // "Joao42"
 */
export function gerarSenhaTemporaria(nomeCompleto: string): string {
  if (!nomeCompleto || nomeCompleto.trim().length === 0) {
    throw new Error('Nome completo é obrigatório para gerar senha');
  }

  // Extrair primeiro nome
  const palavras = nomeCompleto.trim().split(/\s+/);
  const primeiroNome = palavras[0];

  // Remover acentos e caracteres especiais
  const nomeLimpo = removerAcentos(primeiroNome)
    .replace(/[^a-zA-Z]/g, '');

  // Capitalizar primeira letra
  const nomeCapitalizado = nomeLimpo.charAt(0).toUpperCase() + nomeLimpo.slice(1).toLowerCase();

  // Gerar 2 dígitos aleatórios (10-99)
  const digitosAleatorios = Math.floor(Math.random() * 90) + 10;

  return `${nomeCapitalizado}${digitosAleatorios}`;
}

/**
 * Gera múltiplas senhas temporárias garantindo que não haja duplicatas
 * @param nomes - Array de nomes completos
 * @returns Map com nome → senha temporária
 */
export function gerarSenhasTemporariasUnicas(nomes: string[]): Map<string, string> {
  const senhasGeradas = new Map<string, string>();
  const senhasUsadas = new Set<string>();

  for (const nome of nomes) {
    let senha: string;
    let tentativas = 0;
    const maxTentativas = 100;

    // Gerar senha única (evitar colisões)
    do {
      senha = gerarSenhaTemporaria(nome);
      tentativas++;

      if (tentativas >= maxTentativas) {
        // Fallback: adicionar timestamp
        senha = `${senha}${Date.now() % 100}`;
        break;
      }
    } while (senhasUsadas.has(senha));

    senhasUsadas.add(senha);
    senhasGeradas.set(nome, senha);
  }

  return senhasGeradas;
}
