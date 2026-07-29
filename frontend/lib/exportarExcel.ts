'use client';

/**
 * Exportação genérica de linhas pra planilha .xlsx, client-side (biblioteca
 * `xlsx` já é dependência do projeto — usada hoje só pra leitura de upload
 * em BaseUploadPlanilha.tsx, essa é a primeira escrita).
 */

import * as XLSX from 'xlsx';

export function exportarParaExcel(
  nomeArquivo: string,
  nomeAba: string,
  linhas: Record<string, string | number | null>[]
): void {
  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, nomeAba.slice(0, 31)); // limite de 31 caracteres do Excel pro nome da aba
  XLSX.writeFile(livro, `${nomeArquivo}.xlsx`);
}
