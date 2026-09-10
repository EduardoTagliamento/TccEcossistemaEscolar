/**
 * Detecta se um erro veio de falta de conexão (fetch nem conseguiu chegar
 * ao servidor), pra diferenciar de erros de negócio reais (403, 404 etc,
 * que já vêm com mensagem própria do backend em `tratarResposta`).
 * "Network request failed" é o texto padrão que o polyfill de fetch do
 * React Native usa quando o dispositivo está offline ou o host é
 * inalcançável — não é uma mensagem nossa, é do runtime.
 */
export function ehErroDeRede(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('network request failed') || msg.includes('failed to fetch') || msg.includes('network error');
}
