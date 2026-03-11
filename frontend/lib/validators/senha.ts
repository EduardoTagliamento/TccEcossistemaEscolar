/**
 * Validador de Senha
 */

export interface ValidacaoSenha {
  valida: boolean;
  erros: string[];
}

export function validarSenha(senha: string): ValidacaoSenha {
  const erros: string[] = [];

  // Mínimo 6 caracteres
  if (senha.length < 6) {
    erros.push('A senha deve ter no mínimo 6 caracteres');
  }

  // Deve conter pelo menos 1 número
  if (!/\d/.test(senha)) {
    erros.push('A senha deve conter pelo menos 1 número');
  }

  // Deve conter pelo menos 1 caractere especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)) {
    erros.push('A senha deve conter pelo menos 1 caractere especial (!@#$%^&*...)');
  }

  return {
    valida: erros.length === 0,
    erros,
  };
}

export function verificarForcaSenha(senha: string): 'fraca' | 'média' | 'forte' {
  let pontos = 0;

  // Comprimento
  if (senha.length >= 8) pontos++;
  if (senha.length >= 12) pontos++;

  // Complexidade
  if (/[a-z]/.test(senha)) pontos++; // Minúsculas
  if (/[A-Z]/.test(senha)) pontos++; // Maiúsculas
  if (/\d/.test(senha)) pontos++;     // Números
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)) pontos++; // Especiais

  if (pontos <= 2) return 'fraca';
  if (pontos <= 4) return 'média';
  return 'forte';
}
