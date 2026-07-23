/**
 * 📅 Scheduler de Nota Automática de Tarefa
 *
 * Roda a cada 5 minutos, alinhado ao relógio (:00, :05, :10...) — evita
 * tanto o atraso de um job diário quanto os riscos de agendamento exato
 * por tarefa (setTimeout estoura acima de ~24,8 dias e perde o agendamento
 * a cada redeploy). Ver docs/PLANO_IMPLEMENTACAO_MATERIAS.md, decisão #5.
 *
 * Zera (nota 0) toda entrega de tarefa (digital ou presencial) cujo prazo
 * já passou sem check/entrega, e dispara `tarefa_avaliada` em lote.
 */

import cron from "node-cron";
import MysqlDatabase from "../database/MysqlDatabase";
import { TarefaAcademicaMatriculaDAO } from "../repositories/tarefaacademica-matricula.repository";
import { TarefaAcademicaDAO } from "../repositories/tarefaacademica.repository";
import { MatriculaDAO } from "../repositories/matricula.repository";
import { TurmaDAO } from "../repositories/turma.repository";
import { getNotificacaoService } from "./notificacao.service";

export class TarefaAcademicaNotaScheduler {
  #tasks: cron.ScheduledTask[] = [];
  #tarefaMatriculaDAO: TarefaAcademicaMatriculaDAO;
  #tarefaDAO: TarefaAcademicaDAO;
  #matriculaDAO: MatriculaDAO;
  #turmaDAO: TurmaDAO;

  constructor() {
    const db = new MysqlDatabase();
    this.#tarefaMatriculaDAO = new TarefaAcademicaMatriculaDAO(db);
    this.#tarefaDAO = new TarefaAcademicaDAO(db);
    this.#matriculaDAO = new MatriculaDAO(db);
    this.#turmaDAO = new TurmaDAO(db);
  }

  public start(): void {
    console.log("[SCHEDULER] 📅 Iniciando agendamento de nota automática de tarefa...");

    const task = cron.schedule(
      "*/5 * * * *",
      async () => {
        try {
          await this.zerarTarefasVencidas();
        } catch (error) {
          console.error("[SCHEDULER] ❌ Erro ao zerar tarefas vencidas:", error);
        }
      },
      { scheduled: true, timezone: "America/Sao_Paulo" }
    );

    this.#tasks.push(task);
    console.log("[SCHEDULER] ✓ Nota automática de tarefa: a cada 5 minutos (GMT-3)");
  }

  public stop(): void {
    this.#tasks.forEach((task) => task.stop());
    this.#tasks = [];
  }

  public getActiveTasksCount(): number {
    return this.#tasks.length;
  }

  /** Exposto pra rodar manualmente (testes/debug), mesmo padrão do CleanupScheduler. */
  public async zerarTarefasVencidas(): Promise<number> {
    const vencidas = await this.#tarefaMatriculaDAO.findVencidasSemAvaliacao(new Date());
    if (vencidas.length === 0) return 0;

    console.log(`[SCHEDULER] 📝 ${vencidas.length} entrega(s) de tarefa vencida(s) sem avaliação — zerando...`);

    for (const item of vencidas) {
      try {
        await this.#tarefaMatriculaDAO.update(item.TarefaMatriculaGUID, {
          TarefaNota: 0,
          TarefaAvaliadoEm: new Date(),
          TarefaAvaliadoPorCPF: null,
        });

        const tarefa = await this.#tarefaDAO.findById(item.TarefaGUID);
        const matricula = await this.#matriculaDAO.findById(item.MatriculaGUID);
        if (!tarefa || !matricula) continue;

        const turma = await this.#turmaDAO.findById(matricula.TurmaGUID);
        if (!turma) continue;

        await getNotificacaoService().disparar({
          tipoSlug: "tarefa_avaliada",
          destinatarios: [item.UsuarioCPF],
          escolaGUID: turma.EscolaGUID,
          titulo: `Prazo de "${tarefa.TarefaTitulo}" venceu sem entrega — nota 0 atribuída automaticamente`,
          entidadeTipo: "tarefa",
          entidadeGUID: tarefa.TarefaGUID,
          link: `/dashboard/${turma.EscolaGUID}/tarefas/${tarefa.TarefaGUID}`,
        });

        // Sem registro em `registroauditoria` aqui — o schema exige um ator
        // humano (`UsuarioCPFAtor` não é nullable) e essa é uma ação de
        // sistema. O rastro fica no próprio dado: `TarefaAvaliadoPorCPF IS
        // NULL` + `TarefaAvaliadoEm` já distingue "automático" de "manual".
      } catch (error) {
        console.error(`[SCHEDULER] ❌ Erro ao zerar atribuição ${item.TarefaMatriculaGUID}:`, error);
      }
    }

    console.log(`[SCHEDULER] ✅ ${vencidas.length} entrega(s) zerada(s) automaticamente`);
    return vencidas.length;
  }
}
