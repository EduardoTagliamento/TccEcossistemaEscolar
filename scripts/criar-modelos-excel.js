/**
 * Script para criar modelos de planilhas Excel (.xlsx)
 * para importação de dados em massa no sistema
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Diretório onde os modelos serão salvos
const MODELOS_DIR = path.join(__dirname, '..', 'frontend', 'public', 'modelos');

// Garantir que o diretório existe
if (!fs.existsSync(MODELOS_DIR)) {
  fs.mkdirSync(MODELOS_DIR, { recursive: true });
}

/**
 * Cria um arquivo Excel com colunas específicas
 */
function criarModeloExcel(nomeArquivo, colunas, dadosExemplo = []) {
  // Criar workbook
  const wb = XLSX.utils.book_new();
  
  // Criar array de dados com header e exemplos
  const dados = [colunas, ...dadosExemplo];
  
  // Converter para worksheet
  const ws = XLSX.utils.aoa_to_sheet(dados);
  
  // Definir largura das colunas
  const maxLengths = colunas.map((col, i) => {
    const colValues = dados.map(row => row[i] || '');
    return Math.max(...colValues.map(val => String(val).length));
  });
  
  ws['!cols'] = maxLengths.map(len => ({ wch: Math.max(len + 2, 15) }));
  
  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
  
  // Salvar arquivo
  const caminhoCompleto = path.join(MODELOS_DIR, nomeArquivo);
  XLSX.writeFile(wb, caminhoCompleto);
  
  console.log(`✅ Criado: ${nomeArquivo}`);
}

// ==================== MODELOS ====================

// 1. Modelo de Cursos
criarModeloExcel(
  'modelo-cursos.xlsx',
  ['Nome do Curso'],
  [
    ['Técnico em Informática'],
    ['Técnico em Enfermagem'],
    ['Técnico em Administração']
  ]
);

// 2. Modelo de Matérias
criarModeloExcel(
  'modelo-materias.xlsx',
  ['Nome da Matéria', 'Nome do Curso', 'É Técnica'],
  [
    ['Matemática', '', 'false'],
    ['Português', '', 'false'],
    ['Programação Web', 'Técnico em Informática', 'true']
  ]
);

// 3. Modelo de Turmas
criarModeloExcel(
  'modelo-turmas.xlsx',
  ['Série', 'Nome da Turma', 'Nome do Curso', 'É Técnica'],
  [
    ['1º Ano', 'A', '', 'false'],
    ['1º Ano', 'B', '', 'false'],
    ['1º Ano', 'Informática', 'Técnico em Informática', 'true']
  ]
);

// 4. Modelo de Alunos
criarModeloExcel(
  'modelo-alunos.xlsx',
  ['CPF', 'Nome Completo', 'Email', 'Telefone', 'Data de Nascimento', 'Série da Turma', 'Nome da Turma'],
  [
    ['12345678901', 'João Silva', 'joao@email.com', '11999999999', '2005-03-15', '1º Ano', 'A'],
    ['98765432100', 'Maria Santos', 'maria@email.com', '11988888888', '2005-07-20', '1º Ano', 'A']
  ]
);

// 5. Modelo de Professores
criarModeloExcel(
  'modelo-professores.xlsx',
  ['CPF', 'Nome Completo', 'Email', 'Telefone', 'Data de Nascimento'],
  [
    ['11122233344', 'Prof. Carlos Oliveira', 'carlos@email.com', '11977777777', '1980-05-10'],
    ['55566677788', 'Profa. Ana Paula', 'ana@email.com', '11966666666', '1985-09-25']
  ]
);

console.log('\n🎉 Todos os modelos Excel foram criados com sucesso!');
console.log(`📂 Localização: ${MODELOS_DIR}`);
