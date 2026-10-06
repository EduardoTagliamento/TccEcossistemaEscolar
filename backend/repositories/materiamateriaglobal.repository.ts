import MysqlDatabase from "../database/MysqlDatabase";
import { gerarGUID } from "../utils/helpers/guid.helper";
import MateriaGlobal, { MateriaGlobalStatus } from "../entities/materiaglobal.model";

/**
 * Vínculo N:N entre `materia` (escola) e `materiaglobal` (taxonomia universal) —
 * tabela ADITIVA ao vínculo primário já existente (`materia.MateriaGlobalGUID`,
 * resolvido automaticamente por nome, ver `MateriaGlobalService`). Essa tabela é
 * o superset completo (inclui o vínculo primário + qualquer vínculo adicional),
 * usada pro caso real de uma matéria de escola cobrir MAIS de uma matéria global
 * ao mesmo tempo (ex.: "Filosofia/Sociologia" como 1 aula só, 2 matérias globais).
 */
export class MateriaMateriaGlobalDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  MateriaMateriaGlobalDAO.constructor()");
    this.#database = databaseInstance;
  }

  /** Idempotente — vincular de novo um par já existente não é erro, só não faz nada. */
  vincular = async (materiaGUID: string, materiaGlobalGUID: string): Promise<void> => {
    console.log("🟢 MateriaMateriaGlobalDAO.vincular()");

    const SQL = `
      INSERT IGNORE INTO materiamateriaglobal (MateriaMateriaGlobalGUID, MateriaGUID, MateriaGlobalGUID)
      VALUES (?, ?, ?)
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [gerarGUID(), materiaGUID, materiaGlobalGUID]);
  };

  desvincular = async (materiaGUID: string, materiaGlobalGUID: string): Promise<boolean> => {
    console.log("🟢 MateriaMateriaGlobalDAO.desvincular()");

    const SQL = `DELETE FROM materiamateriaglobal WHERE MateriaGUID = ? AND MateriaGlobalGUID = ?`;
    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, [materiaGUID, materiaGlobalGUID]);
    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  /** Lista as matérias globais vinculadas a uma matéria de escola (já com Nome/Status, via JOIN). */
  listarPorMateria = async (materiaGUID: string): Promise<MateriaGlobal[]> => {
    console.log("🟢 MateriaMateriaGlobalDAO.listarPorMateria()");

    const SQL = `
      SELECT mg.MateriaGlobalGUID, mg.Nome, mg.Status, mg.CreatedAt
      FROM materiaglobal mg
      JOIN materiamateriaglobal mmg ON mmg.MateriaGlobalGUID = mg.MateriaGlobalGUID
      WHERE mmg.MateriaGUID = ?
      ORDER BY mg.Nome ASC
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [materiaGUID]);
    return (rows as { MateriaGlobalGUID: string; Nome: string; Status: MateriaGlobalStatus; CreatedAt: Date }[]).map((row) => {
      const materiaGlobal = new MateriaGlobal();
      materiaGlobal.MateriaGlobalGUID = row.MateriaGlobalGUID;
      materiaGlobal.Nome = row.Nome;
      materiaGlobal.Status = row.Status;
      materiaGlobal.CreatedAt = row.CreatedAt ? new Date(row.CreatedAt) : null;
      return materiaGlobal;
    });
  };

  /** Usado pelo merge de Pendente→Confirmado (mesmo propósito de `MateriaDAO.reatribuirMateriaGlobal`,
   * mas pra lista N:N) — `IGNORE` evita violar a unique key quando a matéria de escola já tinha as
   * duas pontas (origem e destino) vinculadas ao mesmo tempo (raro, mas possível). */
  reatribuir = async (deGUID: string, paraGUID: string): Promise<void> => {
    console.log("🟢 MateriaMateriaGlobalDAO.reatribuir()");

    const SQL = `UPDATE IGNORE materiamateriaglobal SET MateriaGlobalGUID = ? WHERE MateriaGlobalGUID = ?`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [paraGUID, deGUID]);
    // Limpa qualquer linha remanescente (a que o IGNORE pulou por colidir com a unique key) — a
    // matéria de escola já tinha o vínculo de destino de outra forma, então a de origem é redundante.
    await pool.execute(`DELETE FROM materiamateriaglobal WHERE MateriaGlobalGUID = ?`, [deGUID]);
  };
}
