/**
 * Validador de Email
 */

export function validarEmail(email: string): boolean {
  // Regex para validação de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return false;
  }

  // Validações adicionais
  const [localPart, domain] = email.split('@');

  // Local part não pode começar ou terminar com ponto
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return false;
  }

  // Domain deve ter pelo menos um ponto
  if (!domain.includes('.')) {
    return false;
  }

  // Domain não pode começar ou terminar com ponto ou hífen
  if (domain.startsWith('.') || domain.endsWith('.') || 
      domain.startsWith('-') || domain.endsWith('-')) {
    return false;
  }

  return true;
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}
