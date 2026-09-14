/**
 * 🔐 Serviço de Autenticação
 * 
 * Gerencia login, logout e validações de credenciais.
 */

import bcrypt from 'bcrypt';
import { UsuarioDAO } from '../repositories/usuario.repository';
import { MatriculaDAO } from '../repositories/matricula.repository';
import { JwtService } from '../utils/JwtService';
import ErrorResponse from '../utils/ErrorResponse';

interface LoginCredentials {
  identifier: string; // CPF, email, telefone ou (com escolaGUID) identificador de matrícula
  senha: string;
  lembrar?: boolean; // "Lembrar de mim" — sessão mais longa (30d em vez de 24h)
  /**
   * Presente quando o login vem de /login/[slug] (frontend já resolveu o
   * slug pra EscolaGUID antes de chamar este endpoint) — habilita a
   * tentativa de resolução por MatriculaIdentificador escopada a essa
   * escola. Ausente = comportamento idêntico ao login geral de hoje.
   * Ver docs/PLANO_IMPLEMENTACAO_LOGIN_POR_ESCOLA.md, §4.2.
   */
  escolaGUID?: string;
}

interface LoginResponse {
  token: string;
  user: {
    UsuarioGUID: string;
    UsuarioCPF: string | null;
    UsuarioNome: string;
    UsuarioEmail: string;
    UsuarioEmailVerificado: boolean;
    UsuarioTelefone: string | null;
    UsuarioFotoUrl: string | null;
    UsuarioTema: 'light' | 'dark' | 'system';
    UsuarioModoDaltonico: boolean;
    UsuarioEscalaFonte: 'small' | 'medium' | 'large';
    UsuarioReduzirMovimento: boolean;
    UsuarioAltoContraste: boolean;
    UsuarioIsPlataformaAdmin: boolean;
  };
}

export default class AuthService {
  #usuarioDAO: UsuarioDAO;
  #matriculaDAO?: MatriculaDAO;

  constructor(usuarioDAO: UsuarioDAO, matriculaDAO?: MatriculaDAO) {
    console.log('⬆️  AuthService.constructor()');
    this.#usuarioDAO = usuarioDAO;
    this.#matriculaDAO = matriculaDAO;
  }

  /**
   * Resolve o usuário a partir do identificador de login — CPF e telefone
   * têm ambos 11 dígitos quando limpos, então `detectIdentifierType` sozinho
   * não distingue um do outro (bug real: todo login por CPF caía em
   * telefone, nunca achava ninguém). Tenta CPF primeiro, telefone depois,
   * só quando o formato é ambíguo. Quando `escolaGUID` é informado (login
   * por /login/[slug]) e nenhum dos três caminhos acha o usuário, tenta
   * resolver como MatriculaIdentificador escopado a essa escola — ver
   * docs/PLANO_IMPLEMENTACAO_LOGIN_POR_ESCOLA.md, §4.2.
   */
  private async resolverUsuarioPorIdentificador(identifier: string, escolaGUID?: string) {
    if (identifier.includes('@')) {
      const formatted = this.formatIdentifier(identifier, 'email');
      console.log(`🔍 [AuthService] Tentativa de login via email: ${formatted}`);
      return this.#usuarioDAO.findByEmail(formatted);
    }

    const cleaned = identifier.replace(/\D/g, '');
    if (cleaned.length !== 11) {
      const formatted = this.formatIdentifier(identifier, 'cpf');
      console.log(`🔍 [AuthService] Tentativa de login via cpf: ${formatted}`);
      const porCPF = await this.#usuarioDAO.findByCPF(formatted);
      if (porCPF) return porCPF;
      return this.resolverPorMatricula(identifier, escolaGUID);
    }

    const cpfFormatado = this.formatIdentifier(identifier, 'cpf');
    console.log(`🔍 [AuthService] Tentativa de login via cpf: ${cpfFormatado}`);
    const porCPF = await this.#usuarioDAO.findByCPF(cpfFormatado);
    if (porCPF) return porCPF;

    const telefoneFormatado = this.formatIdentifier(identifier, 'telefone');
    console.log(`🔍 [AuthService] CPF não encontrado, tentando telefone: ${telefoneFormatado}`);
    const porTelefone = await this.#usuarioDAO.findByTelefone(telefoneFormatado);
    if (porTelefone) return porTelefone;

    return this.resolverPorMatricula(identifier, escolaGUID);
  }

