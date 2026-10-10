import PDFDocument from "pdfkit";
import { QuestaoBancoDTO } from "../services/questaobanco.service";

/** `**texto**` -> negrito; `![alt](url)` (imagem inline recortada do PDF original — ver
 * PraticaQuestoes.tsx no frontend) -> substituída por um placeholder de texto, já que o PDF
 * gerado aqui é só texto (pdfkit, sem download/re-embed de imagem remota). */
const TOKEN_REGEX = /\*\*(.+?)\*\*|!\[([^\]]*)\]\(([^)]+)\)/g;

/** Escreve um parágrafo aplicando negrito nos trechos `**assim**`, mantendo o resto normal —
 * usa a API `continued` do pdfkit pra concatenar trechos com fontes diferentes na mesma linha. */
function escreverComNegrito(doc: PDFKit.PDFDocument, texto: string, opcoes: PDFKit.Mixins.TextOptions = {}): void {
  const partes: { texto: string; negrito: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_REGEX.exec(texto)) !== null) {
    if (match.index > lastIndex) partes.push({ texto: texto.slice(lastIndex, match.index), negrito: false });
    if (match[1] !== undefined) {
      partes.push({ texto: match[1], negrito: true });
    } else {
      partes.push({ texto: "[Imagem]", negrito: false });
    }
    lastIndex = TOKEN_REGEX.lastIndex;
  }
  if (lastIndex < texto.length) partes.push({ texto: texto.slice(lastIndex), negrito: false });
  if (partes.length === 0) partes.push({ texto: "", negrito: false });

  partes.forEach((parte, i) => {
    doc.font(parte.negrito ? "Helvetica-Bold" : "Helvetica");
    doc.text(parte.texto, { ...opcoes, continued: i < partes.length - 1 });
  });
  doc.font("Helvetica");
}

/**
 * Gera o PDF de um simulado — lista de questões (enunciado + alternativas A-E) seguida de uma
 * página de gabarito (decisão de produto: SPEC_SIMULADOS_BANCO_QUESTOES.md item 4 — sempre com
 * gabarito no final). Só texto: `Enunciado`/`AlternativaTexto` do banco de questões não têm
 * imagem embutida de verdade (confirmado no model), só o token `![]()` acima.
 */
export function gerarPdfSimulado(questoes: QuestaoBancoDTO[]): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 56 });

  doc.font("Helvetica-Bold").fontSize(16).text("Simulado", { align: "center" });
  doc.font("Helvetica").fontSize(10).fillColor("#647268");
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} — ${questoes.length} questões`, { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(1.5);

  questoes.forEach((questao, indice) => {
    if (doc.y > 680) doc.addPage();

    doc.font("Helvetica-Bold").fontSize(12).text(`Questão ${indice + 1}`);
    doc.moveDown(0.3);
    doc.fontSize(11);
    escreverComNegrito(doc, questao.Enunciado);
    doc.moveDown(0.5);

    const alternativasOrdenadas = [...questao.Alternativas].sort((a, b) => a.AlternativaOrdem - b.AlternativaOrdem);
    alternativasOrdenadas.forEach((alt, i) => {
      const letra = String.fromCharCode(65 + i);
      doc.font("Helvetica").fontSize(11).text(`${letra}) ${alt.AlternativaTexto}`, { indent: 14 });
    });

    doc.moveDown(1.2);
  });

  doc.addPage();
  doc.font("Helvetica-Bold").fontSize(14).text("Gabarito", { align: "center" });
  doc.moveDown(1);
  doc.font("Helvetica").fontSize(11);
  questoes.forEach((questao, indice) => {
    const alternativasOrdenadas = [...questao.Alternativas].sort((a, b) => a.AlternativaOrdem - b.AlternativaOrdem);
    const indiceCorreta = alternativasOrdenadas.findIndex((a) => a.AlternativaCorreta);
    const letraCorreta = indiceCorreta >= 0 ? String.fromCharCode(65 + indiceCorreta) : "?";
    doc.text(`${indice + 1}. ${letraCorreta}`);
  });

  return doc;
}
