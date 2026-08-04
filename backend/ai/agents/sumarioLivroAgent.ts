import { Schema, Type } from "@google/genai";
import { getGeminiProvider } from "../providers/geminiProvider";

export interface MateriaCandidata {
  MateriaGUID: string;
  Nome: string;
}

export interface CapituloSugerido {
  Titulo: string;
  PaginaInicio: number;
  PaginaFim: number;
  MateriaGUID: string | null;
}

interface SumarioResposta {
  capitulos: { titulo: string; paginaInicio: number; paginaFim: number; materiaIndice: number }[];
}

const SUMARIO_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    capitulos: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          titulo: { type: Type.STRING },
          paginaInicio: { type: Type.INTEGER },
          paginaFim: { type: Type.INTEGER },
          materiaIndice: { type: Type.INTEGER },
        },
        required: ["titulo", "paginaInicio", "paginaFim", "materiaIndice"],
      },
    },
  },
  required: ["capitulos"],
};

const MAX_CARACTERES_ENTRADA = 400000;

/**
 * Sumário do livro (spec item 8, §4/item 19: tier "cheio", roda 1x por
 * livro): a partir do texto já extraído+revisado de todas as páginas, sugere
 * capítulo/faixa de página/matéria. Sempre uma SUGESTÃO — quem cadastrou o
 * livro revisa/edita antes de virar `MaterialDidaticoCapitulo` de verdade
 * (mesmo guardrail de revisão humana do item 10).
 */
export class SumarioLivroAgent {
  sugerirCapitulos = async (
    textoComNumerosDePagina: string,
    materiasDisponiveis: MateriaCandidata[]
  ): Promise<CapituloSugerido[]> => {
    console.log("🤖 SumarioLivroAgent.sugerirCapitulos()");

    if (materiasDisponiveis.length === 0) return [];

    const prompt = [
      "O texto abaixo é de um livro didático, com marcações '[[PAGINA N]]' indicando o início de cada página.",
      "Identifique os capítulos/seções do livro e devolva, pra cada um: título, página de início, página de fim,",
      "e o índice (base 0) da matéria mais provável dentre a lista de matérias disponíveis — ou -1 se nenhuma bater.",
      "",
      "Matérias disponíveis:",
      ...materiasDisponiveis.map((m, i) => `${i}. ${m.Nome}`),
      "",
      "Texto do livro:",
      textoComNumerosDePagina.slice(0, MAX_CARACTERES_ENTRADA),
    ].join("\n");

    const resposta = await getGeminiProvider().gerarEstruturado<SumarioResposta>(prompt, SUMARIO_SCHEMA, "cheio");

    return (resposta.capitulos ?? [])
      .filter((c) => c.titulo && Number.isInteger(c.paginaInicio) && Number.isInteger(c.paginaFim))
      .map((c) => ({
        Titulo: c.titulo,
        PaginaInicio: c.paginaInicio,
        PaginaFim: c.paginaFim,
        MateriaGUID:
          Number.isInteger(c.materiaIndice) && c.materiaIndice >= 0 && c.materiaIndice < materiasDisponiveis.length
            ? materiasDisponiveis[c.materiaIndice].MateriaGUID
            : null,
      }));
  };
}

let instanciaSingleton: SumarioLivroAgent | null = null;

export function getSumarioLivroAgent(): SumarioLivroAgent {
  if (!instanciaSingleton) {
    instanciaSingleton = new SumarioLivroAgent();
  }
  return instanciaSingleton;
}