  /**
   * Último recurso de resolução, só quando `escolaGUID` foi informado
   * (login vindo de /login/[slug]) — matrícula pertence a uma escola
   * específica, então login por matrícula sem escola conhecida seria
   * ambíguo entre escolas. Senha continua sendo a do Usuario (bcrypt),
   * não existe senha por matrícula.
   */
  private async resolverPorMatricula(identifier: string, escolaGUID?: string) {
    if (!escolaGUID || !this.#matriculaDAO) return null;

    console.log(`🔍 [AuthService] Tentativa de login via matrícula (escola ${escolaGUID}): ${identifier.trim()}`);
    const matricula = await this.#matriculaDAO.findByIdentificadorEEscola(identifier.trim(), escolaGUID);
    if (!matricula) return null;

    return this.#usuarioDAO.findByGUID(matricula.UsuarioGUID);
  }

  /**
   * Formata o identificador conforme o tipo
   */
  private formatIdentifier(identifier: string, type: 'cpf' | 'email' | 'telefone'): string {
    if (type === 'email') {
      return identifier.toLowerCase().trim();
    }

    const cleaned = identifier.replace(/\D/g, '');

    if (type === 'cpf') {
      // Formato: XXX.XXX.XXX-XX
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}-${cleaned.substring(9, 11)}`;
    }

    if (type === 'telefone') {
      // Formato: (XX) XXXXX-XXXX
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
    }

    return identifier;
  }

  /**
   * Realiza o login do usuário
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const { identifier, senha, lembrar, escolaGUID } = credentials;

      // 1. Buscar usuário no banco — CPF e telefone têm os dois exatamente
      // 11 dígitos quando limpos (XXX.XXX.XXX-XX = 9+2, (XX) XXXXX-XXXX =
      // 2+9), então contar dígitos não distingue um do outro. Tenta CPF
      // primeiro, cai pra telefone só se não achar — cobre os dois sem
      // depender de adivinhar qual é qual. Com escolaGUID informado, cai
      // por último pra matrícula escopada a essa escola (ver
      // resolverUsuarioPorIdentificador).
      const usuario = await this.resolverUsuarioPorIdentificador(identifier, escolaGUID);

      if (!usuario) {
        throw new ErrorResponse(401, 'Credenciais inválidas', {
          // Não indica qual dos quatro caminhos falhou — mesma política de
          // não vazar qual parte da credencial estava errada.
          message: escolaGUID
            ? 'Matrícula, CPF, email, telefone ou senha incorretos'
            : 'CPF, email, telefone ou senha incorretos',
        });
      }

      // 3. Verificar senha
      const senhaCorreta = await bcrypt.compare(senha, usuario.UsuarioSenha);

      if (!senhaCorreta) {
        console.warn(`⚠️  [AuthService] Senha incorreta para usuário ${usuario.UsuarioGUID}`);
        throw new ErrorResponse(401, 'Credenciais inválidas', {
          message: escolaGUID
            ? 'Matrícula, CPF, email, telefone ou senha incorretos'
            : 'CPF, email, telefone ou senha incorretos',
        });
      }

      // 4. Verificar status do usuário
      if (usuario.UsuarioStatus === 'Bloqueado') {
        throw new ErrorResponse(403, 'Usuário bloqueado', {
          message: 'Sua conta foi bloqueada. Entre em contato com o suporte.',
        });
      }

      if (usuario.UsuarioStatus === 'Inativo') {
        throw new ErrorResponse(403, 'Usuário inativo', {
          message: 'Sua conta está inativa. Entre em contato com o suporte.',
        });
      }

      // 5. Gerar token JWT
      const token = JwtService.generateToken(
        {
          UsuarioGUID: usuario.UsuarioGUID,
          UsuarioEmail: usuario.UsuarioEmail || '',
          UsuarioNome: usuario.UsuarioNome,
        },
        { lembrar }
      );

      // 6. Atualizar último acesso
      await this.#usuarioDAO.updateUltimoAcesso(usuario.UsuarioGUID);

      console.log(`✅ [AuthService] Login bem-sucedido: ${usuario.UsuarioNome}`);

      // 7. Retornar token e dados do usuário (sem senha)
      return {
        token,
        user: {
          UsuarioGUID: usuario.UsuarioGUID,
          UsuarioCPF: usuario.UsuarioCPF,
          UsuarioNome: usuario.UsuarioNome,
          UsuarioEmail: usuario.UsuarioEmail || '',
          UsuarioEmailVerificado: usuario.UsuarioEmailVerificado,
          UsuarioTelefone: usuario.UsuarioTelefone,
          UsuarioFotoUrl: usuario.UsuarioFotoUrl,
          UsuarioTema: usuario.UsuarioTema,
          UsuarioModoDaltonico: usuario.UsuarioModoDaltonico,
          UsuarioEscalaFonte: usuario.UsuarioEscalaFonte,
          UsuarioReduzirMovimento: usuario.UsuarioReduzirMovimento,
          UsuarioAltoContraste: usuario.UsuarioAltoContraste,
          UsuarioIsPlataformaAdmin: usuario.UsuarioIsPlataformaAdmin,
        },
      };
    } catch (error: any) {
      if (error instanceof ErrorResponse) {
        throw error;
      }

      console.error('❌ [AuthService] Erro no login:', error);
      throw new ErrorResponse(500, 'Erro no login', {
        message: 'Erro ao realizar login. Tente novamente.',
      });
    }
  }

  /**
   * Valida um token e retorna os dados do usuário
   */
  async validateToken(token: string): Promise<LoginResponse['user']> {
    try {
      // 1. Verificar token
      const decoded = JwtService.verifyToken(token);

      // 2. Buscar usuário atualizado no banco
      const usuario = await this.#usuarioDAO.findByGUID(decoded.UsuarioGUID);

      if (!usuario) {
        throw new ErrorResponse(401, 'Usuário não encontrado', {
          message: 'Token válido mas usuário não existe mais no sistema',
        });
      }

      // 3. Verificar se usuário não foi bloqueado/inativado
      if (usuario.UsuarioStatus !== 'Ativo') {
        throw new ErrorResponse(403, 'Usuário inativo ou bloqueado', {
          message: 'Sua conta não está mais ativa',
        });
      }

      return {
        UsuarioGUID: usuario.UsuarioGUID,
        UsuarioCPF: usuario.UsuarioCPF,
        UsuarioNome: usuario.UsuarioNome,
        UsuarioEmail: usuario.UsuarioEmail || '',
        UsuarioEmailVerificado: usuario.UsuarioEmailVerificado,
        UsuarioTelefone: usuario.UsuarioTelefone,
        UsuarioFotoUrl: usuario.UsuarioFotoUrl,
        UsuarioTema: usuario.UsuarioTema,
        UsuarioModoDaltonico: usuario.UsuarioModoDaltonico,
        UsuarioEscalaFonte: usuario.UsuarioEscalaFonte,
        UsuarioReduzirMovimento: usuario.UsuarioReduzirMovimento,
        UsuarioAltoContraste: usuario.UsuarioAltoContraste,
        UsuarioIsPlataformaAdmin: usuario.UsuarioIsPlataformaAdmin,
      };
    } catch (error: any) {
      if (error instanceof ErrorResponse) {
        throw error;
      }

      console.error('❌ [AuthService] Erro ao validar token:', error);
      throw new ErrorResponse(401, 'Token inválido', {
        message: error.message || 'Falha na validação do token',
      });
    }
  }
}
