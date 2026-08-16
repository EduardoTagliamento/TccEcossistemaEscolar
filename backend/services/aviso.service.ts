import { gerarGUID } from "../utils/helpers/guid.helper";
import { AvisoDAO, AvisoFilters } from '../repositories/aviso.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../repositories/escolaxusuarioxfuncao.repository';
import { RelacaoAnexosDAO } from '../repositories/relacaoanexos.repository';
import { AnexoDAO } from '../repositories/anexo.repository';
import { MatriculaDAO } from '../repositories/matricula.repository';
import { UsuarioDAO } from '../repositories/usuario.repository';
import { Aviso, AvisoEntity, AvisoCreateDTO } from '../entities/aviso.model';
import Anexo from '../entities/anexo.model';
import ErrorResponse from '../utils/ErrorResponse';
import { getAuditoriaService } from './auditoria.service';
import { getNotificacaoService } from './notificacao.service';

export interface AvisoDTO extends Aviso {
  Anexos: Anexo[];
  TurmaGUIDs: string[];
}

export class AvisoService {
  constructor(
    private avisoDAO: AvisoDAO,
    private escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO,
    private relacaoAnexosDAO: RelacaoAnexosDAO,
    private anexoDAO: AnexoDAO,
    private matriculaDAO: MatriculaDAO,
    private usuarioDAO: UsuarioDAO
  ) {}

