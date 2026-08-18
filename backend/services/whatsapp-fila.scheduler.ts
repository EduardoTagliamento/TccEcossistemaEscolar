/**
 * 📅 Serviço de Agendamento — Fila de Reenvio de WhatsApp
 *
 * Roda a cada 5min (node-cron, mesmo padrão do CleanupScheduler) varrendo
 * whatsappfilareenvio por mensagens pendentes e tentando reenviar. Existe
 * pra sobreviver à instabilidade conhecida do Baileys/Evolution API — ver
 * comentário em EvolutionApiService.ts e whatsapp-fila-reenvio.service.ts.
 */

import cron from "node-cron";
import { getWhatsappFilaReenvioService } from "./whatsapp-fila-reenvio.service";

export class WhatsappFilaScheduler {
  #task: cron.ScheduledTask | null = null;

  public start(): void {
    console.log("[WHATSAPP-FILA-SCHEDULER] 📵 Iniciando agendamento de reenvio...");

    this.#task = cron.schedule(
      "*/5 * * * *",
      async () => {
        try {
          const resultado = await getWhatsappFilaReenvioService().processarPendentes();
          if (resultado.enviadas + resultado.falharam + resultado.desistidas > 0) {
            console.log(
              `[WHATSAPP-FILA-SCHEDULER] 📵 Processamento concluído: ${resultado.enviadas} enviada(s), ` +
                `${resultado.falharam} falhou(aram) (tentará de novo), ${resultado.desistidas} desistida(s)`
            );
          }
        } catch (error) {
          console.error("[WHATSAPP-FILA-SCHEDULER] ❌ Erro ao processar fila:", error);
        }
      },
      { scheduled: true, timezone: "America/Sao_Paulo" }
    );

    console.log("[WHATSAPP-FILA-SCHEDULER] ✓ Reenvio de WhatsApp agendado: a cada 5min");
  }

  public stop(): void {
    console.log("[WHATSAPP-FILA-SCHEDULER] 🛑 Parando agendamento...");
    this.#task?.stop();
    this.#task = null;
  }
}
