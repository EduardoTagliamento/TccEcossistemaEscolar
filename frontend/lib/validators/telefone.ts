/**
 * Validador de Telefone
 */

export function validarTelefone(telefone: string): boolean {
  // Remove caracteres não numéricos
  const telefoneLimpo = telefone.replace(/\D/g, '');

  // Verifica se tem 10 (fixo) ou 11 (celular) dígitos
  if (telefoneLimpo.length !== 10 && telefoneLimpo.length !== 11) {
    return false;
  }

  // Verifica se o DDD é válido (11 a 99)
  const ddd = parseInt(telefoneLimpo.substring(0, 2));
  if (ddd < 11 || ddd > 99) {
    return false;
  }

  // Se for celular (11 dígitos), o primeiro dígito após o DDD deve ser 9
  if (telefoneLimpo.length === 11 && telefoneLimpo[2] !== '9') {
    return false;
  }

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(telefoneLimpo)) {
    return false;
  }

  return true;
}

export function formatarTelefone(telefone: string): string {
  const telefoneLimpo = telefone.replace(/\D/g, '');

  if (telefoneLimpo.length === 11) {
    // Celular: (##) #####-####
    return telefoneLimpo.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (telefoneLimpo.length === 10) {
    // Fixo: (##) ####-####
    return telefoneLimpo.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return telefone;
}

export function limparTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}
