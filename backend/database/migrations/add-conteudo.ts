/**
 * Migration: Criar módulo de Conteúdo (materiais de aula)
 * Data: 15/07/2026
 */

import MysqlDatabase from "../MysqlDatabase";

async function runMigration() {
  console.log("🔧 Iniciando migration: add-conteudo");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    console.log("📝 Criando tabela categoriaconteudo...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS categoriaconteudo (
        CategoriaGUID CHAR(36) NOT NULL PRIMARY KEY,
        UsuarioCPF VARCHAR(14) NOT NULL,
        MateriaGUID CHAR(36) NOT NULL,
        CategoriaNome VARCHAR(100) NOT NULL,
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_categoriaconteudo (UsuarioCPF, MateriaGUID, CategoriaNome),
        CONSTRAINT FK_CategoriaConteudo_Usuario FOREIGN KEY (UsuarioCPF)
          REFERENCES usuario (UsuarioCPF) ON UPDATE CASCADE,
        CONSTRAINT FK_CategoriaConteudo_Materia FOREIGN KEY (MateriaGUID)
          REFERENCES materia (MateriaGUID) ON UPDATE CASCADE
      );
    `);
    console.log("✅ Tabela categoriaconteudo pronta");

    console.log("📝 Criando tabela conteudo...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS conteudo (
        ConteudoGUID CHAR(36) NOT NULL PRIMARY KEY,
        MateriaGUID CHAR(36) NOT NULL,
        UsuarioCPF VARCHAR(14) NOT NULL,
        CategoriaGUID CHAR(36) NULL,
        ConteudoTitulo VARCHAR(150) NOT NULL,
        ConteudoTipo ENUM('cronometrado','texto','paginado') NOT NULL,
        ConteudoDescricao VARCHAR(1024) NULL,
        ConteudoDataPublicacao DATETIME NOT NULL,
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_conteudo_materia (MateriaGUID),
        INDEX idx_conteudo_categoria (CategoriaGUID),
        CONSTRAINT FK_Conteudo_Materia FOREIGN KEY (MateriaGUID)
          REFERENCES materia (MateriaGUID) ON UPDATE CASCADE,
        CONSTRAINT FK_Conteudo_Usuario FOREIGN KEY (UsuarioCPF)
          REFERENCES usuario (UsuarioCPF) ON UPDATE CASCADE,
        CONSTRAINT FK_Conteudo_Categoria FOREIGN KEY (CategoriaGUID)
          REFERENCES categoriaconteudo (CategoriaGUID) ON UPDATE CASCADE ON DELETE SET NULL
      );
    `);
    console.log("✅ Tabela conteudo pronta");

    console.log("📝 Criando tabela conteudoturma...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS conteudoturma (
        ConteudoTurmaGUID CHAR(36) NOT NULL PRIMARY KEY,
        ConteudoGUID CHAR(36) NOT NULL,
        TurmaGUID CHAR(36) NOT NULL,
        ConteudoDataPublicacaoTurma DATETIME NULL,
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_conteudoturma (ConteudoGUID, TurmaGUID),
        CONSTRAINT FK_ConteudoTurma_Conteudo FOREIGN KEY (ConteudoGUID)
          REFERENCES conteudo (ConteudoGUID) ON DELETE CASCADE,
        CONSTRAINT FK_ConteudoTurma_Turma FOREIGN KEY (TurmaGUID)
          REFERENCES turma (TurmaGUID) ON UPDATE CASCADE
      );
    `);
    console.log("✅ Tabela conteudoturma pronta");

    console.log("📝 Criando tabela conteudocronometrado...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS conteudocronometrado (
        ConteudoGUID CHAR(36) NOT NULL PRIMARY KEY,
        OrigemTipo ENUM('upload','link') NOT NULL,
        ArquivoUrl VARCHAR(500) NULL,
        LinkUrl VARCHAR(500) NULL,
        DuracaoSegundos INT NULL,
        ArquivoMimeType VARCHAR(100) NULL,
        CONSTRAINT FK_ConteudoCronometrado_Conteudo FOREIGN KEY (ConteudoGUID)
          REFERENCES conteudo (ConteudoGUID) ON DELETE CASCADE
      );
    `);
    console.log("✅ Tabela conteudocronometrado pronta");

    console.log("📝 Criando tabela conteudotexto...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS conteudotexto (
        ConteudoGUID CHAR(36) NOT NULL PRIMARY KEY,
        ConteudoHtml MEDIUMTEXT NOT NULL,
        CONSTRAINT FK_ConteudoTexto_Conteudo FOREIGN KEY (ConteudoGUID)
          REFERENCES conteudo (ConteudoGUID) ON DELETE CASCADE
      );
    `);
    console.log("✅ Tabela conteudotexto pronta");

    console.log("📝 Criando tabela conteudopaginadoarquivo...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS conteudopaginadoarquivo (
        ConteudoPaginadoArquivoGUID CHAR(36) NOT NULL PRIMARY KEY,
        ConteudoGUID CHAR(36) NOT NULL,
        Ordem INT NOT NULL,
        ArquivoUrl VARCHAR(500) NOT NULL,
        ArquivoMimeType VARCHAR(100) NOT NULL,
        INDEX idx_conteudopaginado_conteudo (ConteudoGUID),
        CONSTRAINT FK_ConteudoPaginadoArquivo_Conteudo FOREIGN KEY (ConteudoGUID)
          REFERENCES conteudo (ConteudoGUID) ON DELETE CASCADE
      );
    `);
    console.log("✅ Tabela conteudopaginadoarquivo pronta");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
