import EvolutionApiService from "../external/EvolutionApiService";
import { paraFormatoEvolutionApi } from "../utils/helpers/telefone.helper";

/**
 * Envio de credenciais de acesso por WhatsApp — alternativa ao
 * "email de boas-vindas" (`EmailAlunoService`) pra contas criadas sem
 * e-mail cadastrado (comum agora que CPF/e-mail são opcionais, ver
 * docs/PLANO_IMPLEMENTACAO_NOTIFICACAO_WHATSAPP.md). Reaproveita o mesmo
 * `EvolutionApiService` do canal de notificações, incluindo a mesma
 * interceptação de `TEST_WHATSAPP_TO` da fase piloto.
 */

interface DadosWhatsappNovoUsuario {
  para: string; // telefone formatado (XX) XXXXX-XXXX
  nomeUsuario: string;
  nomeEscola: string;
  senhaTemporaria: string;
  linkLogin: string;
}

function montarTextoNovoUsuario(dados: DadosWhatsappNovoUsuario): string {
  return [
    `*Bem-vindo ao Ecossistema Escolar*`,
    ``,
    `Olá, ${dados.nomeUsuario}! Sua conta foi criada na escola ${dados.nomeEscola}.`,
    ``,
    `*Senha temporária:* ${dados.senhaTemporaria}`,
    `Por segurança, altere sua senha no primeiro acesso (menu "Meu Perfil").`,
    ``,
    `Acessar: ${dados.linkLogin}`,
  ].join("\n");
}

export class WhatsappCredenciaisService {
  static async enviarCredenciaisNovoUsuario(dados: DadosWhatsappNovoUsuario): Promise<void> {
    try {
      const numeroTeste = process.env.TEST_WHATSAPP_TO;
      const numero = numeroTeste ? paraFormatoEvolutionApi(numeroTeste) : paraFormatoEvolutionApi(dados.para);
      const texto = montarTextoNovoUsuario(dados);

      const resultado = await EvolutionApiService.getInstance().sendText(numero, texto);
      if (resultado.entregue === false) {
        console.error(
          `⚠️ [WhatsappCredenciaisService] Credenciais NÃO confirmadas como entregues para ${dados.nomeUsuario} ` +
            `(id ${resultado.id}) mesmo após reenvio automático — envio manual pode ser necessário.`
        );
      } else {
        console.log(`✅ [WhatsappCredenciaisService] Credenciais enviadas por WhatsApp para ${dados.nomeUsuario}`);
      }
    } catch (erro: any) {
      console.error(`❌ [WhatsappCredenciaisService] Erro ao enviar credenciais para ${dados.nomeUsuario}:`, erro?.message ?? erro);
      // Não lançar erro — mesma política do EmailAlunoService, não bloqueia o cadastro
    }
  }

  /**
   * Envia várias mensagens em sequência com delay anti-ban (ver seção 7 da
   * spec de WhatsApp — rajada de mensagens em segundos é padrão associado a
   * spam pela Meta). 1.8s entre envios, mesmo intervalo usado por
   * NotificacaoService para o canal de notificações.
   */
  static async enviarCredenciaisEmLote(usuarios: DadosWhatsappNovoUsuario[]): Promise<void> {
    console.log(`📵 Enviando credenciais por WhatsApp para ${usuarios.length} usuário(s)...`);

    for (const dados of usuarios) {
      await this.enviarCredenciaisNovoUsuario(dados);
      await new Promise((resolve) => setTimeout(resolve, 1800));
    }

    console.log(`✅ Processamento de credenciais por WhatsApp concluído`);
  }
}
