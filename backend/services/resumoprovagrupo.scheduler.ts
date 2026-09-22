/**
 * 📚 Resumo de IA no grupo da turma (WhatsApp), 1 dia antes de cada prova
 *
 * Job diário (node-cron, mesmo padrão do NotificacaoScheduler/CleanupScheduler)
 * que varre provas com data de amanhã (por turma, via `provaagendada_turma`
 * — mesma quebra por turma que `NotificacaoScheduler#executarProvaPrazoAmanha`
 * já usa) e manda o resumo de estudo já gerado por IA (`ProvaAgendadaRecomendacao`,
 * cacheado desde a criação da prova) pro grupo de WhatsApp da turma.
 *
 * Convive com (não substitui) o lembrete individual "prova amanhã" — aquele
 * é só aviso, 1:1 por aluno; este é o resumo de estudo em si, 1 mensagem
 * pro grupo. Ver docs/spec-resumo-ia-prova-grupo-whatsapp.md (repo
 * interceptacaoAVA) pro desenho completo e o racional de cada decisão.
 */

import cron from "node-cron";
import { RowDataPacket } from "mysql2";
import { gerarGUID } from "../utils/helpers/guid.helper";
import { paraFormatoEvolutionApi } from "../utils/helpers/telefone.helper";
import MysqlDatabase from "../database/MysqlDatabase";
import { ProvaAgendadaRecomendacaoDAO } from "../repositories/provaagendadarecomendacao.repository";
import { TurmaGrupoWhatsappDAO } from "../repositories/turmagrupowhatsapp.repository";
import { ProvaAgendadaTurmaResumoEnvioDAO } from "../repositories/provaagendadaturmaresumoenvio.repository";
import ProvaAgendadaTurmaResumoEnvio from "../entities/provaagendadaturmaresumoenvio.model";
import EvolutionApiService from "../external/EvolutionApiService";

interface ProvaTurmaAmanhaRow extends RowDataPacket {
  ProvaAgendadaGUID: string;
  TurmaGUID: string;
  ProvaTitulo: string;
  MateriaNome: string | null;
  TurmaSerie: string;
  TurmaNome: string;
}

export class ResumoProvaGrupoScheduler {
  #tasks: cron.ScheduledTask[] = [];
  #database: MysqlDatabase;
  #recomendacaoDAO: ProvaAgendadaRecomendacaoDAO;
  #turmaGrupoWhatsappDAO: TurmaGrupoWhatsappDAO;
  #envioDAO: ProvaAgendadaTurmaResumoEnvioDAO;
  #evolutionApiService: EvolutionApiService;

  /** Destino de preview/fallback: turma sem grupo vinculado ainda, ou resumo
   * que não ficou pronto a tempo — ver §4 e §5 da spec. */
  #telefoneTeste: string;

  constructor() {
    this.#database = new MysqlDatabase();
    this.#recomendacaoDAO = new ProvaAgendadaRecomendacaoDAO(this.#database);
    this.#turmaGrupoWhatsappDAO = new TurmaGrupoWhatsappDAO(this.#database);
    this.#envioDAO = new ProvaAgendadaTurmaResumoEnvioDAO(this.#database);
    this.#evolutionApiService = EvolutionApiService.getInstance();
    this.#telefoneTeste = process.env.RESUMO_PROVA_TELEFONE_TESTE || "";
  }

  public start(): void {
    console.log("[RESUMO-PROVA-GRUPO] 📚 Iniciando agendamento de resumo de IA pré-prova...");

    const task = cron.schedule(
      "7 6 * * *",
      async () => {
        console.log("\n[RESUMO-PROVA-GRUPO] 📚 Executando job de resumo de IA pré-prova...");
        try {
          await this.executar();
          console.log("[RESUMO-PROVA-GRUPO] ✅ Job concluído");
        } catch (error) {
          console.error("[RESUMO-PROVA-GRUPO] ❌ Erro no job:", error);
        }
      },
      { scheduled: true, timezone: "America/Sao_Paulo" }
    );

    this.#tasks.push(task);
    console.log("[RESUMO-PROVA-GRUPO] ✓ resumo_prova_grupo agendado (7 6 * * *, GMT-3)");
  }

  public stop(): void {
    console.log("[RESUMO-PROVA-GRUPO] 🛑 Parando agendamento...");
    this.#tasks.forEach((task) => task.stop());
    this.#tasks = [];
  }

  public getActiveTasksCount(): number {
    return this.#tasks.length;
  }

  /** Exposto pra permitir rodar manualmente (debug/teste), fora do cron. */
  async executar(): Promise<void> {
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<ProvaTurmaAmanhaRow[]>(`
      SELECT DISTINCT
        pa.ProvaAgendadaGUID,
        pat.TurmaGUID,
        pa.ProvaTitulo,
        m.MateriaNome,
        t.TurmaSerie,
        t.TurmaNome
      FROM provaagendada_turma pat
      INNER JOIN provaagendada pa ON pa.ProvaAgendadaGUID = pat.ProvaAgendadaGUID
      INNER JOIN turma t ON t.TurmaGUID = pat.TurmaGUID
      LEFT JOIN materia m ON m.MateriaGUID = pa.MateriaGUID
      WHERE pa.ProvaStatus = 'Agendada'
        AND DATE(COALESCE(pat.ProvaDataTurma, pa.ProvaData)) = DATE(NOW() + INTERVAL 1 DAY)
    `);

    console.log(`[RESUMO-PROVA-GRUPO] ${rows.length} par(es) prova/turma encontrado(s) pra amanhã`);

    for (const row of rows) {
      try {
        await this.#processarParProvaTurma(row);
      } catch (error) {
        console.error(
          `[RESUMO-PROVA-GRUPO] ❌ Falha ao processar prova=${row.ProvaAgendadaGUID} turma=${row.TurmaGUID}:`,
          error
        );
      }
    }
  }

