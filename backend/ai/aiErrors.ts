/**
 * Erro tipado pra qualquer falha de provedor de IA/API externa usada pelo
 * pipeline de recomendação (Gemini, YouTube Data API). Guardrail do spec
 * (§7): falha de API não pode travar a criação/edição da prova — o service
 * orquestrador captura isto e grava StatusGeracao='Falhou' em vez de deixar
 * a exceção subir.
 */
export class IAIndisponivelError extends Error {
  constructor(origem: string, causa?: unknown) {
    const causaMsg = causa instanceof Error ? causa.message : causa ? String(causa) : "";
    super(`${origem} indisponível${causaMsg ? `: ${causaMsg}` : ""}`);
    this.name = "IAIndisponivelError";
  }
}