  // CREATE
  async criarAviso(data: AvisoCreateDTO): Promise<AvisoDTO> {
    const podeEnviar = await this.escolaxUsuarioxFuncaoDAO.isCoordSecretariaOuDirecaoEmEscola(
      data.UsuarioGUIDAutor,
      data.EscolaGUID
    );
    if (!podeEnviar) {
      throw new ErrorResponse(403, 'Sem permissão para enviar avisos (apenas Direção, Coordenação ou Secretaria)');
    }

    if (data.AvisoAbrangencia === 'Turmas' && (!data.TurmaGUIDs || data.TurmaGUIDs.length === 0)) {
      throw new ErrorResponse(400, 'Selecione ao menos uma turma para um aviso de abrangência "Turmas"');
    }

    const aviso: Aviso = {
      AvisoGUID: gerarGUID(),
      EscolaGUID: data.EscolaGUID,
      UsuarioGUIDAutor: data.UsuarioGUIDAutor,
      AvisoTitulo: data.AvisoTitulo.trim(),
      AvisoConteudo: data.AvisoConteudo.trim(),
      AvisoAbrangencia: data.AvisoAbrangencia,
      AvisoCreatedAt: new Date(),
    };

    const entity = new AvisoEntity(aviso);
    entity.validar();

    const created = await this.avisoDAO.create(aviso);

    if (data.AvisoAbrangencia === 'Turmas' && data.TurmaGUIDs) {
      await this.avisoDAO.vincularTurmas(created.AvisoGUID, data.TurmaGUIDs);
    }

    const anexosVinculados: Anexo[] = [];
    if (data.AnexoGUIDs && data.AnexoGUIDs.length > 0) {
      for (const anexoGUID of data.AnexoGUIDs) {
        const anexo = await this.anexoDAO.findById(anexoGUID);
        if (!anexo) {
          throw new ErrorResponse(404, `Anexo ${anexoGUID} não encontrado`);
        }
        if (anexo.UsuarioGUID !== data.UsuarioGUIDAutor) {
          throw new ErrorResponse(403, 'Você só pode anexar arquivos que você mesmo enviou');
        }
        await this.relacaoAnexosDAO.vincularAnexoAviso(anexoGUID, created.AvisoGUID);
        anexosVinculados.push(anexo);
      }
    }

    void getAuditoriaService().registrar({
      EscolaGUID: created.EscolaGUID,
      UsuarioGUIDAtor: created.UsuarioGUIDAutor,
      AcaoTipo: 'Create',
      EntidadeTipo: 'aviso',
      EntidadeGUID: created.AvisoGUID,
      EntidadeDescricao: created.AvisoTitulo,
      CategoriaAuditoriaId: 2,
    });

    this.#notificarDestinatarios(created, data.TurmaGUIDs ?? []).catch((error) => {
      console.error('🔴 AvisoService.#notificarDestinatarios() falhou:', error);
    });

    return {
      ...created,
      Anexos: anexosVinculados,
      TurmaGUIDs: data.AvisoAbrangencia === 'Turmas' ? data.TurmaGUIDs ?? [] : [],
    };
  }

  async #notificarDestinatarios(aviso: Aviso, turmaGUIDs: string[]): Promise<void> {
    let destinatarios: string[];

    if (aviso.AvisoAbrangencia === 'Escola') {
      destinatarios = await this.escolaxUsuarioxFuncaoDAO.findUsuariosAtivosByEscolaEFuncoes(
        aviso.EscolaGUID,
        [1, 2, 3, 4, 5, 6]
      );
    } else {
      const listasPorTurma = await Promise.all(turmaGUIDs.map((turmaGUID) => this.matriculaDAO.findByTurma(turmaGUID)));
      const guids = listasPorTurma
        .flat()
        .filter((matricula) => matricula.MatriculaStatus === 'Ativa')
        .map((matricula) => matricula.UsuarioGUID);
      destinatarios = [...new Set(guids)];
    }

    // O autor não precisa ser notificado do próprio aviso.
    destinatarios = destinatarios.filter((guid) => guid !== aviso.UsuarioGUIDAutor);
    if (destinatarios.length === 0) return;

    const preview = aviso.AvisoConteudo.length > 200 ? `${aviso.AvisoConteudo.slice(0, 197)}...` : aviso.AvisoConteudo;

    await getNotificacaoService().disparar({
      tipoSlug: 'aviso_publicado',
      destinatarios,
      escolaGUID: aviso.EscolaGUID,
      titulo: aviso.AvisoTitulo,
      conteudo: preview,
      entidadeTipo: 'aviso',
      entidadeGUID: aviso.AvisoGUID,
      link: `/dashboard/${aviso.EscolaGUID}/avisos/${aviso.AvisoGUID}`,
    });
  }

  // READ (lista — só quem pode enviar, usado na tela de gestão/histórico)
  async listarAvisos(escolaGUID: string, usuarioGUID: string): Promise<AvisoDTO[]> {
    const podeGerenciar = await this.escolaxUsuarioxFuncaoDAO.isCoordSecretariaOuDirecaoEmEscola(usuarioGUID, escolaGUID);
    if (!podeGerenciar) {
      throw new ErrorResponse(403, 'Sem permissão para listar avisos enviados (apenas Direção, Coordenação ou Secretaria)');
    }

    const avisos = await this.avisoDAO.findAll({ EscolaGUID: escolaGUID });
    return Promise.all(avisos.map((aviso) => this.#toDTO(aviso)));
  }

  // READ (por ID — marca visualização como efeito colateral)
  async buscarAviso(guid: string, usuarioGUID: string): Promise<AvisoDTO> {
    const aviso = await this.avisoDAO.findById(guid);
    if (!aviso) {
      throw new ErrorResponse(404, 'Aviso não encontrado');
    }

    await this.#garantirAcesso(aviso, usuarioGUID);
    await this.avisoDAO.registrarVisualizacao(aviso.AvisoGUID, usuarioGUID);

    return this.#toDTO(aviso);
  }

  async #garantirAcesso(aviso: Aviso, usuarioGUID: string): Promise<void> {
    const ehStaff = await this.escolaxUsuarioxFuncaoDAO.isCoordSecretariaOuDirecaoEmEscola(usuarioGUID, aviso.EscolaGUID);
    if (ehStaff) return;

    const vinculos = await this.escolaxUsuarioxFuncaoDAO.findAll({ EscolaGUID: aviso.EscolaGUID, UsuarioGUID: usuarioGUID });
    if (!vinculos.some((v) => v.Status === 'Ativo')) {
      throw new ErrorResponse(403, 'Você não tem vínculo ativo com esta escola');
    }

    if (aviso.AvisoAbrangencia === 'Escola') return;

    const turmaGUIDs = await this.avisoDAO.findTurmaGUIDsByAviso(aviso.AvisoGUID);
    const minhaMatricula = await this.matriculaDAO.findMatriculaAtivaByUsuarioEEscola(usuarioGUID, aviso.EscolaGUID);
    if (!minhaMatricula || !turmaGUIDs.includes(minhaMatricula.TurmaGUID)) {
      throw new ErrorResponse(403, 'Este aviso não é destinado a você');
    }
  }

  // READ (aviso mais recente não visto pelo usuário — banner de destaque na home)
  async buscarNaoVisualizadoMaisRecente(escolaGUID: string, usuarioGUID: string): Promise<AvisoDTO | null> {
    const minhaMatricula = await this.matriculaDAO.findMatriculaAtivaByUsuarioEEscola(usuarioGUID, escolaGUID);
    const turmaGUIDs = minhaMatricula ? [minhaMatricula.TurmaGUID] : [];

    const aviso = await this.avisoDAO.findNaoVisualizadoMaisRecente(escolaGUID, usuarioGUID, turmaGUIDs);
    if (!aviso) return null;

    return this.#toDTO(aviso);
  }

  // DELETE
  async excluirAviso(guid: string, usuarioGUID: string): Promise<void> {
    const aviso = await this.avisoDAO.findById(guid);
    if (!aviso) {
      throw new ErrorResponse(404, 'Aviso não encontrado');
    }

    const ehAutor = aviso.UsuarioGUIDAutor === usuarioGUID;
    const ehDirecao = await this.escolaxUsuarioxFuncaoDAO.findAll({ EscolaGUID: aviso.EscolaGUID, UsuarioGUID: usuarioGUID }).then(
      (vinculos) => vinculos.some((v) => v.Status === 'Ativo' && v.FuncaoId === 6)
    );

    if (!ehAutor && !ehDirecao) {
      throw new ErrorResponse(403, 'Sem permissão para excluir este aviso (apenas quem enviou ou a Direção)');
    }

    const deleted = await this.avisoDAO.delete(guid);
    if (!deleted) {
      throw new ErrorResponse(500, 'Erro ao excluir aviso');
    }

    void getAuditoriaService().registrar({
      EscolaGUID: aviso.EscolaGUID,
      UsuarioGUIDAtor: usuarioGUID,
      AcaoTipo: 'Delete',
      EntidadeTipo: 'aviso',
      EntidadeGUID: aviso.AvisoGUID,
      EntidadeDescricao: aviso.AvisoTitulo,
      CategoriaAuditoriaId: 2,
    });
  }

  async #toDTO(aviso: Aviso): Promise<AvisoDTO> {
    const [anexos, turmaGUIDs] = await Promise.all([
      this.relacaoAnexosDAO.findAnexosByAviso(aviso.AvisoGUID),
      aviso.AvisoAbrangencia === 'Turmas' ? this.avisoDAO.findTurmaGUIDsByAviso(aviso.AvisoGUID) : Promise.resolve([]),
    ]);

    return { ...aviso, Anexos: anexos, TurmaGUIDs: turmaGUIDs };
  }
}
