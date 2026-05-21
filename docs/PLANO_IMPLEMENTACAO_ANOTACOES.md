# 📝 PLANO DE IMPLEMENTAÇÃO - Sistema de Anotações Pessoais

**Data:** 21/05/2026  
**Status:** Planejamento - Aguardando Definições  
**Base Técnica:** Sistema de Calendário Existente  
**Estimativa:** 12-16 horas (~2 dias de trabalho)

---

## ⚠️ QUESTÕES PARA DEFINIÇÃO ANTES DE IMPLEMENTAR

### 🔍 Pontas Soltas - **RESPONDER ANTES DE COMEÇAR**

#### 1. **Visibilidade e Compartilhamento**
- ❓ A anotação é **totalmente pessoal** do usuário ou pode ser compartilhada com outros?
- ❓ Outros usuários da mesma escola podem ver as anotações? Ou apenas o criador?
- 💡 **Sugestão Técnica:** Manter pessoal (apenas usuário vê suas próprias anotações)

#### 2. **Categorização Visual**
- ❓ Anotações precisam de **cores/categorias** diferentes? (ex: Pessoal, Trabalho, Urgente)
- ❓ Adicionar campo `AnotacaoCategoria` ENUM('pessoal', 'trabalho', 'urgente', 'outro')?
- ❓ Se sim, quais categorias são necessárias?
- 💡 **Sugestão Técnica:** Adicionar campo opcional `AnotacaoCor` VARCHAR(7) para hex color (#FF5722)

#### 3. **Notificações/Lembretes**
- ❓ Quando a data da anotação chegar, o sistema deve **notificar o usuário**?
- ❓ Notificação via e-mail, push notification, ou apenas visual no calendário?
- 💡 **Sugestão Técnica:** Implementar apenas visual no calendário (fase 1), notificações depois

#### 4. **Anexos**
- ❓ Anotações podem ter **arquivos anexados**? (ex: foto de lista de compras, documento)
- ❓ Se sim, quantos anexos por anotação? (1 ou N?)
- 💡 **Sugestão Técnica:** Se sim, usar tabela `relacaoanexos` existente (adicionar coluna `AnotacaoGUID`)

#### 5. **Aparência no Calendário**
- ❓ Como deve aparecer **visualmente no calendário**? Diferente de tarefas/provas/eventos?
- ❓ Ícone específico? (📌 📝 ✏️ 📋)
- ❓ Cor padrão? (sugestão: #FFC107 - amarelo post-it)
- 💡 **Sugestão Técnica:** Badge amarelo com ícone 📝 e borda tracejada

#### 6. **Filtros e Busca**
- ❓ No calendário, usuário pode **filtrar para mostrar/ocultar** anotações?
- ❓ Buscar anotações por texto do título/descrição?
- 💡 **Sugestão Técnica:** Toggle no calendário "Mostrar Anotações" + busca textual

#### 7. **Recorrência**
- ❓ Anotações podem ser **recorrentes**? (ex: "Reunião toda segunda-feira")
- ❓ Se sim, adicionar campos de recorrência (diário, semanal, mensal)?
- 💡 **Sugestão Técnica:** Implementar em fase 2 (não agora)

#### 8. **Prioridade**
- ❓ Anotações têm **níveis de prioridade**? (baixa, média, alta, urgente)
- ❓ Se sim, ordenar por prioridade na visualização?
- 💡 **Sugestão Técnica:** Campo opcional `AnotacaoPrioridade` ENUM

---

## 🎯 VISÃO GERAL

### Objetivo
Implementar sistema de **anotações pessoais** integrado ao calendário, permitindo que cada usuário:
- **Crie** anotações vinculadas a uma data específica
- **Edite** suas anotações existentes
- **Marque como feita** quando concluída
- **Exclua** anotações desnecessárias
- **Visualize** no calendário junto com tarefas/provas/eventos

### Exemplo de Uso
> "Dia 24/05 - Não esquecer de levar cartolina na escola"  
> "Dia 01/06 - Aniversário do João - comprar presente"  
> "Dia 15/06 - Vencimento seguro do carro"

### Características Principais
- ✅ **Pessoal:** Apenas o usuário vê suas próprias anotações
- ✅ **Vinculada à escola:** Anotações organizadas por escola
- ✅ **Status feito/pendente:** Marcar como concluída
- ✅ **Integração calendário:** Aparece no modal do dia selecionado
- ✅ **CRUD completo:** Create, Read, Update, Delete

### Diferença de Outros Tipos
| Tipo | Visibilidade | Criado Por | Exemplo |
|------|--------------|------------|---------|
| **Tarefa** | Aluno específico | Professor | "Entregar trabalho de Matemática" |
| **Prova** | Turma inteira | Professor/Coordenador | "Prova de Física - Cap 1-5" |
| **Evento** | Escola inteira | Administrador | "Festa Junina - 20/06" |
| **Anotação** ⭐ | **Apenas o usuário** | **Próprio usuário** | "Levar cartolina na escola" |

### Dependências de Implementação
```
✅ Usuario (já implementado)
✅ Escola (já implementado)
✅ EscolaxUsuarioxFuncao (já implementado)
✅ Calendário Frontend (já implementado)
🆕 Anotacao (NOVA - independente)
```

### Estimativa de Tempo
- **Backend (Entity + Repository + Service + Controller + Routes):** 6-8 horas
- **Frontend (CRUD Modal + Integração Calendário):** 4-6 horas
- **Testes e Ajustes:** 2 horas
- **TOTAL:** 12-16 horas (~2 dias)

---

## 📦 PRÉ-REQUISITOS

### ✅ Antes de Começar

#### 1. Executar Migration no Banco
```sql
-- Tabela: anotacao
CREATE TABLE `tccecossistemaescolar`.`anotacao` (
  `AnotacaoGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `AnotacaoData` DATETIME NOT NULL COMMENT 'Data da anotação em GMT-3 (America/Sao_Paulo)',
  `AnotacaoTitulo` VARCHAR(256) NOT NULL,
  `AnotacaoDescricao` VARCHAR(2048) NULL,
  `AnotacaoIsFeito` BOOLEAN NOT NULL DEFAULT FALSE,
  `AnotacaoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `AnotacaoUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario`(`UsuarioCPF`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`EscolaGUID`) REFERENCES `escola`(`EscolaGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX `idx_anotacao_usuario` (`UsuarioCPF`),
  INDEX `idx_anotacao_escola` (`EscolaGUID`),
  INDEX `idx_anotacao_data` (`AnotacaoData`),
  INDEX `idx_anotacao_feito` (`AnotacaoIsFeito`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Comentários sobre a Tabela:**
- `AnotacaoGUID`: UUID v4 gerado no backend
- `AnotacaoData`: DATETIME sempre em GMT-3 (seguindo padrão do sistema)
- `AnotacaoTitulo`: Máximo 256 caracteres (título curto)
- `AnotacaoDescricao`: Máximo 2048 caracteres (detalhes opcionais)
- `AnotacaoIsFeito`: Boolean para marcar como concluída
- Índices para otimizar queries por usuário, escola, data e status

#### 2. Verificar Configuração Timezone
O sistema já possui utilitários de timezone configurados:
- ✅ `frontend/lib/timezone-utils.ts` (conversão automática)
- ✅ Padrão: Database em GMT-3, Frontend converte automaticamente

---

## 🔧 IMPLEMENTAÇÃO BACKEND

### Ordem de Criação:
1. Entity (30 min)
2. Repository (1.5h)
3. Service (2h)
4. Middleware (1h)
5. Controller (1h)
6. Routes (30 min)

---

### 📄 1. ENTITY (30 min)

**Arquivo:** `backend/entities/anotacao.model.ts`

```typescript
export interface Anotacao {
  AnotacaoGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  AnotacaoData: Date;                    // DATETIME em GMT-3
  AnotacaoTitulo: string;                // MAX 256 chars
  AnotacaoDescricao: string | null;      // MAX 2048 chars
  AnotacaoIsFeito: boolean;
  AnotacaoCreatedAt: Date;
  AnotacaoUpdatedAt: Date;
}

export interface AnotacaoCreateDTO {
  UsuarioCPF: string;
  EscolaGUID: string;
  AnotacaoData: string;                  // ISO string (frontend envia em GMT-3)
  AnotacaoTitulo: string;
  AnotacaoDescricao?: string;
}

export interface AnotacaoUpdateDTO {
  AnotacaoData?: string;
  AnotacaoTitulo?: string;
  AnotacaoDescricao?: string | null;
  AnotacaoIsFeito?: boolean;
}

export class AnotacaoEntity {
  #anotacaoGUID: string;
  #usuarioCPF: string;
  #escolaGUID: string;
  #anotacaoData: Date;
  #anotacaoTitulo: string;
  #anotacaoDescricao: string | null;
  #anotacaoIsFeito: boolean;
  #anotacaoCreatedAt: Date;
  #anotacaoUpdatedAt: Date;

  constructor(data: Anotacao) {
    this.#anotacaoGUID = data.AnotacaoGUID;
    this.#usuarioCPF = data.UsuarioCPF;
    this.#escolaGUID = data.EscolaGUID;
    this.#anotacaoData = data.AnotacaoData;
    this.#anotacaoTitulo = data.AnotacaoTitulo;
    this.#anotacaoDescricao = data.AnotacaoDescricao;
    this.#anotacaoIsFeito = data.AnotacaoIsFeito;
    this.#anotacaoCreatedAt = data.AnotacaoCreatedAt;
    this.#anotacaoUpdatedAt = data.AnotacaoUpdatedAt;
  }

  // Getters
  get anotacaoGUID(): string {
    return this.#anotacaoGUID;
  }

  get usuarioCPF(): string {
    return this.#usuarioCPF;
  }

  get escolaGUID(): string {
    return this.#escolaGUID;
  }

  get anotacaoData(): Date {
    return this.#anotacaoData;
  }

  get anotacaoTitulo(): string {
    return this.#anotacaoTitulo;
  }

  get anotacaoDescricao(): string | null {
    return this.#anotacaoDescricao;
  }

  get anotacaoIsFeito(): boolean {
    return this.#anotacaoIsFeito;
  }

  get anotacaoCreatedAt(): Date {
    return this.#anotacaoCreatedAt;
  }

  get anotacaoUpdatedAt(): Date {
    return this.#anotacaoUpdatedAt;
  }

  // Setters (para updates)
  set anotacaoData(value: Date) {
    this.#anotacaoData = value;
  }

  set anotacaoTitulo(value: string) {
    if (value.length > 256) {
      throw new Error('AnotacaoTitulo não pode exceder 256 caracteres');
    }
    this.#anotacaoTitulo = value;
  }

  set anotacaoDescricao(value: string | null) {
    if (value && value.length > 2048) {
      throw new Error('AnotacaoDescricao não pode exceder 2048 caracteres');
    }
    this.#anotacaoDescricao = value;
  }

  set anotacaoIsFeito(value: boolean) {
    this.#anotacaoIsFeito = value;
  }

  // Validações
  validar(): void {
    // UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(this.#anotacaoGUID)) {
      throw new Error('AnotacaoGUID inválido (deve ser UUID v4)');
    }

    // CPF
    const cpfLimpo = this.#usuarioCPF.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPF deve ter 11 dígitos');
    }

    // EscolaGUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.#escolaGUID)) {
      throw new Error('EscolaGUID inválido (deve ser UUID)');
    }

    // Titulo
    if (!this.#anotacaoTitulo || this.#anotacaoTitulo.trim().length === 0) {
      throw new Error('AnotacaoTitulo é obrigatório');
    }
    if (this.#anotacaoTitulo.length > 256) {
      throw new Error('AnotacaoTitulo não pode exceder 256 caracteres');
    }

    // Descrição (opcional, mas se existir...)
    if (this.#anotacaoDescricao && this.#anotacaoDescricao.length > 2048) {
      throw new Error('AnotacaoDescricao não pode exceder 2048 caracteres');
    }

    // Data
    if (!(this.#anotacaoData instanceof Date) || isNaN(this.#anotacaoData.getTime())) {
      throw new Error('AnotacaoData inválida');
    }
  }

  // Serialização
  toJSON(): Anotacao {
    return {
      AnotacaoGUID: this.#anotacaoGUID,
      UsuarioCPF: this.#usuarioCPF,
      EscolaGUID: this.#escolaGUID,
      AnotacaoData: this.#anotacaoData,
      AnotacaoTitulo: this.#anotacaoTitulo,
      AnotacaoDescricao: this.#anotacaoDescricao,
      AnotacaoIsFeito: this.#anotacaoIsFeito,
      AnotacaoCreatedAt: this.#anotacaoCreatedAt,
      AnotacaoUpdatedAt: this.#anotacaoUpdatedAt
    };
  }
}
```

**Validações Implementadas:**
- ✅ AnotacaoGUID: UUID v4 válido
- ✅ UsuarioCPF: 11 dígitos (aceita formatado ou não)
- ✅ EscolaGUID: UUID válido
- ✅ AnotacaoTitulo: Obrigatório, 1-256 chars
- ✅ AnotacaoDescricao: Opcional, máx 2048 chars
- ✅ AnotacaoData: Date válida
- ✅ AnotacaoIsFeito: Boolean

---

### 📂 2. REPOSITORY (1.5h)

**Arquivo:** `backend/repositories/anotacao.repository.ts`

```typescript
import { getPool } from '../database/mysql';
import { Anotacao, AnotacaoEntity } from '../entities/anotacao.model';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface AnotacaoFilters {
  UsuarioCPF?: string;
  EscolaGUID?: string;
  AnotacaoIsFeito?: boolean;
  DataInicio?: Date;      // Filtrar anotações >= DataInicio
  DataFim?: Date;         // Filtrar anotações <= DataFim
}

export class AnotacaoDAO {
  // CREATE
  async create(anotacao: Anotacao): Promise<Anotacao> {
    const pool = getPool();
    const query = `
      INSERT INTO anotacao (
        AnotacaoGUID, UsuarioCPF, EscolaGUID, AnotacaoData,
        AnotacaoTitulo, AnotacaoDescricao, AnotacaoIsFeito
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute<ResultSetHeader>(query, [
      anotacao.AnotacaoGUID,
      anotacao.UsuarioCPF,
      anotacao.EscolaGUID,
      anotacao.AnotacaoData,
      anotacao.AnotacaoTitulo,
      anotacao.AnotacaoDescricao,
      anotacao.AnotacaoIsFeito
    ]);

    return anotacao;
  }

  // READ BY ID
  async findById(guid: string): Promise<Anotacao | null> {
    const pool = getPool();
    const query = `
      SELECT * FROM anotacao
      WHERE AnotacaoGUID = ?
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query, [guid]);
    
    if (rows.length === 0) {
      return null;
    }

    return rows[0] as Anotacao;
  }

  // READ ALL (com filtros)
  async findAll(filters: AnotacaoFilters): Promise<Anotacao[]> {
    const pool = getPool();
    let query = 'SELECT * FROM anotacao WHERE 1=1';
    const params: any[] = [];

    if (filters.UsuarioCPF) {
      query += ' AND UsuarioCPF = ?';
      params.push(filters.UsuarioCPF);
    }

    if (filters.EscolaGUID) {
      query += ' AND EscolaGUID = ?';
      params.push(filters.EscolaGUID);
    }

    if (filters.AnotacaoIsFeito !== undefined) {
      query += ' AND AnotacaoIsFeito = ?';
      params.push(filters.AnotacaoIsFeito);
    }

    if (filters.DataInicio) {
      query += ' AND AnotacaoData >= ?';
      params.push(filters.DataInicio);
    }

    if (filters.DataFim) {
      query += ' AND AnotacaoData <= ?';
      params.push(filters.DataFim);
    }

    query += ' ORDER BY AnotacaoData ASC, AnotacaoCreatedAt DESC';

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows as Anotacao[];
  }

  // READ BY USER AND SCHOOL (mais usado)
  async findByUsuarioAndEscola(usuarioCPF: string, escolaGUID: string): Promise<Anotacao[]> {
    return this.findAll({ UsuarioCPF: usuarioCPF, EscolaGUID: escolaGUID });
  }

  // READ BY DATE RANGE (para calendário)
  async findByDateRange(
    usuarioCPF: string,
    escolaGUID: string,
    dataInicio: Date,
    dataFim: Date
  ): Promise<Anotacao[]> {
    return this.findAll({
      UsuarioCPF: usuarioCPF,
      EscolaGUID: escolaGUID,
      DataInicio: dataInicio,
      DataFim: dataFim
    });
  }

  // UPDATE
  async update(guid: string, updates: Partial<Anotacao>): Promise<Anotacao | null> {
    const pool = getPool();
    
    // Campos permitidos para update
    const allowedFields = [
      'AnotacaoData',
      'AnotacaoTitulo',
      'AnotacaoDescricao',
      'AnotacaoIsFeito'
    ];

    const setClauses: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) {
      return this.findById(guid);
    }

    const query = `
      UPDATE anotacao
      SET ${setClauses.join(', ')}
      WHERE AnotacaoGUID = ?
    `;

    params.push(guid);

    const [result] = await pool.execute<ResultSetHeader>(query, params);

    if (result.affectedRows === 0) {
      return null;
    }

    return this.findById(guid);
  }

  // DELETE
  async delete(guid: string): Promise<boolean> {
    const pool = getPool();
    const query = 'DELETE FROM anotacao WHERE AnotacaoGUID = ?';

    const [result] = await pool.execute<ResultSetHeader>(query, [guid]);
    return result.affectedRows > 0;
  }

  // COUNT (útil para estatísticas)
  async count(filters: AnotacaoFilters): Promise<number> {
    const pool = getPool();
    let query = 'SELECT COUNT(*) as total FROM anotacao WHERE 1=1';
    const params: any[] = [];

    if (filters.UsuarioCPF) {
      query += ' AND UsuarioCPF = ?';
      params.push(filters.UsuarioCPF);
    }

    if (filters.EscolaGUID) {
      query += ' AND EscolaGUID = ?';
      params.push(filters.EscolaGUID);
    }

    if (filters.AnotacaoIsFeito !== undefined) {
      query += ' AND AnotacaoIsFeito = ?';
      params.push(filters.AnotacaoIsFeito);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows[0].total;
  }
}
```

**Queries Implementadas:**
- ✅ `create`: Inserir nova anotação
- ✅ `findById`: Buscar por GUID
- ✅ `findAll`: Buscar com filtros (usuário, escola, status, datas)
- ✅ `findByUsuarioAndEscola`: Todas as anotações do usuário em uma escola
- ✅ `findByDateRange`: Anotações em intervalo de datas (usado pelo calendário)
- ✅ `update`: Atualizar campos permitidos
- ✅ `delete`: Remover anotação
- ✅ `count`: Contar anotações (estatísticas)

---

### ⚙️ 3. SERVICE (2h)

**Arquivo:** `backend/services/anotacao.service.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import { AnotacaoDAO, AnotacaoFilters } from '../repositories/anotacao.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../repositories/escolaxusuarioxfuncao.repository';
import { Anotacao, AnotacaoEntity, AnotacaoCreateDTO, AnotacaoUpdateDTO } from '../entities/anotacao.model';
import { ErrorResponse } from '../utils/ErrorResponse';

export class AnotacaoService {
  constructor(
    private anotacaoDAO: AnotacaoDAO,
    private escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {}

  // CREATE
  async criarAnotacao(data: AnotacaoCreateDTO): Promise<Anotacao> {
    // 1. Validar vínculo usuário-escola
    const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(
      data.EscolaGUID,
      data.UsuarioCPF
    );

    if (!vinculo || vinculo.Status !== 'Ativo') {
      throw new ErrorResponse('Usuário não vinculado à escola ou vínculo inativo', 403);
    }

    // 2. Criar objeto Anotacao
    const anotacao: Anotacao = {
      AnotacaoGUID: uuidv4(),
      UsuarioCPF: data.UsuarioCPF,
      EscolaGUID: data.EscolaGUID,
      AnotacaoData: new Date(data.AnotacaoData),  // String ISO -> Date
      AnotacaoTitulo: data.AnotacaoTitulo.trim(),
      AnotacaoDescricao: data.AnotacaoDescricao?.trim() || null,
      AnotacaoIsFeito: false,  // Sempre começa como pendente
      AnotacaoCreatedAt: new Date(),
      AnotacaoUpdatedAt: new Date()
    };

    // 3. Validar através da entidade
    const entity = new AnotacaoEntity(anotacao);
    entity.validar();

    // 4. Salvar no banco
    return await this.anotacaoDAO.create(anotacao);
  }

  // READ (lista com filtros)
  async listarAnotacoes(filters: AnotacaoFilters): Promise<Anotacao[]> {
    return await this.anotacaoDAO.findAll(filters);
  }

  // READ (por usuário e escola)
  async listarAnotacoesUsuario(usuarioCPF: string, escolaGUID: string): Promise<Anotacao[]> {
    // Validar vínculo
    const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(
      escolaGUID,
      usuarioCPF
    );

    if (!vinculo || vinculo.Status !== 'Ativo') {
      throw new ErrorResponse('Usuário não vinculado à escola', 403);
    }

    return await this.anotacaoDAO.findByUsuarioAndEscola(usuarioCPF, escolaGUID);
  }

  // READ (por range de datas - para calendário)
  async listarAnotacoesPorPeriodo(
    usuarioCPF: string,
    escolaGUID: string,
    dataInicio: string,
    dataFim: string
  ): Promise<Anotacao[]> {
    // Validar vínculo
    const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(
      escolaGUID,
      usuarioCPF
    );

    if (!vinculo || vinculo.Status !== 'Ativo') {
      throw new ErrorResponse('Usuário não vinculado à escola', 403);
    }

    return await this.anotacaoDAO.findByDateRange(
      usuarioCPF,
      escolaGUID,
      new Date(dataInicio),
      new Date(dataFim)
    );
  }

  // READ (por ID)
  async buscarAnotacao(guid: string, usuarioCPF: string): Promise<Anotacao> {
    const anotacao = await this.anotacaoDAO.findById(guid);

    if (!anotacao) {
      throw new ErrorResponse('Anotação não encontrada', 404);
    }

    // Validar permissão (apenas dono pode ver)
    if (anotacao.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse('Sem permissão para acessar esta anotação', 403);
    }

    return anotacao;
  }

  // UPDATE
  async atualizarAnotacao(
    guid: string,
    usuarioCPF: string,
    updates: AnotacaoUpdateDTO
  ): Promise<Anotacao> {
    // 1. Buscar anotação existente
    const anotacaoExistente = await this.anotacaoDAO.findById(guid);

    if (!anotacaoExistente) {
      throw new ErrorResponse('Anotação não encontrada', 404);
    }

    // 2. Validar permissão (apenas dono pode editar)
    if (anotacaoExistente.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse('Sem permissão para editar esta anotação', 403);
    }

    // 3. Preparar updates
    const updateData: Partial<Anotacao> = {};

    if (updates.AnotacaoData) {
      updateData.AnotacaoData = new Date(updates.AnotacaoData);
    }

    if (updates.AnotacaoTitulo !== undefined) {
      updateData.AnotacaoTitulo = updates.AnotacaoTitulo.trim();
    }

    if (updates.AnotacaoDescricao !== undefined) {
      updateData.AnotacaoDescricao = updates.AnotacaoDescricao?.trim() || null;
    }

    if (updates.AnotacaoIsFeito !== undefined) {
      updateData.AnotacaoIsFeito = updates.AnotacaoIsFeito;
    }

    // 4. Validar através da entidade (merge com dados existentes)
    const dadosCompletos: Anotacao = {
      ...anotacaoExistente,
      ...updateData
    };

    const entity = new AnotacaoEntity(dadosCompletos);
    entity.validar();

    // 5. Atualizar no banco
    const updated = await this.anotacaoDAO.update(guid, updateData);

    if (!updated) {
      throw new ErrorResponse('Erro ao atualizar anotação', 500);
    }

    return updated;
  }

  // TOGGLE FEITO
  async marcarComoFeito(guid: string, usuarioCPF: string): Promise<Anotacao> {
    const anotacao = await this.anotacaoDAO.findById(guid);

    if (!anotacao) {
      throw new ErrorResponse('Anotação não encontrada', 404);
    }

    if (anotacao.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse('Sem permissão para marcar esta anotação', 403);
    }

    // Toggle: se está feito -> desfazer, se não está -> marcar como feito
    const novoStatus = !anotacao.AnotacaoIsFeito;

    const updated = await this.anotacaoDAO.update(guid, {
      AnotacaoIsFeito: novoStatus
    });

    if (!updated) {
      throw new ErrorResponse('Erro ao atualizar status', 500);
    }

    return updated;
  }

  // DELETE
  async excluirAnotacao(guid: string, usuarioCPF: string): Promise<void> {
    // 1. Buscar anotação
    const anotacao = await this.anotacaoDAO.findById(guid);

    if (!anotacao) {
      throw new ErrorResponse('Anotação não encontrada', 404);
    }

    // 2. Validar permissão (apenas dono pode excluir)
    if (anotacao.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse('Sem permissão para excluir esta anotação', 403);
    }

    // 3. Deletar
    const deleted = await this.anotacaoDAO.delete(guid);

    if (!deleted) {
      throw new ErrorResponse('Erro ao excluir anotação', 500);
    }
  }

  // ESTATÍSTICAS (útil para dashboard)
  async obterEstatisticas(usuarioCPF: string, escolaGUID: string): Promise<{
    total: number;
    feitas: number;
    pendentes: number;
  }> {
    const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(
      escolaGUID,
      usuarioCPF
    );

    if (!vinculo || vinculo.Status !== 'Ativo') {
      throw new ErrorResponse('Usuário não vinculado à escola', 403);
    }

    const total = await this.anotacaoDAO.count({
      UsuarioCPF: usuarioCPF,
      EscolaGUID: escolaGUID
    });

    const feitas = await this.anotacaoDAO.count({
      UsuarioCPF: usuarioCPF,
      EscolaGUID: escolaGUID,
      AnotacaoIsFeito: true
    });

    return {
      total,
      feitas,
      pendentes: total - feitas
    };
  }
}
```

**Regras de Negócio:**
- ✅ Apenas usuário vinculado à escola pode criar anotação
- ✅ Anotação sempre começa como `AnotacaoIsFeito = false`
- ✅ Apenas o dono pode ver/editar/excluir sua anotação
- ✅ Toggle de status: clicar alterna entre feito/pendente
- ✅ Validação automática através da Entity
- ✅ Trim automático em título e descrição
- ✅ Estatísticas para dashboard (total, feitas, pendentes)

---

### 🛡️ 4. MIDDLEWARE (1h)

**Arquivo:** `backend/middlewares/anotacao.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../utils/ErrorResponse';

export class AnotacaoMiddleware {
  // Validar body de criação
  static validarCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const { EscolaGUID, AnotacaoData, AnotacaoTitulo } = req.body;

      // Campos obrigatórios
      if (!EscolaGUID) {
        throw new ErrorResponse('EscolaGUID é obrigatório', 400);
      }

      if (!AnotacaoData) {
        throw new ErrorResponse('AnotacaoData é obrigatória', 400);
      }

      if (!AnotacaoTitulo) {
        throw new ErrorResponse('AnotacaoTitulo é obrigatório', 400);
      }

      // Validar formato de data
      const dataObj = new Date(AnotacaoData);
      if (isNaN(dataObj.getTime())) {
        throw new ErrorResponse('AnotacaoData inválida (use formato ISO 8601)', 400);
      }

      // Validar tamanho do título
      if (typeof AnotacaoTitulo !== 'string' || AnotacaoTitulo.trim().length === 0) {
        throw new ErrorResponse('AnotacaoTitulo não pode ser vazio', 400);
      }

      if (AnotacaoTitulo.length > 256) {
        throw new ErrorResponse('AnotacaoTitulo não pode exceder 256 caracteres', 400);
      }

      // Validar descrição (se fornecida)
      if (req.body.AnotacaoDescricao !== undefined) {
        if (typeof req.body.AnotacaoDescricao !== 'string') {
          throw new ErrorResponse('AnotacaoDescricao deve ser uma string', 400);
        }

        if (req.body.AnotacaoDescricao.length > 2048) {
          throw new ErrorResponse('AnotacaoDescricao não pode exceder 2048 caracteres', 400);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  // Validar body de atualização
  static validarUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { AnotacaoData, AnotacaoTitulo, AnotacaoDescricao, AnotacaoIsFeito } = req.body;

      // Pelo menos um campo deve ser fornecido
      if (
        AnotacaoData === undefined &&
        AnotacaoTitulo === undefined &&
        AnotacaoDescricao === undefined &&
        AnotacaoIsFeito === undefined
      ) {
        throw new ErrorResponse('Nenhum campo para atualizar foi fornecido', 400);
      }

      // Validar AnotacaoData (se fornecida)
      if (AnotacaoData !== undefined) {
        const dataObj = new Date(AnotacaoData);
        if (isNaN(dataObj.getTime())) {
          throw new ErrorResponse('AnotacaoData inválida', 400);
        }
      }

      // Validar AnotacaoTitulo (se fornecido)
      if (AnotacaoTitulo !== undefined) {
        if (typeof AnotacaoTitulo !== 'string' || AnotacaoTitulo.trim().length === 0) {
          throw new ErrorResponse('AnotacaoTitulo não pode ser vazio', 400);
        }

        if (AnotacaoTitulo.length > 256) {
          throw new ErrorResponse('AnotacaoTitulo não pode exceder 256 caracteres', 400);
        }
      }

      // Validar AnotacaoDescricao (se fornecida)
      if (AnotacaoDescricao !== undefined) {
        if (AnotacaoDescricao !== null && typeof AnotacaoDescricao !== 'string') {
          throw new ErrorResponse('AnotacaoDescricao deve ser string ou null', 400);
        }

        if (AnotacaoDescricao && AnotacaoDescricao.length > 2048) {
          throw new ErrorResponse('AnotacaoDescricao não pode exceder 2048 caracteres', 400);
        }
      }

      // Validar AnotacaoIsFeito (se fornecido)
      if (AnotacaoIsFeito !== undefined) {
        if (typeof AnotacaoIsFeito !== 'boolean') {
          throw new ErrorResponse('AnotacaoIsFeito deve ser boolean', 400);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  // Validar GUID no params
  static validarGUID(req: Request, res: Response, next: NextFunction) {
    try {
      const { guid } = req.params;

      if (!guid) {
        throw new ErrorResponse('AnotacaoGUID é obrigatório nos parâmetros', 400);
      }

      // Validar formato UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(guid)) {
        throw new ErrorResponse('AnotacaoGUID inválido (deve ser UUID v4)', 400);
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  // Validar query params de filtros
  static validarFiltros(req: Request, res: Response, next: NextFunction) {
    try {
      const { EscolaGUID, DataInicio, DataFim, AnotacaoIsFeito } = req.query;

      // EscolaGUID é obrigatório para listar
      if (!EscolaGUID) {
        throw new ErrorResponse('EscolaGUID é obrigatório nos parâmetros de busca', 400);
      }

      // Validar datas (se fornecidas)
      if (DataInicio) {
        const data = new Date(DataInicio as string);
        if (isNaN(data.getTime())) {
          throw new ErrorResponse('DataInicio inválida', 400);
        }
      }

      if (DataFim) {
        const data = new Date(DataFim as string);
        if (isNaN(data.getTime())) {
          throw new ErrorResponse('DataFim inválida', 400);
        }
      }

      // Validar AnotacaoIsFeito (se fornecido)
      if (AnotacaoIsFeito !== undefined) {
        const valorBoolean = AnotacaoIsFeito === 'true' || AnotacaoIsFeito === '1';
        const valorBooleanFalse = AnotacaoIsFeito === 'false' || AnotacaoIsFeito === '0';

        if (!valorBoolean && !valorBooleanFalse) {
          throw new ErrorResponse('AnotacaoIsFeito deve ser true, false, 1 ou 0', 400);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  }
}
```

**Validações Implementadas:**
- ✅ **validarCreate**: Campos obrigatórios, formatos, tamanhos
- ✅ **validarUpdate**: Pelo menos um campo, validações condicionais
- ✅ **validarGUID**: UUID v4 válido nos params
- ✅ **validarFiltros**: EscolaGUID obrigatório, datas opcionais

---

### 🎮 5. CONTROLLER (1h)

**Arquivo:** `backend/controllers/anotacao.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { AnotacaoService } from '../services/anotacao.service';
import { AnotacaoCreateDTO, AnotacaoUpdateDTO } from '../entities/anotacao.model';

export class AnotacaoController {
  constructor(private anotacaoService: AnotacaoService) {}

  // POST /api/anotacao - Criar nova anotação
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { EscolaGUID, AnotacaoData, AnotacaoTitulo, AnotacaoDescricao } = req.body;

      const createDTO: AnotacaoCreateDTO = {
        UsuarioCPF: usuarioCPF,
        EscolaGUID,
        AnotacaoData,
        AnotacaoTitulo,
        AnotacaoDescricao
      };

      const anotacao = await this.anotacaoService.criarAnotacao(createDTO);

      return res.status(201).json({
        success: true,
        message: 'Anotação criada com sucesso',
        data: anotacao
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/anotacao - Listar anotações (com filtros)
  index = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { EscolaGUID, DataInicio, DataFim, AnotacaoIsFeito } = req.query;

      let anotacoes;

      // Se forneceu range de datas, usar query específica
      if (DataInicio && DataFim) {
        anotacoes = await this.anotacaoService.listarAnotacoesPorPeriodo(
          usuarioCPF,
          EscolaGUID as string,
          DataInicio as string,
          DataFim as string
        );
      } else {
        // Caso contrário, usar filtros gerais
        const filters: any = {
          UsuarioCPF: usuarioCPF,
          EscolaGUID: EscolaGUID as string
        };

        if (AnotacaoIsFeito !== undefined) {
          filters.AnotacaoIsFeito = AnotacaoIsFeito === 'true' || AnotacaoIsFeito === '1';
        }

        anotacoes = await this.anotacaoService.listarAnotacoes(filters);
      }

      return res.json({
        success: true,
        data: anotacoes,
        total: anotacoes.length
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/anotacao/:guid - Buscar anotação específica
  show = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { guid } = req.params;

      const anotacao = await this.anotacaoService.buscarAnotacao(guid, usuarioCPF);

      return res.json({
        success: true,
        data: anotacao
      });
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/anotacao/:guid - Atualizar anotação
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { guid } = req.params;
      const { AnotacaoData, AnotacaoTitulo, AnotacaoDescricao, AnotacaoIsFeito } = req.body;

      const updateDTO: AnotacaoUpdateDTO = {
        AnotacaoData,
        AnotacaoTitulo,
        AnotacaoDescricao,
        AnotacaoIsFeito
      };

      const anotacao = await this.anotacaoService.atualizarAnotacao(guid, usuarioCPF, updateDTO);

      return res.json({
        success: true,
        message: 'Anotação atualizada com sucesso',
        data: anotacao
      });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/anotacao/:guid/toggle - Marcar/desmarcar como feito
  toggleFeito = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { guid } = req.params;

      const anotacao = await this.anotacaoService.marcarComoFeito(guid, usuarioCPF);

      return res.json({
        success: true,
        message: `Anotação marcada como ${anotacao.AnotacaoIsFeito ? 'feita' : 'pendente'}`,
        data: anotacao
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/anotacao/:guid - Excluir anotação
  destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { guid } = req.params;

      await this.anotacaoService.excluirAnotacao(guid, usuarioCPF);

      return res.json({
        success: true,
        message: 'Anotação excluída com sucesso'
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/anotacao/estatisticas - Estatísticas do usuário
  stats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { EscolaGUID } = req.query;

      if (!EscolaGUID) {
        return res.status(400).json({
          success: false,
          message: 'EscolaGUID é obrigatório'
        });
      }

      const stats = await this.anotacaoService.obterEstatisticas(
        usuarioCPF,
        EscolaGUID as string
      );

      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  };
}
```

**Endpoints Implementados:**
- ✅ `POST /api/anotacao` - Criar anotação
- ✅ `GET /api/anotacao` - Listar (com filtros)
- ✅ `GET /api/anotacao/:guid` - Buscar por ID
- ✅ `PUT /api/anotacao/:guid` - Atualizar
- ✅ `PATCH /api/anotacao/:guid/toggle` - Toggle feito/pendente
- ✅ `DELETE /api/anotacao/:guid` - Excluir
- ✅ `GET /api/anotacao/estatisticas` - Estatísticas (total, feitas, pendentes)

---

### 🛤️ 6. ROUTES (30 min)

**Arquivo:** `routes/anotacao.routes.ts`

```typescript
import { Router } from 'express';
import { AnotacaoController } from '../backend/controllers/anotacao.controller';
import { AnotacaoService } from '../backend/services/anotacao.service';
import { AnotacaoDAO } from '../backend/repositories/anotacao.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../backend/repositories/escolaxusuarioxfuncao.repository';
import { AnotacaoMiddleware } from '../backend/middlewares/anotacao.middleware';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';

export function anotacaoRouterFactory() {
  const router = Router();

  // Instanciar DAOs
  const anotacaoDAO = new AnotacaoDAO();
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO();

  // Instanciar Service
  const anotacaoService = new AnotacaoService(anotacaoDAO, escolaxUsuarioxFuncaoDAO);

  // Instanciar Controller
  const anotacaoController = new AnotacaoController(anotacaoService);

  // Instanciar Middlewares
  const authMiddleware = new AuthMiddleware();

  // **TODAS AS ROTAS REQUEREM AUTENTICAÇÃO**
  router.use(authMiddleware.autenticar);

  // POST /api/anotacao - Criar nova anotação
  router.post(
    '/',
    AnotacaoMiddleware.validarCreate,
    anotacaoController.create
  );

  // GET /api/anotacao/estatisticas - Estatísticas (ANTES da rota /:guid)
  router.get(
    '/estatisticas',
    anotacaoController.stats
  );

  // GET /api/anotacao - Listar anotações
  router.get(
    '/',
    AnotacaoMiddleware.validarFiltros,
    anotacaoController.index
  );

  // GET /api/anotacao/:guid - Buscar específica
  router.get(
    '/:guid',
    AnotacaoMiddleware.validarGUID,
    anotacaoController.show
  );

  // PUT /api/anotacao/:guid - Atualizar
  router.put(
    '/:guid',
    AnotacaoMiddleware.validarGUID,
    AnotacaoMiddleware.validarUpdate,
    anotacaoController.update
  );

  // PATCH /api/anotacao/:guid/toggle - Toggle feito/pendente
  router.patch(
    '/:guid/toggle',
    AnotacaoMiddleware.validarGUID,
    anotacaoController.toggleFeito
  );

  // DELETE /api/anotacao/:guid - Excluir
  router.delete(
    '/:guid',
    AnotacaoMiddleware.validarGUID,
    anotacaoController.destroy
  );

  return router;
}
```

**Registro no Server:**

**Arquivo:** `backend/Server.ts` (adicionar import e uso)

```typescript
import { anotacaoRouterFactory } from '../routes/anotacao.routes';

// Dentro do método setupRoutes():
this.app.use('/api/anotacao', anotacaoRouterFactory());
```

---

## 🌐 DOCUMENTAÇÃO DE ROTAS DA API

### Base URL
```
http://localhost:3000/api/anotacao
```

### Headers Obrigatórios
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

### 📌 **1. Criar Anotação**

**Endpoint:** `POST /api/anotacao`

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "EscolaGUID": "123e4567-e89b-12d3-a456-426614174000",
  "AnotacaoData": "2026-05-24T10:00:00-03:00",
  "AnotacaoTitulo": "Levar cartolina na escola",
  "AnotacaoDescricao": "Comprar cartolina branca grande para aula de artes"
}
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "message": "Anotação criada com sucesso",
  "data": {
    "AnotacaoGUID": "987fcdeb-51a2-43f7-8db3-6a1c2e5d4f3a",
    "UsuarioCPF": "12345678901",
    "EscolaGUID": "123e4567-e89b-12d3-a456-426614174000",
    "AnotacaoData": "2026-05-24T10:00:00.000Z",
    "AnotacaoTitulo": "Levar cartolina na escola",
    "AnotacaoDescricao": "Comprar cartolina branca grande para aula de artes",
    "AnotacaoIsFeito": false,
    "AnotacaoCreatedAt": "2026-05-21T14:30:00.000Z",
    "AnotacaoUpdatedAt": "2026-05-21T14:30:00.000Z"
  }
}
```

**Erros Possíveis:**
- `400` - Campos obrigatórios faltando ou inválidos
- `403` - Usuário não vinculado à escola
- `401` - Token inválido ou ausente

---

### 📋 **2. Listar Anotações**

**Endpoint:** `GET /api/anotacao`

**Query Params:**
- `EscolaGUID` (obrigatório): GUID da escola
- `DataInicio` (opcional): Data início para filtro (ISO 8601)
- `DataFim` (opcional): Data fim para filtro (ISO 8601)
- `AnotacaoIsFeito` (opcional): `true` ou `false`

**Exemplos de Uso:**

**Todas as anotações do usuário na escola:**
```http
GET /api/anotacao?EscolaGUID=123e4567-e89b-12d3-a456-426614174000
```

**Anotações em um período (calendário do mês):**
```http
GET /api/anotacao?EscolaGUID=123e4567-e89b-12d3-a456-426614174000&DataInicio=2026-05-01&DataFim=2026-05-31
```

**Apenas anotações pendentes:**
```http
GET /api/anotacao?EscolaGUID=123e4567-e89b-12d3-a456-426614174000&AnotacaoIsFeito=false
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": [
    {
      "AnotacaoGUID": "987fcdeb-51a2-43f7-8db3-6a1c2e5d4f3a",
      "UsuarioCPF": "12345678901",
      "EscolaGUID": "123e4567-e89b-12d3-a456-426614174000",
      "AnotacaoData": "2026-05-24T10:00:00.000Z",
      "AnotacaoTitulo": "Levar cartolina na escola",
      "AnotacaoDescricao": "Comprar cartolina branca grande",
      "AnotacaoIsFeito": false,
      "AnotacaoCreatedAt": "2026-05-21T14:30:00.000Z",
      "AnotacaoUpdatedAt": "2026-05-21T14:30:00.000Z"
    },
    {
      "AnotacaoGUID": "111aaaaa-bbbb-cccc-dddd-222222222222",
      "UsuarioCPF": "12345678901",
      "EscolaGUID": "123e4567-e89b-12d3-a456-426614174000",
      "AnotacaoData": "2026-06-01T00:00:00.000Z",
      "AnotacaoTitulo": "Aniversário do João",
      "AnotacaoDescricao": null,
      "AnotacaoIsFeito": false,
      "AnotacaoCreatedAt": "2026-05-21T15:00:00.000Z",
      "AnotacaoUpdatedAt": "2026-05-21T15:00:00.000Z"
    }
  ],
  "total": 2
}
```

---

### 🔍 **3. Buscar Anotação Específica**

**Endpoint:** `GET /api/anotacao/:guid`

**Exemplo:**
```http
GET /api/anotacao/987fcdeb-51a2-43f7-8db3-6a1c2e5d4f3a
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "AnotacaoGUID": "987fcdeb-51a2-43f7-8db3-6a1c2e5d4f3a",
    "UsuarioCPF": "12345678901",
    "EscolaGUID": "123e4567-e89b-12d3-a456-426614174000",
    "AnotacaoData": "2026-05-24T10:00:00.000Z",
    "AnotacaoTitulo": "Levar cartolina na escola",
    "AnotacaoDescricao": "Comprar cartolina branca grande",
    "AnotacaoIsFeito": false,
    "AnotacaoCreatedAt": "2026-05-21T14:30:00.000Z",
    "AnotacaoUpdatedAt": "2026-05-21T14:30:00.000Z"
  }
}
```

**Erros:**
- `404` - Anotação não encontrada
- `403` - Sem permissão (anotação de outro usuário)

---

### ✏️ **4. Atualizar Anotação**

**Endpoint:** `PUT /api/anotacao/:guid`

**Body (campos opcionais):**
```json
{
  "AnotacaoData": "2026-05-25T10:00:00-03:00",
  "AnotacaoTitulo": "Levar cartolina e cola",
  "AnotacaoDescricao": "Comprar também cola branca",
  "AnotacaoIsFeito": false
}
```

**Exemplo de atualização parcial (apenas título):**
```json
{
  "AnotacaoTitulo": "Levar materiais de artes"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Anotação atualizada com sucesso",
  "data": {
    "AnotacaoGUID": "987fcdeb-51a2-43f7-8db3-6a1c2e5d4f3a",
    "UsuarioCPF": "12345678901",
    "EscolaGUID": "123e4567-e89b-12d3-a456-426614174000",
    "AnotacaoData": "2026-05-25T10:00:00.000Z",
    "AnotacaoTitulo": "Levar materiais de artes",
    "AnotacaoDescricao": "Comprar também cola branca",
    "AnotacaoIsFeito": false,
    "AnotacaoCreatedAt": "2026-05-21T14:30:00.000Z",
    "AnotacaoUpdatedAt": "2026-05-21T16:45:00.000Z"
  }
}
```

---

### ✅ **5. Marcar/Desmarcar Como Feito (Toggle)**

**Endpoint:** `PATCH /api/anotacao/:guid/toggle`

**Sem body necessário** (apenas params e auth header)

**Exemplo:**
```http
PATCH /api/anotacao/987fcdeb-51a2-43f7-8db3-6a1c2e5d4f3a/toggle
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Anotação marcada como feita",
  "data": {
    "AnotacaoGUID": "987fcdeb-51a2-43f7-8db3-6a1c2e5d4f3a",
    "UsuarioCPF": "12345678901",
    "EscolaGUID": "123e4567-e89b-12d3-a456-426614174000",
    "AnotacaoData": "2026-05-24T10:00:00.000Z",
    "AnotacaoTitulo": "Levar cartolina na escola",
    "AnotacaoDescricao": "Comprar cartolina branca grande",
    "AnotacaoIsFeito": true,  ← Mudou para true
    "AnotacaoCreatedAt": "2026-05-21T14:30:00.000Z",
    "AnotacaoUpdatedAt": "2026-05-21T17:00:00.000Z"
  }
}
```

**Uso:** Clicar no checkbox da anotação alterna o status automaticamente

---

### 🗑️ **6. Excluir Anotação**

**Endpoint:** `DELETE /api/anotacao/:guid`

**Exemplo:**
```http
DELETE /api/anotacao/987fcdeb-51a2-43f7-8db3-6a1c2e5d4f3a
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Anotação excluída com sucesso"
}
```

**Erros:**
- `404` - Anotação não encontrada
- `403` - Sem permissão (anotação de outro usuário)

---

### 📊 **7. Estatísticas do Usuário**

**Endpoint:** `GET /api/anotacao/estatisticas`

**Query Params:**
- `EscolaGUID` (obrigatório): GUID da escola

**Exemplo:**
```http
GET /api/anotacao/estatisticas?EscolaGUID=123e4567-e89b-12d3-a456-426614174000
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "total": 15,
    "feitas": 8,
    "pendentes": 7
  }
}
```

**Uso:** Mostrar dashboard/widget com estatísticas do usuário

---

## 🎨 IMPLEMENTAÇÃO FRONTEND

### Fluxo de Uso no Calendário

```
1. Usuário clica em um dia do calendário
2. Modal abre mostrando avisos do dia (tarefas, provas, eventos, anotações)
3. No modal, aparece seção "Minhas Anotações" com botão "➕ Nova Anotação"
4. Ao clicar em "Nova Anotação", abre form com:
   - AnotacaoTitulo (input)
   - AnotacaoDescricao (textarea)
   - Data já preenchida com o dia clicado
