/**
 * 📎 Entity - RelacaoAnexos
 * 
 * Tabela pivot N:N:N para vincular anexos a tarefas, pendências ou eventos.
 * 
 * Regra: Exatamente UM dos campos (TarefaGUID, PendenciaGUID, EventoGUID) deve estar preenchido.
 * 
 * Campos:
 * - RelacaoAnexoGUID: Identificador único (UUID v4)
 * - AnexoGUID: Anexo vinculado
 * - TarefaGUID: Tarefa acadêmica (opcional)
 * - PendenciaGUID: Pendência (opcional)
 * - EventoGUID: Evento (opcional)
 * - RelacaoCreatedAt: Data de criação do vínculo
 */

export interface RelacaoAnexos {
  RelacaoAnexoGUID: string;
  AnexoGUID: string;
  TarefaGUID: string | null;
  PendenciaGUID: string | null;
  EventoGUID: string | null;
  RelacaoCreatedAt: Date;
}

/**
 * Tipo do recurso vinculado ao anexo
 */
export type TipoRecurso = "tarefa" | "pendencia" | "evento";

/**
 * DTO para criar vínculo
 */
export interface RelacaoAnexosCreateDTO {
  AnexoGUID: string;
  tipo: TipoRecurso;
  recursoGUID: string;
}
