import MysqlDatabase from "../database/MysqlDatabase";
import EscolaConfiguracao from "../entities/escolaconfiguracao.model";
import EscolaConfiguracaoIntervalo from "../entities/escolaconfiguracaointervalo.model";
import { DiaSemana } from "../utils/gradeHoraria.util";

interface EscolaConfiguracaoRow {
  EscolaConfiguracaoGUID: string;
  EscolaGUID: string;
  MinutosPorAula: number;
  DiasSemana: string;
  PeriodoManhaInicio: string;
  PeriodoManhaFim: string;
  TemAulaTarde: number | boolean;
  PeriodoTardeInicio: string | null;
  PeriodoTardeFim: string | null;
  IntervaloVariado: number | boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

interface EscolaConfiguracaoIntervaloRow {
  EscolaConfiguracaoIntervaloGUID: string;
  EscolaConfiguracaoGUID: string;
  DiaSemana: DiaSemana | null;
  IntervaloInicio: string;
  IntervaloFim: string;
}

export class EscolaConfiguracaoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  EscolaConfiguracaoDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (config: EscolaConfiguracao): Promise<string> => {
    console.log("🟢 EscolaConfiguracaoDAO.create()");

    const SQL = `
      INSERT INTO escolaconfiguracao
      (EscolaConfiguracaoGUID, EscolaGUID, MinutosPorAula, DiasSemana,
       PeriodoManhaInicio, PeriodoManhaFim, TemAulaTarde,
       PeriodoTardeInicio, PeriodoTardeFim, IntervaloVariado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      config.EscolaConfiguracaoGUID,
      config.EscolaGUID,
      config.MinutosPorAula,
      config.DiasSemana.join(","),
      config.PeriodoManhaInicio,
      config.PeriodoManhaFim,
      config.TemAulaTarde,
      config.PeriodoTardeInicio,
      config.PeriodoTardeFim,
      config.IntervaloVariado,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return config.EscolaConfiguracaoGUID;
  };

  update = async (config: EscolaConfiguracao): Promise<boolean> => {
    console.log("🟢 EscolaConfiguracaoDAO.update()");

    const SQL = `
      UPDATE escolaconfiguracao
      SET MinutosPorAula = ?, DiasSemana = ?,
          PeriodoManhaInicio = ?, PeriodoManhaFim = ?, TemAulaTarde = ?,
          PeriodoTardeInicio = ?, PeriodoTardeFim = ?, IntervaloVariado = ?,
          UpdatedAt = CURRENT_TIMESTAMP
      WHERE EscolaConfiguracaoGUID = ?;
    `;
    const params = [
      config.MinutosPorAula,
      config.DiasSemana.join(","),
      config.PeriodoManhaInicio,
      config.PeriodoManhaFim,
      config.TemAulaTarde,
      config.PeriodoTardeInicio,
      config.PeriodoTardeFim,
      config.IntervaloVariado,
      config.EscolaConfiguracaoGUID,
    ];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  findByEscola = async (escolaGUID: string): Promise<EscolaConfiguracao | null> => {
    console.log("🟢 EscolaConfiguracaoDAO.findByEscola()");

    const SQL = `SELECT * FROM escolaconfiguracao WHERE EscolaGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [escolaGUID]);

    const configs = this.mapRows(rows as EscolaConfiguracaoRow[]);
    return configs[0] || null;
  };

  findIntervalosByConfiguracao = async (
    escolaConfiguracaoGUID: string
  ): Promise<EscolaConfiguracaoIntervalo[]> => {
    console.log("🟢 EscolaConfiguracaoDAO.findIntervalosByConfiguracao()");

    const SQL = `
      SELECT * FROM escolaconfiguracaointervalo
      WHERE EscolaConfiguracaoGUID = ?
      ORDER BY DiaSemana IS NULL DESC, FIELD(DiaSemana, 'Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'), IntervaloInicio
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [escolaConfiguracaoGUID]);

    return this.mapIntervaloRows(rows as EscolaConfiguracaoIntervaloRow[]);
  };

  /**
   * Substitui todos os intervalos de uma configuração (delete + insert),
   * mais simples e seguro que um diff fino para uma lista pequena.
   */
  replaceIntervalos = async (
    escolaConfiguracaoGUID: string,
    intervalos: EscolaConfiguracaoIntervalo[]
  ): Promise<void> => {
    console.log("🟢 EscolaConfiguracaoDAO.replaceIntervalos()");

    const pool = await this.#database.getPool();

    await pool.execute(
      `DELETE FROM escolaconfiguracaointervalo WHERE EscolaConfiguracaoGUID = ?`,
      [escolaConfiguracaoGUID]
    );

    if (intervalos.length === 0) {
      return;
    }

    const SQL = `
      INSERT INTO escolaconfiguracaointervalo
      (EscolaConfiguracaoIntervaloGUID, EscolaConfiguracaoGUID, DiaSemana, IntervaloInicio, IntervaloFim)
      VALUES ${intervalos.map(() => "(?, ?, ?, ?, ?)").join(", ")}
    `;
    const params = intervalos.flatMap((intervalo) => [
      intervalo.EscolaConfiguracaoIntervaloGUID,
      intervalo.EscolaConfiguracaoGUID,
      intervalo.DiaSemana,
      intervalo.IntervaloInicio,
      intervalo.IntervaloFim,
    ]);

    await pool.execute(SQL, params);
  };

  private mapRows(rows: EscolaConfiguracaoRow[]): EscolaConfiguracao[] {
    return rows.map((row) => {
      const config = new EscolaConfiguracao();
      config.EscolaConfiguracaoGUID = row.EscolaConfiguracaoGUID;
      config.EscolaGUID = row.EscolaGUID;
      config.MinutosPorAula = row.MinutosPorAula;
      config.DiasSemana = row.DiasSemana.split(",").filter(Boolean) as DiaSemana[];
      config.PeriodoManhaInicio = row.PeriodoManhaInicio;
      config.PeriodoManhaFim = row.PeriodoManhaFim;
      config.TemAulaTarde = Boolean(row.TemAulaTarde);
      config.PeriodoTardeInicio = row.PeriodoTardeInicio;
      config.PeriodoTardeFim = row.PeriodoTardeFim;
      config.IntervaloVariado = Boolean(row.IntervaloVariado);
      config.CreatedAt = new Date(row.CreatedAt);
      config.UpdatedAt = new Date(row.UpdatedAt);
      return config;
    });
  }

  private mapIntervaloRows(rows: EscolaConfiguracaoIntervaloRow[]): EscolaConfiguracaoIntervalo[] {
    return rows.map((row) => {
      const intervalo = new EscolaConfiguracaoIntervalo();
      intervalo.EscolaConfiguracaoIntervaloGUID = row.EscolaConfiguracaoIntervaloGUID;
      intervalo.EscolaConfiguracaoGUID = row.EscolaConfiguracaoGUID;
      intervalo.DiaSemana = row.DiaSemana;
      intervalo.IntervaloInicio = row.IntervaloInicio;
      intervalo.IntervaloFim = row.IntervaloFim;
      return intervalo;
    });
  }
}
