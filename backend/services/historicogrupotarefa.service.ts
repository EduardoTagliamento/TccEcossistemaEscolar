import { HistoricoGrupoTarefaDAO } from '../repositories/historicogrupotarefa.repository';
import { HistoricoGrupoTarefaCreateDTO, HistoricoGrupoTarefa } from '../entities/historicogrupotarefa.model';
import ErrorResponse from '../utils/ErrorResponse';

export default class HistoricoGrupoTarefaService {
  #historicoDAO: HistoricoGrupoTarefaDAO;

  constructor(historicoDAO: HistoricoGrupoTarefaDAO) {
    console.log('⬆️  HistoricoGrupoTarefaService.constructor()');
    this.#historicoDAO = historicoDAO;
  }

  /**
   * REGISTRAR evento no histórico
   */
  async registrar(data: HistoricoGrupoTarefaCreateDTO): Promise<HistoricoGrupoTarefa> {
    console.log('🟣 HistoricoGrupoTarefaService.registrar()');

    // Criar registro no histórico
    const historico = await this.#historicoDAO.create(data);

    return historico;
  }

  /**
   * BUSCAR histórico de um grupo
   */
  async buscarHistoricoGrupo(grupoGUID: string): Promise<HistoricoGrupoTarefa[]> {
    console.log('🟣 HistoricoGrupoTarefaService.buscarHistoricoGrupo()');

    const historico = await this.#historicoDAO.findByGrupo(grupoGUID);

    return historico;
  }

  /**
   * BUSCAR histórico específico por ID
   */
  async buscarPorId(historicoGUID: string): Promise<HistoricoGrupoTarefa> {
    console.log('🟣 HistoricoGrupoTarefaService.buscarPorId()');

    const historico = await this.#historicoDAO.findById(historicoGUID);

    if (!historico) {
      throw new ErrorResponse(404, 'Histórico não encontrado');
    }

    return historico;
  }
}
