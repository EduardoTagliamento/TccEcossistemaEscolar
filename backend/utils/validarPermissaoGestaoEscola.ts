import ErrorResponse from "./ErrorResponse";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";

const FUNCAO_ID_COORDENACAO = 1;
const FUNCAO_ID_DIRECAO = 6;

/**
 * Checagem padrão de "é Coordenação ou Direção ativa nesta escola" — antes
 * só existia como método privado duplicável em cada service
 * (ProfessorService#validarPermissaoEscrita foi a primeira versão). Extraído
 * pra cá pra poder ser reaproveitado nos endpoints de LEITURA que também
 * precisam dessa mesma trava (ex.: listar professores/alunos com CPF e
 * email — até agora só exigiam estar logado, sem checar papel nenhum na
 * escola, então um Aluno autenticado conseguia ler o CPF de qualquer
 * professor/colega só sabendo o EscolaGUID).
 *
 * Lança 403 se a pessoa não for Coordenação nem Direção ativa — senão,
 * retorna normalmente.
 */
export async function validarCoordenacaoOuDirecaoAtiva(
  escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO,
  usuarioGUID: string,
  escolaGUID: string,
  mensagem = "Você não tem permissão para acessar estes dados. Apenas Coordenação e Direção podem."
): Promise<void> {
  const coordenacao = await escolaxUsuarioxFuncaoDAO.findByTripla(usuarioGUID, escolaGUID, FUNCAO_ID_COORDENACAO);
  if (coordenacao && coordenacao.Status === "Ativo") {
    return;
  }

  const direcao = await escolaxUsuarioxFuncaoDAO.findByTripla(usuarioGUID, escolaGUID, FUNCAO_ID_DIRECAO);
  if (direcao && direcao.Status === "Ativo") {
    return;
  }

  throw new ErrorResponse(403, "Sem permissão", { message: mensagem });
}