  async #processarParProvaTurma(row: ProvaTurmaAmanhaRow): Promise<void> {
    const jaEnviado = await this.#envioDAO.jaEnviado(row.ProvaAgendadaGUID, row.TurmaGUID);
    if (jaEnviado) {
      console.log(`[RESUMO-PROVA-GRUPO]   já enviado antes, pulando (prova=${row.ProvaAgendadaGUID} turma=${row.TurmaGUID})`);
      return;
    }

    const vinculo = await this.#turmaGrupoWhatsappDAO.findByTurma(row.TurmaGUID);
    const recomendacao = await this.#recomendacaoDAO.findByProva(row.ProvaAgendadaGUID);

    const resumoPronto = recomendacao?.StatusGeracao === "Concluida" && !!recomendacao.ResumoTexto;

    // Caso 1: resumo não ficou pronto a tempo — não manda pro grupo (nem
    // resumo incompleto), manda um alerta de falha pro telefone de teste.
    if (!resumoPronto) {
      console.log(
        `[RESUMO-PROVA-GRUPO]   resumo não pronto (status=${recomendacao?.StatusGeracao ?? "sem recomendação"}), mandando alerta de falha (prova=${row.ProvaAgendadaGUID} turma=${row.TurmaGUID})`
      );
      await this.#mandarAlertaFalha(row, recomendacao?.ErroGeracao ?? "recomendação ainda não gerada");
      await this.#registrarEnvio(row, "TelefoneTeste");
      return;
    }

    const mensagem = this.#montarMensagem(row, recomendacao!.ResumoTexto!);

    // Caso 2: turma sem grupo vinculado ainda — manda pro telefone de teste
    // como preview (identificando a turma/prova), em vez de pular.
    if (!vinculo) {
      console.log(`[RESUMO-PROVA-GRUPO]   turma sem grupo vinculado, mandando preview pro telefone de teste (turma=${row.TurmaGUID})`);
      await this.#mandarParaTelefoneTeste(mensagem, row);
      await this.#registrarEnvio(row, "TelefoneTeste");
      return;
    }

    // Caso 3 (normal): turma com grupo vinculado e resumo pronto — manda pro grupo real.
    console.log(`[RESUMO-PROVA-GRUPO]   mandando pro grupo real da turma (turma=${row.TurmaGUID}, jid=${vinculo.GrupoWhatsappJID})`);
    await this.#evolutionApiService.sendText(vinculo.GrupoWhatsappJID, mensagem);
    await this.#registrarEnvio(row, "GrupoReal");
  }

  #montarMensagem(row: ProvaTurmaAmanhaRow, resumo: string): string {
    const materiaLinha = row.MateriaNome ? `📘 ${row.MateriaNome}` : null;
    const linhas = [
      `*${row.ProvaTitulo}*`,
      materiaLinha,
      "",
      resumo,
      "",
      "powered by *BAUÁ* 🐦‍⬛",
    ].filter((linha): linha is string => linha !== null);
    return linhas.join("\n");
  }

  async #mandarParaTelefoneTeste(mensagem: string, row: ProvaTurmaAmanhaRow): Promise<void> {
    if (!this.#telefoneTeste) {
      console.warn("[RESUMO-PROVA-GRUPO] ⚠️ RESUMO_PROVA_TELEFONE_TESTE não configurado — preview não enviado.");
      return;
    }
    const cabecalho = `⚠️ *Preview* (turma ${row.TurmaSerie} ${row.TurmaNome} ainda sem grupo vinculado)\n\n`;
    await this.#evolutionApiService.sendText(paraFormatoEvolutionApi(this.#telefoneTeste), cabecalho + mensagem);
  }

  async #mandarAlertaFalha(row: ProvaTurmaAmanhaRow, motivo: string): Promise<void> {
    if (!this.#telefoneTeste) {
      console.warn("[RESUMO-PROVA-GRUPO] ⚠️ RESUMO_PROVA_TELEFONE_TESTE não configurado — alerta não enviado.");
      return;
    }
    const texto =
      `⚠️ *MAVA — resumo de prova falhou*\n\n` +
      `Turma: ${row.TurmaSerie} ${row.TurmaNome}\n` +
      `Prova: ${row.ProvaTitulo}\n` +
      `Motivo: ${motivo}\n\n` +
      `O grupo real não recebeu nada dessa vez.`;
    await this.#evolutionApiService.sendText(paraFormatoEvolutionApi(this.#telefoneTeste), texto);
  }

  async #registrarEnvio(row: ProvaTurmaAmanhaRow, destino: "GrupoReal" | "TelefoneTeste"): Promise<void> {
    const envio = new ProvaAgendadaTurmaResumoEnvio();
    envio.ProvaAgendadaTurmaResumoEnvioGUID = gerarGUID();
    envio.ProvaAgendadaGUID = row.ProvaAgendadaGUID;
    envio.TurmaGUID = row.TurmaGUID;
    envio.Destino = destino;
    envio.validar();
    await this.#envioDAO.registrar(envio);
  }
}
