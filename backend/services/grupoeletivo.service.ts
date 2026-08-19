import GrupoEletivo from "../entities/grupoeletivo.model";
import Matricula from "../entities/matricula.model";
import { GrupoEletivoDAO, GrupoEletivoFilters } from "../repositories/grupoeletivo.repository";
import { MatriculaDAO } from "../repositories/matricula.repository";
import { UsuarioDAO } from "../repositories/usuario.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import ErrorResponse from "../utils/ErrorResponse";
import { gerarGUID } from "../utils/helpers/guid.helper";
import { getAuditoriaService } from "./auditoria.service";

/**
 * DTOs
 */
export interface GrupoEletivoDTO {
  GrupoEletivoGUID: string;
  EscolaGUID: string;
  GrupoEletivoNome: string;
  GrupoEletivoStatus: 'Ativo' | 'Inativo';
  TotalMembros: number;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface GrupoEletivoCreateDTO {
  EscolaGUID: string;
  GrupoEletivoNome: string;
}

export interface GrupoEletivoUpdateDTO {
  GrupoEletivoNome?: string;
  GrupoEletivoStatus?: 'Ativo' | 'Inativo';
}

export interface MembroGrupoEletivoDTO {
  UsuarioGUID: string;
  UsuarioNome: string;
  MatriculaGUID: string;
  MatriculaDataEntrada: Date;
}

/**
 * Service para lógica de negócio de Grupo Eletivo (turmas mistas/eletivas)
 *
 * Ver docs/PLANO_IMPLEMENTACAO_GRUPO_ELETIVO.md.
 *
 * Regras principais:
 * - Autorização: Secretaria (FuncaoId 2), Coordenação (FuncaoId 1) ou Direção (FuncaoId 6)
 * - Nome único por escola
 * - Membro = matrícula-sombra (matricula.GrupoEletivoGUID), nunca exposta
 *   como "matrícula" na UI — é um detalhe interno que existe só pra
 *   tarefaacademica_matricula/conteudoprogresso continuarem funcionando
 * - Só aluno com matrícula ativa na escola pode ser adicionado
 */
export default class GrupoEletivoService {
  #grupoEletivoDAO: GrupoEletivoDAO;
  #matriculaDAO: MatriculaDAO;
  #usuarioDAO: UsuarioDAO;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(
    grupoEletivoDAO: GrupoEletivoDAO,
    matriculaDAO: MatriculaDAO,
    usuarioDAO: UsuarioDAO,
    escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {
    this.#grupoEletivoDAO = grupoEletivoDAO;
    this.#matriculaDAO = matriculaDAO;
    this.#usuarioDAO = usuarioDAO;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAO;
  }

  async criarGrupo(data: GrupoEletivoCreateDTO, usuarioGUIDAtor: string): Promise<GrupoEletivoDTO> {
    await this.validarPermissaoEscrita(usuarioGUIDAtor, data.EscolaGUID);

    const nome = data.GrupoEletivoNome.trim();
    const existente = await this.#grupoEletivoDAO.findByEscolaAndNome(data.EscolaGUID, nome);
    if (existente) {
      throw new ErrorResponse(409, 'Já existe um grupo eletivo com esse nome nesta escola', {
        message: `O grupo "${nome}" já está cadastrado nesta escola`,
      });
    }

    const grupo = new GrupoEletivo();
    grupo.GrupoEletivoGUID = gerarGUID();
    grupo.EscolaGUID = data.EscolaGUID;
    grupo.GrupoEletivoNome = nome;
    grupo.GrupoEletivoStatus = 'Ativo';
    grupo.CreatedAt = new Date();
    grupo.UpdatedAt = new Date();
    grupo.validar();

    const criado = await this.#grupoEletivoDAO.create(grupo);

    void getAuditoriaService().registrar({
      EscolaGUID: criado.EscolaGUID,
      UsuarioGUIDAtor: usuarioGUIDAtor,
      AcaoTipo: "Create",
      EntidadeTipo: "grupoeletivo",
      EntidadeGUID: criado.GrupoEletivoGUID,
      EntidadeDescricao: criado.GrupoEletivoNome,
      CategoriaAuditoriaId: 2,
    });

    return this.toDTO(criado, 0);
  }

  async listarGrupos(filters?: GrupoEletivoFilters): Promise<GrupoEletivoDTO[]> {
    const grupos = await this.#grupoEletivoDAO.findAll(filters);
    return Promise.all(
      grupos.map(async (grupo) => {
        const membros = await this.#matriculaDAO.findMembrosByGrupoEletivo(grupo.GrupoEletivoGUID);
        return this.toDTO(grupo, membros.length);
      })
    );
  }

  async buscarGrupo(grupoEletivoGUID: string): Promise<GrupoEletivoDTO> {
    const grupo = await this.#grupoEletivoDAO.findById(grupoEletivoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo eletivo não encontrado');
    }
    const membros = await this.#matriculaDAO.findMembrosByGrupoEletivo(grupo.GrupoEletivoGUID);
    return this.toDTO(grupo, membros.length);
  }

