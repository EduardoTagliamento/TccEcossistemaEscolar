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

/**
 * Converte um telefone pro formato que a Evolution API espera (dígitos
 * puros com DDI 55). Aceita tanto `(XX) XXXXX-XXXX` (sem DDI, formato do
 * banco) quanto `+55XX9XXXXXXXX` (com DDI, formato de `TEST_WHATSAPP_TO`/
 * `WHATSAPP_NUMBER` no `.env`) — sem essa checagem, prefixar "55" de novo
 * num número que já tem DDI duplica o prefixo e o envio falha.
 */
export function paraFormatoEvolutionApi(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
    return digitos;
  }
  return `55${digitos}`;
}
