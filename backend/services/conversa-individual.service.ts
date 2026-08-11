import { gerarGUID } from "../utils/helpers/guid.helper";
import { ConversaDAO } from '../repositories/conversa.repository';
import { ConversaIndividualDAO } from '../repositories/conversa-individual.repository';
import { UsuarioDAO } from '../repositories/usuario.repository';
import ErrorResponse from '../utils/ErrorResponse';

export default class ConversaIndividualService {
  #conversaDAO: ConversaDAO;
  #conversaIndividualDAO: ConversaIndividualDAO;
  #usuarioDAO: UsuarioDAO;

  constructor(conversaDAO: ConversaDAO, conversaIndividualDAO: ConversaIndividualDAO, usuarioDAO: UsuarioDAO) {
    console.log('⬆️  ConversaIndividualService.constructor()');
    this.#conversaDAO = conversaDAO;
    this.#conversaIndividualDAO = conversaIndividualDAO;
    this.#usuarioDAO = usuarioDAO;
  }

  // Idempotente — cria ou recupera a conversa 1:1 entre dois usuários.
  // O par é normalizado (menor GUID → Usr1) para que a UNIQUE KEY cubra ambos os sentidos.
  async iniciarConversa(
    remetenteGUID: string,
    destinatarioGUID: string
  ): Promise<{ ConversaGUID: string; isNova: boolean }> {
    console.log('🟣 ConversaIndividualService.iniciarConversa()');

    if (remetenteGUID === destinatarioGUID) {
      throw new ErrorResponse(400, 'Não é possível iniciar uma conversa consigo mesmo');
    }

    const destinatario = await this.#usuarioDAO.findByGUID(destinatarioGUID);
    if (!destinatario) {
      throw new ErrorResponse(404, 'Usuário destinatário não encontrado');
    }

    const [guidMin, guidMax] = [remetenteGUID, destinatarioGUID].sort();

    const existente = await this.#conversaIndividualDAO.findByPair(guidMin, guidMax);
    if (existente) {
      return { ConversaGUID: existente.ConversaGUID, isNova: false };
    }

    const conversaGUID = gerarGUID();
    await this.#conversaDAO.create(conversaGUID, 'Individual');
    await this.#conversaIndividualDAO.create(conversaGUID, guidMin, guidMax);

    return { ConversaGUID: conversaGUID, isNova: true };
  }
}
