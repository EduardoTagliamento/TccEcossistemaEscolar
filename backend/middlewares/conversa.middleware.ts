import {
  ConversaGUIDParamSchema,
  MensagemGUIDParamSchema,
  IniciarIndividualBodySchema,
  CPFBodySchema,
  CPFParamSchema,
  EditarBodySchema,
  ReacaoBodySchema,
} from "../schemas/conversa.schema";
import { zodValidate } from "../utils/zodValidate";

export class ConversaMiddleware {
  static validarGUID = zodValidate(ConversaGUIDParamSchema, "params", "", { semDetails: true });

  static validarMsgGUID = zodValidate(MensagemGUIDParamSchema, "params", "", { semDetails: true });

  // A checagem de "não pode iniciar conversa consigo mesmo" precisa comparar
  // o CPF do destinatário com o CPF do usuário autenticado — mas `req.user`
  // só carrega UsuarioGUID (JWT migrado pra GUID), então essa comparação não
  // dá mais pra fazer aqui sem acesso ao banco. ConversaIndividualService.
  // iniciarConversa() já faz essa mesma checagem internamente (com o CPF
  // resolvido de verdade), então a validação de formato via Zod é suficiente
  // neste nível.
  static validarIniciarIndividual = zodValidate(IniciarIndividualBodySchema, "body", "", { semDetails: true });

  static validarCPFBody = zodValidate(CPFBodySchema, "body", "", { semDetails: true });

  static validarCPFParam = zodValidate(CPFParamSchema, "params", "", { semDetails: true });

  static validarEditarBody = zodValidate(EditarBodySchema, "body", "", { semDetails: true });

  static validarReacaoBody = zodValidate(ReacaoBodySchema, "body", "", { semDetails: true });
}
