# 📊 Modelos de Planilhas Excel

Este diretório contém os modelos de planilhas Excel (.xlsx) para importação em massa de dados no sistema EcossistemaEscolar.

## 📁 Arquivos Disponíveis

### ✅ Modelos Excel (Prontos para Download)

| Arquivo | Descrição | Colunas Obrigatórias |
|---------|-----------|---------------------|
| **modelo-cursos.xlsx** | Importação de cursos técnicos | Nome do Curso |
| **modelo-materias.xlsx** | Importação de matérias/disciplinas | Nome da Matéria |
| **modelo-turmas.xlsx** | Importação de turmas/classes | Série, Nome da Turma |
| **modelo-alunos.xlsx** | Importação de alunos e matrículas | CPF, Nome Completo, Série da Turma, Nome da Turma |
| **modelo-professores.xlsx** | Importação de professores | CPF, Nome Completo |

### 📋 Documentação Detalhada

Consulte os arquivos README individuais para instruções completas de preenchimento:

- [README_MODELO_CURSOS.md](./README_MODELO_CURSOS.md)
- [README_MODELO_MATERIAS.md](./README_MODELO_MATERIAS.md)
- [README_MODELO_TURMAS.md](./README_MODELO_TURMAS.md)
- [README_MODELO_ALUNOS.md](./README_MODELO_ALUNOS.md)
- [README_MODELO_PROFESSORES.md](./README_MODELO_PROFESSORES.md)

## 🔧 Como Usar os Modelos

1. **Baixe o modelo** desejado clicando no botão "📥 Baixar Modelo da Planilha" na interface
2. **Abra o arquivo** no Microsoft Excel, Google Sheets ou LibreOffice Calc
3. **Preencha os dados** seguindo as instruções da documentação
4. **Salve o arquivo** no formato .xlsx
5. **Faça o upload** através do botão "📊 Importar Planilha" no sistema

## ⚙️ Regenerar os Modelos

Se precisar recriar os arquivos .xlsx (por exemplo, após alterações na estrutura), execute:

```bash
npm run criar-modelos
```

Este comando executará o script `scripts/criar-modelos-excel.js` que gera todos os modelos automaticamente.

## 📝 Observações Importantes

- **Formato obrigatório:** Os arquivos devem estar em formato `.xlsx` ou `.xls`
- **Encoding:** Use UTF-8 para caracteres especiais (acentos, ç, etc.)
- **Colunas:** Respeite exatamente os nomes das colunas especificados
- **Validação:** O sistema valida os dados automaticamente ao fazer upload
- **Duplicados:** Registros duplicados são identificados e ignorados
- **Erros:** Linhas com erros são relatadas no resultado do processamento

## 🎯 Dicas de Preenchimento

### ✅ Boas Práticas

- Use nomes descritivos e padronizados
- Verifique CPFs (devem ter 11 dígitos, apenas números)
- Use datas no formato DD/MM/YYYY
- Preencha todos os campos obrigatórios
- Revise os dados antes de importar

### ❌ Erros Comuns

- CPF com pontos e traços (use apenas números)
- Datas em formato americano (MM/DD/YYYY)
- Espaços extras no início ou fim dos campos
- Nomes de colunas alterados ou com erros de digitação
- Linhas vazias no meio da planilha

## 🔒 Validações Automáticas

O sistema realiza as seguintes validações ao importar:

1. **Existência de colunas obrigatórias**
2. **Formato de CPF** (11 dígitos)
3. **Formato de email** (deve conter @ e domínio)
4. **Duplicidade de registros** (verifica se já existe no banco)
5. **Referências** (ex: curso deve existir ao criar matéria técnica)
6. **Regras de negócio** (ex: escola deve ser técnica para ter cursos)

## 📊 Estrutura dos Arquivos

Cada arquivo .xlsx contém:

- **Linha 1 (Header):** Nomes das colunas
- **Linhas 2-4:** Exemplos de dados (podem ser apagados)
- **Formatação:** Colunas com largura automática
- **Planilha:** Única, chamada "Modelo"

---

**Última atualização:** 2026-06-19
**Versão:** 1.0.0
