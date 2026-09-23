// Extrai titulo de capitulo via Gemini (tier leve) pros 5 livros que a
// regex do sumario nao conseguiu alinhar direito (perdia uma entrada perto
// de uma segunda secao "Frente" no meio do livro). So gera e imprime pra
// revisao -- nao insere nada no banco ainda.
import fs from "node:fs";
import { GoogleGenAI, Type } from "@google/genai";

const PASTA = "F:/Area de Trabalho/ivros/conteudo_livro/";

const MATERIA: Record<string, string> = {
  HISTORIA: "71493499-76ab-4b61-8530-72a7872ca596",
  LINGUA_PORTUGUESA: "45487cbe-6c75-434e-b8ee-353f383648e4",
  LITERATURA: "4bbc8d7b-949c-4ebb-9d8a-d12b7a3dff3f",
};

const LIVROS = [
  { arquivo: "PV_Historia_L1", guid: "107ef824-5042-4772-bde4-d37acddb7067", materiaFixa: MATERIA.HISTORIA },
  { arquivo: "PV_Historia_L4", guid: "afc61d76-55a2-47b9-a38c-7d58ed47ac4c", materiaFixa: MATERIA.HISTORIA },
  { arquivo: "PV_Lingua_Portuguesa_Gramatica_e_Literatura_L1", guid: "84976c05-b509-4508-9717-e275b1b9fb18", materiaPorFrente: true },
  { arquivo: "PV_Lingua_Portuguesa_Gramatica_e_Literatura_L2", guid: "4fe1a01c-85c5-4bda-b76b-4fa7b071c701", materiaPorFrente: true },
  { arquivo: "PV_Lingua_Portuguesa_Gramatica_e_Literatura_L3", guid: "1f293fdc-61e1-4860-aca9-cf3783e3077b", materiaPorFrente: true },
];

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    capitulos: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          numero: { type: Type.INTEGER },
          titulo: { type: Type.STRING },
          paginaInicio: { type: Type.INTEGER },
          frente: { type: Type.INTEGER },
        },
        required: ["numero", "titulo", "paginaInicio", "frente"],
      },
    },
  },
  required: ["capitulos"],
};

function textoDoSumario(livroData: any): string {
  const frontMatter = livroData.capitulos[0];
  return frontMatter.paginas.map((p: any) => p.texto || "").join(" \n ");
}

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY nao configurada");
  const client = new GoogleGenAI({ apiKey });
  const modelo = process.env.GEMINI_MODEL_LEVE || "gemini-flash-lite-latest";

  const resultado: any[] = [];

  for (const livro of LIVROS) {
    const data = JSON.parse(fs.readFileSync(PASTA + livro.arquivo + ".json", "utf8"));
    const textoSumario = textoDoSumario(data);

    const prompt = [
      "O texto abaixo é o Sumário de um livro didático, extraído de PDF (pode ter erros de espaçamento/pontuação da extração).",
      "Cada capítulo real aparece como: número + título + preenchimento (pontos ou outro caractere repetido) + número de página inicial,",
      "seguido de uma lista de subtópicos (cada um com sua própria vírgula + número de página, que você deve IGNORAR).",
      'O livro pode ter mais de uma seção "Frente" (ex.: "Frente 1", "Frente 2") — a numeração dos capítulos REINICIA a cada Frente nova,',
      "mas a página segue sempre crescente. Extraia TODOS os capítulos reais em ordem (ignore a seção final \"Gabarito\", que não é capítulo).",
      "Pra cada capítulo, devolva: numero (o número local dele dentro da Frente), titulo (limpo, sem lixo de extração), paginaInicio, e frente (1 ou 2).",
      "",
      "TEXTO DO SUMÁRIO:",
      textoSumario,
    ].join("\n");

    console.log(`\nProcessando ${livro.arquivo}...`);
    const response = await client.models.generateContent({
      model: modelo,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: SCHEMA },
    });
    const parsed = JSON.parse(response.text ?? "{}");
    const capitulosIA: { numero: number; titulo: string; paginaInicio: number; frente: number }[] = parsed.capitulos ?? [];

    const capitulosReais = data.capitulos.slice(1); // pula front matter
    const avisos: string[] = [];
    const capitulosProcessados: any[] = [];

    capitulosReais.forEach((cap: any, i: number) => {
      const entrada = capitulosIA[i];
      const materiaGUID = livro.materiaPorFrente ? (entrada?.frente === 2 ? MATERIA.LITERATURA : MATERIA.LINGUA_PORTUGUESA) : livro.materiaFixa;
      if (!entrada) {
        avisos.push(`capitulo ${i} (pags ${cap.paginaInicio}-${cap.paginaFim}) sem entrada da IA`);
        capitulosProcessados.push({ titulo: `(SEM TÍTULO — pags ${cap.paginaInicio}-${cap.paginaFim})`, paginaInicio: cap.paginaInicio, paginaFim: cap.paginaFim, materiaGUID });
        return;
      }
      if (entrada.paginaInicio !== cap.paginaInicio) {
        avisos.push(`capitulo ${i}: IA diz pagina ${entrada.paginaInicio}, chunking diz ${cap.paginaInicio} (titulo: "${entrada.titulo}")`);
      }
      capitulosProcessados.push({ titulo: entrada.titulo, paginaInicio: cap.paginaInicio, paginaFim: cap.paginaFim, materiaGUID });
    });

    resultado.push({ arquivo: livro.arquivo, guid: livro.guid, totalPaginas: data.totalPaginas, capitulos: capitulosProcessados, avisos });
  }

  for (const livro of resultado) {
    console.log(`\n=== ${livro.arquivo} (${livro.totalPaginas} pgs, ${livro.capitulos.length} capítulos) ===`);
    for (const cap of livro.capitulos) {
      const materiaNome = Object.keys(MATERIA).find((k) => MATERIA[k] === cap.materiaGUID);
      console.log(`  [${cap.paginaInicio}-${cap.paginaFim}] (${materiaNome}) ${cap.titulo}`);
    }
    if (livro.avisos.length) {
      console.log("  !! AVISOS:");
      livro.avisos.forEach((a: string) => console.log("    - " + a));
    }
  }

  fs.writeFileSync("capitulos-extraidos-ia.json", JSON.stringify(resultado, null, 2));
  console.log("\n\nSalvo em capitulos-extraidos-ia.json pra revisão.");
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
