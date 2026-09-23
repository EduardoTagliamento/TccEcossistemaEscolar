// Extrai titulo de capitulo parseando a pagina de Sumario do livro (texto
// bruto ja extraido, sem IA) — muito mais confiavel que tentar adivinhar
// pelo cabecalho de pagina espalhado pelo capitulo (ver conversa: regex
// heuristica em cima de titulos de pagina quebrava caso a caso).
// So gera e imprime pra revisao humana -- nao insere nada no banco ainda.
const fs = require('fs');

const PASTA = 'F:/Area de Trabalho/ivros/conteudo_livro/';

const MATERIA = {
  ARTES: '87d58ad2-e627-4b3b-b0f5-2330bb15196a',
  FILOSOFIA_SOCIOLOGIA: 'f07c5664-1bb7-4bbc-a2fb-97f7fd96c62a',
  HISTORIA: '71493499-76ab-4b61-8530-72a7872ca596',
  LINGUA_INGLESA: 'e574d4b4-e1d1-4b02-9e6f-4edf62e674cc',
  LINGUA_PORTUGUESA: '45487cbe-6c75-434e-b8ee-353f383648e4',
  LITERATURA: '4bbc8d7b-949c-4ebb-9d8a-d12b7a3dff3f',
  REDACAO_LEITURA: 'd126c916-d415-47ac-8d54-22ce04c5e862',
};

const LIVROS = [
  { arquivo: 'PV_Arte_LU', guid: '6ef4c18f-10b8-428e-a469-cf3874430dbe', materiaFixa: MATERIA.ARTES },
  { arquivo: 'PV_Filosofia_LU', guid: '1c2704fd-305a-43bc-bdb5-6bba60e4fc94', materiaFixa: MATERIA.FILOSOFIA_SOCIOLOGIA },
  { arquivo: 'PV_Sociologia_LU', guid: '53e5976e-bd24-4112-8efc-0c6822e9e89f', materiaFixa: MATERIA.FILOSOFIA_SOCIOLOGIA },
  { arquivo: 'PV_Historia_L1', guid: '107ef824-5042-4772-bde4-d37acddb7067', materiaFixa: MATERIA.HISTORIA },
  { arquivo: 'PV_Historia_L2', guid: 'b170409f-e192-4e8a-9d80-b09554245554', materiaFixa: MATERIA.HISTORIA },
  { arquivo: 'PV_Historia_L3', guid: '0dfc6333-5b2e-4e17-b6a6-4f9165cd4d71', materiaFixa: MATERIA.HISTORIA },
  { arquivo: 'PV_Historia_L4', guid: 'afc61d76-55a2-47b9-a38c-7d58ed47ac4c', materiaFixa: MATERIA.HISTORIA },
  { arquivo: 'PV_Lingua_Inglesa_L1', guid: '18fe7e96-0098-4374-82f6-881f59c3c281', materiaFixa: MATERIA.LINGUA_INGLESA },
  { arquivo: 'PV_Lingua_Inglesa_L2', guid: '86aa79d1-ec59-449d-b296-bd1d93ff5f64', materiaFixa: MATERIA.LINGUA_INGLESA },
  { arquivo: 'PV_Lingua_Portuguesa_Interp_Texto_LU', guid: 'd53e0aed-1359-4b3c-a9af-62bad76a1db4', materiaFixa: MATERIA.LINGUA_PORTUGUESA },
  { arquivo: 'PV_Lingua_Portuguesa_Prod_Texto_LU', guid: '93fd9b81-a008-4aa0-99dd-c990c32a5511', materiaFixa: MATERIA.REDACAO_LEITURA },
  { arquivo: 'PV_Lingua_Portuguesa_Gramatica_e_Literatura_L1', guid: '84976c05-b509-4508-9717-e275b1b9fb18', materiaPorFrente: true },
  { arquivo: 'PV_Lingua_Portuguesa_Gramatica_e_Literatura_L2', guid: '4fe1a01c-85c5-4bda-b76b-4fa7b071c701', materiaPorFrente: true },
  { arquivo: 'PV_Lingua_Portuguesa_Gramatica_e_Literatura_L3', guid: '1f293fdc-61e1-4860-aca9-cf3783e3077b', materiaPorFrente: true },
  { arquivo: 'PV_Lingua_Portuguesa_Gramatica_e_Literatura_L4', guid: '86a1764c-de56-463f-b195-c7c625e6514e', materiaPorFrente: true },
];

/** Acha as paginas do "front matter" (indice 0 do array de capitulos tecnico) e concatena o texto em ordem. */
function textoDoSumario(livroData) {
  const frontMatter = livroData.capitulos[0];
  return frontMatter.paginas.map((p) => p.texto || '').join(' \n ');
}

