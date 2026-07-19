import { v4 as uuidv4 } from 'uuid';
import { ProjetoDAO } from '../repositories/projeto.repository';
import { TurmaDAO } from '../repositories/turma.repository';
import { MatriculaDAO } from '../repositories/matricula.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../repositories/escolaxusuarioxfuncao.repository';
import ErrorResponse from '../utils/ErrorResponse';
import { getNotificacaoService } from './notificacao.service';
import {
  Projeto,
  ProjetoCreateDTO,
  ProjetoUpdateDTO,
  ProjetoDTO
} from '../entities/projeto.model';

export default class ProjetoService {
  #projetoDAO: ProjetoDAO;
  #turmaDAO: TurmaDAO;
  #matriculaDAO: MatriculaDAO;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(
    projetoDAO: ProjetoDAO,
    turmaDAO: TurmaDAO,
    matriculaDAO: MatriculaDAO,
    escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {
    console.log('⬆️  ProjetoService.constructor()');
    this.#projetoDAO = projetoDAO;
    this.#turmaDAO = turmaDAO;
    this.#matriculaDAO = matriculaDAO;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAO;
  }

  /**
   * CRIAR PROJETO
   * Apenas Professor (FuncaoId=3) ou Direção (FuncaoId=6) da escola —
   * ver docs/PLANO_IMPLEMENTACAO_PROJETOS.md, Seção 1 decisão #1.
   */
  criarProjeto = async (data: ProjetoCreateDTO, usuarioCPF: string): Promise<ProjetoDTO> => {
    console.log('🟣 ProjetoService.criarProjeto()');

    const podecriar = await this.#escolaxUsuarioxFuncaoDAO.isProfessorOuDirecaoEmEscola(usuarioCPF, data.EscolaGUID);
    if (!podecriar) {
      throw new ErrorResponse(403, 'Apenas Professor ou Direção podem criar um projeto');
    }

    if (data.ProjetoGrupoMinPessoas < 1) {
      throw new ErrorResponse(400, 'ProjetoGrupoMinPessoas deve ser >= 1');
    }

    if (data.ProjetoGrupoMaxPessoas < data.ProjetoGrupoMinPessoas) {
      throw new ErrorResponse(400, 'ProjetoGrupoMaxPessoas deve ser >= ProjetoGrupoMinPessoas');
    }

    const prazoInscricao = new Date(data.ProjetoInscricaoPrazoData);
    if (isNaN(prazoInscricao.getTime()) || prazoInscricao < new Date()) {
      throw new ErrorResponse(400, 'ProjetoInscricaoPrazoData não pode ser no passado');
    }

    if (data.ProjetoEntregaPrazoData) {
      const prazoEntrega = new Date(data.ProjetoEntregaPrazoData);
      if (isNaN(prazoEntrega.getTime()) || prazoEntrega < prazoInscricao) {
        throw new ErrorResponse(400, 'ProjetoEntregaPrazoData deve ser posterior ao prazo de inscrição');
      }
    }

    let turmasGUID: string[] = [];
    if (data.ProjetoPublicoAlvo === 'Turmas') {
      if (!data.TurmasGUID || data.TurmasGUID.length === 0) {
        throw new ErrorResponse(400, 'TurmasGUID é obrigatório quando ProjetoPublicoAlvo é "Turmas"');
      }

      const turmas = await Promise.all(data.TurmasGUID.map((guid) => this.#turmaDAO.findById(guid)));
      const turmasInvalidas = data.TurmasGUID.filter((guid, index) => !turmas[index]);
      if (turmasInvalidas.length > 0) {
        throw new ErrorResponse(404, 'Turmas não encontradas', {
          message: `As seguintes turmas não existem: ${turmasInvalidas.join(', ')}`
        });
      }

      const turmasDeOutraEscola = turmas.filter((t) => t && t.EscolaGUID !== data.EscolaGUID);
      if (turmasDeOutraEscola.length > 0) {
        throw new ErrorResponse(400, 'Todas as turmas devem pertencer à escola informada em EscolaGUID');
      }

      turmasGUID = data.TurmasGUID;
    }

    const projetoCriado = await this.#projetoDAO.create(data, usuarioCPF);

    if (turmasGUID.length > 0) {
      await this.#projetoDAO.addTurmas(projetoCriado.ProjetoGUID, turmasGUID);
    }

    this.#notificarProjetoCriado(projetoCriado, turmasGUID).catch((error) => {
      console.error('🔴 ProjetoService.#notificarProjetoCriado() falhou:', error);
    });

    const projetoDTO = await this.#projetoDAO.findByIdComDetalhes(projetoCriado.ProjetoGUID);
    if (!projetoDTO) {
      throw new Error('Erro ao buscar projeto recém-criado');
    }

    return projetoDTO;
  };

  /** Notifica os alunos elegíveis (tipo `projeto_criado`) */
  #notificarProjetoCriado = async (projeto: Projeto, turmasGUID: string[]): Promise<void> => {
    let destinatarios: string[] = [];

