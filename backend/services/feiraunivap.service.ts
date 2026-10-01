import bcrypt from "bcrypt";
import { TurmaDAO } from "../repositories/turma.repository";
import { CursoDAO } from "../repositories/curso.repository";
import { MatriculaDAO } from "../repositories/matricula.repository";
import { UsuarioDAO } from "../repositories/usuario.repository";
import { gerarSenhaTemporaria } from "../utils/helpers/password-generator.helper";
import { normalizarTelefone } from "../utils/helpers/telefone.helper";
import { WhatsappCredenciaisService } from "./whatsapp-credenciais.service";
import { EmailAlunoService } from "./email-aluno.service";
import ErrorResponse from "../utils/ErrorResponse";

/**
 * Fluxo público e temporário de ativação de conta pra feira técnica do
 * Colégio Univap — ver docs/SPEC_FEIRA_TECNICA_UNIVAP_2026.md.
 *
 * Escopado a uma ÚNICA escola fixa, de propósito: existem 7 outras escolas
 * "Univap" no banco (testes/duplicadas) e esta é a única com dados reais
 * (confirmado por consulta direta em 2026-10-01). NUNCA generalizar isso
 * pra "qualquer escola" sem reavaliar — o objetivo aqui é só destravar o
 * acesso dos alunos já pré-cadastrados (ver migration
 * `2026-10-01-feira-tecnica-univap.ts`), não virar um cadastro público
 * genérico.
 *
 * `ativar` só funciona em cima de um UsuarioGUID que já existe (pré-criado
 * pela migration ou já real de antes) e que ainda não tem telefone nem
 * email — nunca cria conta nova. Isso é a trava contra a rota virar um
 * cadastro aberto de qualquer pessoa.
 */
const ESCOLA_GUID_UNIVAP = "b67a6634-9afd-4fb3-8227-d2569a3db98c";
const NOME_ESCOLA_UNIVAP = "Colégios UNIVAP - Centro";

export interface TurmaFeiraDTO {
  TurmaGUID: string;
  TurmaSerie: string;
  TurmaNome: string;
  CursoNome: string | null;
}

export interface PessoaFeiraDTO {
  UsuarioGUID: string;
  UsuarioNome: string;
  jaAtivada: boolean;
}

export interface AtivarResultado {
  UsuarioNome: string;
  credenciaisEnviadasPorWhatsapp: boolean;
  credenciaisEnviadasPorEmail: boolean;
}

export default class FeiraUnivapService {
  #turmaDAO: TurmaDAO;
  #cursoDAO: CursoDAO;
  #matriculaDAO: MatriculaDAO;
  #usuarioDAO: UsuarioDAO;

  constructor(turmaDAO: TurmaDAO, cursoDAO: CursoDAO, matriculaDAO: MatriculaDAO, usuarioDAO: UsuarioDAO) {
    console.log("⬆️  FeiraUnivapService.constructor()");
    this.#turmaDAO = turmaDAO;
    this.#cursoDAO = cursoDAO;
    this.#matriculaDAO = matriculaDAO;
    this.#usuarioDAO = usuarioDAO;
  }

  listarTurmasPorAno = async (ano: string): Promise<TurmaFeiraDTO[]> => {
    console.log("🟣 FeiraUnivapService.listarTurmasPorAno()");

    const turmas = await this.#turmaDAO.findAll({ EscolaGUID: ESCOLA_GUID_UNIVAP, TurmaStatus: "Ativa" });
    const daAno = turmas.filter((t) => t.TurmaSerie === ano);

    const cursoCache = new Map<string, string | null>();
    const resultado: TurmaFeiraDTO[] = [];
    for (const turma of daAno) {
      let cursoNome: string | null = null;
      if (turma.CursoGUID) {
        if (!cursoCache.has(turma.CursoGUID)) {
          const curso = await this.#cursoDAO.findById(turma.CursoGUID);
          cursoCache.set(turma.CursoGUID, curso?.CursoNome ?? null);
        }
        cursoNome = cursoCache.get(turma.CursoGUID) ?? null;
      }
      resultado.push({
        TurmaGUID: turma.TurmaGUID,
        TurmaSerie: turma.TurmaSerie,
        TurmaNome: turma.TurmaNome,
        CursoNome: cursoNome,
      });
    }

    resultado.sort((a, b) => a.TurmaNome.localeCompare(b.TurmaNome));
    return resultado;
  };

