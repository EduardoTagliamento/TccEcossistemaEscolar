/**
 * 📵 Fila de Reenvio de WhatsApp
 *
 * Camada de proteção contra a instabilidade conhecida do Baileys/Evolution
 * API (reconexões de stream a cada ~10-15min — ver comentário em
 * EvolutionApiService.ts). Quando `EvolutionApiService.sendText` não
 * consegue confirmar entrega (mesmo após o retry embutido) ou a chamada à
 * API lança erro, a mensagem é enfileirada aqui em vez de simplesmente
 * perdida. `WhatsappFilaScheduler` varre os pendentes periodicamente e
 * tenta reenviar até confirmar entrega ou esgotar as tentativas.
 */

import MysqlDatabase from "../database/MysqlDatabase";
import { WhatsappFilaReenvioDAO } from "../repositories/whatsappfilareenvio.repository";
import EvolutionApiService from "../external/EvolutionApiService";

const MAX_TENTATIVAS = 12; // com job a cada 5min, ~1h de tentativas antes de desistir

export class WhatsappFilaReenvioService {
  #dao: WhatsappFilaReenvioDAO;

  constructor(dao: WhatsappFilaReenvioDAO) {
    this.#dao = dao;
  }

  /**
   * Enfileira uma mensagem que falhou pra reenvio posterior. `origem` é só
   * pra triagem manual (ex.: "credenciais_novo_usuario", "notificacao").
   */
  async enfileirar(numero: string, texto: string, origem: string, erro: string): Promise<void> {
    console.log(`📥 [WhatsappFilaReenvioService] Enfileirando mensagem de "${origem}" pra reenvio posterior`);
    await this.#dao.enfileirar(numero, texto, origem, erro);
  }

  /**
   * Processa até `limite` mensagens pendentes, tentando reenviar cada uma
   * via EvolutionApiService (já com a verificação/retry embutida). Chamado
   * pelo WhatsappFilaScheduler a cada 5min.
   */
  async processarPendentes(limite: number = 20): Promise<{ enviadas: number; falharam: number; desistidas: number }> {
    const pendentes = await this.#dao.buscarPendentes(limite);
    if (pendentes.length === 0) {
      return { enviadas: 0, falharam: 0, desistidas: 0 };
    }

    console.log(`📵 [WhatsappFilaReenvioService] Processando ${pendentes.length} mensagem(ns) pendente(s) na fila...`);

    let enviadas = 0;
    let falharam = 0;
    let desistidas = 0;

    for (const item of pendentes) {
      try {
        const resultado = await EvolutionApiService.getInstance().sendText(item.WhatsappFilaNumero, item.WhatsappFilaTexto);

        if (resultado.entregue === false) {
          throw new Error("Mensagem não confirmada como entregue");
        }

        await this.#dao.marcarEnviado(item.WhatsappFilaId);
        console.log(`✅ [WhatsappFilaReenvioService] Mensagem ${item.WhatsappFilaId} (${item.WhatsappFilaOrigem}) reenviada com sucesso`);
        enviadas++;
      } catch (erro: any) {
        const tentativasAposEsta = item.WhatsappFilaTentativas + 1;
        if (tentativasAposEsta >= MAX_TENTATIVAS) {
          await this.#dao.marcarDesistido(item.WhatsappFilaId);
          console.error(
            `❌ [WhatsappFilaReenvioService] Mensagem ${item.WhatsappFilaId} (${item.WhatsappFilaOrigem}) desistida após ${tentativasAposEsta} tentativas. Requer envio manual.`
          );
          desistidas++;
        } else {
          await this.#dao.marcarTentativaFalhou(item.WhatsappFilaId, erro?.message ?? String(erro));
          falharam++;
        }
      }

      // Anti-ban: mesmo intervalo usado nos outros pontos de envio em lote.
      await new Promise((resolve) => setTimeout(resolve, 1800));
    }

    return { enviadas, falharam, desistidas };
  }
}

let instanciaSingleton: WhatsappFilaReenvioService | null = null;

export function getWhatsappFilaReenvioService(): WhatsappFilaReenvioService {
  if (!instanciaSingleton) {
    const database = new MysqlDatabase();
    instanciaSingleton = new WhatsappFilaReenvioService(new WhatsappFilaReenvioDAO(database));
  }
  return instanciaSingleton;
}
