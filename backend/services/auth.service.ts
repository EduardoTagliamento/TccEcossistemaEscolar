/**
 * 🔐 Serviço de Autenticação
 * 
 * Gerencia login, logout e validações de credenciais.
 */

import bcrypt from 'bcrypt';
import { UsuarioDAO } from '../repositories/usuario.repository.js';
import { JwtService } from '../utils/JwtService.js';
import ErrorResponse from '../utils/ErrorResponse.js';

interface LoginCredentials {
  identifier: string; // CPF, email ou telefone
  senha: string;
}

interface LoginResponse {
  token: string;
  user: {
    UsuarioCPF: string;
    UsuarioNome: string;
    UsuarioEmail: string;
    UsuarioEmailVerificado: boolean;
    UsuarioTelefone: string | null;
  };
}

export default class AuthService {
  #usuarioDAO: UsuarioDAO;

  constructor(usuarioDAO: UsuarioDAO) {
    console.log('⬆️  AuthService.constructor()');
    this.#usuarioDAO = usuarioDAO;
  }

  /**
   * Detecta o tipo de identificador (CPF, email ou telefone)
   */
  private detectIdentifierType(identifier: string): 'cpf' | 'email' | 'telefone' {
    // Remove formatação
    const cleaned = identifier.replace(/\D/g, '');

    // Se tem @ é email
    if (identifier.includes('@')) {
      return 'email';
    }

    // Se tem 11 dígitos sem @ é telefone
    if (cleaned.length === 11 && !identifier.includes('@')) {
      return 'telefone';
    }

    // Padrão é CPF
    return 'cpf';
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
      const { identifier, senha } = credentials;

      // 1. Detectar tipo de identificador
      const type = this.detectIdentifierType(identifier);
      const formattedIdentifier = this.formatIdentifier(identifier, type);

      console.log(`🔍 [AuthService] Tentativa de login via ${type}: ${formattedIdentifier}`);

      // 2. Buscar usuário no banco
      let usuario;

      if (type === 'cpf') {
        usuario = await this.#usuarioDAO.findByCPF(formattedIdentifier);
      } else if (type === 'email') {
        usuario = await this.#usuarioDAO.findByEmail(formattedIdentifier);
      } else {
        usuario = await this.#usuarioDAO.findByTelefone(formattedIdentifier);
      }

      if (!usuario) {
        throw new ErrorResponse(401, 'Credenciais inválidas', {
          message: 'CPF, email, telefone ou senha incorretos',
        });
      }

      // 3. Verificar senha
      const senhaCorreta = await bcrypt.compare(senha, usuario.UsuarioSenha);

      if (!senhaCorreta) {
        console.warn(`⚠️  [AuthService] Senha incorreta para usuário ${usuario.UsuarioCPF}`);
        throw new ErrorResponse(401, 'Credenciais inválidas', {
          message: 'CPF, email, telefone ou senha incorretos',
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
      const token = JwtService.generateToken({
        UsuarioCPF: usuario.UsuarioCPF,
        UsuarioEmail: usuario.UsuarioEmail || '',
        UsuarioNome: usuario.UsuarioNome,
      });

      // 6. Atualizar último acesso
      await this.#usuarioDAO.updateUltimoAcesso(usuario.UsuarioCPF);

      console.log(`✅ [AuthService] Login bem-sucedido: ${usuario.UsuarioNome}`);

      // 7. Retornar token e dados do usuário (sem senha)
      return {
        token,
        user: {
          UsuarioCPF: usuario.UsuarioCPF,
          UsuarioNome: usuario.UsuarioNome,
          UsuarioEmail: usuario.UsuarioEmail || '',
          UsuarioEmailVerificado: usuario.UsuarioEmailVerificado,
          UsuarioTelefone: usuario.UsuarioTelefone,
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
      const usuario = await this.#usuarioDAO.findByCPF(decoded.UsuarioCPF);

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
        UsuarioCPF: usuario.UsuarioCPF,
        UsuarioNome: usuario.UsuarioNome,
        UsuarioEmail: usuario.UsuarioEmail || '',
        UsuarioEmailVerificado: usuario.UsuarioEmailVerificado,
        UsuarioTelefone: usuario.UsuarioTelefone,
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
