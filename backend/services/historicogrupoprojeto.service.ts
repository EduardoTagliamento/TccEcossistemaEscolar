import { HistoricoGrupoProjetoDAO, Executor } from '../repositories/historicogrupoprojeto.repository';
import { HistoricoGrupoProjetoCreateDTO, HistoricoGrupoProjeto } from '../entities/historicogrupoprojeto.model';
import ErrorResponse from '../utils/ErrorResponse';

export default class HistoricoGrupoProjetoService {
  #historicoDAO: HistoricoGrupoProjetoDAO;

  constructor(historicoDAO: HistoricoGrupoProjetoDAO) {
    console.log('⬆️  HistoricoGrupoProjetoService.constructor()');
    this.#historicoDAO = historicoDAO;
  }

  async registrar(data: HistoricoGrupoProjetoCreateDTO, executor?: Executor): Promise<HistoricoGrupoProjeto> {
    console.log('🟣 HistoricoGrupoProjetoService.registrar()');
    return await this.#historicoDAO.create(data, executor);
  }

  async buscarHistoricoGrupo(grupoGUID: string): Promise<HistoricoGrupoProjeto[]> {
    console.log('🟣 HistoricoGrupoProjetoService.buscarHistoricoGrupo()');
    return await this.#historicoDAO.findByGrupo(grupoGUID);
  }
}
