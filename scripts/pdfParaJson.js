// Extrai o texto de cada página de um PDF DIRETO do arquivo (sem IA/OCR) + detecta e recorta cada
// imagem raster embutida (sem linha decorativa), retornando uma hierarquia capítulo > páginas:
// { capitulos: [{ indice, arquivo, paginaInicio, paginaFim, paginas: [{ numero, texto, caracteres,
// titulos, cabecalhoRodape, possivelTabela, possivelFormula, imagens }] }] } — sem `opcoes.capitulos`
// (ver abaixo), sai como 1 capítulo só cobrindo o PDF inteiro.
//
// Algoritmo validado no projeto "ivros" (extração em lote de ~50 livros didáticos reais, com
// revisão de qualidade manual) — ver `F:\Area de Trabalho\ivros\scripts\processar_conteudo_livro.js`,
// de onde este arquivo foi portado. Principais decisões de design (todas confirmadas com casos
// reais, não teóricas):
//
// - `montarTexto`: junta itens de texto olhando a distância real entre eles (gap horizontal e
//   salto de linha), em vez de sempre inserir espaço fixo — corrige capitular decorativa virando
//   "S ubstantivo" em vez de "Substantivo", e "Cl" (cloro) virando "C L".
// - `corrigirGlifosConhecidos`: um item de texto isolado igual a "y" pode na verdade ser o
//   marcador de lista "•" — fonte customizada embutida no PDF reaproveita esse slot Unicode. Só
//   aplica em página SEM fórmula (confirmado: em página de fórmula, "y" pode ser variável
//   matemática de verdade — página de fórmula já é candidata a revisão visual de qualquer jeito).
// - `analisarLayoutPagina`: heurística de posição (não da string já concatenada) pra sinalizar
//   página provável de TABELA (3+ blocos com gap horizontal grande na mesma linha) ou FÓRMULA
//   (muitos itens pequenos/curtos — subscrito/sobrescrito) — nesses casos a leitura linear do
//   texto tende a embaralhar a ordem, então a página é candidata a revisão visual em vez de
//   confiar direto no texto extraído.
// - `detectarTitulos`: título usa fonte DIFERENTE da fonte de corpo dominante da página E tamanho
//   maior (>=1pt) — só checar o nome da fonte pega negrito/itálico do corpo (ex. "Faça os
//   exercícios...") como falso título. Gap vertical entre linhas do título escala com o tamanho da
//   fonte (título grande tem entrelinha maior). Descarta título sem nenhuma letra (caixa de
//   resposta/linha pontilhada renderizada em fonte grande, ex. "( ) ( ) ( )").
// - `agruparImagens`: um ícone pequeno repetido dezenas de vezes lado a lado (diagrama tipo grid)
//   vira uma paintImageXObject por repetição — sem agrupar bounding boxes próximas/sobrepostas
//   antes do filtro de tamanho mínimo, isso virava dezenas de recortes minúsculos em vez de 1 só.
// - Cabeçalho/rodapé: 2 passadas — 1ª coleta candidatos (itens nos 10% superior/inferior da
//   página, em espaço PDF), 2ª só confirma como boilerplate de verdade o que se repete em >=30%
//   das páginas do documento (evita cortar texto legítimo que só coincidentemente ficou perto da
//   margem em 1 página).
//
// Uso como CLI: node scripts/pdfParaJson.js <caminho.pdf> [--paginas-img <pasta>] [--saida <arquivo.json>]
//   --paginas-img: pasta com 1 JPG por página já renderizada (nome `pagina-0001.jpg`, etc., escala
//                  1.5) — OPCIONAL; sem isso, imagens são detectadas (posição/tamanho) mas não
//                  recortadas pra arquivo (o campo `imagens` ainda descreve onde elas estão).
//   --saida: caminho do JSON de saída (default: <nome-do-pdf>.json ao lado do PDF).
//
// Uso como módulo: const { converterPdfParaJson } = require("./pdfParaJson");
//   const { paginas, totalImagensRecortadas } = await converterPdfParaJson(caminhoPdf, { pastaPaginasImg, pastaSaidaRecortes });

const fs = require("fs");
const path = require("path");

let sharp = null;
try {
  sharp = require("sharp");
} catch {
  // sharp é opcional — só é usado se `pastaPaginasImg` for informado (pra recortar imagens de verdade)
}

