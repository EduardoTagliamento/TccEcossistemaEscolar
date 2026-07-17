import { v4 as uuidv4 } from 'uuid';
import { ConversaDAO } from '../repositories/conversa.repository';
import { ConversaIndividualDAO } from '../repositories/conversa-individual.repository';
import ErrorResponse from '../utils/ErrorResponse';

export default class ConversaIndividualService {
  #conversaDAO: ConversaDAO;
  #conversaIndividualDAO: ConversaIndividualDAO;

  constructor(conversaDAO: ConversaDAO, conversaIndividualDAO: ConversaIndividualDAO) {
    console.log('⬆️  ConversaIndividualService.constructor()');
    this.#conversaDAO = conversaDAO;
    this.#conversaIndividualDAO = conversaIndividualDAO;
  }

  // Idempotente — cria ou recupera a conversa 1:1 entre dois usuários.
  // O par é normalizado (menor CPF → Usr1) para que a UNIQUE KEY cubra ambos os sentidos.
  async iniciarConversa(
    remetenteCPF: string,
    destinatarioCPF: string
  ): Promise<{ ConversaGUID: string; isNova: boolean }> {
    console.log('🟣 ConversaIndividualService.iniciarConversa()');

    if (remetenteCPF === destinatarioCPF) {
      throw new ErrorResponse(400, 'Não é possível iniciar uma conversa consigo mesmo');
    }

    const [cpfMin, cpfMax] = [remetenteCPF, destinatarioCPF].sort();

    const existente = await this.#conversaIndividualDAO.findByPair(cpfMin, cpfMax);
    if (existente) {
      return { ConversaGUID: existente.ConversaGUID, isNova: false };
    }

    const conversaGUID = uuidv4();
    await this.#conversaDAO.create(conversaGUID, 'Individual');
    await this.#conversaIndividualDAO.create(conversaGUID, cpfMin, cpfMax);

    return { ConversaGUID: conversaGUID, isNova: true };
  }
}
