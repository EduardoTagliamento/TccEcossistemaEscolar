import { v4 as uuidv4 } from 'uuid';
import { AnotacaoDAO, AnotacaoFilters } from '../repositories/anotacao.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../repositories/escolaxusuarioxfuncao.repository';
import { Anotacao, AnotacaoEntity, AnotacaoCreateDTO, AnotacaoUpdateDTO } from '../entities/anotacao.model';
import { ErrorResponse } from '../utils/ErrorResponse';

export class AnotacaoService {
  constructor(
    private anotacaoDAO: AnotacaoDAO,
    private escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {}

  // CREATE
  async criarAnotacao(data: AnotacaoCreateDTO): Promise<Anotacao> {
    // Validar vínculo usuário-escola
    const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(
      data.EscolaGUID,
      data.UsuarioCPF
    );

    if (!vinculo || vinculo.Status !== 'Ativo') {
      throw new ErrorResponse('Usuário não vinculado à escola ou vínculo inativo', 403);
    }

    // Criar objeto Anotacao
    const anotacao: Anotacao = {
      AnotacaoGUID: uuidv4(),
      UsuarioCPF: data.UsuarioCPF,
      EscolaGUID: data.EscolaGUID,
      AnotacaoData: new Date(data.AnotacaoData),
      AnotacaoTitulo: data.AnotacaoTitulo.trim(),
      AnotacaoDescricao: data.AnotacaoDescricao?.trim() || null,
      AnotacaoIsFeito: false,
      AnotacaoCreatedAt: new Date(),
      AnotacaoUpdatedAt: new Date()
    };

    // Validar através da entidade
    const entity = new AnotacaoEntity(anotacao);
    entity.validar();

    // Salvar no banco
    return await this.anotacaoDAO.create(anotacao);
  }

  // READ (lista com filtros)
  async listarAnotacoes(filters: AnotacaoFilters): Promise<Anotacao[]> {
    return await this.anotacaoDAO.findAll(filters);
  }

  // READ (por usuário e escola)
  async listarAnotacoesUsuario(usuarioCPF: string, escolaGUID: string): Promise<Anotacao[]> {
    const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(
      escolaGUID,
      usuarioCPF
    );

    if (!vinculo || vinculo.Status !== 'Ativo') {
      throw new ErrorResponse('Usuário não vinculado à escola', 403);
    }

    return await this.anotacaoDAO.findByUsuarioAndEscola(usuarioCPF, escolaGUID);
  }

  // READ (por range de datas - para calendário)
  async listarAnotacoesPorPeriodo(
    usuarioCPF: string,
    escolaGUID: string,
    dataInicio: string,
    dataFim: string
  ): Promise<Anotacao[]> {
    const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(
      escolaGUID,
      usuarioCPF
    );

    if (!vinculo || vinculo.Status !== 'Ativo') {
      throw new ErrorResponse('Usuário não vinculado à escola', 403);
    }

    return await this.anotacaoDAO.findByDateRange(
      usuarioCPF,
      escolaGUID,
      new Date(dataInicio),
      new Date(dataFim)
    );
  }

  // READ (por ID)
  async buscarAnotacao(guid: string, usuarioCPF: string): Promise<Anotacao> {
    const anotacao = await this.anotacaoDAO.findById(guid);

    if (!anotacao) {
      throw new ErrorResponse('Anotação não encontrada', 404);
    }

    // Validar permissão (apenas dono pode ver)
    if (anotacao.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse('Sem permissão para acessar esta anotação', 403);
    }

    return anotacao;
  }

  // UPDATE
  async atualizarAnotacao(
    guid: string,
    usuarioCPF: string,
    updates: AnotacaoUpdateDTO
  ): Promise<Anotacao> {
    // Buscar anotação existente
    const anotacaoExistente = await this.anotacaoDAO.findById(guid);

    if (!anotacaoExistente) {
      throw new ErrorResponse('Anotação não encontrada', 404);
    }

    // Validar permissão (apenas dono pode editar)
    if (anotacaoExistente.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse('Sem permissão para editar esta anotação', 403);
    }

    // Preparar updates
    const updateData: Partial<Anotacao> = {};

    if (updates.AnotacaoData) {
      updateData.AnotacaoData = new Date(updates.AnotacaoData);
    }

    if (updates.AnotacaoTitulo !== undefined) {
      updateData.AnotacaoTitulo = updates.AnotacaoTitulo.trim();
    }

    if (updates.AnotacaoDescricao !== undefined) {
      updateData.AnotacaoDescricao = updates.AnotacaoDescricao?.trim() || null;
    }

    if (updates.AnotacaoIsFeito !== undefined) {
      updateData.AnotacaoIsFeito = updates.AnotacaoIsFeito;
    }

    // Validar através da entidade
    const dadosCompletos: Anotacao = {
      ...anotacaoExistente,
      ...updateData
    };

    const entity = new AnotacaoEntity(dadosCompletos);
    entity.validar();

    // Atualizar no banco
    const updated = await this.anotacaoDAO.update(guid, updateData);

    if (!updated) {
      throw new ErrorResponse('Erro ao atualizar anotação', 500);
    }

    return updated;
  }

  // TOGGLE FEITO
  async marcarComoFeito(guid: string, usuarioCPF: string): Promise<Anotacao> {
    const anotacao = await this.anotacaoDAO.findById(guid);

    if (!anotacao) {
      throw new ErrorResponse('Anotação não encontrada', 404);
    }

    if (anotacao.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse('Sem permissão para marcar esta anotação', 403);
    }

    const novoStatus = !anotacao.AnotacaoIsFeito;

    const updated = await this.anotacaoDAO.update(guid, {
      AnotacaoIsFeito: novoStatus
    });

    if (!updated) {
      throw new ErrorResponse('Erro ao atualizar status', 500);
    }

    return updated;
  }

  // DELETE
  async excluirAnotacao(guid: string, usuarioCPF: string): Promise<void> {
    const anotacao = await this.anotacaoDAO.findById(guid);

    if (!anotacao) {
      throw new ErrorResponse('Anotação não encontrada', 404);
    }

    // Validar permissão (apenas dono pode excluir)
    if (anotacao.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse('Sem permissão para excluir esta anotação', 403);
    }

    const deleted = await this.anotacaoDAO.delete(guid);

    if (!deleted) {
      throw new ErrorResponse('Erro ao excluir anotação', 500);
    }
  }

  // ESTATÍSTICAS
  async obterEstatisticas(usuarioCPF: string, escolaGUID: string): Promise<{
    total: number;
    feitas: number;
    pendentes: number;
  }> {
    const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(
      escolaGUID,
      usuarioCPF
    );

    if (!vinculo || vinculo.Status !== 'Ativo') {
      throw new ErrorResponse('Usuário não vinculado à escola', 403);
    }

    const total = await this.anotacaoDAO.count({
      UsuarioCPF: usuarioCPF,
      EscolaGUID: escolaGUID
    });

    const feitas = await this.anotacaoDAO.count({
      UsuarioCPF: usuarioCPF,
      EscolaGUID: escolaGUID,
      AnotacaoIsFeito: true
    });

    return {
      total,
      feitas,
      pendentes: total - feitas
    };
  }
}
