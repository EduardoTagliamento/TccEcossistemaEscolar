/**
 * 🔐 Serviço de JWT (JSON Web Token)
 * 
 * Responsável por gerar e validar tokens de autenticação.
 * Utilizado para manter sessões de usuário sem armazenar estado no servidor.
 */

import jwt, { SignOptions } from 'jsonwebtoken';

interface TokenPayload {
  UsuarioCPF: string;
  UsuarioEmail: string;
  UsuarioNome: string;
}

interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
}

export class JwtService {
  private static readonly SECRET: string = process.env.JWT_SECRET || 'default_secret_key_CHANGE_IN_PRODUCTION';
  private static readonly EXPIRES_IN: string = (process.env.JWT_EXPIRES_IN as string) || '24h';

  /**
   * Gera um token JWT para o usuário
   */
  static generateToken(payload: TokenPayload): string {
    try {
      const options: SignOptions = {
        expiresIn: this.EXPIRES_IN as any,
      };

      const token = jwt.sign(payload, this.SECRET, options);

      console.log(`✅ [JWT] Token gerado para ${payload.UsuarioNome}`);
      return token;
    } catch (error) {
      console.error('❌ [JWT] Erro ao gerar token:', error);
      throw new Error('Erro ao gerar token de autenticação');
    }
  }

  /**
   * Verifica e decodifica um token JWT
   */
  static verifyToken(token: string): DecodedToken {
    try {
      const decoded = jwt.verify(token, this.SECRET) as DecodedToken;
      return decoded;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        console.warn('⚠️  [JWT] Token expirado');
        throw new Error('Token expirado');
      } else if (error.name === 'JsonWebTokenError') {
        console.warn('⚠️  [JWT] Token inválido');
        throw new Error('Token inválido');
      } else {
        console.error('❌ [JWT] Erro ao verificar token:', error);
        throw new Error('Erro ao verificar token');
      }
    }
  }

  /**
   * Decodifica um token sem verificar assinatura (útil para debug)
   */
  static decodeToken(token: string): DecodedToken | null {
    try {
      const decoded = jwt.decode(token) as DecodedToken;
      return decoded;
    } catch (error) {
      console.error('❌ [JWT] Erro ao decodificar token:', error);
      return null;
    }
  }

  /**
   * Verifica se um token está expirado (sem verificar assinatura)
   */
  static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  }

  /**
   * Extrai o CPF do usuário de um token
   */
  static extractUserCPF(token: string): string | null {
    try {
      const decoded = this.verifyToken(token);
      return decoded.UsuarioCPF;
    } catch (error) {
      return null;
    }
  }
}
