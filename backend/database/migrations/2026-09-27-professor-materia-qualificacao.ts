/**
 * Migration: Qualificação de Professor por Matéria
 * Data: 27/09/2026
 * Descrição: nova tabela `professormateria` — representa "o professor X está
 * qualificado a lecionar a matéria Y nesta escola", independente de turma.
 *
 * Motivação: a caixa "Turma × Matéria" em gestão-dados/professores (seção
 * "Nova Alocação") mostrava TODAS as matérias da escola pra qualquer
 * professor. Esta migration cria a base pra restringir isso — a matéria só
 * aparece nessa caixa depois de o professor estar qualificado pra ela aqui.
 * `materiaxprofessorxturma` (alocação em turma) não serve pra isso porque
 * exige TurmaGUID ou GrupoEletivoGUID obrigatoriamente (não representa
 * "qualificado, ainda sem turma nenhuma").
 *
 * Idempotente — mesmo padrão de 2026-08-18-grupo-eletivo.ts (checa
 * existência antes de criar).
 */

import MysqlDatabase from "../MysqlDatabase";

async function tabelaExiste(pool: any, tabela: string): Promise<boolean> {
  const [rows] = await pool.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [process.env.DB_NAME || "railway", tabela]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function runMigration() {
  console.log("🔧 Iniciando migration: professor-materia-qualificacao");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    if (await tabelaExiste(pool, "professormateria")) {
      console.log("✅ Tabela professormateria já existe. Pulando.");
    } else {
      console.log("📝 Criando tabela professormateria...");
      await pool.execute(`
        CREATE TABLE professormateria (
          ProfessorMateriaGUID CHAR(36) NOT NULL PRIMARY KEY,
          EscolaGUID CHAR(36) NOT NULL,
          UsuarioGUID CHAR(12) NOT NULL,
          MateriaGUID CHAR(36) NOT NULL,
          ProfessorMateriaStatus ENUM('Ativa','Inativa') NOT NULL DEFAULT 'Ativa',
          CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY UQ_ProfessorMateria_Usuario_Materia (UsuarioGUID, MateriaGUID),
          INDEX idx_professormateria_escola (EscolaGUID),
          INDEX idx_professormateria_usuario (UsuarioGUID),
          INDEX idx_professormateria_materia (MateriaGUID),
          CONSTRAINT FK_ProfessorMateria_Escola FOREIGN KEY (EscolaGUID)
            REFERENCES escola(EscolaGUID) ON UPDATE CASCADE ON DELETE RESTRICT,
          CONSTRAINT FK_ProfessorMateria_Usuario FOREIGN KEY (UsuarioGUID)
            REFERENCES usuario(UsuarioGUID) ON UPDATE CASCADE ON DELETE RESTRICT,
          CONSTRAINT FK_ProfessorMateria_Materia FOREIGN KEY (MateriaGUID)
            REFERENCES materia(MateriaGUID) ON UPDATE CASCADE ON DELETE RESTRICT
        );
      `);
      console.log("✅ Tabela professormateria criada");
    }

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