const ESCALA_PADRAO = 1.5; // precisa bater com a escala usada pra renderizar `pastaPaginasImg`
const TAMANHO_MINIMO_PX = 20; // filtra imagem-linha decorativa (traço esticado, ex. sublinhado)
const GAP_AGRUPAMENTO_PX = 15;

function corrigirGlifosConhecidos(items) {
  return items.map((it) => (it.str === "y" ? { ...it, str: "•" } : it));
}

function montarTexto(items) {
  let resultado = "";
  let anterior = null;
  for (const it of items) {
    if (!it.str) continue;
    if (anterior && it.transform && anterior.transform) {
      const mudouLinha = Math.abs(it.transform[5] - anterior.transform[5]) > (anterior.height || 10) * 0.5;
      if (mudouLinha) {
        resultado += " ";
      } else {
        const fimAnterior = anterior.transform[4] + (anterior.width || 0);
        const gap = it.transform[4] - fimAnterior;
        if (gap > (anterior.height || 10) * 0.2) resultado += " ";
      }
    } else if (resultado) {
      resultado += " ";
    }
    resultado += it.str;
    anterior = it;
  }
  return resultado.replace(/\s+/g, " ").trim();
}

function multiplicar(m1, m2) {
  return [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5],
  ];
}

function aplicar(ponto, m) {
  return [ponto[0] * m[0] + ponto[1] * m[2] + m[4], ponto[0] * m[1] + ponto[1] * m[3] + m[5]];
}

function sobrepoeOuPerto(a, b, gap) {
  return !(
    a.left - gap > b.left + b.width ||
    b.left - gap > a.left + a.width ||
    a.top - gap > b.top + b.height ||
    b.top - gap > a.top + a.height
  );
}

function unirCaixas(a, b) {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.left + a.width, b.left + b.width);
  const bottom = Math.max(a.top + a.height, b.top + b.height);
  return { left, top, width: right - left, height: bottom - top };
}

function agruparImagens(imagens, gap = GAP_AGRUPAMENTO_PX) {
  let grupos = imagens.map((im) => ({ ...im }));
  let mudou = true;
  while (mudou) {
    mudou = false;
    outer: for (let i = 0; i < grupos.length; i++) {
      for (let j = i + 1; j < grupos.length; j++) {
        if (sobrepoeOuPerto(grupos[i], grupos[j], gap)) {
          grupos[i] = unirCaixas(grupos[i], grupos[j]);
          grupos.splice(j, 1);
          mudou = true;
          break outer;
        }
      }
    }
  }
  return grupos;
}

function analisarLayoutPagina(items) {
  const validos = items.filter((it) => it.str.trim() !== "" && it.transform);
  if (validos.length === 0) return { possivelTabela: false, possivelFormula: false };

  const alturas = validos.map((it) => it.height).filter((h) => h > 0).sort((a, b) => a - b);
  const alturaMediana = alturas[Math.floor(alturas.length / 2)] || 0;

  const itensPequenos = validos.filter((it) => it.height > 0 && it.height < alturaMediana * 0.75).length;
  const itensCurtos = validos.filter((it) => it.str.trim().length <= 2).length;
  const possivelFormula = alturaMediana > 0 && (itensPequenos / validos.length > 0.15 || itensCurtos / validos.length > 0.35);

  const porLinha = new Map();
  for (const it of validos) {
    const y = Math.round(it.transform[5] / 8) * 8;
    if (!porLinha.has(y)) porLinha.set(y, []);
    porLinha.get(y).push(it.transform[4]);
  }
  let linhasComVariasColunas = 0;
  for (const xs of porLinha.values()) {
    xs.sort((a, b) => a - b);
    let colunas = 1;
    for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > 40) colunas++;
    if (colunas >= 3) linhasComVariasColunas++;
  }
  const possivelTabela = linhasComVariasColunas >= 3;

  return { possivelTabela, possivelFormula };
}

