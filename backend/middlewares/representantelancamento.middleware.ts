import { zodValidate } from "../utils/zodValidate";
import {
  TurmaGUIDParamsSchema,
  EscolaGUIDParamsSchema,
  CriarProvaRepresentanteBodySchema,
  CriarTarefaRepresentanteBodySchema,
  CriarConteudoRepresentanteBodySchema,
  DefinirFlagRepresentanteBodySchema,
} from "../schemas/representantelancamento.schema";

/**
 * Middlewares de validação do fluxo "Lançamento por Representante" — ver
 * backend/schemas/representantelancamento.schema.ts e
 * docs/PLANO_IMPLEMENTACAO_LANCAMENTO_POR_REPRESENTANTE.md.
 */
export default class RepresentanteLancamentoMiddleware {
  static validarTurmaParams = zodValidate(TurmaGUIDParamsSchema, "params", "", { semDetails: true });
  static validarEscolaParams = zodValidate(EscolaGUIDParamsSchema, "params", "", { semDetails: true });
  static validarCriarProva = zodValidate(CriarProvaRepresentanteBodySchema, "body", "", { semDetails: true });
  static validarCriarTarefa = zodValidate(CriarTarefaRepresentanteBodySchema, "body", "", { semDetails: true });
  static validarCriarConteudo = zodValidate(CriarConteudoRepresentanteBodySchema, "body", "", { semDetails: true });
  static validarDefinirFlag = zodValidate(DefinirFlagRepresentanteBodySchema, "body", "", { semDetails: true });
}