  listarPessoasPorTurma = async (turmaGUID: string): Promise<PessoaFeiraDTO[]> => {
    console.log("🟣 FeiraUnivapService.listarPessoasPorTurma()");

    const turma = await this.#turmaDAO.findById(turmaGUID);
    if (!turma || turma.EscolaGUID !== ESCOLA_GUID_UNIVAP) {
      throw new ErrorResponse(404, "Turma inválida pra este fluxo.");
    }

    const matriculas = (await this.#matriculaDAO.findByTurma(turmaGUID)).filter((m) => m.MatriculaStatus === "Ativa");

    const pessoas: PessoaFeiraDTO[] = [];
    for (const matricula of matriculas) {
      const usuario = await this.#usuarioDAO.findByGUID(matricula.UsuarioGUID);
      if (!usuario) continue;
      pessoas.push({
        UsuarioGUID: usuario.UsuarioGUID,
        UsuarioNome: usuario.UsuarioNome,
        jaAtivada: !!(usuario.UsuarioTelefone || usuario.UsuarioEmail),
      });
    }

    pessoas.sort((a, b) => a.UsuarioNome.localeCompare(b.UsuarioNome));
    return pessoas;
  };

  ativar = async (dados: {
    UsuarioGUID: string;
    telefone: string;
    email?: string;
    matricula?: string;
  }): Promise<AtivarResultado> => {
    console.log("🟣 FeiraUnivapService.ativar()");

    const usuario = await this.#usuarioDAO.findByGUID(dados.UsuarioGUID);
    if (!usuario) {
      throw new ErrorResponse(404, "Esse cadastro não existe. Fale com a administração do Bauá.");
    }
    if (usuario.UsuarioTelefone || usuario.UsuarioEmail) {
      throw new ErrorResponse(400, "Essa conta já foi ativada antes, não é possível ativar de novo por aqui.");
    }

    // Trava de segurança: só ativa quem tem matrícula ativa na escola da feira
    // (impede usar essa rota pública pra mexer num UsuarioGUID de outra escola).
    const turmasDaEscola = await this.#turmaDAO.findAll({ EscolaGUID: ESCOLA_GUID_UNIVAP });
    const turmaGUIDsDaEscola = new Set(turmasDaEscola.map((t) => t.TurmaGUID));
    let matriculaAtivaNaEscola: Awaited<ReturnType<MatriculaDAO["findByTurma"]>>[number] | null = null;
    for (const turmaGUID of turmaGUIDsDaEscola) {
      const matriculas = await this.#matriculaDAO.findByTurma(turmaGUID);
      const ativa = matriculas.find((m) => m.UsuarioGUID === usuario.UsuarioGUID && m.MatriculaStatus === "Ativa");
      if (ativa) {
        matriculaAtivaNaEscola = ativa;
        break;
      }
    }
    if (!matriculaAtivaNaEscola) {
      throw new ErrorResponse(400, "Essa pessoa não está matriculada no Colégio Univap. Fale com a administração do Bauá.");
    }

    usuario.UsuarioTelefone = normalizarTelefone(dados.telefone);
    if (dados.email) {
      usuario.UsuarioEmail = dados.email;
    }
    const senhaTemporaria = gerarSenhaTemporaria(usuario.UsuarioNome);
    usuario.UsuarioSenha = await bcrypt.hash(senhaTemporaria, 10);

    await this.#usuarioDAO.update(usuario);

    if (dados.matricula && dados.matricula.trim()) {
      await this.#matriculaDAO.updateIdentificador(matriculaAtivaNaEscola.MatriculaGUID, dados.matricula.trim());
    }

    const linkLogin = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : "http://localhost:3000/login";

    let credenciaisEnviadasPorWhatsapp = false;
    try {
      await WhatsappCredenciaisService.enviarCredenciaisNovoUsuario({
        para: usuario.UsuarioTelefone,
        nomeUsuario: usuario.UsuarioNome,
        nomeEscola: NOME_ESCOLA_UNIVAP,
        senhaTemporaria,
        linkLogin,
      });
      credenciaisEnviadasPorWhatsapp = true;
    } catch (erro) {
      console.error("❌ FeiraUnivapService.ativar() — falha ao enviar WhatsApp:", erro);
    }

    let credenciaisEnviadasPorEmail = false;
    if (usuario.UsuarioEmail) {
      try {
        await EmailAlunoService.enviarEmailNovoAluno({
          para: usuario.UsuarioEmail,
          nomeAluno: usuario.UsuarioNome,
          nomeEscola: NOME_ESCOLA_UNIVAP,
          cpf: usuario.UsuarioCPF ?? "",
          senhaTemporaria,
          linkLogin,
        });
        credenciaisEnviadasPorEmail = true;
      } catch (erro) {
        console.error("❌ FeiraUnivapService.ativar() — falha ao enviar email:", erro);
      }
    }

    return {
      UsuarioNome: usuario.UsuarioNome,
      credenciaisEnviadasPorWhatsapp,
      credenciaisEnviadasPorEmail,
    };
  };
}