  async atualizarGrupo(
    grupoEletivoGUID: string,
    data: GrupoEletivoUpdateDTO,
    usuarioGUIDAtor: string
  ): Promise<GrupoEletivoDTO> {
    const existente = await this.#grupoEletivoDAO.findById(grupoEletivoGUID);
    if (!existente) {
      throw new ErrorResponse(404, 'Grupo eletivo não encontrado');
    }

    await this.validarPermissaoEscrita(usuarioGUIDAtor, existente.EscolaGUID);

    if (data.GrupoEletivoNome && data.GrupoEletivoNome.trim() !== existente.GrupoEletivoNome) {
      const nome = data.GrupoEletivoNome.trim();
      const duplicado = await this.#grupoEletivoDAO.findByEscolaAndNome(existente.EscolaGUID, nome);
      if (duplicado && duplicado.GrupoEletivoGUID !== grupoEletivoGUID) {
        throw new ErrorResponse(409, 'Já existe um grupo eletivo com esse nome nesta escola', {
          message: `O grupo "${nome}" já está cadastrado nesta escola`,
        });
      }
    }

    const atualizado = await this.#grupoEletivoDAO.update(grupoEletivoGUID, {
      GrupoEletivoNome: data.GrupoEletivoNome?.trim(),
      GrupoEletivoStatus: data.GrupoEletivoStatus,
    });
    if (!atualizado) {
      throw new ErrorResponse(500, 'Erro ao atualizar grupo eletivo');
    }

    void getAuditoriaService().registrar({
      EscolaGUID: atualizado.EscolaGUID,
      UsuarioGUIDAtor: usuarioGUIDAtor,
      AcaoTipo: "Update",
      EntidadeTipo: "grupoeletivo",
      EntidadeGUID: grupoEletivoGUID,
      EntidadeDescricao: atualizado.GrupoEletivoNome,
      CategoriaAuditoriaId: 2,
    });

    const membros = await this.#matriculaDAO.findMembrosByGrupoEletivo(grupoEletivoGUID);
    return this.toDTO(atualizado, membros.length);
  }

  async excluirGrupo(grupoEletivoGUID: string, usuarioGUIDAtor: string): Promise<void> {
    const grupo = await this.#grupoEletivoDAO.findById(grupoEletivoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo eletivo não encontrado');
    }

    await this.validarPermissaoEscrita(usuarioGUIDAtor, grupo.EscolaGUID);

    const deletado = await this.#grupoEletivoDAO.delete(grupoEletivoGUID);
    if (!deletado) {
      throw new ErrorResponse(500, 'Erro ao excluir grupo eletivo');
    }

    void getAuditoriaService().registrar({
      EscolaGUID: grupo.EscolaGUID,
      UsuarioGUIDAtor: usuarioGUIDAtor,
      AcaoTipo: "Delete",
      EntidadeTipo: "grupoeletivo",
      EntidadeGUID: grupoEletivoGUID,
      EntidadeDescricao: grupo.GrupoEletivoNome,
      CategoriaAuditoriaId: 2,
    });
  }

  // ==================== MEMBROS ====================

  async listarMembros(grupoEletivoGUID: string): Promise<MembroGrupoEletivoDTO[]> {
    const grupo = await this.#grupoEletivoDAO.findById(grupoEletivoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo eletivo não encontrado');
    }

    const matriculas = await this.#matriculaDAO.findMembrosByGrupoEletivo(grupoEletivoGUID);

    const membros = await Promise.all(
      matriculas.map(async (matricula) => {
        const usuario = await this.#usuarioDAO.findByGUID(matricula.UsuarioGUID);
        if (!usuario) return null;
        return {
          UsuarioGUID: usuario.UsuarioGUID,
          UsuarioNome: usuario.UsuarioNome,
          MatriculaGUID: matricula.MatriculaGUID,
          MatriculaDataEntrada: matricula.MatriculaDataEntrada,
        };
      })
    );

    return membros.filter((m): m is MembroGrupoEletivoDTO => m !== null);
  }

  async adicionarMembro(
    grupoEletivoGUID: string,
    usuarioGUID: string,
    usuarioGUIDAtor: string
  ): Promise<MembroGrupoEletivoDTO> {
    const grupo = await this.#grupoEletivoDAO.findById(grupoEletivoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo eletivo não encontrado');
    }
    if (grupo.GrupoEletivoStatus !== 'Ativo') {
      throw new ErrorResponse(400, 'Grupo eletivo inativo', {
        message: 'Não é possível adicionar membros a um grupo eletivo inativo',
      });
    }

    await this.validarPermissaoEscrita(usuarioGUIDAtor, grupo.EscolaGUID);

    const usuario = await this.#usuarioDAO.findByGUID(usuarioGUID);
    if (!usuario) {
      throw new ErrorResponse(404, 'Aluno não encontrado');
    }

    // Só aluno com matrícula ativa NESTA escola é elegível — grupo eletivo
    // não cria vínculo de aluno novo, só agrupa alunos que já pertencem à escola.
    const matriculaPrincipal = await this.#matriculaDAO.findMatriculaAtivaByUsuarioEEscola(
      usuarioGUID,
      grupo.EscolaGUID
    );
    if (!matriculaPrincipal) {
      throw new ErrorResponse(400, 'Aluno sem matrícula ativa nesta escola', {
        message: 'Só é possível adicionar ao grupo eletivo alunos com matrícula ativa nesta escola',
      });
    }

    const jaMembro = await this.#matriculaDAO.findMatriculaEletivaAtiva(usuarioGUID, grupoEletivoGUID);
    if (jaMembro) {
      throw new ErrorResponse(409, 'Aluno já é membro deste grupo eletivo');
    }

    const matriculaEletiva = new Matricula();
    matriculaEletiva.MatriculaGUID = gerarGUID();
    matriculaEletiva.UsuarioGUID = usuarioGUID;
    matriculaEletiva.TurmaGUID = null;
    matriculaEletiva.GrupoEletivoGUID = grupoEletivoGUID;
    matriculaEletiva.MatriculaDataEntrada = new Date();
    matriculaEletiva.MatriculaDataSaida = null;
    matriculaEletiva.MatriculaStatus = 'Ativa';
    matriculaEletiva.MatriculaCreatedAt = new Date();
    matriculaEletiva.MatriculaUpdatedAt = new Date();
    matriculaEletiva.validar();

    const criada = await this.#matriculaDAO.criarMatriculaEletiva(matriculaEletiva);

    void getAuditoriaService().registrar({
      EscolaGUID: grupo.EscolaGUID,
      UsuarioGUIDAtor: usuarioGUIDAtor,
      AcaoTipo: "Create",
      EntidadeTipo: "grupoeletivo_membro",
      EntidadeGUID: criada.MatriculaGUID,
      EntidadeDescricao: `${usuario.UsuarioNome} entrou em "${grupo.GrupoEletivoNome}"`,
      CategoriaAuditoriaId: 2,
    });

    return {
      UsuarioGUID: usuario.UsuarioGUID,
      UsuarioNome: usuario.UsuarioNome,
      MatriculaGUID: criada.MatriculaGUID,
      MatriculaDataEntrada: criada.MatriculaDataEntrada,
    };
  }

  async removerMembro(grupoEletivoGUID: string, usuarioGUID: string, usuarioGUIDAtor: string): Promise<void> {
    const grupo = await this.#grupoEletivoDAO.findById(grupoEletivoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo eletivo não encontrado');
    }

    await this.validarPermissaoEscrita(usuarioGUIDAtor, grupo.EscolaGUID);

    const removido = await this.#matriculaDAO.removerMatriculaEletiva(usuarioGUID, grupoEletivoGUID);
    if (!removido) {
      throw new ErrorResponse(404, 'Aluno não é membro ativo deste grupo eletivo');
    }

    void getAuditoriaService().registrar({
      EscolaGUID: grupo.EscolaGUID,
      UsuarioGUIDAtor: usuarioGUIDAtor,
      AcaoTipo: "Delete",
      EntidadeTipo: "grupoeletivo_membro",
      EntidadeGUID: usuarioGUID,
      EntidadeDescricao: `Removido de "${grupo.GrupoEletivoNome}"`,
      CategoriaAuditoriaId: 2,
    });
  }

  /**
   * Secretaria (FuncaoId 2), Coordenação (FuncaoId 1) ou Direção (FuncaoId 6)
   */
  private async validarPermissaoEscrita(usuarioGUIDAtor: string, escolaGUID: string): Promise<void> {
    const podeGerenciar = await this.#escolaxUsuarioxFuncaoDAO.isCoordSecretariaOuDirecaoEmEscola(
      usuarioGUIDAtor,
      escolaGUID
    );
    if (!podeGerenciar) {
      throw new ErrorResponse(403, 'Sem permissão', {
        message: 'Apenas Secretaria, Coordenação e Direção podem gerenciar grupos eletivos.',
      });
    }
  }

  private toDTO(grupo: GrupoEletivo, totalMembros: number): GrupoEletivoDTO {
    return {
      GrupoEletivoGUID: grupo.GrupoEletivoGUID,
      EscolaGUID: grupo.EscolaGUID,
      GrupoEletivoNome: grupo.GrupoEletivoNome,
      GrupoEletivoStatus: grupo.GrupoEletivoStatus,
      TotalMembros: totalMembros,
      CreatedAt: grupo.CreatedAt,
      UpdatedAt: grupo.UpdatedAt,
    };
  }
}
