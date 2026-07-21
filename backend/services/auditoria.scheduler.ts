/**
 * 📅 Serviço de Agendamento — Expurgo do Registro de Auditoria
 *
 * Job diário (node-cron, mesmo padrão do NotificacaoScheduler) que aplica
 * a retenção diferenciada por categoria de sensibilidade (ver
 * docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md, Seção 4 regra 9, e
 * Seção 6 fase 5). Exclusão física, sem soft delete — dado que já passou
 * do prazo de retenção decidido pelo negócio deve ser removido de fato.
 */

import cron from "node-cron";
import MysqlDatabase from "../database/MysqlDatabase";
import { RegistroAuditoriaDAO } from "../repositories/registroauditoria.repository";
import { CategoriaAuditoriaDAO } from "../repositories/categoriaauditoria.repository";

export class AuditoriaScheduler {
  #tasks: cron.ScheduledTask[] = [];
  #registroDAO: RegistroAuditoriaDAO;
  #categoriaDAO: CategoriaAuditoriaDAO;

  constructor() {
    const database = new MysqlDatabase();
    this.#registroDAO = new RegistroAuditoriaDAO(database);
    this.#categoriaDAO = new CategoriaAuditoriaDAO(database);
  }

  public start(): void {
    console.log("[AUDITORIA-SCHEDULER] 🗂️ Iniciando agendamento de expurgo por retenção...");

    this.#schedule("30 3 * * *", "expurgo_retencao_auditoria", () => this.#executarExpurgo());

    console.log(`[AUDITORIA-SCHEDULER] ✅ ${this.#tasks.length} agendamento(s) de expurgo iniciado(s).`);
  }

  public stop(): void {
    console.log("[AUDITORIA-SCHEDULER] 🛑 Parando agendamento de expurgo...");
    this.#tasks.forEach((task) => task.stop());
    this.#tasks = [];
  }

  public getActiveTasksCount(): number {
    return this.#tasks.length;
  }

  #schedule(cronExpr: string, nome: string, handler: () => Promise<void>): void {
    const task = cron.schedule(
      cronExpr,
      async () => {
        console.log(`\n[AUDITORIA-SCHEDULER] 🗂️ Executando job: ${nome}...`);
        try {
          await handler();
          console.log(`[AUDITORIA-SCHEDULER] ✅ Job ${nome} concluído`);
        } catch (error) {
          console.error(`[AUDITORIA-SCHEDULER] ❌ Erro no job ${nome}:`, error);
        }
      },
      { scheduled: true, timezone: "America/Sao_Paulo" }
    );
    this.#tasks.push(task);
    console.log(`[AUDITORIA-SCHEDULER] ✓ ${nome} agendado (${cronExpr}, GMT-3)`);
  }

  async #executarExpurgo(): Promise<void> {
    const categorias = await this.#categoriaDAO.findAll();

    for (const categoria of categorias) {
      const removidos = await this.#registroDAO.deleteExpiradosPorCategoria(
        categoria.CategoriaAuditoriaId,
        categoria.CategoriaAuditoriaRetencaoDias
      );
      console.log(
        `[AUDITORIA-SCHEDULER] 🗑️  Categoria '${categoria.CategoriaAuditoriaNome}' (retenção ${categoria.CategoriaAuditoriaRetencaoDias}d): ${removidos} registro(s) expurgado(s)`
      );
    }
  }
}
