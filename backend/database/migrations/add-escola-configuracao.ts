/**
 * Migration: Criar tabelas escolaconfiguracao e escolaconfiguracaointervalo
 * Data: 14/07/2026
 * Descrição: Parâmetros de horário letivo da escola (minutos/aula, dias
 *            letivos, período manhã/tarde, intervalos), base do cronograma
 *            de turma.
 */

import MysqlDatabase from "../MysqlDatabase";

async function runMigration() {
  console.log("🔧 Iniciando migration: add-escola-configuracao");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    console.log("📝 Criando tabela escolaconfiguracao (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS escolaconfiguracao (
        EscolaConfiguracaoGUID CHAR(36) NOT NULL PRIMARY KEY,
        EscolaGUID CHAR(36) NOT NULL,
        MinutosPorAula INT NOT NULL,
        DiasSemana VARCHAR(60) NOT NULL,
        PeriodoManhaInicio VARCHAR(5) NOT NULL,
        PeriodoManhaFim VARCHAR(5) NOT NULL,
        TemAulaTarde TINYINT(1) NOT NULL DEFAULT 0,
        PeriodoTardeInicio VARCHAR(5) NULL,
        PeriodoTardeFim VARCHAR(5) NULL,
        IntervaloVariado TINYINT(1) NOT NULL DEFAULT 0,
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_escolaconfiguracao_escola (EscolaGUID),
        CONSTRAINT FK_EscolaConfiguracao_Escola FOREIGN KEY (EscolaGUID)
          REFERENCES escola (EscolaGUID)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      );
    `);
    console.log("✅ Tabela escolaconfiguracao pronta");

    console.log("📝 Criando tabela escolaconfiguracaointervalo (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS escolaconfiguracaointervalo (
        EscolaConfiguracaoIntervaloGUID CHAR(36) NOT NULL PRIMARY KEY,
        EscolaConfiguracaoGUID CHAR(36) NOT NULL,
        DiaSemana ENUM('Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo') NULL,
        IntervaloInicio VARCHAR(5) NOT NULL,
        IntervaloFim VARCHAR(5) NOT NULL,
        INDEX idx_escolaconfiguracaointervalo_config (EscolaConfiguracaoGUID),
        CONSTRAINT FK_EscolaConfiguracaoIntervalo_Config FOREIGN KEY (EscolaConfiguracaoGUID)
          REFERENCES escolaconfiguracao (EscolaConfiguracaoGUID)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      );
    `);
    console.log("✅ Tabela escolaconfiguracaointervalo pronta");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
