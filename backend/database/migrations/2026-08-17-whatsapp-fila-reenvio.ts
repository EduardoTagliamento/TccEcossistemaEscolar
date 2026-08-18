/**
 * Migration: Fila de reenvio de WhatsApp
 * Data: 17/08/2026
 * Descrição: Instabilidade conhecida do Baileys/Evolution API (reconexões
 *            de stream a cada ~10-15min, ver EvolutionApiService.ts) faz
 *            mensagens falharem de forma intermitente mesmo com a API
 *            retornando sucesso. Quando `EvolutionApiService.sendText`
 *            confirma falha de entrega (ou a chamada à API lança erro),
 *            a mensagem cai nessa fila e um scheduler (whatsapp-fila.scheduler.ts)
 *            tenta reenviar periodicamente até confirmar entrega ou esgotar
 *            as tentativas.
 */

import MysqlDatabase from "../MysqlDatabase";

async function runMigration() {
  console.log("🔧 Iniciando migration: whatsapp fila de reenvio");

  const db = new MysqlDatabase();

  try {
    const pool = await db.getPool();

    console.log("📝 Criando tabela whatsappfilareenvio (se não existir)...");
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS whatsappfilareenvio (
        WhatsappFilaId INT NOT NULL AUTO_INCREMENT,
        WhatsappFilaNumero VARCHAR(20) NOT NULL,
        WhatsappFilaTexto TEXT NOT NULL,
        WhatsappFilaOrigem VARCHAR(50) NULL,
        WhatsappFilaStatus ENUM('Pendente','Enviado','Desistido') NOT NULL DEFAULT 'Pendente',
        WhatsappFilaTentativas TINYINT NOT NULL DEFAULT 0,
        WhatsappFilaUltimoErro VARCHAR(255) NULL,
        WhatsappFilaUltimaTentativaEm TIMESTAMP NULL,
        WhatsappFilaEnviadoEm TIMESTAMP NULL,
        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (WhatsappFilaId),
        INDEX idx_whatsappfila_status (WhatsappFilaStatus)
      );
    `);
    console.log("✅ Tabela whatsappfilareenvio pronta");

    console.log("🎉 Migration concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
