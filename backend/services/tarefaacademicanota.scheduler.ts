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
import { TarefaAcademicaRespostaDAO } from "../repositories/tarefaacademica-resposta.repository";
import { MatriculaDAO } from "../repositories/matricula.repository";
import { TurmaDAO } from "../repositories/turma.repository";
import { getNotificacaoService } from "./notificacao.service";

export class TarefaAcademicaNotaScheduler {
  #tasks: cron.ScheduledTask[] = [];
  #tarefaMatriculaDAO: TarefaAcademicaMatriculaDAO;
  #tarefaDAO: TarefaAcademicaDAO;
  #respostaDAO: TarefaAcademicaRespostaDAO;
  #matriculaDAO: MatriculaDAO;
  #turmaDAO: TurmaDAO;

  constructor() {
    const db = new MysqlDatabase();
    this.#tarefaMatriculaDAO = new TarefaAcademicaMatriculaDAO(db);
    this.#tarefaDAO = new TarefaAcademicaDAO(db);
    this.#respostaDAO = new TarefaAcademicaRespostaDAO(db);
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
        // Passo separado, não bloqueia nem é bloqueado pelo zerar acima —
        // digital/presencial e lista têm caminhos de fechamento diferentes.
        try {
          await this.fecharListasVencidas();
        } catch (error) {
          console.error("[SCHEDULER] ❌ Erro ao fechar listas vencidas:", error);
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

    let zeradas = 0;
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
        zeradas++;
      } catch (error) {
        console.error(`[SCHEDULER] ❌ Erro ao zerar atribuição ${item.TarefaMatriculaGUID}:`, error);
      }
    }

    console.log(`[SCHEDULER] ✅ ${zeradas}/${vencidas.length} entrega(s) zerada(s) automaticamente`);
    return zeradas;
  }

  /**
   * Prazo vencido com lista incompleta (decisão confirmada com o usuário,
   * ver docs/PLANO_IMPLEMENTACAO_TAREFA_LISTA.md Seção 4.4): aproveita o que
   * já foi respondido — insere resposta em branco (0 pontos) só nas questões
   * que ficaram sem resposta, fecha a submissão (TarefaFeito=true, o aluno
   * não pode mais responder depois disso) e tenta fechar a nota final (só
   * fecha de fato se não sobrar nenhuma discursiva sem corrigir).
   */
  public async fecharListasVencidas(): Promise<number> {
    const vencidas = await this.#tarefaMatriculaDAO.findListasVencidasParaFechar(new Date());
    if (vencidas.length === 0) return 0;

    console.log(`[SCHEDULER] 📝 ${vencidas.length} lista(s) vencida(s) incompleta(s) — fechando...`);

    let fechadas = 0;
    for (const item of vencidas) {
      try {
        await this.#respostaDAO.inserirRespostasEmBranco(item.TarefaGUID, item.TarefaMatriculaGUID);
        await this.#tarefaMatriculaDAO.update(item.TarefaMatriculaGUID, { TarefaFeito: true });
        await this.#settleTarefaLista(item.TarefaMatriculaGUID);

        const tarefa = await this.#tarefaDAO.findById(item.TarefaGUID);
        const matricula = await this.#matriculaDAO.findById(item.MatriculaGUID);
        if (tarefa && matricula) {
          const turma = await this.#turmaDAO.findById(matricula.TurmaGUID);
          if (turma) {
            await getNotificacaoService().disparar({
              tipoSlug: "tarefa_avaliada",
              destinatarios: [item.UsuarioCPF],
              escolaGUID: turma.EscolaGUID,
              titulo: `Prazo de "${tarefa.TarefaTitulo}" venceu — as questões em branco foram zeradas automaticamente`,
              entidadeTipo: "tarefa",
              entidadeGUID: tarefa.TarefaGUID,
              link: `/dashboard/${turma.EscolaGUID}/tarefas/${tarefa.TarefaGUID}`,
            });
          }
        }

        fechadas++;
      } catch (error) {
        console.error(`[SCHEDULER] ❌ Erro ao fechar lista ${item.TarefaMatriculaGUID}:`, error);
      }
    }

    console.log(`[SCHEDULER] ✅ ${fechadas}/${vencidas.length} lista(s) fechada(s) automaticamente`);
    return fechadas;
  }

  /**
   * Mesma lógica de TarefaAcademicaService.#tentarSettleTarefaLista, só a
   * parte da nota (o TarefaFeito=true já foi setado explicitamente acima,
   * incondicional, porque aqui o prazo já venceu — diferente do fluxo normal
   * de resposta, onde TarefaFeito só vira true quando o aluno responde a
   * última questão). Duplicado aqui em vez de injetar TarefaAcademicaService
   * inteiro só por causa de um método privado — o scheduler já tem as DAOs
   * que precisa.
   */
  #settleTarefaLista = async (TarefaMatriculaGUID: string): Promise<void> => {
    const agregado = (await this.#respostaDAO.buscarAgregadoPorAluno([TarefaMatriculaGUID])).get(TarefaMatriculaGUID);
    if (!agregado || agregado.TotalQuestoes === 0) return;
    if (agregado.QuestoesCorrigidas < agregado.TotalQuestoes) return; // sobrou discursiva sem corrigir — fica "aguardando_avaliacao"

    const notaFinal = agregado.PontosMaximosTotal > 0
      ? Math.round((agregado.PontosObtidos / agregado.PontosMaximosTotal) * 1000) / 100
      : 0;

    await this.#tarefaMatriculaDAO.update(TarefaMatriculaGUID, {
      TarefaNota: notaFinal,
      TarefaAvaliadoEm: new Date(),
      TarefaAvaliadoPorCPF: await this.#respostaDAO.buscarAvaliadorHumano(TarefaMatriculaGUID),
    });
  };
}
