/**
 * 📅 Serviço de Agendamento — Retry de Resumo de IA Faltando
 *
 * Roda a cada 15min (node-cron, mesmo padrão do WhatsappFilaScheduler)
 * reprocessando provas cujo resumo de estudo ficou faltando — falha parcial
 * silenciosa: StatusGeracao continua 'Concluida' se vídeo/página de livro
 * deram certo, então não existe erro registrado pra alertar ninguém sem
 * isso. Causas reais vistas em produção: cota do tier "cheio" esgotada E o
 * fallback "leve" deu timeout (ambos transientes — spec 08/10/2026).
 */

import cron from "node-cron";
import { getProvaAgendadaRecomendacaoService } from "./provaagendadarecomendacao.service";

const LOTE_POR_EXECUCAO = 5;

export class ProvaAgendadaRecomendacaoRetryScheduler {
  #task: cron.ScheduledTask | null = null;

  public start(): void {
    console.log("[RECOMENDACAO-RETRY-SCHEDULER] 🔁 Iniciando agendamento de retry de resumo...");

    this.#task = cron.schedule(
      "*/15 * * * *",
      async () => {
        try {
          const resultado = await getProvaAgendadaRecomendacaoService().reprocessarResumosFaltando(LOTE_POR_EXECUCAO);
          if (resultado.tentadas > 0) {
            console.log(`[RECOMENDACAO-RETRY-SCHEDULER] 🔁 ${resultado.tentadas} prova(s) reprocessada(s)`);
          }
        } catch (error) {
          console.error("[RECOMENDACAO-RETRY-SCHEDULER] ❌ Erro ao reprocessar:", error);
        }
      },
      { scheduled: true, timezone: "America/Sao_Paulo" }
    );

    console.log("[RECOMENDACAO-RETRY-SCHEDULER] ✓ Retry de resumo agendado: a cada 15min");
  }

  public stop(): void {
    console.log("[RECOMENDACAO-RETRY-SCHEDULER] 🛑 Parando agendamento...");
    this.#task?.stop();
    this.#task = null;
  }
}
