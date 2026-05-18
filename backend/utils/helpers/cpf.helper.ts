/**
 * Utilitários para manipulação e validação de CPF
 * 
 * Padrão do sistema: CPF sempre formatado como XXX.XXX.XXX-XX
 */

/**
 * Remove todos os caracteres não numéricos do CPF
 * @param cpf - CPF com ou sem formatação
 * @returns CPF apenas com dígitos
 * @example
 * cleanCPF("123.456.789-09") // "12345678909"
 * cleanCPF("12345678909") // "12345678909"
 */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Formata CPF no padrão XXX.XXX.XXX-XX
 * @param cpf - CPF com ou sem formatação
 * @returns CPF formatado ou string original se inválido
 * @example
 * formatCPF("12345678909") // "123.456.789-09"
 * formatCPF("123.456.789-09") // "123.456.789-09"
 */
export function formatCPF(cpf: string): string {
  const cleaned = cleanCPF(cpf);
  
  if (cleaned.length !== 11) {
    return cpf; // Retorna original se não tiver 11 dígitos
  }
  
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
}

/**
 * Valida se o CPF está no formato correto (XXX.XXX.XXX-XX)
 * @param cpf - CPF a ser validado
 * @returns true se estiver no formato correto
 */
export function isValidCPFFormat(cpf: string): boolean {
  const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
  return cpfRegex.test(cpf);
}

/**
 * Valida e formata CPF para uso nas entidades
 * Aceita CPF com ou sem formatação, mas sempre retorna formatado
 * 
 * @param cpf - CPF a ser normalizado
 * @returns CPF formatado (XXX.XXX.XXX-XX)
 * @throws Error se o CPF não tiver exatamente 11 dígitos
 * @example
 * normalizeCPF("12345678909") // "123.456.789-09"
 * normalizeCPF("123.456.789-09") // "123.456.789-09"
 * normalizeCPF("123456789") // Error: CPF deve ter 11 dígitos
 */
export function normalizeCPF(cpf: string): string {
  if (typeof cpf !== 'string' || cpf.trim() === '') {
    throw new Error('CPF deve ser uma string não vazia');
  }
  
  const cleaned = cleanCPF(cpf.trim());
  
  if (cleaned.length !== 11) {
    throw new Error('CPF deve ter exatamente 11 dígitos');
  }
  
  return formatCPF(cleaned);
}

/**
 * Valida CPF (verifica dígitos verificadores)
 * Implementação do algoritmo oficial de validação de CPF
 * 
 * @param cpf - CPF a ser validado (com ou sem formatação)
 * @returns true se o CPF for válido
 */
export function isValidCPF(cpf: string): boolean {
  const cleaned = cleanCPF(cpf);
  
  // CPF deve ter 11 dígitos
  if (cleaned.length !== 11) {
    return false;
  }
  
  // Elimina CPFs conhecidos como inválidos (todos dígitos iguais)
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let firstDigit = 11 - (sum % 11);
  if (firstDigit >= 10) firstDigit = 0;
  
  if (firstDigit !== parseInt(cleaned.charAt(9))) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  let secondDigit = 11 - (sum % 11);
  if (secondDigit >= 10) secondDigit = 0;
  
  return secondDigit === parseInt(cleaned.charAt(10));
}
