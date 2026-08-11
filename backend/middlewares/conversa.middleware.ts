import {
  ConversaGUIDParamSchema,
  MensagemGUIDParamSchema,
  IniciarIndividualBodySchema,
  UsuarioGUIDBodySchema,
  UsuarioGUIDParamSchema,
  EditarBodySchema,
  ReacaoBodySchema,
} from "../schemas/conversa.schema";
import { zodValidate } from "../utils/zodValidate";

export class ConversaMiddleware {
  static validarGUID = zodValidate(ConversaGUIDParamSchema, "params", "", { semDetails: true });

  static validarMsgGUID = zodValidate(MensagemGUIDParamSchema, "params", "", { semDetails: true });

  // A checagem de "não pode iniciar conversa consigo mesmo" já é feita em
  // ConversaIndividualService.iniciarConversa() (comparando UsuarioGUID
  // diretamente, sem round-trip ao banco) — a validação de formato via Zod é
  // suficiente neste nível.
  static validarIniciarIndividual = zodValidate(IniciarIndividualBodySchema, "body", "", { semDetails: true });

  static validarUsuarioGUIDBody = zodValidate(UsuarioGUIDBodySchema, "body", "", { semDetails: true });

  static validarUsuarioGUIDParam = zodValidate(UsuarioGUIDParamSchema, "params", "", { semDetails: true });

  static validarEditarBody = zodValidate(EditarBodySchema, "body", "", { semDetails: true });

  static validarReacaoBody = zodValidate(ReacaoBodySchema, "body", "", { semDetails: true });
}
