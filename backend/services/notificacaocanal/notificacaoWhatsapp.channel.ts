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

export interface EnvioWhatsappResultado {
  id: string;
}

/**
 * `usuario.UsuarioTelefone` é guardado como `(XX) XXXXX-XXXX` (sem DDI); a
 * Evolution API espera dígitos puros com DDI (55 + DDD + número). Já
 * `TEST_WHATSAPP_TO`/`WHATSAPP_NUMBER` no `.env` seguem o formato `+55DDNNNNNNNNN`
 * (DDI já incluso, ver `.env.example`) — sem essa checagem, prefixar "55" de
 * novo duplicaria o DDI (`555512988493959`) e o envio falharia.
 */
function paraFormatoEvolutionApi(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
    return digitos;
  }
  return `55${digitos}`;
}

/**
 * WhatsApp não renderiza HTML — texto puro, `*negrito*` no formato do
 * próprio WhatsApp. NotificacaoConteudo já é limitado a 500 caracteres no
 * banco, não precisa de truncamento adicional aqui.
 */
function montarTexto(notificacao: Notificacao): string {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const linhas = [`*${notificacao.NotificacaoTitulo}*`];

  if (notificacao.NotificacaoConteudo) {
    linhas.push(notificacao.NotificacaoConteudo);
  }

  const linkCompleto = notificacao.NotificacaoLink ? `${frontendUrl}${notificacao.NotificacaoLink}` : frontendUrl;
  linhas.push("", `Ver no Ecossistema Escolar: ${linkCompleto}`);

  return linhas.join("\n");
}

export default class NotificacaoWhatsappChannel {
  async enviar(destinatarioTelefone: string | null, notificacao: Notificacao): Promise<EnvioWhatsappResultado> {
    console.log("📵 NotificacaoWhatsappChannel.enviar()");

    if (!destinatarioTelefone) {
      throw new Error("Usuário sem telefone cadastrado");
    }

    // Fase piloto de rollout (ver seção 9 da spec): com TEST_WHATSAPP_TO
    // setado, TODO envio real intercepta pro número de teste, independente
    // do destinatário calculado — evita mandar mensagem de teste pra usuário
    // real enquanto o canal ainda está em validação.
    const numeroTeste = process.env.TEST_WHATSAPP_TO;
    const numero = numeroTeste ? paraFormatoEvolutionApi(numeroTeste) : paraFormatoEvolutionApi(destinatarioTelefone);
    if (numeroTeste) {
      console.log(`📵 NotificacaoWhatsappChannel.enviar() - TEST_WHATSAPP_TO ativo, interceptando envio pro número de teste`);
    }

    const texto = montarTexto(notificacao);

    return EvolutionApiService.getInstance().sendText(numero, texto);
  }
}