    if (projeto.ProjetoPublicoAlvo === 'Escola') {
      destinatarios = await this.#escolaxUsuarioxFuncaoDAO.findUsuariosAtivosByEscolaEFuncoes(
        projeto.EscolaGUID,
        [5]
      );
    } else {
      const matriculasPorTurma = await Promise.all(
        turmasGUID.map((turmaGUID) => this.#matriculaDAO.findByTurma(turmaGUID))
      );
      const cpfsUnicos = new Set<string>();
      matriculasPorTurma.flat().forEach((matricula) => cpfsUnicos.add(matricula.UsuarioCPF));
      destinatarios = Array.from(cpfsUnicos);
    }

    if (destinatarios.length === 0) return;

    await getNotificacaoService().disparar({
      tipoSlug: 'projeto_criado',
      destinatarios,
      escolaGUID: projeto.EscolaGUID,
      titulo: `Novo projeto: ${projeto.ProjetoTitulo}`,
      conteudo: projeto.ProjetoDescricao,
      entidadeTipo: 'projeto',
      entidadeGUID: projeto.ProjetoGUID,
      link: `/dashboard/${projeto.EscolaGUID}/projetos/${projeto.ProjetoGUID}`
    });
  };

  /**
   * LISTAR PROJETOS de uma escola.
   * Se o usuário for Professor/Direção, retorna os que ele criou.
   * Se o usuário for Aluno, retorna os elegíveis (público ou turma dele).
   */
  listarProjetos = async (escolaGUID: string, usuarioCPF: string): Promise<Projeto[]> => {
    console.log('🟣 ProjetoService.listarProjetos()');

    const eProfessorOuDirecao = await this.#escolaxUsuarioxFuncaoDAO.isProfessorOuDirecaoEmEscola(usuarioCPF, escolaGUID);

    if (eProfessorOuDirecao) {
      return await this.#projetoDAO.findAll({ EscolaGUID: escolaGUID, UsuarioCPFCriador: usuarioCPF });
    }

    return await this.#projetoDAO.findElegiveisParaAluno(escolaGUID, usuarioCPF);
  };

  /**
   * BUSCAR PROJETO (detalhe)
   */
  buscarProjeto = async (projetoGUID: string): Promise<ProjetoDTO> => {
    console.log('🟣 ProjetoService.buscarProjeto()');

    const projeto = await this.#projetoDAO.findByIdComDetalhes(projetoGUID);
    if (!projeto) {
      throw new ErrorResponse(404, 'Projeto não encontrado');
    }

    return projeto;
  };

  /**
   * ATUALIZAR PROJETO (apenas o criador)
   */
  atualizarProjeto = async (
    projetoGUID: string,
    data: ProjetoUpdateDTO,
    usuarioCPF: string
  ): Promise<ProjetoDTO> => {
    console.log('🟣 ProjetoService.atualizarProjeto()');

    const projeto = await this.#projetoDAO.findById(projetoGUID);
    if (!projeto) {
      throw new ErrorResponse(404, 'Projeto não encontrado');
    }

    if (projeto.UsuarioCPFCriador !== usuarioCPF) {
      throw new ErrorResponse(403, 'Apenas o criador pode atualizar o projeto');
    }

    if (
      data.ProjetoGrupoMinPessoas !== undefined &&
      data.ProjetoGrupoMaxPessoas !== undefined &&
      data.ProjetoGrupoMaxPessoas < data.ProjetoGrupoMinPessoas
    ) {
      throw new ErrorResponse(400, 'ProjetoGrupoMaxPessoas deve ser >= ProjetoGrupoMinPessoas');
    }

    await this.#projetoDAO.update(projetoGUID, data);

    const projetoAtualizado = await this.#projetoDAO.findByIdComDetalhes(projetoGUID);
    if (!projetoAtualizado) {
      throw new Error('Erro ao buscar projeto atualizado');
    }

    return projetoAtualizado;
  };

  /**
   * ENCERRAR PROJETO (apenas o criador)
   * Não há DELETE físico — ver docs/PLANO_IMPLEMENTACAO_PROJETOS.md, Seção 7 ponto 3.
   */
  encerrarProjeto = async (projetoGUID: string, usuarioCPF: string): Promise<{ mensagem: string }> => {
    console.log('🟣 ProjetoService.encerrarProjeto()');

    const projeto = await this.#projetoDAO.findById(projetoGUID);
    if (!projeto) {
      throw new ErrorResponse(404, 'Projeto não encontrado');
    }

    if (projeto.UsuarioCPFCriador !== usuarioCPF) {
      throw new ErrorResponse(403, 'Apenas o criador pode encerrar o projeto');
    }

    if (projeto.ProjetoStatus === 'Encerrado') {
      throw new ErrorResponse(400, 'Projeto já está encerrado');
    }

    await this.#projetoDAO.atualizarStatus(projetoGUID, 'Encerrado');

    return { mensagem: 'Projeto encerrado com sucesso' };
  };

  /**
   * AUXILIAR — Valida se o projeto está aberto e dentro do prazo de
   * inscrição (usado por GrupoProjetoService/ConviteGrupoProjetoService
   * antes de qualquer ação de entrada em grupo).
   */
  validarProjetoAbertoParaInscricao = async (projetoGUID: string): Promise<Projeto> => {
    console.log('🟣 ProjetoService.validarProjetoAbertoParaInscricao()');

    const projeto = await this.#projetoDAO.findById(projetoGUID);
    if (!projeto) {
      throw new ErrorResponse(404, 'Projeto não encontrado');
    }

    if (projeto.ProjetoStatus === 'Encerrado') {
      throw new ErrorResponse(400, 'Projeto está encerrado');
    }

    if (new Date(projeto.ProjetoInscricaoPrazoData) < new Date()) {
      throw new ErrorResponse(400, 'Prazo de inscrição do projeto já encerrou');
    }

    return projeto;
  };
}
