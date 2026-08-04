import MysqlDatabase from "../database/MysqlDatabase";
import MaterialDidaticoCapitulo from "../entities/materialdidaticocapitulo.model";

interface MaterialDidaticoCapituloRow {
  MaterialDidaticoCapituloGUID: string;
  MaterialDidaticoGUID: string;
  MateriaGUID: string;
  Titulo: string;
  PaginaInicio: number;
  PaginaFim: number;
  AssuntoGUID: string | null;
}

export class MaterialDidaticoCapituloDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  MaterialDidaticoCapituloDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (capitulo: MaterialDidaticoCapitulo): Promise<void> => {
    console.log("🟢 MaterialDidaticoCapituloDAO.create()");

    const SQL = `
      INSERT INTO materialdidaticocapitulo (MaterialDidaticoCapituloGUID, MaterialDidaticoGUID, MateriaGUID, Titulo, PaginaInicio, PaginaFim, AssuntoGUID)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [
      capitulo.MaterialDidaticoCapituloGUID,
      capitulo.MaterialDidaticoGUID,
      capitulo.MateriaGUID,
      capitulo.Titulo,
      capitulo.PaginaInicio,
      capitulo.PaginaFim,
      capitulo.AssuntoGUID,
    ]);
  };

  findById = async (guid: string): Promise<MaterialDidaticoCapitulo | null> => {
    console.log("🟢 MaterialDidaticoCapituloDAO.findById()");

    const SQL = `SELECT * FROM materialdidaticocapitulo WHERE MaterialDidaticoCapituloGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [guid]);

    const lista = this.mapRows(rows as MaterialDidaticoCapituloRow[]);
    return lista[0] || null;
  };

  findByMaterial = async (materialDidaticoGUID: string): Promise<MaterialDidaticoCapitulo[]> => {
    console.log("🟢 MaterialDidaticoCapituloDAO.findByMaterial()");

    const SQL = `SELECT * FROM materialdidaticocapitulo WHERE MaterialDidaticoGUID = ? ORDER BY PaginaInicio ASC`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [materialDidaticoGUID]);
    return this.mapRows(rows as MaterialDidaticoCapituloRow[]);
  };

  /** Livros que têm pelo menos um capítulo desta matéria — pro professor escolher "qual" livro ao referenciar página. */
  findMaterialGUIDsPorMateria = async (materiaGUID: string): Promise<string[]> => {
    console.log("🟢 MaterialDidaticoCapituloDAO.findMaterialGUIDsPorMateria()");

    const SQL = `SELECT DISTINCT MaterialDidaticoGUID FROM materialdidaticocapitulo WHERE MateriaGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [materiaGUID]);
    return (rows as { MaterialDidaticoGUID: string }[]).map((r) => r.MaterialDidaticoGUID);
  };

  findByMaterialEMateria = async (materialDidaticoGUID: string, materiaGUID: string): Promise<MaterialDidaticoCapitulo[]> => {
    console.log("🟢 MaterialDidaticoCapituloDAO.findByMaterialEMateria()");

    const SQL = `
      SELECT * FROM materialdidaticocapitulo
      WHERE MaterialDidaticoGUID = ? AND MateriaGUID = ?
      ORDER BY PaginaInicio ASC
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [materialDidaticoGUID, materiaGUID]);
    return this.mapRows(rows as MaterialDidaticoCapituloRow[]);
  };

  private mapRows(rows: MaterialDidaticoCapituloRow[]): MaterialDidaticoCapitulo[] {
    return rows.map((row) => {
      const capitulo = new MaterialDidaticoCapitulo();
      capitulo.MaterialDidaticoCapituloGUID = row.MaterialDidaticoCapituloGUID;
      capitulo.MaterialDidaticoGUID = row.MaterialDidaticoGUID;
      capitulo.MateriaGUID = row.MateriaGUID;
      capitulo.Titulo = row.Titulo;
      capitulo.PaginaInicio = row.PaginaInicio;
      capitulo.PaginaFim = row.PaginaFim;
      capitulo.AssuntoGUID = row.AssuntoGUID;
      return capitulo;
    });
  }
}