5. Ao salvar, chama POST /api/anotacao
6. Anotação aparece na lista do dia
7. Cada anotação tem:
   - ☐ Checkbox (toggle feito/pendente)
   - ✏️ Botão editar
   - 🗑️ Botão excluir
```

---

### Arquivos a Modificar/Criar

#### 1. **Interface TypeScript**

**Arquivo:** `frontend/types/anotacao.ts` (CRIAR)

```typescript
export interface Anotacao {
  AnotacaoGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  AnotacaoData: string;              // ISO string
  AnotacaoTitulo: string;
  AnotacaoDescricao: string | null;
  AnotacaoIsFeito: boolean;
  AnotacaoCreatedAt: string;
  AnotacaoUpdatedAt: string;
}

export interface AnotacaoFormData {
  AnotacaoTitulo: string;
  AnotacaoDescricao: string;
  AnotacaoData: string;              // ISO string em GMT-3 (usar timezone-utils)
}
```

---

#### 2. **Serviço de API**

**Arquivo:** `frontend/lib/api/anotacao.api.ts` (CRIAR)

```typescript
import { Anotacao } from '@/types/anotacao';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Helper: obter token do localStorage
function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') || '';
}

// Helper: headers padrão
function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

// CREATE
export async function criarAnotacao(
  escolaGUID: string,
  data: string,
  titulo: string,
  descricao?: string
): Promise<Anotacao> {
  const response = await fetch(`${API_URL}/anotacao`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      EscolaGUID: escolaGUID,
      AnotacaoData: data,
      AnotacaoTitulo: titulo,
      AnotacaoDescricao: descricao || null
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar anotação');
  }

  return result.data;
}

