import Anexo from './anexo.model';

/**
 * Módulo temporário (beta com grupo pequeno) — entidade simples de
 * propósito, sem a classe Entity/validar() de outros módulos porque não há
 * nada a manter depois do teste encerrar.
 */
export interface Sugestao {
  SugestaoGUID: string;
  UsuarioGUID: string;
  EscolaGUID: string | null;
  SugestaoTexto: string;
  SugestaoPaginaUrl: string | null;
  SugestaoCreatedAt: Date;
}

export interface SugestaoComAutor extends Sugestao {
  UsuarioNome: string | null;
  UsuarioEmail: string | null;
  Anexos: Anexo[];
}

export interface SugestaoCreateDTO {
  UsuarioGUID: string;
  EscolaGUID?: string | null;
  SugestaoTexto: string;
  SugestaoPaginaUrl?: string | null;
  AnexoGUIDs?: string[];
}
