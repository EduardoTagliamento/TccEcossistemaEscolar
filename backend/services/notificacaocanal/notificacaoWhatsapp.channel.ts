/**
 * 📵 Canal de Notificação - WhatsApp (stub)
 *
 * Interface pronta pra plugar a Evolution API futuramente. Por ora não faz
 * nenhuma tentativa de envio real e não grava linha em `notificacaoenvio`
 * (ver docs/PLANO_IMPLEMENTACAO_NOTIFICACOES.md, seção 4.2) — evita registro
 * "Pendente" eterno enquanto o provedor não existe.
 */

import Notificacao from "../../entities/notificacao.model";

export default class NotificacaoWhatsappChannel {
  async enviar(destinatarioTelefone: string | null, notificacao: Notificacao): Promise<void> {
    console.log(
      `📵 [NotificacaoWhatsappChannel] Canal ainda não implementado (Evolution API pendente). ` +
        `Notificação ${notificacao.NotificacaoGUID} (tel. ${destinatarioTelefone ?? "não cadastrado"}) não foi enviada por WhatsApp.`
    );
  }
}