// READ (listar por período - usado no calendário)
export async function listarAnotacoesPorPeriodo(
  escolaGUID: string,
  dataInicio: string,
  dataFim: string
): Promise<Anotacao[]> {
  const params = new URLSearchParams({
    EscolaGUID: escolaGUID,
    DataInicio: dataInicio,
    DataFim: dataFim
  });

  const response = await fetch(`${API_URL}/anotacao?${params}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar anotações');
  }

  return result.data;
}

// READ (listar com filtro de status)
export async function listarAnotacoes(
  escolaGUID: string,
  isFeito?: boolean
): Promise<Anotacao[]> {
  const params: any = { EscolaGUID: escolaGUID };
  
  if (isFeito !== undefined) {
    params.AnotacaoIsFeito = isFeito;
  }

  const queryString = new URLSearchParams(params).toString();

  const response = await fetch(`${API_URL}/anotacao?${queryString}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar anotações');
  }

  return result.data;
}

// UPDATE
export async function atualizarAnotacao(
  guid: string,
  updates: {
    AnotacaoData?: string;
    AnotacaoTitulo?: string;
    AnotacaoDescricao?: string | null;
    AnotacaoIsFeito?: boolean;
  }
): Promise<Anotacao> {
  const response = await fetch(`${API_URL}/anotacao/${guid}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao atualizar anotação');
  }

  return result.data;
}

// TOGGLE FEITO
export async function toggleAnotacaoFeito(guid: string): Promise<Anotacao> {
  const response = await fetch(`${API_URL}/anotacao/${guid}/toggle`, {
    method: 'PATCH',
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao atualizar status');
  }

  return result.data;
}

// DELETE
export async function excluirAnotacao(guid: string): Promise<void> {
  const response = await fetch(`${API_URL}/anotacao/${guid}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao excluir anotação');
  }
}

