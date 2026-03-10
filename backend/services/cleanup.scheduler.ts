/**
 * 📅 Serviço de Agendamento de Limpeza Periódica
 * 
 * Utiliza Node-Cron para agendar tarefas de limpeza automática.
 * Executa daily às 3h da manhã para remover códigos de verificação expirados.
 */

import cron from "node-cron";
import { executarLimpeza } from "../scripts/cleanupVerificacaoEmail.js";

export class CleanupScheduler {
    #tasks: cron.ScheduledTask[] = [];
    
    /**
     * Inicia todos os agendamentos configurados
     */
    public start(): void {
        console.log("[SCHEDULER] 📅 Iniciando agendamentos de limpeza...");
        
        // Agendar limpeza diária às 3h da manhã (horário de baixo tráfego)
        this.#scheduleVerificationCleanup();
        
        console.log(`[SCHEDULER] ✅ ${this.#tasks.length} agendamentos iniciados com sucesso.`);
    }
    
    /**
     * Para todos os agendamentos ativos
     */
    public stop(): void {
        console.log("[SCHEDULER] 🛑 Parando agendamentos...");
        
        this.#tasks.forEach((task) => {
            task.stop();
        });
        
        this.#tasks = [];
        
        console.log("[SCHEDULER] ✅ Todos os agendamentos foram parados.");
    }
    
    /**
     * Retorna quantidade de agendamentos ativos
     */
    public getActiveTasksCount(): number {
        return this.#tasks.length;
    }
    
    /**
     * Agenda limpeza de códigos de verificação expirados
     * Execução: Todos os dias às 3h da manhã
     * Cron: "0 3 * * *" = min=0, hour=3, every day, every month, every weekday
     */
    #scheduleVerificationCleanup(): void {
        const task = cron.schedule(
            "0 3 * * *", // Todos os dias às 3:00 AM
            async () => {
                console.log("\n[SCHEDULER] 🧹 Executando limpeza agendada de verificações...");
                
                try {
                    const deletedCount = await executarLimpeza();
                    console.log(`[SCHEDULER] ✅ Limpeza concluída: ${deletedCount} registros removidos\n`);
                    
                } catch (error) {
                    console.error("[SCHEDULER] ❌ Erro na limpeza agendada:", error);
                }
            },
            {
                scheduled: true,
                timezone: "America/Sao_Paulo" // Horário de Brasília
            }
        );
        
        this.#tasks.push(task);
        
        console.log("[SCHEDULER] ✓ Limpeza de verificações agendada: Diariamente às 3h (GMT-3)");
    }
    
    /**
     * Executa limpeza manualmente (para testes)
     */
    public async runCleanupNow(): Promise<number> {
        console.log("[SCHEDULER] 🔧 Executando limpeza manual...");
        
        try {
            const deletedCount = await executarLimpeza();
            console.log(`[SCHEDULER] ✅ Limpeza manual concluída: ${deletedCount} registros`);
            return deletedCount;
            
        } catch (error) {
            console.error("[SCHEDULER] ❌ Erro na limpeza manual:", error);
            throw error;
        }
    }
}
