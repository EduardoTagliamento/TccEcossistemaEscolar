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
  // O par é normalizado (menor CPF → Usr1) para que a UNIQUE KEY cubra ambos os sentidos.
  async iniciarConversa(
    remetenteGUID: string,
    destinatarioCPF: string
  ): Promise<{ ConversaGUID: string; isNova: boolean }> {
    console.log('🟣 ConversaIndividualService.iniciarConversa()');

    // conversa_individual ainda usa CPF — resolver o remetente logado.
    const usuario = await this.#usuarioDAO.findByGUID(remetenteGUID);
    if (!usuario?.UsuarioCPF) {
      throw new ErrorResponse(403, 'Usuário sem CPF cadastrado');
    }
    const remetenteCPF = usuario.UsuarioCPF;

    if (remetenteCPF === destinatarioCPF) {
      throw new ErrorResponse(400, 'Não é possível iniciar uma conversa consigo mesmo');
    }

    const [cpfMin, cpfMax] = [remetenteCPF, destinatarioCPF].sort();

    const existente = await this.#conversaIndividualDAO.findByPair(cpfMin, cpfMax);
    if (existente) {
      return { ConversaGUID: existente.ConversaGUID, isNova: false };
    }

    const conversaGUID = gerarGUID();
    await this.#conversaDAO.create(conversaGUID, 'Individual');
    await this.#conversaIndividualDAO.create(conversaGUID, cpfMin, cpfMax);

    return { ConversaGUID: conversaGUID, isNova: true };
  }
}