// STATS
export async function obterEstatisticas(escolaGUID: string): Promise<{
  total: number;
  feitas: number;
  pendentes: number;
}> {
  const params = new URLSearchParams({ EscolaGUID: escolaGUID });

  const response = await fetch(`${API_URL}/anotacao/estatisticas?${params}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao obter estatísticas');
  }

  return result.data;
}
```

---

#### 3. **Modificar Modal do Calendário**

**Arquivo:** `frontend/app/dashboard/[escolaGUID]/calendario/page.tsx`

**A. Adicionar aos imports:**
```typescript
import { Anotacao } from '@/types/anotacao';
import {
  criarAnotacao,
  listarAnotacoesPorPeriodo,
  toggleAnotacaoFeito,
  excluirAnotacao,
  atualizarAnotacao
} from '@/lib/api/anotacao.api';
import { converterParaBrasil, converterDoBrasil } from '@/lib/timezone-utils';
```

**B. Adicionar state para anotações:**
```typescript
const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
const [modoEdicaoAnotacao, setModoEdicaoAnotacao] = useState<string | null>(null);
const [formAnotacao, setFormAnotacao] = useState({
  titulo: '',
  descricao: ''
});
```

**C. Modificar fetchAvisos para incluir anotações:**
```typescript
// Dentro de fetchAvisos(), após carregar tarefas/provas/eventos:

// Buscar anotações do mês
const primeiroDia = new Date(ano, mes, 1);
const ultimoDia = new Date(ano, mes + 1, 0);

const anotacoesData = await listarAnotacoesPorPeriodo(
  escolaGUID,
  primeiroDia.toISOString().split('T')[0],
  ultimoDia.toISOString().split('T')[0]
);

setAnotacoes(anotacoesData);
```

**D. Função para adicionar anotação ao aviso do dia:**
```typescript
// Atualizar diasDoCalendario useMemo para incluir anotações:
const anotacoesNoDia = anotacoes.filter(anotacao => {
  const dataAnotacao = new Date(anotacao.AnotacaoData);
  return (
    dataAnotacao.getFullYear() === data.getFullYear() &&
    dataAnotacao.getMonth() === data.getMonth() &&
    dataAnotacao.getDate() === dia
  );
});

// Adicionar cada anotação como um aviso do tipo 'anotacao'
anotacoesNoDia.forEach(anotacao => {
  avisosNoDia.push({
    AvisoId: anotacao.AnotacaoGUID,
    Titulo: anotacao.AnotacaoTitulo,
    Descricao: anotacao.AnotacaoDescricao,
    DataPrazo: anotacao.AnotacaoData,
    TipoAviso: 'anotacao',
    StatusTexto: anotacao.AnotacaoIsFeito ? 'Feita' : 'Pendente',
    IsFeito: anotacao.AnotacaoIsFeito
  });
});
```

**E. Handlers para anotações:**
```typescript
const handleCriarAnotacao = async () => {
  if (!diaSelecionado || !formAnotacao.titulo.trim()) {
    alert('Título é obrigatório');
    return;
  }

  try {
    // Converter data do dia selecionado para GMT-3
    const dataGMT3 = converterParaBrasil(
      `${diaSelecionado.data.toISOString().split('T')[0]}T12:00:00`
    );

    await criarAnotacao(
      escolaGUID,
      dataGMT3,
      formAnotacao.titulo,
      formAnotacao.descricao || undefined
    );

    // Limpar form
    setFormAnotacao({ titulo: '', descricao: '' });

    // Recarregar avisos
    await fetchAvisos();
  } catch (error: any) {
    alert(error.message || 'Erro ao criar anotação');
  }
};

const handleToggleAnotacao = async (guid: string) => {
  try {
    await toggleAnotacaoFeito(guid);
    await fetchAvisos();
  } catch (error: any) {
    alert(error.message || 'Erro ao atualizar status');
  }
};

const handleExcluirAnotacao = async (guid: string) => {
  if (!confirm('Deseja realmente excluir esta anotação?')) return;

  try {
    await excluirAnotacao(guid);
    await fetchAvisos();
  } catch (error: any) {
    alert(error.message || 'Erro ao excluir anotação');
  }
};

const handleEditarAnotacao = async (guid: string) => {
  if (!formAnotacao.titulo.trim()) {
    alert('Título é obrigatório');
    return;
  }

  try {
    await atualizarAnotacao(guid, {
      AnotacaoTitulo: formAnotacao.titulo,
      AnotacaoDescricao: formAnotacao.descricao || null
    });

    setModoEdicaoAnotacao(null);
    setFormAnotacao({ titulo: '', descricao: '' });
    await fetchAvisos();
  } catch (error: any) {
    alert(error.message || 'Erro ao editar anotação');
  }
};
```

**F. Adicionar seção de anotações no modal:**
```tsx
{/* DENTRO DO MODAL, APÓS LISTA DE AVISOS */}

<div className={styles.anotacoesSection}>
  <h3>📝 Minhas Anotações</h3>
  
  {/* Form para criar/editar */}
  <div className={styles.anotacaoForm}>
    <input
      type="text"
      placeholder="Título da anotação"
      value={formAnotacao.titulo}
      onChange={(e) => setFormAnotacao({ ...formAnotacao, titulo: e.target.value })}
      maxLength={256}
      className={styles.input}
    />
    <textarea
      placeholder="Descrição (opcional)"
      value={formAnotacao.descricao}
      onChange={(e) => setFormAnotacao({ ...formAnotacao, descricao: e.target.value })}
      maxLength={2048}
      className={styles.textarea}
    />
    <button onClick={handleCriarAnotacao} className={styles.btnAdicionar}>
      ➕ Adicionar Anotação
    </button>
  </div>

  {/* Lista de anotações do dia */}
  <div className={styles.listaAnotacoes}>
    {anotacoes
      .filter(a => {
        const dataAnotacao = new Date(a.AnotacaoData);
        return (
          dataAnotacao.getFullYear() === diaSelecionado.data.getFullYear() &&
          dataAnotacao.getMonth() === diaSelecionado.data.getMonth() &&
          dataAnotacao.getDate() === diaSelecionado.data.getDate()
        );
      })
      .map(anotacao => (
        <div key={anotacao.AnotacaoGUID} className={styles.anotacaoCard}>
          {modoEdicaoAnotacao === anotacao.AnotacaoGUID ? (
            // Modo edição
            <>
              <input
                type="text"
                value={formAnotacao.titulo}
                onChange={(e) => setFormAnotacao({ ...formAnotacao, titulo: e.target.value })}
                className={styles.input}
              />
              <textarea
                value={formAnotacao.descricao}
                onChange={(e) => setFormAnotacao({ ...formAnotacao, descricao: e.target.value })}
                className={styles.textarea}
              />
              <div className={styles.acoesEdicao}>
                <button onClick={() => handleEditarAnotacao(anotacao.AnotacaoGUID)}>
                  💾 Salvar
                </button>
                <button onClick={() => {
                  setModoEdicaoAnotacao(null);
                  setFormAnotacao({ titulo: '', descricao: '' });
                }}>
                  ❌ Cancelar
                </button>
              </div>
            </>
          ) : (
            // Modo visualização
            <>
              <div className={styles.anotacaoHeader}>
                <input
                  type="checkbox"
                  checked={anotacao.AnotacaoIsFeito}
                  onChange={() => handleToggleAnotacao(anotacao.AnotacaoGUID)}
                  className={styles.checkbox}
                />
                <h4 className={anotacao.AnotacaoIsFeito ? styles.feito : ''}>
                  {anotacao.AnotacaoTitulo}
                </h4>
              </div>
              {anotacao.AnotacaoDescricao && (
                <p className={styles.descricao}>{anotacao.AnotacaoDescricao}</p>
              )}
              <div className={styles.acoesAnotacao}>
                <button
                  onClick={() => {
                    setModoEdicaoAnotacao(anotacao.AnotacaoGUID);
                    setFormAnotacao({
                      titulo: anotacao.AnotacaoTitulo,
                      descricao: anotacao.AnotacaoDescricao || ''
                    });
                  }}
                  className={styles.btnEditar}
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleExcluirAnotacao(anotacao.AnotacaoGUID)}
                  className={styles.btnExcluir}
                >
                  🗑️ Excluir
                </button>
              </div>
            </>
          )}
        </div>
      ))}
  </div>
</div>
```

**G. Adicionar cor para anotações na função `obterCorTipo`:**
```typescript
function obterCorTipo(tipo: string): string {
  switch (tipo) {
    case 'tarefa':
      return '#4CAF50';
    case 'prova':
      return '#FF5722';
    case 'evento':
      return '#2196F3';
    case 'anotacao':
      return '#FFC107';  // Amarelo post-it
    default:
      return '#9E9E9E';
  }
}
```

---

#### 4. **Estilos CSS**

**Arquivo:** `frontend/app/dashboard/[escolaGUID]/calendario/page.module.css`

**Adicionar ao final:**
```css
/* ===== SEÇÃO DE ANOTAÇÕES ===== */

.anotacoesSection {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid #e0e0e0;
}

.anotacoesSection h3 {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #333;
}

.anotacaoForm {
  background: #fffbf0;  /* Amarelo claro post-it */
  border: 2px dashed #FFC107;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.anotacaoForm .input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.anotacaoForm .textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  margin-bottom: 0.5rem;
}

.btnAdicionar {
  width: 100%;
  padding: 0.75rem;
  background-color: #FFC107;
  color: #333;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btnAdicionar:hover {
  background-color: #FFB300;
}

.listaAnotacoes {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.anotacaoCard {
  background: #fffbf0;  /* Amarelo post-it */
  border-left: 4px solid #FFC107;
  padding: 1rem;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s;
}

.anotacaoCard:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.anotacaoHeader {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.anotacaoHeader .checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.anotacaoHeader h4 {
  margin: 0;
  font-size: 1rem;
  color: #333;
  flex: 1;
}

.anotacaoHeader h4.feito {
  text-decoration: line-through;
  color: #999;
  opacity: 0.7;
}

.descricao {
  margin: 0.5rem 0 0 2.5rem;
  font-size: 0.9rem;
  color: #666;
  line-height: 1.5;
}

.acoesAnotacao {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  justify-content: flex-end;
}

.btnEditar,
.btnExcluir {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btnEditar {
  background-color: #2196F3;
  color: white;
}

.btnEditar:hover {
  background-color: #1976D2;
}

.btnExcluir {
  background-color: #f44336;
  color: white;
}

.btnExcluir:hover {
  background-color: #d32f2f;
}

.acoesEdicao {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.acoesEdicao button {
  flex: 1;
  padding: 0.6rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.acoesEdicao button:first-child {
  background-color: #4CAF50;
  color: white;
}

.acoesEdicao button:first-child:hover {
  background-color: #388E3C;
}

.acoesEdicao button:last-child {
  background-color: #f44336;
  color: white;
}

.acoesEdicao button:last-child:hover {
  background-color: #d32f2f;
}

/* Badge de anotação no calendário */
.avisoBadge.anotacao {
  background-color: #FFC107 !important;
  border-left: 3px dashed #FF8F00;
}
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Backend
- [ ] Executar migration SQL (criar tabela `anotacao`)
- [ ] Criar `backend/entities/anotacao.model.ts`
- [ ] Criar `backend/repositories/anotacao.repository.ts`
- [ ] Criar `backend/services/anotacao.service.ts`
- [ ] Criar `backend/middlewares/anotacao.middleware.ts`
- [ ] Criar `backend/controllers/anotacao.controller.ts`
- [ ] Criar `routes/anotacao.routes.ts`
- [ ] Registrar rotas em `backend/Server.ts`
- [ ] Testar endpoints com Postman/Insomnia

### Frontend
- [ ] Criar `frontend/types/anotacao.ts`
- [ ] Criar `frontend/lib/api/anotacao.api.ts`
- [ ] Modificar `calendario/page.tsx` (imports, states, handlers)
- [ ] Adicionar seção de anotações no modal do calendário
- [ ] Adicionar estilos em `calendario/page.module.css`
- [ ] Integrar cor amarela (#FFC107) para badge de anotação
- [ ] Testar criação de anotação
- [ ] Testar edição de anotação
- [ ] Testar toggle feito/pendente
- [ ] Testar exclusão de anotação
- [ ] Verificar conversão de timezone (usar `timezone-utils`)

### Testes
- [ ] Criar anotação e verificar no banco (GMT-3)
- [ ] Listar anotações de um período
- [ ] Editar título e descrição
- [ ] Marcar como feito e verificar estado no DB
- [ ] Excluir anotação e verificar remoção
- [ ] Validar permissões (usuário só vê suas próprias anotações)
- [ ] Testar com usuário fora do Brasil (verificar timezone)

---

## 🚀 PRÓXIMOS PASSOS (Após Implementação Básica)

### Melhorias Futuras (Fase 2)
- 🔔 **Notificações**: Avisar quando data da anotação chegar
- 🔁 **Recorrência**: Anotações repetidas (diário, semanal, mensal)
- 🏷️ **Categorias**: Cores personalizadas e tags
- 📎 **Anexos**: Vincular arquivos às anotações (usar `relacaoanexos`)
- 🔍 **Busca**: Pesquisa textual por título/descrição
- 📊 **Dashboard**: Widget com estatísticas de anotações
- ⚡ **Prioridade**: Anotações urgentes, altas, baixas
- 🎨 **Customização**: Cores personalizadas por usuário

---

## 📚 REFERÊNCIAS

- **Modelo Base**: [PLANO_IMPLEMENTACAO_AVISOS_TAREFAS_EVENTOS.md](./PLANO_IMPLEMENTACAO_AVISOS_TAREFAS_EVENTOS.md)
- **Sistema de Timezone**: [SISTEMA_TIMEZONE_GLOBAL.md](./SISTEMA_TIMEZONE_GLOBAL.md)
- **Padrão UUID**: [UUID v4 Specification](https://tools.ietf.org/html/rfc4122)
- **Calendário Frontend**: `frontend/app/dashboard/[escolaGUID]/calendario/page.tsx`

---

## 🤝 PERGUNTAS PARA O DESENVOLVEDOR

**🔴 RESPONDER ANTES DE COMEÇAR A IMPLEMENTAÇÃO:**

1. ❓ Anotações devem ser compartilháveis ou apenas pessoais?
2. ❓ Precisa de categorias/cores personalizadas?
3. ❓ Implementar notificações agora ou deixar para fase 2?
4. ❓ Anotações podem ter anexos?
5. ❓ Qual ícone usar no calendário? (sugestão: 📝)
6. ❓ Cor padrão confirmada como #FFC107 (amarelo)?
7. ❓ Precisa de filtros avançados (busca textual)?
8. ❓ Implementar prioridades (baixa, média, alta, urgente)?
9. ❓ Precisa de recorrência ou deixar para depois?

**💡 Após responder essas questões, a implementação pode começar com segurança!**

---

**FIM DO GUIA DE IMPLEMENTAÇÃO**
