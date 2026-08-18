/**
 * 📵 Canal de Notificação - WhatsApp
 *
 * Envia via Evolution API (gateway self-hosted sobre Baileys/WhatsApp Web —
 * ver docs/PLANO_IMPLEMENTACAO_NOTIFICACAO_WHATSAPP.md). Mesma assinatura de
 * retorno de NotificacaoEmailChannel.enviar() (`{ id }`), pra manter os dois
 * canais simétricos em NotificacaoService.
 */

import EvolutionApiService from "../../external/EvolutionApiService";
import Notificacao from "../../entities/notificacao.model";
import { paraFormatoEvolutionApi } from "../../utils/helpers/telefone.helper";

export interface EnvioWhatsappResultado {
  id: string;
  entregue?: boolean;
}

/**
 * WhatsApp não renderiza HTML — texto puro, `*negrito*` no formato do
 * próprio WhatsApp. NotificacaoConteudo já é limitado a 500 caracteres no
 * banco, não precisa de truncamento adicional aqui.
 *
 * Exportada (junto com `resolverNumeroDestino`) pra NotificacaoService
 * conseguir reconstruir número+texto e enfileirar pra reenvio quando o
 * envio falha — ver WhatsappFilaReenvioService.
 */
export function montarTexto(notificacao: Notificacao): string {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const linhas = [`*${notificacao.NotificacaoTitulo}*`];

  if (notificacao.NotificacaoConteudo) {
    linhas.push(notificacao.NotificacaoConteudo);
  }

  const linkCompleto = notificacao.NotificacaoLink ? `${frontendUrl}${notificacao.NotificacaoLink}` : frontendUrl;
  linhas.push("", `Ver no Ecossistema Escolar: ${linkCompleto}`);

  return linhas.join("\n");
}

/**
 * Fase piloto de rollout (ver seção 9 da spec): com TEST_WHATSAPP_TO setado,
 * TODO envio real intercepta pro número de teste, independente do
 * destinatário calculado — evita mandar mensagem de teste pra usuário real
 * enquanto o canal ainda está em validação.
 */
export function resolverNumeroDestino(destinatarioTelefone: string): string {
  const numeroTeste = process.env.TEST_WHATSAPP_TO;
  return numeroTeste ? paraFormatoEvolutionApi(numeroTeste) : paraFormatoEvolutionApi(destinatarioTelefone);
}

export default class NotificacaoWhatsappChannel {
  async enviar(destinatarioTelefone: string | null, notificacao: Notificacao): Promise<EnvioWhatsappResultado> {
    console.log("📵 NotificacaoWhatsappChannel.enviar()");

    if (!destinatarioTelefone) {
      throw new Error("Usuário sem telefone cadastrado");
    }

    const numero = resolverNumeroDestino(destinatarioTelefone);
    if (process.env.TEST_WHATSAPP_TO) {
      console.log(`📵 NotificacaoWhatsappChannel.enviar() - TEST_WHATSAPP_TO ativo, interceptando envio pro número de teste`);
    }

    const texto = montarTexto(notificacao);

    return EvolutionApiService.getInstance().sendText(numero, texto);
  }
}
