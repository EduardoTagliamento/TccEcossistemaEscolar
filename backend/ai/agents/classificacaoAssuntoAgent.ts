import { Schema, Type } from "@google/genai";
import { getGeminiProvider } from "../providers/geminiProvider";

export interface AssuntoCandidato {
  AssuntoGUID: string;
  Nome: string;
}

interface ClassificacaoResposta {
  assuntoIndice: number;
}

const CLASSIFICACAO_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    assuntoIndice: { type: Type.INTEGER },
  },
  required: ["assuntoIndice"],
};

/**
 * Classificação de assunto restrita à lista já cadastrada pra Matéria
 * (spec item 3) — a IA só roda quando o professor NÃO travou o assunto
 * manualmente, e mesmo assim escolhe (nunca inventa) um item da lista, ou
 * devolve "nenhum aplicável".
 */
export class ClassificacaoAssuntoAgent {
  classificar = async (contexto: string, assuntosDisponiveis: AssuntoCandidato[]): Promise<string | null> => {
    console.log(`🤖 ClassificacaoAssuntoAgent.classificar() candidatos=${assuntosDisponiveis.length}`);

    if (assuntosDisponiveis.length === 0) return null;

    const prompt = [
      "Classifique o contexto de prova abaixo escolhendo o assunto mais apropriado dentre a lista numerada.",
      "Responda com o índice (baseado em 0) do assunto escolhido, ou -1 se nenhum da lista se aplicar de verdade.",
      "Nunca invente um assunto que não esteja na lista.",
      "",
      `Contexto da prova: ${contexto}`,
      "",
      "Assuntos disponíveis:",
      ...assuntosDisponiveis.map((a, i) => `${i}. ${a.Nome}`),
    ].join("\n");

    try {
      const resposta = await getGeminiProvider().gerarEstruturado<ClassificacaoResposta>(
        prompt,
        CLASSIFICACAO_SCHEMA,
        "leve"
      );

      if (
        !Number.isInteger(resposta.assuntoIndice) ||
        resposta.assuntoIndice < 0 ||
        resposta.assuntoIndice >= assuntosDisponiveis.length
      ) {
        return null;
      }

      return assuntosDisponiveis[resposta.assuntoIndice].AssuntoGUID;
    } catch (error) {
      console.warn("🟡 ClassificacaoAssuntoAgent.classificar() falhou, seguindo sem assunto classificado:", error);
      return null;
    }
  };
}

let instanciaSingleton: ClassificacaoAssuntoAgent | null = null;

export function getClassificacaoAssuntoAgent(): ClassificacaoAssuntoAgent {
  if (!instanciaSingleton) {
    instanciaSingleton = new ClassificacaoAssuntoAgent();
  }
  return instanciaSingleton;
}
