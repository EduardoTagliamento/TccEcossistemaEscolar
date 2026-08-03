import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import ErrorResponse from "./ErrorResponse";

type Origem = "body" | "params" | "query";

/**
 * Mensagem de topo do ErrorResponse. A maioria dos domínios (tarefaacademica,
 * provaagendada) usa sempre a mesma string genérica "Erro na validação de
 * dados", com o motivo específico só em `details.message` — é o default
 * quando `mensagemTopo` não é passado. `conteudo` foge à regra: cada campo
 * tem sua própria mensagem de topo (ex.: "MateriaGUID inválido") — nesse
 * caso passa uma função que recebe o nome do campo (ÚLTIMO segmento do
 * `path` do issue Zod — em domínios com body aninhado tipo
 * `categoriaconteudo` (`{ categoria: { MateriaGUID, ... } }`) o path é
 * `['categoria', 'MateriaGUID']`; o último segmento é o nome do campo em si,
 * igual ao que os domínios de schema plano já tinham no primeiro segmento)
 * e devolve a mensagem certa.
 */
type MensagemTopo = string | ((campo: string | undefined) => string);

interface ZodValidateOpcoes {
  /**
   * `pendencia` usa um terceiro contrato de erro: a mensagem específica vai
   * direto no topo (`ErrorResponse(400, mensagem)`, sem segundo argumento) —
   * não existe `details`. Com essa flag, `mensagemTopo` é ignorada e a
   * mensagem do próprio issue Zod (`schema` com `.min(n, "mensagem")` etc.)
   * vira a mensagem de topo.
   */
  semDetails?: boolean;
  /**
   * `usuario` precisa que o dado VALIDADO (já normalizado por `.transform()`,
   * ex.: CPF cru "12345678901" virando "123.456.789-01") seja escrito de
   * volta no `request` antes do `next()` — o controller depende disso
   * (`request.body.usuario` já normalizado). Nenhum domínio anterior
   * precisou disso (todos só validavam e deixavam o `request` original
   * seguir intocado). Quando fornecida, é chamada com `(request, dadosValidados)`
   * em caso de sucesso, antes do `next()`.
   */
  aposSucesso?: (request: Request, dados: unknown) => void;
}

/**
 * Adapta um schema Zod para o contrato de erro já usado no projeto:
 * ErrorResponse(400, mensagemTopo, { message }). Sem isso, um ZodError
 * vazando até o handler global cairia no branch genérico de 500 (ver
 * backend/Server.ts::setupErrorMiddleware).
 */
export function zodValidate(schema: ZodType, origem: Origem = "body", mensagemTopo: MensagemTopo = "Erro na validação de dados", opcoes: ZodValidateOpcoes = {}) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const resultado = schema.safeParse(request[origem]);

    if (!resultado.success) {
      const primeiroIssue = resultado.error.issues[0];

      if (opcoes.semDetails) {
        throw new ErrorResponse(400, primeiroIssue?.message ?? "Dados inválidos.");
      }

      const campo = primeiroIssue?.path?.[primeiroIssue.path.length - 1] as string | undefined;
      const topo = typeof mensagemTopo === "function" ? mensagemTopo(campo) : mensagemTopo;
      throw new ErrorResponse(400, topo, {
        message: primeiroIssue?.message ?? "Dados inválidos.",
      });
    }

    opcoes.aposSucesso?.(request, resultado.data);
    next();
  };
}