function detectarTitulos(items) {
  const validos = items.filter((it) => it.str.trim() !== "");
  if (validos.length === 0) return [];

  const charsPorFonte = new Map();
  for (const it of validos) {
    charsPorFonte.set(it.fontName, (charsPorFonte.get(it.fontName) || 0) + it.str.length);
  }
  const fonteDominante = [...charsPorFonte.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  let tamanhoDominante = 0;
  for (const it of validos) {
    if (it.fontName === fonteDominante) tamanhoDominante = Math.max(tamanhoDominante, Math.abs(it.transform?.[3] || 0));
  }
  const MARGEM_TAMANHO_TITULO = 1;

  const LIMITE_TITULO = 80;
  const GAP_Y_MAXIMO_BASE = 20;

  const titulos = [];
  let grupoAtual = [];
  let comprimentoAtual = 0;
  let ultimoY = null;
  for (const it of validos) {
    const y = it.transform ? it.transform[5] : null;
    const tamanho = Math.abs(it.transform?.[3] || 0);
    const gapMaximo = Math.max(GAP_Y_MAXIMO_BASE, tamanho * 1.5);
    const pertoDoAnterior = ultimoY === null || y === null || Math.abs(y - ultimoY) <= gapMaximo;
    const candidato =
      it.fontName !== fonteDominante && tamanho >= tamanhoDominante + MARGEM_TAMANHO_TITULO && it.str.trim().length >= 1;

    if (candidato && pertoDoAnterior && comprimentoAtual < LIMITE_TITULO) {
      grupoAtual.push(it);
      comprimentoAtual += it.str.length;
      ultimoY = y;
    } else {
      if (grupoAtual.length > 0) titulos.push(montarTexto(grupoAtual));
      grupoAtual = candidato ? [it] : [];
      comprimentoAtual = candidato ? it.str.length : 0;
      ultimoY = candidato ? y : null;
    }
  }
  if (grupoAtual.length > 0) titulos.push(montarTexto(grupoAtual));
  return titulos.filter((t) => t.length >= 3 && t.length <= LIMITE_TITULO && /\p{L}/u.test(t));
}

function normalizarBorda(texto) {
  return texto.replace(/\d+/g, "#").trim();
}

/** `capitulos`: array opcional de `{arquivo, paginaInicio, paginaFim}` (1-indexado, inclusive), na
 * ordem de leitura — útil quando o PDF foi montado a partir de fragmentos por capítulo e o caller
 * já sabe essa fronteira (ex.: `unificar_capitulos.js` do projeto "ivros" persiste isso como
 * `<nome>.capitulos.json` ao lado do PDF unificado). Sem isso, o resultado sai com 1 capítulo só,
 * cobrindo o PDF inteiro.
 *
 * Hierarquia livro > capítulo > páginas (em vez de lista linear de página com um campo `capitulo`
 * repetido em cada uma) — mais barato pra IA consumir 1 capítulo por vez: sem escanear o livro
 * inteiro filtrando por índice, sem repetir metadado de capítulo página a página. */
function agruparPorCapitulo(paginas, capitulos, caminhoPdf) {
  if (!capitulos) {
    return [{ indice: 1, arquivo: path.basename(caminhoPdf), paginaInicio: 1, paginaFim: paginas.length, paginas }];
  }
  return capitulos.map((c, i) => ({
    indice: i + 1,
    arquivo: c.arquivo,
    paginaInicio: c.paginaInicio,
    paginaFim: c.paginaFim,
    paginas: paginas.filter((p) => p.numero >= c.paginaInicio && p.numero <= c.paginaFim),
  }));
}

/**
 * @param {string} caminhoPdf
 * @param {object} [opcoes]
 * @param {string} [opcoes.pastaPaginasImg] pasta com `pagina-0001.jpg`, etc. (escala `opcoes.escala`) — se omitido, imagens não são recortadas pra arquivo, só descritas (posição/tamanho) no JSON.
 * @param {string} [opcoes.pastaSaidaRecortes] pasta onde salvar os recortes de imagem (default: `<pastaPaginasImg>/../recortes`)
 * @param {number} [opcoes.escala] escala usada pra renderizar `pastaPaginasImg` (default 1.5)
 * @param {Array} [opcoes.capitulos] ver `agruparPorCapitulo` acima
 */
async function converterPdfParaJson(caminhoPdf, opcoes = {}) {
  const { getDocument, OPS } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const escala = opcoes.escala || ESCALA_PADRAO;
  const pastaPaginasImg = opcoes.pastaPaginasImg || null;
  const pastaSaidaRecortes = opcoes.pastaSaidaRecortes || (pastaPaginasImg ? path.join(pastaPaginasImg, "..", "recortes") : null);
  if (pastaSaidaRecortes) fs.mkdirSync(pastaSaidaRecortes, { recursive: true });

  const data = new Uint8Array(fs.readFileSync(caminhoPdf));
  const doc = await getDocument({ data }).promise;

  const paginasBrutas = [];
  let totalImagensRecortadas = 0;

  for (let numero = 1; numero <= doc.numPages; numero++) {
    const pagina = await doc.getPage(numero);

    const conteudoTexto = await pagina.getTextContent();
    const { possivelTabela, possivelFormula } = analisarLayoutPagina(conteudoTexto.items);
    if (!possivelFormula) {
      conteudoTexto.items = corrigirGlifosConhecidos(conteudoTexto.items);
    }

    const [, y0, , y1] = pagina.view;
    const alturaPdf = y1 - y0;
    const faixa = alturaPdf * 0.1;
    const itensBorda = conteudoTexto.items.filter(
      (it) => it.str.trim() !== "" && it.transform && (it.transform[5] - y0 < faixa || y1 - it.transform[5] < faixa)
    );

    const viewport = pagina.getViewport({ scale: escala });
    const opList = await pagina.getOperatorList();
    let ctm = [1, 0, 0, 1, 0, 0];
    const pilha = [];
    const imagensDetectadas = [];

    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      const opArgs = opList.argsArray[i];
      if (fn === OPS.save) {
        pilha.push(ctm);
      } else if (fn === OPS.restore) {
        ctm = pilha.pop() || [1, 0, 0, 1, 0, 0];
      } else if (fn === OPS.transform) {
        ctm = multiplicar(opArgs, ctm);
      } else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
        const cantosPdf = [[0, 0], [1, 0], [1, 1], [0, 1]].map((p) => aplicar(p, ctm));
        const cantosPixel = cantosPdf.map((p) => aplicar(p, viewport.transform));
        const xs = cantosPixel.map((p) => p[0]);
        const ys = cantosPixel.map((p) => p[1]);
        imagensDetectadas.push({
          left: Math.round(Math.min(...xs)),
          top: Math.round(Math.min(...ys)),
          width: Math.round(Math.max(...xs) - Math.min(...xs)),
          height: Math.round(Math.max(...ys) - Math.min(...ys)),
        });
      }
    }

    const imagensAgrupadas = agruparImagens(imagensDetectadas);
    const imagensReais = imagensAgrupadas.filter((im) => im.width >= TAMANHO_MINIMO_PX && im.height >= TAMANHO_MINIMO_PX);
    const imagensSalvas = [];
    const caminhoPaginaJpg = pastaPaginasImg ? path.join(pastaPaginasImg, `pagina-${String(numero).padStart(4, "0")}.jpg`) : null;

    if (imagensReais.length > 0 && caminhoPaginaJpg && sharp && fs.existsSync(caminhoPaginaJpg)) {
      const meta = await sharp(caminhoPaginaJpg).metadata();
      for (let k = 0; k < imagensReais.length; k++) {
        const im = imagensReais[k];
        const left = Math.max(0, im.left);
        const top = Math.max(0, im.top);
        const width = Math.min(im.width, meta.width - left);
        const height = Math.min(im.height, meta.height - top);
        if (width <= 0 || height <= 0) continue;
        const nomeRecorte = `pagina-${String(numero).padStart(4, "0")}-img${k}.jpg`;
        try {
          await sharp(caminhoPaginaJpg).extract({ left, top, width, height }).toFile(path.join(pastaSaidaRecortes, nomeRecorte));
          imagensSalvas.push({ arquivo: `recortes/${nomeRecorte}`, left, top, width, height });
          totalImagensRecortadas++;
        } catch {
          // recorte inválido (raro, geometria degenerada) — só ignora essa imagem específica
        }
      }
    } else {
      for (const im of imagensReais) imagensSalvas.push({ arquivo: null, ...im });
    }

    paginasBrutas.push({
      numero,
      itemsTexto: conteudoTexto.items,
      itensBorda,
      possivelTabela,
      possivelFormula,
      imagens: imagensSalvas,
    });
  }

  const contagemBorda = new Map();
  for (const p of paginasBrutas) {
    const vistosNaPagina = new Set();
    for (const it of p.itensBorda) {
      const chave = normalizarBorda(it.str);
      if (!chave || vistosNaPagina.has(chave)) continue;
      vistosNaPagina.add(chave);
      contagemBorda.set(chave, (contagemBorda.get(chave) || 0) + 1);
    }
  }
  const limiteConfirmar = Math.max(2, Math.ceil(paginasBrutas.length * 0.3));
  // Marcador de alternativa de questão (ex.: "(d)", "e)", "C.") nunca é cabeçalho/rodapé de
  // verdade — em livro denso de questões (coletânea de vestibular), é ESPERADO que a última
  // alternativa da última questão de várias páginas caia perto da margem inferior por coincidência
  // de layout; sem essa exclusão isso "confirma" (d)/(e) como boilerplate e apaga alternativas de
  // questões no meio do texto em qualquer página do livro.
  const PADRAO_ALTERNATIVA = /^\(?[a-eA-E]\)?\.?$/;
  const padroesConfirmados = new Set(
    [...contagemBorda.entries()]
      .filter(([chave, n]) => n >= limiteConfirmar && !PADRAO_ALTERNATIVA.test(chave))
      .map(([chave]) => chave)
  );

  const paginas = paginasBrutas.map((p) => {
    // Remove por IDENTIDADE do item (não por valor da string) — um item que por coincidência caiu
    // perto da margem em 1 página não pode apagar TODAS as ocorrências dessa mesma string na
    // página inteira.
    const itensBordaConfirmados = p.itensBorda.filter((it) => padroesConfirmados.has(normalizarBorda(it.str)));
    const setBordaConfirmados = new Set(itensBordaConfirmados);
    const itemsSemBorda = p.itemsTexto.filter((it) => !setBordaConfirmados.has(it));
    const textoCompleto = montarTexto(itemsSemBorda);
    const titulos = detectarTitulos(itemsSemBorda);

    return {
      numero: p.numero,
      texto: textoCompleto,
      caracteres: textoCompleto.length,
      titulos,
      cabecalhoRodape: [...new Set(itensBordaConfirmados.map((it) => it.str))],
      possivelTabela: p.possivelTabela,
      possivelFormula: p.possivelFormula,
      imagens: p.imagens,
    };
  });

  const capitulos = agruparPorCapitulo(paginas, opcoes.capitulos, caminhoPdf);

  return { capitulos, totalImagensRecortadas };
}