/** Extrai pares (titulo, paginaInicio) do texto do sumario via o padrao "N Titulo ........ pagina". */
function parseSumario(texto) {
  const entradas = [];
  // Uma entrada real de sumario e "N Titulo <preenchimento> pagina" — o
  // preenchimento e um run longo de caracteres repetidos (pontos "....." ou,
  // em alguns livros, outro leader Unicode que nao decodificou certo, tipo
  // "�"). Um subtopico da lista (ex.: "Revisando, 11") NUNCA tem esse run
  // longo — so virgula+numero. Por isso ancora no run de preenchimento (nao
  // no digito inicial), e limita o titulo a nao atravessar virgula nem
  // passar de 120 chars, pra nao "vazar" pro subtopico anterior.
  const regex = /([^,\n]{3,120}?)\s*([^\w\s,]{5,})\s*(\d{1,3})\b/gu;
  let m;
  while ((m = regex.exec(texto))) {
    let titulo = m[1].trim().replace(/^Sum[aá]rio\s+/i, '');
    // remove numero(s) soltos e/ou marcador "Frente N" no inicio, em loop —
    // pode ter mais de uma combinacao (ex.: "13 2 Arte da Pré-História": 13
    // e a pagina que sobrou do subtopico anterior, 2 e o numero real do
    // capitulo; ou "22 Frente 2 1 História": pagina sobrando + marcador de
    // frente + numero do capitulo).
    while (/^(\d+\s+|Frente\s+\S+\s+)/i.test(titulo)) {
      titulo = titulo.replace(/^(\d+\s+|Frente\s+\S+\s+)/i, '');
    }
    const pagina = Number(m[3]);
    if (titulo.length >= 3 && pagina > 0) entradas.push({ titulo, pagina });
  }
  return entradas;
}

function detectarFrenteNoTitulo(textoAntes) {
  const m = /FRENTE\s*(\d+)/gi.exec(textoAntes);
  return m ? Number(m[1]) : null;
}

const resultado = [];
for (const livro of LIVROS) {
  const data = JSON.parse(fs.readFileSync(PASTA + livro.arquivo + '.json', 'utf8'));
  const textoSumario = textoDoSumario(data);
  const entradas = parseSumario(textoSumario);

  // pra saber a Frente de cada entrada (pros livros Gramatica/Literatura),
  // olha o texto do sumario ANTES da posicao dessa entrada e pega a ultima "FRENTE N"
  let frenteAtual = 1;
  const entradasComFrente = [];
  let cursor = 0;
  for (const entrada of entradas) {
    const idx = textoSumario.indexOf(entrada.titulo, cursor);
    const trechoAntes = textoSumario.slice(Math.max(0, idx - 30), idx);
    const frenteDetectada = detectarFrenteNoTitulo(trechoAntes);
    if (frenteDetectada) frenteAtual = frenteDetectada;
    entradasComFrente.push({ ...entrada, frente: frenteAtual });
    cursor = idx + entrada.titulo.length;
  }

  // alinha em ordem com data.capitulos (pulando o front matter, indice 0)
  const capitulosReais = data.capitulos.slice(1);
  const capitulosProcessados = [];
  const avisos = [];

  capitulosReais.forEach((cap, i) => {
    const entrada = entradasComFrente[i];
    let materiaGUID = livro.materiaFixa;
    if (livro.materiaPorFrente) {
      materiaGUID = entrada?.frente === 2 ? MATERIA.LITERATURA : MATERIA.LINGUA_PORTUGUESA;
    }
    if (!entrada) {
      avisos.push(`capitulo ${i} (pags ${cap.paginaInicio}-${cap.paginaFim}) sem entrada correspondente no sumario`);
      capitulosProcessados.push({ titulo: `(SEM TÍTULO — pags ${cap.paginaInicio}-${cap.paginaFim})`, paginaInicio: cap.paginaInicio, paginaFim: cap.paginaFim, materiaGUID, materia: Object.keys(MATERIA).find(k=>MATERIA[k]===materiaGUID) });
      return;
    }
    if (entrada.pagina !== cap.paginaInicio) {
      avisos.push(`capitulo ${i}: sumario diz pagina ${entrada.pagina}, chunking diz ${cap.paginaInicio} (titulo: "${entrada.titulo}")`);
    }
    capitulosProcessados.push({
      titulo: entrada.titulo,
      paginaInicio: cap.paginaInicio,
      paginaFim: cap.paginaFim,
      materiaGUID,
      materia: Object.keys(MATERIA).find((k) => MATERIA[k] === materiaGUID),
    });
  });

  resultado.push({ arquivo: livro.arquivo, guid: livro.guid, totalPaginas: data.totalPaginas, capitulos: capitulosProcessados, avisos });
}

for (const livro of resultado) {
  console.log(`\n=== ${livro.arquivo} (${livro.totalPaginas} pgs, ${livro.capitulos.length} capítulos) ===`);
  for (const cap of livro.capitulos) {
    console.log(`  [${cap.paginaInicio}-${cap.paginaFim}] (${cap.materia}) ${cap.titulo}`);
  }
  if (livro.avisos.length) {
    console.log('  !! AVISOS:');
    livro.avisos.forEach((a) => console.log('    - ' + a));
  }
}

fs.writeFileSync('capitulos-extraidos.json', JSON.stringify(resultado, null, 2));
console.log('\n\nSalvo em capitulos-extraidos.json pra inserir depois da revisão.');
