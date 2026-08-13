/**
 * Utilitários para manipulação de telefone.
 *
 * Padrão do sistema: telefone sempre formatado como (XX) XXXXX-XXXX — é o
 * único formato aceito pelo setter de `usuario.model.ts` (celular com DDD,
 * 11 dígitos; não há suporte a fixo de 10 dígitos hoje).
 */

/**
 * Formata um telefone de 11 dígitos como (XX) XXXXX-XXXX. Se não tiver
 * exatamente 11 dígitos, devolve o valor original sem alteração — quem
 * chama decide se isso é um erro (ex.: o setter da entidade rejeita
 * qualquer coisa fora do formato).
 */
export function normalizarTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7, 11)}`;
  }
  return telefone;
}
