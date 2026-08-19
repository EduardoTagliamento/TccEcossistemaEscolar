/**
 * Migration: Grupo Eletivo (turmas mistas/eletivas)
 * Data: 18/08/2026
 * Descrição: ver docs/PLANO_IMPLEMENTACAO_GRUPO_ELETIVO.md.
 *
 * Cria a tabela `grupoeletivo` e estende `matricula`, `materiaxprofessorxturma`
 * e `categoriaconteudo` para aceitarem um GrupoEletivoGUID como alvo
 * alternativo a TurmaGUID (mutuamente exclusivos). Não remove nem renomeia
 * nenhuma constraint existente — só adiciona colunas/índices novos, então é
 * seguro mesmo sem saber os nomes exatos das constraints já existentes em
 * produção.
 */

import MysqlDatabase from "../MysqlDatabase";

async function colunaExiste(pool: any, tabela: string, coluna: string): Promise<boolean> {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME || "railway", tabela, coluna]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function constraintExiste(pool: any, tabela: string, nomeConstraint: string): Promise<boolean> {
  const [rows] = await pool.execute(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [process.env.DB_NAME || "railway", tabela, nomeConstraint]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function indiceExiste(pool: any, tabela: string, nomeIndice: string): Promise<boolean> {
  const [rows] = await pool.execute(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [process.env.DB_NAME || "railway", tabela, nomeIndice]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function runMigration() {
  console.log("🔧 Iniciando migration: grupo-eletivo");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    // ========== 1. Tabela grupoeletivo ==========
    console.log("📝 Criando tabela grupoeletivo (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS grupoeletivo (
        GrupoEletivoGUID CHAR(36) NOT NULL PRIMARY KEY,
        EscolaGUID CHAR(36) NOT NULL,
        GrupoEletivoNome VARCHAR(80) NOT NULL,
        GrupoEletivoStatus ENUM('Ativo','Inativo') NOT NULL DEFAULT 'Ativo',
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY UQ_GrupoEletivo_Escola_Nome (EscolaGUID, GrupoEletivoNome),
        INDEX idx_grupoeletivo_escola (EscolaGUID),
        CONSTRAINT FK_GrupoEletivo_Escola FOREIGN KEY (EscolaGUID)
          REFERENCES escola(EscolaGUID) ON UPDATE CASCADE ON DELETE RESTRICT
      );
    `);
    console.log("✅ Tabela grupoeletivo pronta");

    // ========== 2. matricula: TurmaGUID nullable + GrupoEletivoGUID ==========
    console.log("📝 Tornando matricula.TurmaGUID opcional...");
    await pool.execute(`ALTER TABLE matricula MODIFY TurmaGUID CHAR(36) NULL`);

    if (await colunaExiste(pool, "matricula", "GrupoEletivoGUID")) {
      console.log("✅ Coluna matricula.GrupoEletivoGUID já existe. Pulando.");
    } else {
      console.log("📝 Adicionando coluna matricula.GrupoEletivoGUID...");
      await pool.execute(`
        ALTER TABLE matricula
        ADD COLUMN GrupoEletivoGUID CHAR(36) NULL AFTER TurmaGUID,
        ADD INDEX idx_matricula_grupoeletivo (GrupoEletivoGUID)
      `);
      console.log("✅ Coluna matricula.GrupoEletivoGUID adicionada");
    }

    if (await constraintExiste(pool, "matricula", "FK_Matricula_GrupoEletivo")) {
      console.log("✅ FK_Matricula_GrupoEletivo já existe. Pulando.");
    } else {
      console.log("📝 Adicionando FK_Matricula_GrupoEletivo...");
      await pool.execute(`
        ALTER TABLE matricula
        ADD CONSTRAINT FK_Matricula_GrupoEletivo FOREIGN KEY (GrupoEletivoGUID)
          REFERENCES grupoeletivo(GrupoEletivoGUID) ON UPDATE RESTRICT ON DELETE RESTRICT
      `);
      console.log("✅ FK_Matricula_GrupoEletivo adicionada");
    }

    // CHK_Matricula_Alvo (XOR Turma/GrupoEletivo) intencionalmente NÃO
    // adicionada: FK_Matricula_Turma (pré-existente) usa ON UPDATE CASCADE,
    // e o MySQL proíbe uma coluna de FK com ação CASCADE/SET NULL/SET
    // DEFAULT de também participar de um CHECK (erro 3823). Trocar a ação
    // de uma FK antiga, alheia a esta migration, ficou fora de escopo — a
    // regra XOR já é validada em código (Matricula.validar()), mesmo
    // padrão de validação usado no resto do projeto (ver
    // TarefaAcademica.validarCompartilhada()).

    // ========== 3. materiaxprofessorxturma: TurmaGUID nullable + GrupoEletivoGUID ==========
    console.log("📝 Tornando materiaxprofessorxturma.TurmaGUID opcional...");
    await pool.execute(`ALTER TABLE materiaxprofessorxturma MODIFY TurmaGUID CHAR(36) NULL`);

    if (await colunaExiste(pool, "materiaxprofessorxturma", "GrupoEletivoGUID")) {
      console.log("✅ Coluna materiaxprofessorxturma.GrupoEletivoGUID já existe. Pulando.");
    } else {
      console.log("📝 Adicionando coluna materiaxprofessorxturma.GrupoEletivoGUID...");
      await pool.execute(`
        ALTER TABLE materiaxprofessorxturma
        ADD COLUMN GrupoEletivoGUID CHAR(36) NULL AFTER TurmaGUID,
        ADD INDEX idx_mpt_grupoeletivo (GrupoEletivoGUID)
      `);
      console.log("✅ Coluna materiaxprofessorxturma.GrupoEletivoGUID adicionada");
    }

    if (await constraintExiste(pool, "materiaxprofessorxturma", "FK_MPT_GrupoEletivo")) {
      console.log("✅ FK_MPT_GrupoEletivo já existe. Pulando.");
    } else {
      console.log("📝 Adicionando FK_MPT_GrupoEletivo...");
      await pool.execute(`
        ALTER TABLE materiaxprofessorxturma
        ADD CONSTRAINT FK_MPT_GrupoEletivo FOREIGN KEY (GrupoEletivoGUID)
          REFERENCES grupoeletivo(GrupoEletivoGUID) ON UPDATE RESTRICT ON DELETE RESTRICT
      `);
      console.log("✅ FK_MPT_GrupoEletivo adicionada");
    }

    // CHK_MPT_Alvo intencionalmente não adicionada — mesmo motivo do
    // CHK_Matricula_Alvo acima (FK_MPT_Turma pré-existente usa CASCADE).

    if (await indiceExiste(pool, "materiaxprofessorxturma", "UQ_MPT_Materia_Grupo_Professor")) {
      console.log("✅ UQ_MPT_Materia_Grupo_Professor já existe. Pulando.");
    } else {
      console.log("📝 Adicionando UQ_MPT_Materia_Grupo_Professor (evita alocação duplicada em grupo eletivo)...");
      await pool.execute(`
        ALTER TABLE materiaxprofessorxturma
        ADD UNIQUE KEY UQ_MPT_Materia_Grupo_Professor (MateriaGUID, GrupoEletivoGUID, UsuarioGUID)
      `);
      console.log("✅ UQ_MPT_Materia_Grupo_Professor adicionada");
    }

    // ========== 4. categoriaconteudo: TurmaGUID nullable + GrupoEletivoGUID ==========
    console.log("📝 Tornando categoriaconteudo.TurmaGUID opcional...");
    await pool.execute(`ALTER TABLE categoriaconteudo MODIFY TurmaGUID CHAR(36) NULL`);

    if (await colunaExiste(pool, "categoriaconteudo", "GrupoEletivoGUID")) {
      console.log("✅ Coluna categoriaconteudo.GrupoEletivoGUID já existe. Pulando.");
    } else {
      console.log("📝 Adicionando coluna categoriaconteudo.GrupoEletivoGUID...");
      await pool.execute(`
        ALTER TABLE categoriaconteudo
        ADD COLUMN GrupoEletivoGUID CHAR(36) NULL AFTER TurmaGUID,
        ADD INDEX idx_categoriaconteudo_grupoeletivo (GrupoEletivoGUID)
      `);
      console.log("✅ Coluna categoriaconteudo.GrupoEletivoGUID adicionada");
    }

    if (await constraintExiste(pool, "categoriaconteudo", "FK_CategoriaConteudo_GrupoEletivo")) {
      console.log("✅ FK_CategoriaConteudo_GrupoEletivo já existe. Pulando.");
    } else {
      console.log("📝 Adicionando FK_CategoriaConteudo_GrupoEletivo...");
      await pool.execute(`
        ALTER TABLE categoriaconteudo
        ADD CONSTRAINT FK_CategoriaConteudo_GrupoEletivo FOREIGN KEY (GrupoEletivoGUID)
          REFERENCES grupoeletivo(GrupoEletivoGUID) ON UPDATE RESTRICT ON DELETE RESTRICT
      `);
      console.log("✅ FK_CategoriaConteudo_GrupoEletivo adicionada");
    }

    // CHK_CategoriaConteudo_Alvo intencionalmente não adicionada — mesmo
    // motivo do CHK_Matricula_Alvo acima.

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
