import { v4 as uuidv4 } from 'uuid';
import { AnotacaoDAO, AnotacaoFilters } from '../repositories/anotacao.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../repositories/escolaxusuarioxfuncao.repository';
import { Anotacao, AnotacaoEntity, AnotacaoCreateDTO, AnotacaoUpdateDTO } from '../entities/anotacao.model';
import ErrorResponse from '../utils/ErrorResponse';
import { getAuditoriaService } from './auditoria.service';

export class AnotacaoService {
  constructor(
    private anotacaoDAO: AnotacaoDAO,
    private escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {}

  // CREATE
  async criarAnotacao(data: AnotacaoCreateDTO): Promise<Anotacao> {
    // Validar vínculo usuário-escola
    const vinculos = await this.escolaxUsuarioxFuncaoDAO.findAll({
      EscolaGUID: data.EscolaGUID,
      UsuarioCPF: data.UsuarioCPF
    });

    // Considera QUALQUER vínculo ativo do usuário na escola, não só o
    // primeiro retornado (um usuário pode ter mais de uma função na mesma escola).
    if (!vinculos.some((v) => v.Status === 'Ativo')) {
      throw new ErrorResponse(403, 'Usuário não vinculado à escola ou vínculo inativo');
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
    const created = await this.anotacaoDAO.create(anotacao);

    void getAuditoriaService().registrar({
      EscolaGUID: created.EscolaGUID,
      UsuarioCPFAtor: created.UsuarioCPF,
      AcaoTipo: "Create",
      EntidadeTipo: "anotacao",
      EntidadeGUID: created.AnotacaoGUID,
      EntidadeDescricao: created.AnotacaoTitulo,
      CategoriaAuditoriaId: 1,
    });

    return created;
  }

  // READ (lista com filtros)
  async listarAnotacoes(filters: AnotacaoFilters): Promise<Anotacao[]> {
    return await this.anotacaoDAO.findAll(filters);
  }

  // READ (por usuário e escola)
  async listarAnotacoesUsuario(usuarioCPF: string, escolaGUID: string): Promise<Anotacao[]> {
    const vinculos = await this.escolaxUsuarioxFuncaoDAO.findAll({
      EscolaGUID: escolaGUID,
      UsuarioCPF: usuarioCPF
    });

    // Considera QUALQUER vínculo ativo do usuário na escola, não só o
    // primeiro retornado (um usuário pode ter mais de uma função na mesma escola).
    if (!vinculos.some((v) => v.Status === 'Ativo')) {
      throw new ErrorResponse(403, 'Usuário não vinculado à escola');
    }

    return await this.anotacaoDAO.findAll({ UsuarioCPF: usuarioCPF, EscolaGUID: escolaGUID });
  }

  // READ (por range de datas - para calendário)
  async listarAnotacoesPorPeriodo(
    usuarioCPF: string,
    escolaGUID: string,
    dataInicio: string,
    dataFim: string
  ): Promise<Anotacao[]> {
    const vinculos = await this.escolaxUsuarioxFuncaoDAO.findAll({
      EscolaGUID: escolaGUID,
      UsuarioCPF: usuarioCPF
    });

    // Considera QUALQUER vínculo ativo do usuário na escola, não só o
    // primeiro retornado (um usuário pode ter mais de uma função na mesma escola).
    if (!vinculos.some((v) => v.Status === 'Ativo')) {
      throw new ErrorResponse(403, 'Usuário não vinculado à escola');
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
      throw new ErrorResponse(404, 'Anotação não encontrada');
    }

    // Validar permissão (apenas dono pode ver)
    if (anotacao.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse(403, 'Sem permissão para acessar esta anotação');
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
      throw new ErrorResponse(404, 'Anotação não encontrada');
    }

    // Validar permissão (apenas dono pode editar)
    if (anotacaoExistente.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse(403, 'Sem permissão para editar esta anotação');
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
      throw new ErrorResponse(500, 'Erro ao atualizar anotação');
    }

    void getAuditoriaService().registrar({
      EscolaGUID: updated.EscolaGUID,
      UsuarioCPFAtor: usuarioCPF,
      AcaoTipo: "Update",
      EntidadeTipo: "anotacao",
      EntidadeGUID: updated.AnotacaoGUID,
      EntidadeDescricao: updated.AnotacaoTitulo,
      CategoriaAuditoriaId: 1,
    });

    return updated;
  }

  // TOGGLE FEITO
  async marcarComoFeito(guid: string, usuarioCPF: string): Promise<Anotacao> {
    const anotacao = await this.anotacaoDAO.findById(guid);

    if (!anotacao) {
      throw new ErrorResponse(404, 'Anotação não encontrada');
    }

    if (anotacao.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse(403, 'Sem permissão para marcar esta anotação');
    }

    const novoStatus = !anotacao.AnotacaoIsFeito;

    const updated = await this.anotacaoDAO.update(guid, {
      AnotacaoIsFeito: novoStatus
    });

    if (!updated) {
      throw new ErrorResponse(500, 'Erro ao atualizar status');
    }

    void getAuditoriaService().registrar({
      EscolaGUID: updated.EscolaGUID,
      UsuarioCPFAtor: usuarioCPF,
      AcaoTipo: "Update",
      EntidadeTipo: "anotacao",
      EntidadeGUID: updated.AnotacaoGUID,
      EntidadeDescricao: updated.AnotacaoTitulo,
      CategoriaAuditoriaId: 1,
    });

    return updated;
  }

  // DELETE
  async excluirAnotacao(guid: string, usuarioCPF: string): Promise<void> {
    const anotacao = await this.anotacaoDAO.findById(guid);

    if (!anotacao) {
      throw new ErrorResponse(404, 'Anotação não encontrada');
    }

    // Validar permissão (apenas dono pode excluir)
    if (anotacao.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse(403, 'Sem permissão para excluir esta anotação');
    }

    const deleted = await this.anotacaoDAO.delete(guid);

    if (!deleted) {
      throw new ErrorResponse(500, 'Erro ao excluir anotação');
    }

    void getAuditoriaService().registrar({
      EscolaGUID: anotacao.EscolaGUID,
      UsuarioCPFAtor: usuarioCPF,
      AcaoTipo: "Delete",
      EntidadeTipo: "anotacao",
      EntidadeGUID: anotacao.AnotacaoGUID,
      EntidadeDescricao: anotacao.AnotacaoTitulo,
      CategoriaAuditoriaId: 1,
    });
  }

  // ESTATÍSTICAS
  async obterEstatisticas(usuarioCPF: string, escolaGUID: string): Promise<{
    total: number;
    feitas: number;
    pendentes: number;
  }> {
    const vinculos = await this.escolaxUsuarioxFuncaoDAO.findAll({
      EscolaGUID: escolaGUID,
      UsuarioCPF: usuarioCPF
    });

    // Considera QUALQUER vínculo ativo do usuário na escola, não só o
    // primeiro retornado (um usuário pode ter mais de uma função na mesma escola).
    if (!vinculos.some((v) => v.Status === 'Ativo')) {
      throw new ErrorResponse(403, 'Usuário não vinculado à escola');
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
