/**
 * Migration: Add Academic Modules Tables
 * 
 * Adiciona as 5 tabelas dos módulos acadêmicos:
 * - materia (Disciplinas/Matérias)
 * - curso (Cursos Técnicos)
 * - turma (Turmas/Classes)
 * - matricula (Matrículas de Alunos)
 * - materiaxprofessorxturma (Alocações de Professores)
 * 
 * Execução: npx tsx backend/database/migrations/add-modulos-academicos.ts
 */

import { getPool } from "../mysql";
import { RowDataPacket } from "mysql2";

async function runMigration() {
  const pool = getPool();
  console.log("🔄 Iniciando migration: Add Academic Modules Tables...\n");

  try {
    // =====================================================
    // TABELA: materia
    // =====================================================
    console.log("📚 Criando tabela 'materia'...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS materia (
        MateriaGUID CHAR(36) NOT NULL,
        EscolaGUID CHAR(36) NOT NULL,
        MateriaNome VARCHAR(100) NOT NULL,
        MateriaIsTecnica BOOLEAN NOT NULL DEFAULT FALSE,
        MateriaStatus ENUM('Ativa', 'Inativa') NOT NULL DEFAULT 'Ativa',
        MateriaCreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        MateriaUpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (MateriaGUID),
        UNIQUE KEY UQ_Escola_MateriaNome (EscolaGUID, MateriaNome),
        INDEX idx_materia_escola (EscolaGUID),
        INDEX idx_materia_nome (MateriaNome),
        INDEX idx_materia_tecnica (MateriaIsTecnica),
        INDEX idx_materia_status (MateriaStatus),
        CONSTRAINT FK_Materia_Escola FOREIGN KEY (EscolaGUID)
          REFERENCES escola(EscolaGUID)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabela 'materia' criada com sucesso!\n");

    // =====================================================
    // TABELA: curso
    // =====================================================
    console.log("🎓 Criando tabela 'curso'...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS curso (
        CursoGUID CHAR(36) NOT NULL,
        EscolaGUID CHAR(36) NOT NULL,
        CursoNome VARCHAR(100) NOT NULL,
        CursoStatus ENUM('Ativo', 'Inativo') NOT NULL DEFAULT 'Ativo',
        CursoCreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CursoUpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (CursoGUID),
        UNIQUE KEY UQ_Escola_CursoNome (EscolaGUID, CursoNome),
        INDEX idx_curso_escola (EscolaGUID),
        INDEX idx_curso_nome (CursoNome),
        INDEX idx_curso_status (CursoStatus),
        CONSTRAINT FK_Curso_Escola FOREIGN KEY (EscolaGUID)
          REFERENCES escola(EscolaGUID)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabela 'curso' criada com sucesso!\n");

    // =====================================================
    // TABELA: turma
    // =====================================================
    console.log("🏫 Criando tabela 'turma'...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS turma (
        TurmaGUID CHAR(36) NOT NULL,
        EscolaGUID CHAR(36) NOT NULL,
        TurmaSerie VARCHAR(20) NOT NULL,
        TurmaNome VARCHAR(50) NOT NULL,
        TurmaIsTecnico BOOLEAN NOT NULL DEFAULT FALSE,
        CursoGUID CHAR(36) NULL,
        TurmaStatus ENUM('Ativa', 'Inativa', 'Encerrada') NOT NULL DEFAULT 'Ativa',
        TurmaCreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        TurmaUpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (TurmaGUID),
        UNIQUE KEY UQ_Escola_Serie_Nome (EscolaGUID, TurmaSerie, TurmaNome),
        INDEX idx_turma_escola (EscolaGUID),
        INDEX idx_turma_curso (CursoGUID),
        INDEX idx_turma_tecnico (TurmaIsTecnico),
        INDEX idx_turma_status (TurmaStatus),
        CONSTRAINT FK_Turma_Escola FOREIGN KEY (EscolaGUID)
          REFERENCES escola(EscolaGUID)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT FK_Turma_Curso FOREIGN KEY (CursoGUID)
          REFERENCES curso(CursoGUID)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabela 'turma' criada com sucesso!\n");

    // =====================================================
    // TABELA: matricula
    // =====================================================
    console.log("📝 Criando tabela 'matricula'...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS matricula (
        MatriculaGUID VARCHAR(36) NOT NULL,
        UsuarioCPF VARCHAR(14) NOT NULL,
        TurmaGUID CHAR(36) NOT NULL,
        MatriculaStatus ENUM('Ativa', 'Transferida', 'Concluida', 'Cancelada') NOT NULL DEFAULT 'Ativa',
        MatriculaCreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        MatriculaUpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (MatriculaGUID),
        INDEX idx_matricula_usuario (UsuarioCPF),
        INDEX idx_matricula_turma (TurmaGUID),
        INDEX idx_matricula_status (MatriculaStatus),
        CONSTRAINT FK_Matricula_Usuario FOREIGN KEY (UsuarioCPF)
          REFERENCES usuario(UsuarioCPF)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT FK_Matricula_Turma FOREIGN KEY (TurmaGUID)
          REFERENCES turma(TurmaGUID)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabela 'matricula' criada com sucesso!\n");

    // =====================================================
    // TABELA: materiaxprofessorxturma
    // =====================================================
    console.log("👨‍🏫 Criando tabela 'materiaxprofessorxturma'...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS materiaxprofessorxturma (
        MatProfTurGUID CHAR(36) NOT NULL,
        MateriaGUID CHAR(36) NOT NULL,
        TurmaGUID CHAR(36) NOT NULL,
        UsuarioCPF VARCHAR(14) NOT NULL,
        AlocacaoStatus ENUM('Ativa', 'Inativa') NOT NULL DEFAULT 'Ativa',
        MatProfTurCreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        MatProfTurUpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (MatProfTurGUID),
        UNIQUE KEY UQ_Materia_Turma_Professor (MateriaGUID, TurmaGUID, UsuarioCPF),
        INDEX idx_mpt_materia (MateriaGUID),
        INDEX idx_mpt_turma (TurmaGUID),
        INDEX idx_mpt_professor (UsuarioCPF),
        INDEX idx_mpt_status (AlocacaoStatus),
        CONSTRAINT FK_MPT_Materia FOREIGN KEY (MateriaGUID)
          REFERENCES materia(MateriaGUID)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT FK_MPT_Turma FOREIGN KEY (TurmaGUID)
          REFERENCES turma(TurmaGUID)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT FK_MPT_Professor FOREIGN KEY (UsuarioCPF)
          REFERENCES usuario(UsuarioCPF)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabela 'materiaxprofessorxturma' criada com sucesso!\n");

    // =====================================================
    // Verificar tabelas criadas
    // =====================================================
    console.log("🔍 Verificando tabelas criadas...");
    const [tables] = await pool.execute<RowDataPacket[]>(
      "SHOW TABLES LIKE 'materia' OR SHOW TABLES LIKE 'curso' OR SHOW TABLES LIKE 'turma' OR SHOW TABLES LIKE 'matricula' OR SHOW TABLES LIKE 'materiaxprofessorxturma'"
    );

    const tabelasEsperadas = [
      "materia",
      "curso",
      "turma",
      "matricula",
      "materiaxprofessorxturma",
    ];

    console.log("\n📊 Resumo da Migration:");
    console.log("========================");
    for (const tabela of tabelasEsperadas) {
      const [existe] = await pool.execute<RowDataPacket[]>(
        `SHOW TABLES LIKE '${tabela}'`
      );
      const status = existe.length > 0 ? "✅ Existe" : "❌ Não encontrada";
      console.log(`${status}: ${tabela}`);
    }

    console.log("\n✅ Migration concluída com sucesso!");
    console.log("\n📝 Notas Importantes:");
    console.log(
      "   - Matéria: MateriaIsTecnica=true requer EscolaIsTecnica=true"
    );
    console.log(
      "   - Curso: Todos os cursos são técnicos, apenas em escolas técnicas"
    );
    console.log("   - Turma: TurmaIsTecnico=true requer CursoGUID obrigatório");
    console.log(
      "   - Matrícula: Um aluno só pode ter 1 matrícula 'Ativa' por vez"
    );
    console.log(
      "   - Professor: Não é entidade separada, é Usuario com FuncaoId=3"
    );
    console.log(
      "   - Alocação: Junction table com UNIQUE (Materia + Turma + Professor)"
    );

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Erro ao executar migration:");
    console.error(error.message);

    if (error.code === "ER_TABLE_EXISTS_ERROR") {
      console.log(
        "\n⚠️  Tabela já existe. Use DROP TABLE para recriar ou ignore se já foi executada."
      );
    }

    process.exit(1);
  }
}

// Executar migration
runMigration();
