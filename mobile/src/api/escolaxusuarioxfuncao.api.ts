/**
 * Vínculo Escola × Usuário × Função — usado só para descobrir a(s) escola(s)
 * e o papel (`FuncaoNome`) do usuário logo após o login (tela de seleção de
 * escola, se houver mais de uma). Espelha
 * `frontend/lib/api/escolaxusuarioxfuncao.api.ts`.
 *
 * FuncaoId: 1=Coordenação 2=Secretaria 3=Professor 4=Responsável 5=Aluno 6=Direção
 */
import { API_URL, getHeaders, query, tratarResposta } from './client';

export type FuncaoStatus = 'Ativo' | 'Inativo' | 'Finalizado';

export interface EscolaxUsuarioxFuncao {
  EscolaxUsuarioxFuncaoId: number;
  UsuarioGUID: string;
  EscolaGUID: string;
  FuncaoId: number;
  FuncaoNome: string | null;
  Status: FuncaoStatus;
}

export async function listarVinculos(filtros: { UsuarioGUID: string }): Promise<EscolaxUsuarioxFuncao[]> {
  const response = await fetch(`${API_URL}/escolaxusuarioxfuncao${query(filtros)}`, {
    headers: getHeaders(),
  });
  const resultado = await tratarResposta<{ escolaxusuarioxfuncaos: EscolaxUsuarioxFuncao[] }>(
    response,
    'Erro ao listar vínculos'
  );
  return resultado.escolaxusuarioxfuncaos;
}