async function cli() {
  const args = process.argv.slice(2);
  const caminhoPdf = args[0];
  if (!caminhoPdf || caminhoPdf.startsWith("--")) {
    console.error("Uso: node scripts/pdfParaJson.js <caminho.pdf> [--paginas-img <pasta>] [--saida <arquivo.json>] [--capitulos <arquivo.json>]");
    process.exit(1);
  }
  function argValor(nome) {
    const i = args.indexOf(nome);
    return i >= 0 ? args[i + 1] : null;
  }
  const pastaPaginasImg = argValor("--paginas-img");
  const saida = argValor("--saida") || caminhoPdf.replace(/\.pdf$/i, ".json");
  const caminhoCapitulos = argValor("--capitulos");
  const capitulos = caminhoCapitulos ? JSON.parse(fs.readFileSync(caminhoCapitulos, "utf8")) : null;

  const inicio = Date.now();
  const { capitulos: capitulosComPaginas, totalImagensRecortadas } = await converterPdfParaJson(caminhoPdf, { pastaPaginasImg, capitulos });
  const totalPaginas = capitulosComPaginas.reduce((soma, c) => soma + c.paginas.length, 0);
  fs.writeFileSync(saida, JSON.stringify({ arquivo: path.basename(caminhoPdf), totalPaginas, capitulos: capitulosComPaginas }, null, 1));
  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
  console.log(`OK: ${totalPaginas} páginas (${capitulosComPaginas.length} capítulo(s)), ${totalImagensRecortadas} imagem(ns) recortada(s) em ${segundos}s -> ${saida}`);
}

if (require.main === module) {
  cli().catch((e) => {
    console.error("Falha:", e);
    process.exit(1);
  });
}

module.exports = { converterPdfParaJson };
