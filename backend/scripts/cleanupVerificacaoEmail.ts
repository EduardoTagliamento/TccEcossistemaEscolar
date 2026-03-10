/**
 * 🧹 Script de Limpeza de Códigos de Verificação Expirados
 * 
 * Remove códigos de verificação de email que:
 * - Expiraram (VerificacaoExpiresAt < NOW())
 * - Foram criados há mais de 7 dias
 * 
 * Uso:
 * - Via Cron Job: npm run cleanup:verification
 * - Manualmente: npx tsx backend/scripts/cleanupVerificacaoEmail.ts
 */

import MysqlDatabase from "../database/MysqlDatabase.js";
import { VerificacaoEmailDAO } from "../repositories/verificacao-email.repository.js";
import { pool } from "../database/mysql.js";

/**
 * Executa a limpeza e retorna contagem de registros deletados
 */
async function executarLimpeza(): Promise<number> {
    try {
        console.log("[CLEANUP] 🧹 Iniciando limpeza de códigos de verificação...");
        console.log(`[CLEANUP] ⏰ Data/Hora: ${new Date().toLocaleString("pt-BR")}`);
        
        // Inicializar database e DAO
        const database = new MysqlDatabase();
        const verificacaoDAO = new VerificacaoEmailDAO(database);
        
        // Executar deleção
        const deletedCount = await verificacaoDAO.deleteExpired();
        
        console.log(`[CLEANUP] ✅ Limpeza concluída: ${deletedCount} registros deletados`);
        
        return deletedCount;
        
    } catch (error) {
        console.error("[CLEANUP] ❌ Erro durante a limpeza:", error);
        throw error;
    }
}

/**
 * Função principal
 */
async function main(): Promise<void> {
    try {
        const deletedCount = await executarLimpeza();
        
        // Fechar conexão com banco
        await pool.end();
        
        console.log("[CLEANUP] 🔌 Conexão com banco encerrada.");
        console.log(`[CLEANUP] 🎉 Script finalizado com sucesso! Total: ${deletedCount} registros removidos.`);
        
        process.exit(0); // Exit com sucesso
        
    } catch (error) {
        console.error("[CLEANUP] 💥 Falha crítica no script:", error);
        
        // Tentar fechar conexão mesmo em caso de erro
        try {
            await pool.end();
        } catch (endError) {
            console.error("[CLEANUP] ⚠️ Erro ao fechar conexão:", endError);
        }
        
        process.exit(1); // Exit com erro
    }
}

// Executar script
main();

export { executarLimpeza };
