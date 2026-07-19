/**
 * 📅 Serviço de Agendamento — Lembretes de Notificação
 *
 * Jobs diários (node-cron, mesmo padrão do CleanupScheduler) que varrem
 * tarefa/prova/anotação/evento com vencimento amanhã e disparam os tipos
 * `*_prazo_amanha` do catálogo (ver docs/PLANO_IMPLEMENTACAO_NOTIFICACOES.md,
 * seção 2.6 e 3).
 */

import cron from "node-cron";
import { RowDataPacket } from "mysql2";
import MysqlDatabase from "../database/MysqlDatabase";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import { getNotificacaoService } from "./notificacao.service";

const FUNCOES_EVENTO = [1, 2, 3, 5, 6]; // Coordenacao, Secretaria, Professor, Aluno, Direcao

interface DestinatarioRow extends RowDataPacket {
  UsuarioCPF: string;
  EscolaGUID: string;
  EntidadeGUID: string;
  Titulo: string;
  Compartilhada?: number;
}

export class NotificacaoScheduler {
  #tasks: cron.ScheduledTask[] = [];
  #database: MysqlDatabase;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor() {
    this.#database = new MysqlDatabase();
    this.#escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(this.#database);
  }

  public start(): void {
    console.log("[NOTIF-SCHEDULER] 🔔 Iniciando agendamentos de lembretes...");

    this.#schedule("0 7 * * *", "tarefa_prazo_amanha", () => this.#executarTarefaPrazoAmanha());
    this.#schedule("5 7 * * *", "prova_prazo_amanha", () => this.#executarProvaPrazoAmanha());
    this.#schedule("10 7 * * *", "anotacao_prazo_amanha", () => this.#executarAnotacaoPrazoAmanha());
    this.#schedule("15 7 * * *", "evento_prazo_amanha", () => this.#executarEventoPrazoAmanha());

    console.log(`[NOTIF-SCHEDULER] ✅ ${this.#tasks.length} agendamentos de lembrete iniciados.`);
  }

  public stop(): void {
    console.log("[NOTIF-SCHEDULER] 🛑 Parando agendamentos de lembrete...");
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
        console.log(`\n[NOTIF-SCHEDULER] 🔔 Executando job: ${nome}...`);
        try {
          await handler();
          console.log(`[NOTIF-SCHEDULER] ✅ Job ${nome} concluído`);
        } catch (error) {
          console.error(`[NOTIF-SCHEDULER] ❌ Erro no job ${nome}:`, error);
        }
      },
      { scheduled: true, timezone: "America/Sao_Paulo" }
    );
    this.#tasks.push(task);
    console.log(`[NOTIF-SCHEDULER] ✓ ${nome} agendado (${cronExpr}, GMT-3)`);
  }

  /**
   * Dispara um tipo de lembrete pra cada grupo (EntidadeGUID → destinatários),
   * já filtrando quem já recebeu esse lembrete hoje (idempotência).
   */
  async #dispararPorEntidade(
    tipoSlug: string,
    rows: DestinatarioRow[],
    montarTituloConteudo: (row: DestinatarioRow) => { titulo: string; conteudo?: string }
  ): Promise<void> {
    const notificacaoService = getNotificacaoService();

    const porEntidade = new Map<string, DestinatarioRow[]>();
    for (const row of rows) {
      const lista = porEntidade.get(row.EntidadeGUID) ?? [];
      lista.push(row);
      porEntidade.set(row.EntidadeGUID, lista);
    }

    for (const [entidadeGUID, linhas] of porEntidade) {
      const destinatarios = linhas.map((l) => l.UsuarioCPF);
      const pendentes = await notificacaoService.filtrarNaoNotificadosHoje(destinatarios, tipoSlug, entidadeGUID);
      if (pendentes.length === 0) continue;

      const { titulo, conteudo } = montarTituloConteudo(linhas[0]);

      await notificacaoService.disparar({
        tipoSlug,
        destinatarios: pendentes,
        escolaGUID: linhas[0].EscolaGUID,
        titulo,
        conteudo,
        entidadeTipo: tipoSlug.split("_")[0],
        entidadeGUID,
      });
    }
  }

  async #executarTarefaPrazoAmanha(): Promise<void> {
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT m.UsuarioCPF, t.EscolaGUID, ta.TarefaGUID AS EntidadeGUID, ta.TarefaTitulo AS Titulo, ta.TarefaCompartilhada AS Compartilhada
      FROM tarefaacademica_matricula tam
      INNER JOIN tarefaacademica ta ON ta.TarefaGUID = tam.TarefaGUID
      INNER JOIN matricula m ON m.MatriculaGUID = tam.MatriculaGUID
      INNER JOIN turma t ON t.TurmaGUID = m.TurmaGUID
      WHERE tam.TarefaFeito = 0
        AND m.MatriculaStatus = 'Ativa'
        AND DATE(COALESCE(tam.TarefaPrazoDataMatricula, ta.TarefaPrazoData)) = DATE(NOW() + INTERVAL 1 DAY)
    `);

    await this.#dispararPorEntidade("tarefa_prazo_amanha", rows as DestinatarioRow[], (row) => ({
      titulo: row.Compartilhada
        ? `Lembrete: tarefa compartilhada "${row.Titulo}" vence amanhã`
        : `Lembrete: tarefa "${row.Titulo}" vence amanhã`,
    }));
  }

  async #executarProvaPrazoAmanha(): Promise<void> {
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT DISTINCT m.UsuarioCPF, t.EscolaGUID, pa.ProvaAgendadaGUID AS EntidadeGUID, pa.ProvaDescricao AS Titulo
      FROM provaagendada_turma pat
      INNER JOIN provaagendada pa ON pa.ProvaAgendadaGUID = pat.ProvaAgendadaGUID
      INNER JOIN turma t ON t.TurmaGUID = pat.TurmaGUID
      INNER JOIN matricula m ON m.TurmaGUID = pat.TurmaGUID AND m.MatriculaStatus = 'Ativa'
      WHERE pa.ProvaStatus = 'Agendada'
        AND DATE(COALESCE(pat.ProvaDataTurma, pa.ProvaData)) = DATE(NOW() + INTERVAL 1 DAY)
    `);

    await this.#dispararPorEntidade("prova_prazo_amanha", rows as DestinatarioRow[], (row) => ({
      titulo: "Lembrete: prova amanhã",
      conteudo: row.Titulo ?? undefined,
    }));
  }

  async #executarAnotacaoPrazoAmanha(): Promise<void> {
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT UsuarioCPF, EscolaGUID, AnotacaoGUID AS EntidadeGUID, AnotacaoTitulo AS Titulo
      FROM anotacao
      WHERE AnotacaoIsFeito = 0
        AND DATE(AnotacaoData) = DATE(NOW() + INTERVAL 1 DAY)
    `);

    await this.#dispararPorEntidade("anotacao_prazo_amanha", rows as DestinatarioRow[], (row) => ({
      titulo: `Lembrete: anotação "${row.Titulo}" vence amanhã`,
    }));
  }

  async #executarEventoPrazoAmanha(): Promise<void> {
    const pool = await this.#database.getPool();
    const [eventos] = await pool.execute<RowDataPacket[]>(`
      SELECT EventoGUID, EscolaGUID, EventoTitulo
      FROM evento
      WHERE EventoStatus = 'Agendado'
        AND DATE(EventoData) = DATE(NOW() + INTERVAL 1 DAY)
    `);

    const notificacaoService = getNotificacaoService();

    for (const evento of eventos as any[]) {
      const destinatarios = await this.#escolaxUsuarioxFuncaoDAO.findUsuariosAtivosByEscolaEFuncoes(
        evento.EscolaGUID,
        FUNCOES_EVENTO
      );
      if (destinatarios.length === 0) continue;

      const pendentes = await notificacaoService.filtrarNaoNotificadosHoje(
        destinatarios,
        "evento_prazo_amanha",
        evento.EventoGUID
      );
      if (pendentes.length === 0) continue;

      await notificacaoService.disparar({
        tipoSlug: "evento_prazo_amanha",
        destinatarios: pendentes,
        escolaGUID: evento.EscolaGUID,
        titulo: `Lembrete: evento "${evento.EventoTitulo}" amanhã`,
        entidadeTipo: "evento",
        entidadeGUID: evento.EventoGUID,
      });
    }
  }
}
