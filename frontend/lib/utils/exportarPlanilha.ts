import * as XLSX from 'xlsx';

/**
 * Exporta uma lista de objetos pra um arquivo .xlsx e dispara o download no
 * navegador. As chaves de cada objeto viram o cabeçalho das colunas — pra
 * poder reimportar direto, use exatamente os mesmos nomes de coluna que
 * `colunasEsperadas`/o mapeamento de `BaseUploadPlanilha` de cada página
 * espera (ex.: 'Nome', 'CPF', 'Data de Nascimento').
 */
export function exportarParaPlanilha(dados: Record<string, any>[], nomeArquivo: string): void {
  const worksheet = XLSX.utils.json_to_sheet(dados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
  XLSX.writeFile(workbook, nomeArquivo);
}
