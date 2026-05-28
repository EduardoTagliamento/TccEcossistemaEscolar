# 📋 PLANO DE IMPLEMENTAÇÃO REST API - Tarefa Compartilhada (Sistema de Grupos)

**Data de criação:** 27/05/2026  
**Status:** 🟡 Planejamento Executável  
**Complexidade:** Alta  
**Base funcional:** PLANO_IMPLEMENTACAO_TAREFA_COMPARTILHADA.md  
**Estimativa total:** 40-52 horas (~5-7 dias de trabalho)

---

## 📖 RESUMO EXECUTIVO

Implementação completa de REST API para sistema de tarefas compartilhadas com grupos colaborativos. Cada aluno começa como líder do próprio grupo e pode formar equipes através de convites/solicitações. O sistema valida regras de lotação, gerencia transações atômicas para mudanças de grupo e liderança, e sincroniza status de entrega entre todos os membros.

**Características Principais:**
- ✅ Criação automática de grupos ao criar tarefa compartilhada
- ✅ Sistema de convites e solicitações com validações de lotação
- ✅ Transferência de liderança e expulsão de membros
- ✅ Entrega compartilhada (digital com anexos ou física com checkbox)
- ✅ Auditoria completa de operações em grupos
- ✅ Transações atômicas para garantir consistência de dados

---

## 🎯 VISÃO GERAL

### Objetivo
Implementar 12 endpoints REST para gerenciamento completo de grupos de tarefas, incluindo:
- CRUD de tarefa com suporte a modo compartilhado
- Gerenciamento de grupos (criação, listagem, dissolução)
- Sistema de convites e solicitações de entrada
- Controle de membros (expulsão, transferência de liderança)
- Submissão de tarefa (digital e física) com propagação de status

### Arquitetura Base
```
┌─────────────────────────────────────────────────────────┐
│                    REST API Layer                        │
├─────────────────────────────────────────────────────────┤
│  POST   /api/tarefa              (criar compartilhada)  │
│  PUT    /api/tarefa/:id          (editar limites)       │
│  GET    /api/grupotarefa/:id     (listar grupos)        │
│  POST   /api/grupotarefa/.../convites                   │
│  PATCH  /api/convitegrupotarefa/.../aceitar             │
│  DELETE /api/grupotarefa/.../membros/:cpf               │
│  PATCH  /api/grupotarefa/.../transferir-lider          │
│  POST   /api/grupotarefa/.../anexos/concluir           │
└─────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────┐
│                   Service Layer                          │
├─────────────────────────────────────────────────────────┤
│  • TarefaAcademicaService (modificado)                  │
│  • GrupoTarefaService (novo)                            │
│  • ConviteGrupoTarefaService (novo)                     │
│  • HistoricoGrupoTarefaService (novo)                   │
│                                                          │
│  Regras de Negócio:                                     │
│  - Validação min/max pessoas                            │
│  - Criação automática de grupos                         │
│  - Transações atômicas para mudanças                    │
│  - Propagação de status para grupo                      │
└─────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────┐
│                 Repository Layer                         │
├─────────────────────────────────────────────────────────┤
│  • GrupoTarefaDAO (novo)                                │
│  • UsuarioXGrupoTarefaDAO (novo)                        │
│  • ConviteGrupoTarefaDAO (novo)                         │
│  • HistoricoGrupoTarefaDAO (novo)                       │
│  • TarefaAcademicaDAO (modificado)                      │
└─────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────┐
│                     Database                             │
├─────────────────────────────────────────────────────────┤
│  • grupotarefa                                          │
│  • usuarioxgrupotarefa                                  │
│  • convitegrupotarefa                                   │
│  • historicogrupotarefa                                 │
│  • tarefaacademica (+ 3 colunas)                        │
│  • tarefaacademica_matricula (+ 1 coluna)              │
└─────────────────────────────────────────────────────────┘
```

### Dependências de Implementação
```
✅ tarefaacademica (já implementado)
✅ tarefaacademica_matricula (já implementado)
✅ usuario (já implementado)
✅ turma (já implementado)
✅ matricula (já implementado)
🆕 grupotarefa (NOVO)
🆕 usuarioxgrupotarefa (NOVO)
🆕 convitegrupotarefa (NOVO)
🆕 historicogrupotarefa (NOVO)
```

### Estimativa de Tempo por Fase
- **Fase A - Migrations e Entities:** 6-8 horas
- **Fase B - Repositories (DAO):** 8-10 horas
- **Fase C - Services (regras de negócio):** 12-16 horas
- **Fase D - Middlewares (validação):** 4-6 horas
- **Fase E - Controllers:** 6-8 horas
- **Fase F - Routes e Integração:** 4-6 horas
- **TOTAL:** 40-52 horas (~5-7 dias)

---

## 📦 PRÉ-REQUISITOS

### ✅ Antes de Começar

#### 1. Executar Migrations no Banco

**Migration 1/5 - Alterar tabela `tarefaacademica`**
```sql
-- Adicionar campos de tarefa compartilhada
ALTER TABLE `tccecossistemaescolar`.`tarefaacademica`
ADD COLUMN `TarefaCompartilhada` BOOLEAN NOT NULL DEFAULT FALSE 
  COMMENT 'Se TRUE, tarefa é feita em grupos',
ADD COLUMN `TarefaMinPessoas` INT NULL 
  COMMENT 'Mínimo de pessoas por grupo (obrigatório se compartilhada)',
ADD COLUMN `TarefaMaxPessoas` INT NULL 
  COMMENT 'Máximo de pessoas por grupo (obrigatório se compartilhada)',
ADD CONSTRAINT `CHK_TarefaMinPessoas` CHECK (`TarefaMinPessoas` >= 1),
ADD CONSTRAINT `CHK_TarefaMaxPessoas` CHECK (`TarefaMaxPessoas` >= `TarefaMinPessoas`),
ADD INDEX `idx_tarefa_compartilhada` (`TarefaCompartilhada`);
```

**Migration 2/5 - Alterar tabela `tarefaacademica_matricula`**
```sql
-- Adicionar rastreamento opcional de grupo
ALTER TABLE `tccecossistemaescolar`.`tarefaacademica_matricula`
ADD COLUMN `GrupoTarefaGUID` CHAR(36) NULL 
  COMMENT 'Rastreamento opcional do grupo (para auditoria)',
ADD INDEX `idx_grupo_tarefa` (`GrupoTarefaGUID`);
```

**Migration 3/5 - Criar tabela `grupotarefa`**
```sql
CREATE TABLE IF NOT EXISTS `tccecossistemaescolar`.`grupotarefa` (
  `GrupoTarefaGUID` CHAR(36) NOT NULL,
  `TarefaGUID` CHAR(36) NOT NULL,
  `TurmaGUID` CHAR(36) NOT NULL,
  `UsuarioCPFLider` VARCHAR(14) NOT NULL COMMENT 'CPF do líder do grupo',
  `GrupoNome` VARCHAR(128) NULL COMMENT 'Nome customizado do grupo (opcional)',
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`GrupoTarefaGUID`),
  
  UNIQUE KEY `UK_TarefaTurmaLider` (`TarefaGUID`, `TurmaGUID`, `UsuarioCPFLider`)
    COMMENT 'Um usuário só pode liderar 1 grupo por tarefa/turma',
  
  INDEX `idx_tarefa` (`TarefaGUID`),
  INDEX `idx_turma` (`TurmaGUID`),
  INDEX `idx_lider` (`UsuarioCPFLider`),
  
  CONSTRAINT `FK_GrupoTarefa_Tarefa`
    FOREIGN KEY (`TarefaGUID`) REFERENCES `tarefaacademica`(`TarefaGUID`)
    ON UPDATE CASCADE ON DELETE CASCADE,
    
  CONSTRAINT `FK_GrupoTarefa_Turma`
    FOREIGN KEY (`TurmaGUID`) REFERENCES `turma`(`TurmaGUID`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
    
  CONSTRAINT `FK_GrupoTarefa_Lider`
    FOREIGN KEY (`UsuarioCPFLider`) REFERENCES `usuario`(`UsuarioCPF`)
    ON UPDATE CASCADE ON DELETE RESTRICT
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Migration 4/5 - Criar tabela `usuarioxgrupotarefa`**
```sql
CREATE TABLE IF NOT EXISTS `tccecossistemaescolar`.`usuarioxgrupotarefa` (
  `UsuarioXGrupoTarefaGUID` CHAR(36) NOT NULL,
  `GrupoTarefaGUID` CHAR(36) NOT NULL,
  `UsuarioCPF` VARCHAR(14) NOT NULL COMMENT 'CPF do membro (não-líder)',
  `DataEntrada` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`UsuarioXGrupoTarefaGUID`),
  
  UNIQUE KEY `UK_GrupoUsuario` (`GrupoTarefaGUID`, `UsuarioCPF`)
    COMMENT 'Um usuário não pode estar duplicado no mesmo grupo',
  
  INDEX `idx_grupo` (`GrupoTarefaGUID`),
  INDEX `idx_usuario` (`UsuarioCPF`),
  
  CONSTRAINT `FK_UsuarioXGrupoTarefa_Grupo`
    FOREIGN KEY (`GrupoTarefaGUID`) REFERENCES `grupotarefa`(`GrupoTarefaGUID`)
    ON UPDATE CASCADE ON DELETE CASCADE,
    
  CONSTRAINT `FK_UsuarioXGrupoTarefa_Usuario`
    FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario`(`UsuarioCPF`)
    ON UPDATE CASCADE ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Migration 5/5 - Criar tabela `convitegrupotarefa`**
```sql
CREATE TABLE IF NOT EXISTS `tccecossistemaescolar`.`convitegrupotarefa` (
  `ConviteGUID` CHAR(36) NOT NULL,
  `GrupoTarefaGUID` CHAR(36) NOT NULL,
  `UsuarioCPFConvidado` VARCHAR(14) NOT NULL,
  `ConviteTipo` ENUM('Convite', 'Solicitacao') NOT NULL DEFAULT 'Convite' 
    COMMENT 'Convite=líder convidou, Solicitacao=aluno pediu para entrar',
  `ConviteStatus` ENUM('Pendente', 'Aceito', 'Recusado', 'Expirado') NOT NULL DEFAULT 'Pendente',
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`ConviteGUID`),
  
  INDEX `idx_grupo` (`GrupoTarefaGUID`),
  INDEX `idx_convidado` (`UsuarioCPFConvidado`),
  INDEX `idx_status` (`ConviteStatus`),
  INDEX `idx_tipo` (`ConviteTipo`),
  
  CONSTRAINT `FK_ConviteGrupoTarefa_Grupo`
    FOREIGN KEY (`GrupoTarefaGUID`) REFERENCES `grupotarefa`(`GrupoTarefaGUID`)
    ON UPDATE CASCADE ON DELETE CASCADE,
    
  CONSTRAINT `FK_ConviteGrupoTarefa_Usuario`
    FOREIGN KEY (`UsuarioCPFConvidado`) REFERENCES `usuario`(`UsuarioCPF`)
    ON UPDATE CASCADE ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Migration 6/5 (Opcional) - Criar tabela `historicogrupotarefa`**
```sql
CREATE TABLE IF NOT EXISTS `tccecossistemaescolar`.`historicogrupotarefa` (
  `HistoricoGUID` CHAR(36) NOT NULL,
  `GrupoTarefaGUID` CHAR(36) NOT NULL,
  `HistoricoTipo` ENUM('TransferenciaLider', 'Expulsao', 'Saida', 'Entrada', 'PendenciaDelegada', 'TarefaConcluida') NOT NULL,
  `UsuarioCPFAtor` VARCHAR(14) NOT NULL COMMENT 'Quem executou a ação',
  `UsuarioCPFAlvo` VARCHAR(14) NULL COMMENT 'Quem recebeu a ação (se aplicável)',
  `HistoricoDetalhes` TEXT NULL COMMENT 'JSON com dados adicionais',
  `CreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`HistoricoGUID`),
  
  INDEX `idx_grupo` (`GrupoTarefaGUID`),
  INDEX `idx_ator` (`UsuarioCPFAtor`),
  INDEX `idx_tipo` (`HistoricoTipo`),
  INDEX `idx_data` (`CreatedAt`)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🔧 FASE A: ENTITIES (6-8h)

### Ordem de Criação:
1. grupotarefa.model.ts (1h)
2. usuarioxgrupotarefa.model.ts (45min)
3. convitegrupotarefa.model.ts (1h)
4. historicogrupotarefa.model.ts (45min)
5. Modificar tarefaacademica.model.ts (1-1.5h)

---

### A.1 - Entity GrupoTarefa (1h)

**Arquivo:** `backend/entities/grupotarefa.model.ts`

```typescript
export interface GrupoTarefa {
  GrupoTarefaGUID: string;
  TarefaGUID: string;
  TurmaGUID: string;
  UsuarioCPFLider: string;
  GrupoNome: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface GrupoTarefaCreateDTO {
  TarefaGUID: string;
  TurmaGUID: string;
  UsuarioCPFLider: string;
  GrupoNome?: string;
}

export interface GrupoTarefaUpdateDTO {
  GrupoNome?: string;
  UsuarioCPFLider?: string;  // Para transferência de liderança
}

export interface GrupoTarefaComMembrosDTO {
  GrupoTarefaGUID: string;
  TarefaGUID: string;
  TurmaGUID: string;
  UsuarioCPFLider: string;
  NomeLider: string;
  GrupoNome: string | null;
  Membros: MembroGrupoDTO[];
  TotalMembros: number;
  LimiteMaximo: number;
  PodeConvidar: boolean;
  CreatedAt: Date;
}

export interface MembroGrupoDTO {
  UsuarioCPF: string;
  UsuarioNome: string;
  DataEntrada: Date;
  IsLider: boolean;
}

/**
 * Classe Entity com encapsulamento e validações
 */
export class GrupoTarefaEntity {
  #grupoTarefaGUID: string;
  #tarefaGUID: string;
  #turmaGUID: string;
  #usuarioCPFLider: string;
  #grupoNome: string | null;
  #createdAt: Date;
  #updatedAt: Date;

  constructor(data: GrupoTarefa) {
    this.#grupoTarefaGUID = data.GrupoTarefaGUID;
    this.#tarefaGUID = data.TarefaGUID;
    this.#turmaGUID = data.TurmaGUID;
    this.#usuarioCPFLider = data.UsuarioCPFLider;
    this.#grupoNome = data.GrupoNome;
    this.#createdAt = data.CreatedAt;
    this.#updatedAt = data.UpdatedAt;
  }

  // Getters
  get grupoTarefaGUID(): string { return this.#grupoTarefaGUID; }
  get tarefaGUID(): string { return this.#tarefaGUID; }
  get turmaGUID(): string { return this.#turmaGUID; }
  get usuarioCPFLider(): string { return this.#usuarioCPFLider; }
  get grupoNome(): string | null { return this.#grupoNome; }
  get createdAt(): Date { return this.#createdAt; }
  get updatedAt(): Date { return this.#updatedAt; }

  // Setters
  set grupoNome(value: string | null) {
    if (value && value.length > 128) {
      throw new Error('GrupoNome não pode exceder 128 caracteres');
    }
    this.#grupoNome = value;
  }

  set usuarioCPFLider(value: string) {
    const cpfLimpo = value.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPFLider deve ter 11 dígitos');
    }
    this.#usuarioCPFLider = value;
  }

  // Validações
  validar(): void {
    // UUID do grupo
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(this.#grupoTarefaGUID)) {
      throw new Error('GrupoTarefaGUID inválido (deve ser UUID v4)');
    }

    // UUID da tarefa
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.#tarefaGUID)) {
      throw new Error('TarefaGUID inválido');
    }

    // UUID da turma
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.#turmaGUID)) {
      throw new Error('TurmaGUID inválido');
    }

    // CPF do líder
    const cpfLimpo = this.#usuarioCPFLider.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPFLider deve ter 11 dígitos');
    }

    // Nome do grupo (opcional)
    if (this.#grupoNome && this.#grupoNome.length > 128) {
      throw new Error('GrupoNome não pode exceder 128 caracteres');
    }
  }

  toJSON(): GrupoTarefa {
    return {
      GrupoTarefaGUID: this.#grupoTarefaGUID,
      TarefaGUID: this.#tarefaGUID,
      TurmaGUID: this.#turmaGUID,
      UsuarioCPFLider: this.#usuarioCPFLider,
      GrupoNome: this.#grupoNome,
      CreatedAt: this.#createdAt,
      UpdatedAt: this.#updatedAt
    };
  }
}
```

---

### A.2 - Entity UsuarioXGrupoTarefa (45min)

**Arquivo:** `backend/entities/usuarioxgrupotarefa.model.ts`

```typescript
export interface UsuarioXGrupoTarefa {
  UsuarioXGrupoTarefaGUID: string;
  GrupoTarefaGUID: string;
  UsuarioCPF: string;
  DataEntrada: Date;
  CreatedAt: Date;
}

export interface UsuarioXGrupoTarefaCreateDTO {
  GrupoTarefaGUID: string;
  UsuarioCPF: string;
}

export class UsuarioXGrupoTarefaEntity {
  #usuarioXGrupoTarefaGUID: string;
  #grupoTarefaGUID: string;
  #usuarioCPF: string;
  #dataEntrada: Date;
  #createdAt: Date;

  constructor(data: UsuarioXGrupoTarefa) {
    this.#usuarioXGrupoTarefaGUID = data.UsuarioXGrupoTarefaGUID;
    this.#grupoTarefaGUID = data.GrupoTarefaGUID;
    this.#usuarioCPF = data.UsuarioCPF;
    this.#dataEntrada = data.DataEntrada;
    this.#createdAt = data.CreatedAt;
  }

  get usuarioXGrupoTarefaGUID(): string { return this.#usuarioXGrupoTarefaGUID; }
  get grupoTarefaGUID(): string { return this.#grupoTarefaGUID; }
  get usuarioCPF(): string { return this.#usuarioCPF; }
  get dataEntrada(): Date { return this.#dataEntrada; }
  get createdAt(): Date { return this.#createdAt; }

  validar(): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(this.#usuarioXGrupoTarefaGUID)) {
      throw new Error('UsuarioXGrupoTarefaGUID inválido');
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.#grupoTarefaGUID)) {
      throw new Error('GrupoTarefaGUID inválido');
    }

    const cpfLimpo = this.#usuarioCPF.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPF deve ter 11 dígitos');
    }
  }

  toJSON(): UsuarioXGrupoTarefa {
    return {
      UsuarioXGrupoTarefaGUID: this.#usuarioXGrupoTarefaGUID,
      GrupoTarefaGUID: this.#grupoTarefaGUID,
      UsuarioCPF: this.#usuarioCPF,
      DataEntrada: this.#dataEntrada,
      CreatedAt: this.#createdAt
    };
  }
}
```

---

### A.3 - Entity ConviteGrupoTarefa (1h)

**Arquivo:** `backend/entities/convitegrupotarefa.model.ts`

```typescript
export type ConviteTipo = 'Convite' | 'Solicitacao';
export type ConviteStatus = 'Pendente' | 'Aceito' | 'Recusado' | 'Expirado';

export interface ConviteGrupoTarefa {
  ConviteGUID: string;
  GrupoTarefaGUID: string;
  UsuarioCPFConvidado: string;
  ConviteTipo: ConviteTipo;
  ConviteStatus: ConviteStatus;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ConviteGrupoTarefaCreateDTO {
  GrupoTarefaGUID: string;
  UsuarioCPFConvidado: string;
  ConviteTipo: ConviteTipo;
}

export interface ConviteGrupoTarefaDTO {
  ConviteGUID: string;
  GrupoTarefaGUID: string;
  GrupoNome: string | null;
  NomeLider: string;
  UsuarioCPFConvidado: string;
  NomeConvidado: string;
  ConviteTipo: ConviteTipo;
  ConviteStatus: ConviteStatus;
  TotalMembrosAtual: number;
  LimiteMaximo: number;
  CreatedAt: Date;
}

export class ConviteGrupoTarefaEntity {
  #conviteGUID: string;
  #grupoTarefaGUID: string;
  #usuarioCPFConvidado: string;
  #conviteTipo: ConviteTipo;
  #conviteStatus: ConviteStatus;
  #createdAt: Date;
  #updatedAt: Date;

  constructor(data: ConviteGrupoTarefa) {
    this.#conviteGUID = data.ConviteGUID;
    this.#grupoTarefaGUID = data.GrupoTarefaGUID;
    this.#usuarioCPFConvidado = data.UsuarioCPFConvidado;
    this.#conviteTipo = data.ConviteTipo;
    this.#conviteStatus = data.ConviteStatus;
    this.#createdAt = data.CreatedAt;
    this.#updatedAt = data.UpdatedAt;
  }

  get conviteGUID(): string { return this.#conviteGUID; }
  get grupoTarefaGUID(): string { return this.#grupoTarefaGUID; }
  get usuarioCPFConvidado(): string { return this.#usuarioCPFConvidado; }
  get conviteTipo(): ConviteTipo { return this.#conviteTipo; }
  get conviteStatus(): ConviteStatus { return this.#conviteStatus; }
  get createdAt(): Date { return this.#createdAt; }
  get updatedAt(): Date { return this.#updatedAt; }

  set conviteStatus(value: ConviteStatus) {
    const statusValidos: ConviteStatus[] = ['Pendente', 'Aceito', 'Recusado', 'Expirado'];
    if (!statusValidos.includes(value)) {
      throw new Error(`ConviteStatus inválido: ${value}`);
    }
    this.#conviteStatus = value;
  }

  validar(): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(this.#conviteGUID)) {
      throw new Error('ConviteGUID inválido');
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.#grupoTarefaGUID)) {
      throw new Error('GrupoTarefaGUID inválido');
    }

    const cpfLimpo = this.#usuarioCPFConvidado.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPFConvidado deve ter 11 dígitos');
    }

    const tiposValidos: ConviteTipo[] = ['Convite', 'Solicitacao'];
    if (!tiposValidos.includes(this.#conviteTipo)) {
      throw new Error(`ConviteTipo inválido: ${this.#conviteTipo}`);
    }

    const statusValidos: ConviteStatus[] = ['Pendente', 'Aceito', 'Recusado', 'Expirado'];
    if (!statusValidos.includes(this.#conviteStatus)) {
      throw new Error(`ConviteStatus inválido: ${this.#conviteStatus}`);
    }
  }

  toJSON(): ConviteGrupoTarefa {
    return {
      ConviteGUID: this.#conviteGUID,
      GrupoTarefaGUID: this.#grupoTarefaGUID,
      UsuarioCPFConvidado: this.#usuarioCPFConvidado,
      ConviteTipo: this.#conviteTipo,
      ConviteStatus: this.#conviteStatus,
      CreatedAt: this.#createdAt,
      UpdatedAt: this.#updatedAt
    };
  }
}
```

---

### A.4 - Entity HistoricoGrupoTarefa (45min)

**Arquivo:** `backend/entities/historicogrupotarefa.model.ts`

```typescript
export type HistoricoTipo = 
  | 'TransferenciaLider' 
  | 'Expulsao' 
  | 'Saida' 
  | 'Entrada' 
  | 'PendenciaDelegada'
  | 'TarefaConcluida';

export interface HistoricoGrupoTarefa {
  HistoricoGUID: string;
  GrupoTarefaGUID: string;
  HistoricoTipo: HistoricoTipo;
  UsuarioCPFAtor: string;
  UsuarioCPFAlvo: string | null;
  HistoricoDetalhes: string | null;  // JSON serializado
  CreatedAt: Date;
}

export interface HistoricoGrupoTarefaCreateDTO {
  GrupoTarefaGUID: string;
  HistoricoTipo: HistoricoTipo;
  UsuarioCPFAtor: string;
  UsuarioCPFAlvo?: string;
  HistoricoDetalhes?: Record<string, any>;
}

export class HistoricoGrupoTarefaEntity {
  #historicoGUID: string;
  #grupoTarefaGUID: string;
  #historicoTipo: HistoricoTipo;
  #usuarioCPFAtor: string;
  #usuarioCPFAlvo: string | null;
  #historicoDetalhes: string | null;
  #createdAt: Date;

  constructor(data: HistoricoGrupoTarefa) {
    this.#historicoGUID = data.HistoricoGUID;
    this.#grupoTarefaGUID = data.GrupoTarefaGUID;
    this.#historicoTipo = data.HistoricoTipo;
    this.#usuarioCPFAtor = data.UsuarioCPFAtor;
    this.#usuarioCPFAlvo = data.UsuarioCPFAlvo;
    this.#historicoDetalhes = data.HistoricoDetalhes;
    this.#createdAt = data.CreatedAt;
  }

  get historicoGUID(): string { return this.#historicoGUID; }
  get grupoTarefaGUID(): string { return this.#grupoTarefaGUID; }
  get historicoTipo(): HistoricoTipo { return this.#historicoTipo; }
  get usuarioCPFAtor(): string { return this.#usuarioCPFAtor; }
  get usuarioCPFAlvo(): string | null { return this.#usuarioCPFAlvo; }
  get historicoDetalhes(): string | null { return this.#historicoDetalhes; }
  get createdAt(): Date { return this.#createdAt; }

  validar(): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(this.#historicoGUID)) {
      throw new Error('HistoricoGUID inválido');
    }

    const tiposValidos: HistoricoTipo[] = [
      'TransferenciaLider',
      'Expulsao',
      'Saida',
      'Entrada',
      'PendenciaDelegada',
      'TarefaConcluida'
    ];
    
    if (!tiposValidos.includes(this.#historicoTipo)) {
      throw new Error(`HistoricoTipo inválido: ${this.#historicoTipo}`);
    }
  }

  toJSON(): HistoricoGrupoTarefa {
    return {
      HistoricoGUID: this.#historicoGUID,
      GrupoTarefaGUID: this.#grupoTarefaGUID,
      HistoricoTipo: this.#historicoTipo,
      UsuarioCPFAtor: this.#usuarioCPFAtor,
      UsuarioCPFAlvo: this.#usuarioCPFAlvo,
      HistoricoDetalhes: this.#historicoDetalhes,
      CreatedAt: this.#createdAt
    };
  }
}
```

---

### A.5 - Modificar Entity TarefaAcademica (1-1.5h)

**Arquivo:** `backend/entities/tarefaacademica.model.ts`

**Adicionar campos:**
```typescript
export interface TarefaAcademica {
  // ... campos existentes ...
  
  // NOVOS CAMPOS
  TarefaCompartilhada: boolean;
  TarefaMinPessoas: number | null;
  TarefaMaxPessoas: number | null;
}

// Adicionar validação na classe TarefaAcademicaEntity
validarCompartilhada(): void {
  if (this.#tarefaCompartilhada) {
    // Se compartilhada, min e max são obrigatórios
    if (this.#tarefaMinPessoas === null || this.#tarefaMaxPessoas === null) {
      throw new Error('Tarefa compartilhada requer TarefaMinPessoas e TarefaMaxPessoas');
    }
    
    if (this.#tarefaMinPessoas < 1) {
      throw new Error('TarefaMinPessoas deve ser >= 1');
    }
    
    if (this.#tarefaMaxPessoas < this.#tarefaMinPessoas) {
      throw new Error('TarefaMaxPessoas deve ser >= TarefaMinPessoas');
    }
  } else {
    // Se não compartilhada, min e max devem ser null
    if (this.#tarefaMinPessoas !== null || this.#tarefaMaxPessoas !== null) {
      throw new Error('Tarefa individual não pode ter limites de pessoas');
    }
  }
}
```

---

## 🔧 FASE B: REPOSITORIES (8-10h)

### Ordem de Criação:
1. grupotarefa.repository.ts (2-3h)
2. usuarioxgrupotarefa.repository.ts (1.5-2h)
3. convitegrupotarefa.repository.ts (2-2.5h)
4. historicogrupotarefa.repository.ts (1-1.5h)
5. Modificar tarefaacademica.repository.ts (1h)

---

### B.1 - Repository GrupoTarefa (2-3h)

**Arquivo:** `backend/repositories/grupotarefa.repository.ts`

```typescript
import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import {
  GrupoTarefa,
  GrupoTarefaCreateDTO,
  GrupoTarefaUpdateDTO,
  GrupoTarefaComMembrosDTO,
  MembroGrupoDTO
} from '../entities/grupotarefa.model';

interface GrupoTarefaRow extends RowDataPacket {
  GrupoTarefaGUID: string;
  TarefaGUID: string;
  TurmaGUID: string;
  UsuarioCPFLider: string;
  GrupoNome: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface GrupoTarefaFilters {
  TarefaGUID?: string;
  TurmaGUID?: string;
  UsuarioCPFLider?: string;
}

export class GrupoTarefaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log('⬆️  GrupoTarefaDAO.constructor()');
    this.#database = databaseInstance;
  }

  // CREATE
  async create(data: GrupoTarefaCreateDTO): Promise<GrupoTarefa> {
    console.log('🟢 GrupoTarefaDAO.create()');
    
    const grupoGUID = uuidv4();
    const nomeDefault = data.GrupoNome || null;
    
    const query = `
      INSERT INTO grupotarefa (
        GrupoTarefaGUID,
        TarefaGUID,
        TurmaGUID,
        UsuarioCPFLider,
        GrupoNome
      ) VALUES (?, ?, ?, ?, ?)
    `;
    
    const pool = await this.#database.getPool();
    await pool.execute(query, [
      grupoGUID,
      data.TarefaGUID,
      data.TurmaGUID,
      data.UsuarioCPFLider,
      nomeDefault
    ]);
    
    const grupoC created = await this.findById(grupoGUID);
    if (!grupoCriado) {
      throw new Error('Erro ao buscar grupo recém-criado');
    }
    
    return grupoCriado;
  }

  // READ - FIND BY ID
  async findById(guid: string): Promise<GrupoTarefa | null> {
    console.log('🟢 GrupoTarefaDAO.findById()');
    
    const query = `
      SELECT * FROM grupotarefa
      WHERE GrupoTarefaGUID = ?
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<GrupoTarefaRow[]>(query, [guid]);
    
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  // READ - FIND ALL (com filtros)
  async findAll(filters: GrupoTarefaFilters = {}): Promise<GrupoTarefa[]> {
    console.log('🟢 GrupoTarefaDAO.findAll()');
    
    let query = `SELECT * FROM grupotarefa WHERE 1=1`;
    const params: any[] = [];
    
    if (filters.TarefaGUID) {
      query += ` AND TarefaGUID = ?`;
      params.push(filters.TarefaGUID);
    }
    
    if (filters.TurmaGUID) {
      query += ` AND TurmaGUID = ?`;
      params.push(filters.TurmaGUID);
    }
    
    if (filters.UsuarioCPFLider) {
      query += ` AND UsuarioCPFLider = ?`;
      params.push(filters.UsuarioCPFLider);
    }
    
    query += ` ORDER BY CreatedAt ASC`;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<GrupoTarefaRow[]>(query, params);
    
    return rows.map(row => this.mapRow(row));
  }

  // READ - FIND COM MEMBROS (JOIN com usuarioxgrupotarefa + usuario)
  async findByIdComMembros(grupoGUID: string): Promise<GrupoTarefaComMembrosDTO | null> {
    console.log('🟢 GrupoTarefaDAO.findByIdComMembros()');
    
    const query = `
      SELECT 
        gt.GrupoTarefaGUID,
        gt.TarefaGUID,
        gt.TurmaGUID,
        gt.UsuarioCPFLider,
        gt.GrupoNome,
        gt.CreatedAt,
        u_lider.UsuarioNome AS NomeLider,
        t.TarefaMaxPessoas AS LimiteMaximo,
        -- Membros não-líderes
        uxgt.UsuarioCPF AS MembroCPF,
        u_membro.UsuarioNome AS MembroNome,
        uxgt.DataEntrada AS MembroDataEntrada
      FROM grupotarefa gt
      INNER JOIN usuario u_lider ON u_lider.UsuarioCPF = gt.UsuarioCPFLider
      INNER JOIN tarefaacademica t ON t.TarefaGUID = gt.TarefaGUID
      LEFT JOIN usuarioxgrupotarefa uxgt ON uxgt.GrupoTarefaGUID = gt.GrupoTarefaGUID
      LEFT JOIN usuario u_membro ON u_membro.UsuarioCPF = uxgt.UsuarioCPF
      WHERE gt.GrupoTarefaGUID = ?
      ORDER BY uxgt.DataEntrada ASC
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID]);
    
    if (rows.length === 0) return null;
    
    const primeiraLinha = rows[0];
    const membros: MembroGrupoDTO[] = [];
    
    // Adicionar líder
    membros.push({
      UsuarioCPF: primeiraLinha.UsuarioCPFLider,
      UsuarioNome: primeiraLinha.NomeLider,
      DataEntrada: primeiraLinha.CreatedAt,
      IsLider: true
    });
    
    // Adicionar membros não-líderes
    rows.forEach(row => {
      if (row.MembroCPF) {
        membros.push({
          UsuarioCPF: row.MembroCPF,
          UsuarioNome: row.MembroNome,
          DataEntrada: row.MembroDataEntrada,
          IsLider: false
        });
      }
    });
    
    const totalMembros = membros.length;
    const limiteMaximo = primeiraLinha.LimiteMaximo;
    
    return {
      GrupoTarefaGUID: primeiraLinha.GrupoTarefaGUID,
      TarefaGUID: primeiraLinha.TarefaGUID,
      TurmaGUID: primeiraLinha.TurmaGUID,
      UsuarioCPFLider: primeiraLinha.UsuarioCPFLider,
      NomeLider: primeiraLinha.NomeLider,
      GrupoNome: primeiraLinha.GrupoNome,
      Membros: membros,
      TotalMembros: totalMembros,
      LimiteMaximo: limiteMaximo,
      PodeConvidar: totalMembros < limiteMaximo,
      CreatedAt: primeiraLinha.CreatedAt
    };
  }

  // UPDATE
  async update(guid: string, data: GrupoTarefaUpdateDTO): Promise<GrupoTarefa | null> {
    console.log('🟢 GrupoTarefaDAO.update()');
    
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.GrupoNome !== undefined) {
      updates.push('GrupoNome = ?');
      params.push(data.GrupoNome);
    }
    
    if (data.UsuarioCPFLider !== undefined) {
      updates.push('UsuarioCPFLider = ?');
      params.push(data.UsuarioCPFLider);
    }
    
    if (updates.length === 0) {
      return await this.findById(guid);
    }
    
    params.push(guid);
    
    const query = `
      UPDATE grupotarefa 
      SET ${updates.join(', ')}
      WHERE GrupoTarefaGUID = ?
    `;
    
    const pool = await this.#database.getPool();
    await pool.execute(query, params);
    
    return await this.findById(guid);
  }

  // DELETE
  async delete(guid: string): Promise<boolean> {
    console.log('🟢 GrupoTarefaDAO.delete()');
    
    const query = `DELETE FROM grupotarefa WHERE GrupoTarefaGUID = ?`;
    
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [guid]);
    
    return result.affectedRows > 0;
  }

  // AUXILIAR - Contar membros do grupo (líder + membros)
  async contarMembros(grupoGUID: string): Promise<number> {
    console.log('🟢 GrupoTarefaDAO.contarMembros()');
    
    const query = `
      SELECT 
        (1 + COUNT(uxgt.UsuarioCPF)) AS TotalMembros
      FROM grupotarefa gt
      LEFT JOIN usuarioxgrupotarefa uxgt ON uxgt.GrupoTarefaGUID = gt.GrupoTarefaGUID
      WHERE gt.GrupoTarefaGUID = ?
      GROUP BY gt.GrupoTarefaGUID
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID]);
    
    return rows.length > 0 ? rows[0].TotalMembros : 0;
  }

  // AUXILIAR - Buscar grupo onde usuário é líder (por tarefa)
  async findGrupoOndeEhLider(usuarioCPF: string, tarefaGUID: string): Promise<GrupoTarefa | null> {
    console.log('🟢 GrupoTarefaDAO.findGrupoOndeEhLider()');
    
    const query = `
      SELECT * FROM grupotarefa
      WHERE UsuarioCPFLider = ? AND TarefaGUID = ?
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<GrupoTarefaRow[]>(query, [usuarioCPF, tarefaGUID]);
    
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  // AUXILIAR - Verificar se usuário pertence ao grupo (líder ou membro)
  async usuarioPertenceAoGrupo(usuarioCPF: string, grupoGUID: string): Promise<boolean> {
    console.log('🟢 GrupoTarefaDAO.usuarioPertenceAoGrupo()');
    
    const query = `
      SELECT 1 FROM grupotarefa WHERE GrupoTarefaGUID = ? AND UsuarioCPFLider = ?
      UNION
      SELECT 1 FROM usuarioxgrupotarefa WHERE GrupoTarefaGUID = ? AND UsuarioCPF = ?
      LIMIT 1
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID, usuarioCPF, grupoGUID, usuarioCPF]);
    
    return rows.length > 0;
  }

  private mapRow(row: GrupoTarefaRow): GrupoTarefa {
    return {
      GrupoTarefaGUID: row.GrupoTarefaGUID,
      TarefaGUID: row.TarefaGUID,
      TurmaGUID: row.TurmaGUID,
      UsuarioCPFLider: row.UsuarioCPFLider,
      GrupoNome: row.GrupoNome,
      CreatedAt: row.CreatedAt,
      UpdatedAt: row.UpdatedAt
    };
  }
}
```

---

### B.2 - Repository UsuarioXGrupoTarefa (1.5-2h)

**Arquivo:** `backend/repositories/usuarioxgrupotarefa.repository.ts`

```typescript
import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import {
  UsuarioXGrupoTarefa,
  UsuarioXGrupoTarefaCreateDTO
} from '../entities/usuarioxgrupotarefa.model';

interface UsuarioXGrupoTarefaRow extends RowDataPacket {
  UsuarioXGrupoTarefaGUID: string;
  GrupoTarefaGUID: string;
  UsuarioCPF: string;
  DataEntrada: Date;
  CreatedAt: Date;
}

export class UsuarioXGrupoTarefaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log('⬆️  UsuarioXGrupoTarefaDAO.constructor()');
    this.#database = databaseInstance;
  }

  // CREATE
  async create(data: UsuarioXGrupoTarefaCreateDTO): Promise<UsuarioXGrupoTarefa> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.create()');
    
    const vinculoGUID = uuidv4();
    
    const query = `
      INSERT INTO usuarioxgrupotarefa (
        UsuarioXGrupoTarefaGUID,
        GrupoTarefaGUID,
        UsuarioCPF
      ) VALUES (?, ?, ?)
    `;
    
    const pool = await this.#database.getPool();
    await pool.execute(query, [
      vinculoGUID,
      data.GrupoTarefaGUID,
      data.UsuarioCPF
    ]);
    
    const vinculoCriado = await this.findById(vinculoGUID);
    if (!vinculoCriado) {
      throw new Error('Erro ao buscar vínculo recém-criado');
    }
    
    return vinculoCriado;
  }

  // READ - FIND BY ID
  async findById(guid: string): Promise<UsuarioXGrupoTarefa | null> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.findById()');
    
    const query = `
      SELECT * FROM usuarioxgrupotarefa
      WHERE UsuarioXGrupoTarefaGUID = ?
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<UsuarioXGrupoTarefaRow[]>(query, [guid]);
    
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  // READ - FIND BY GRUPO
  async findByGrupo(grupoGUID: string): Promise<UsuarioXGrupoTarefa[]> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.findByGrupo()');
    
    const query = `
      SELECT * FROM usuarioxgrupotarefa
      WHERE GrupoTarefaGUID = ?
      ORDER BY DataEntrada ASC
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<UsuarioXGrupoTarefaRow[]>(query, [grupoGUID]);
    
    return rows.map(row => this.mapRow(row));
  }

  // READ - FIND BY USUARIO
  async findByUsuario(usuarioCPF: string): Promise<UsuarioXGrupoTarefa[]> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.findByUsuario()');
    
    const query = `
      SELECT * FROM usuarioxgrupotarefa
      WHERE UsuarioCPF = ?
      ORDER BY CreatedAt DESC
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<UsuarioXGrupoTarefaRow[]>(query, [usuarioCPF]);
    
    return rows.map(row => this.mapRow(row));
  }

  // DELETE - Remover membro do grupo
  async deleteByGrupoAndUsuario(grupoGUID: string, usuarioCPF: string): Promise<boolean> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.deleteByGrupoAndUsuario()');
    
    const query = `
      DELETE FROM usuarioxgrupotarefa 
      WHERE GrupoTarefaGUID = ? AND UsuarioCPF = ?
    `;
    
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [grupoGUID, usuarioCPF]);
    
    return result.affectedRows > 0;
  }

  // DELETE - Remover todos membros do grupo
  async deleteByGrupo(grupoGUID: string): Promise<number> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.deleteByGrupo()');
    
    const query = `DELETE FROM usuarioxgrupotarefa WHERE GrupoTarefaGUID = ?`;
    
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [grupoGUID]);
    
    return result.affectedRows;
  }

  // AUXILIAR - Verificar se usuário é membro (não-líder) do grupo
  async isMembroNaoLider(usuarioCPF: string, grupoGUID: string): Promise<boolean> {
    console.log('🟢 UsuarioXGrupoTarefaDAO.isMembroNaoLider()');
    
    const query = `
      SELECT 1 FROM usuarioxgrupotarefa
      WHERE GrupoTarefaGUID = ? AND UsuarioCPF = ?
      LIMIT 1
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID, usuarioCPF]);
    
    return rows.length > 0;
  }

  private mapRow(row: UsuarioXGrupoTarefaRow): UsuarioXGrupoTarefa {
    return {
      UsuarioXGrupoTarefaGUID: row.UsuarioXGrupoTarefaGUID,
      GrupoTarefaGUID: row.GrupoTarefaGUID,
      UsuarioCPF: row.UsuarioCPF,
      DataEntrada: row.DataEntrada,
      CreatedAt: row.CreatedAt
    };
  }
}
```

---

### B.3 - Repository ConviteGrupoTarefa (2-2.5h)

**Arquivo:** `backend/repositories/convitegrupotarefa.repository.ts`

```typescript
import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import {
  ConviteGrupoTarefa,
  ConviteGrupoTarefaCreateDTO,
  ConviteGrupoTarefaDTO,
  ConviteTipo,
  ConviteStatus
} from '../entities/convitegrupotarefa.model';

interface ConviteGrupoTarefaRow extends RowDataPacket {
  ConviteGUID: string;
  GrupoTarefaGUID: string;
  UsuarioCPFConvidado: string;
  ConviteTipo: ConviteTipo;
  ConviteStatus: ConviteStatus;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ConviteFilters {
  GrupoTarefaGUID?: string;
  UsuarioCPFConvidado?: string;
  ConviteTipo?: ConviteTipo;
  ConviteStatus?: ConviteStatus;
}

export class ConviteGrupoTarefaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log('⬆️  ConviteGrupoTarefaDAO.constructor()');
    this.#database = databaseInstance;
  }

  // CREATE
  async create(data: ConviteGrupoTarefaCreateDTO): Promise<ConviteGrupoTarefa> {
    console.log('🟢 ConviteGrupoTarefaDAO.create()');
    
    const conviteGUID = uuidv4();
    
    const query = `
      INSERT INTO convitegrupotarefa (
        ConviteGUID,
        GrupoTarefaGUID,
        UsuarioCPFConvidado,
        ConviteTipo
      ) VALUES (?, ?, ?, ?)
    `;
    
    const pool = await this.#database.getPool();
    await pool.execute(query, [
      conviteGUID,
      data.GrupoTarefaGUID,
      data.UsuarioCPFConvidado,
      data.ConviteTipo
    ]);
    
    const conviteCriado = await this.findById(conviteGUID);
    if (!conviteCriado) {
      throw new Error('Erro ao buscar convite recém-criado');
    }
    
    return conviteCriado;
  }

  // READ - FIND BY ID
  async findById(guid: string): Promise<ConviteGrupoTarefa | null> {
    console.log('🟢 ConviteGrupoTarefaDAO.findById()');
    
    const query = `
      SELECT * FROM convitegrupotarefa
      WHERE ConviteGUID = ?
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<ConviteGrupoTarefaRow[]>(query, [guid]);
    
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  // READ - FIND ALL (com filtros)
  async findAll(filters: ConviteFilters = {}): Promise<ConviteGrupoTarefa[]> {
    console.log('🟢 ConviteGrupoTarefaDAO.findAll()');
    
    let query = `SELECT * FROM convitegrupotarefa WHERE 1=1`;
    const params: any[] = [];
    
    if (filters.GrupoTarefaGUID) {
      query += ` AND GrupoTarefaGUID = ?`;
      params.push(filters.GrupoTarefaGUID);
    }
    
    if (filters.UsuarioCPFConvidado) {
      query += ` AND UsuarioCPFConvidado = ?`;
      params.push(filters.UsuarioCPFConvidado);
    }
    
    if (filters.ConviteTipo) {
      query += ` AND ConviteTipo = ?`;
      params.push(filters.ConviteTipo);
    }
    
    if (filters.ConviteStatus) {
      query += ` AND ConviteStatus = ?`;
      params.push(filters.ConviteStatus);
    }
    
    query += ` ORDER BY CreatedAt DESC`;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<ConviteGrupoTarefaRow[]>(query, params);
    
    return rows.map(row => this.mapRow(row));
  }

  // READ - FIND COM DETALHES (JOIN com grupo, tarefa, usuários)
  async findByIdComDetalhes(conviteGUID: string): Promise<ConviteGrupoTarefaDTO | null> {
    console.log('🟢 ConviteGrupoTarefaDAO.findByIdComDetalhes()');
    
    const query = `
      SELECT 
        c.ConviteGUID,
        c.GrupoTarefaGUID,
        c.UsuarioCPFConvidado,
        c.ConviteTipo,
        c.ConviteStatus,
        c.CreatedAt,
        gt.GrupoNome,
        u_lider.UsuarioNome AS NomeLider,
        u_convidado.UsuarioNome AS NomeConvidado,
        t.TarefaMaxPessoas AS LimiteMaximo,
        (1 + COUNT(uxgt.UsuarioCPF)) AS TotalMembrosAtual
      FROM convitegrupotarefa c
      INNER JOIN grupotarefa gt ON gt.GrupoTarefaGUID = c.GrupoTarefaGUID
      INNER JOIN tarefaacademica t ON t.TarefaGUID = gt.TarefaGUID
      INNER JOIN usuario u_lider ON u_lider.UsuarioCPF = gt.UsuarioCPFLider
      INNER JOIN usuario u_convidado ON u_convidado.UsuarioCPF = c.UsuarioCPFConvidado
      LEFT JOIN usuarioxgrupotarefa uxgt ON uxgt.GrupoTarefaGUID = gt.GrupoTarefaGUID
      WHERE c.ConviteGUID = ?
      GROUP BY c.ConviteGUID
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [conviteGUID]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    
    return {
      ConviteGUID: row.ConviteGUID,
      GrupoTarefaGUID: row.GrupoTarefaGUID,
      GrupoNome: row.GrupoNome,
      NomeLider: row.NomeLider,
      UsuarioCPFConvidado: row.UsuarioCPFConvidado,
      NomeConvidado: row.NomeConvidado,
      ConviteTipo: row.ConviteTipo,
      ConviteStatus: row.ConviteStatus,
      TotalMembrosAtual: row.TotalMembrosAtual,
      LimiteMaximo: row.LimiteMaximo,
      CreatedAt: row.CreatedAt
    };
  }

  // UPDATE STATUS
  async updateStatus(guid: string, status: ConviteStatus): Promise<ConviteGrupoTarefa | null> {
    console.log('🟢 ConviteGrupoTarefaDAO.updateStatus()');
    
    const query = `
      UPDATE convitegrupotarefa 
      SET ConviteStatus = ?
      WHERE ConviteGUID = ?
    `;
    
    const pool = await this.#database.getPool();
    await pool.execute(query, [status, guid]);
    
    return await this.findById(guid);
  }

  // DELETE
  async delete(guid: string): Promise<boolean> {
    console.log('🟢 ConviteGrupoTarefaDAO.delete()');
    
    const query = `DELETE FROM convitegrupotarefa WHERE ConviteGUID = ?`;
    
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [guid]);
    
    return result.affectedRows > 0;
  }

  // AUXILIAR - Verificar se convite/solicitação já existe (pendente)
  async existeConvitePendente(grupoGUID: string, usuarioCPF: string): Promise<boolean> {
    console.log('🟢 ConviteGrupoTarefaDAO.existeConvitePendente()');
    
    const query = `
      SELECT 1 FROM convitegrupotarefa
      WHERE GrupoTarefaGUID = ? 
        AND UsuarioCPFConvidado = ?
        AND ConviteStatus = 'Pendente'
      LIMIT 1
    `;
    
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [grupoGUID, usuarioCPF]);
    
    return rows.length > 0;
  }

  // AUXILIAR - Excluir convites pendentes do grupo (quando grupo enche)
  async deletePendentesByGrupo(grupoGUID: string): Promise<number> {
    console.log('🟢 ConviteGrupoTarefaDAO.deletePendentesByGrupo()');
    
    const query = `
      DELETE FROM convitegrupotarefa 
      WHERE GrupoTarefaGUID = ? AND ConviteStatus = 'Pendente'
    `;
    
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [grupoGUID]);
    
    return result.affectedRows;
  }

  private mapRow(row: ConviteGrupoTarefaRow): ConviteGrupoTarefa {
    return {
      ConviteGUID: row.ConviteGUID,
      GrupoTarefaGUID: row.GrupoTarefaGUID,
      UsuarioCPFConvidado: row.UsuarioCPFConvidado,
      ConviteTipo: row.ConviteTipo,
      ConviteStatus: row.ConviteStatus,
      CreatedAt: row.CreatedAt,
      UpdatedAt: row.UpdatedAt
    };
  }
}
```

---

## 🔧 FASE C: SERVICES (12-16h)

### Ordem de Criação:
1. grupotarefa.service.ts (6-8h) - **CRÍTICO**
2. convitegrupotarefa.service.ts (4-5h)
3. historicogrupotarefa.service.ts (2-3h)

---

### C.1 - Service GrupoTarefa (6-8h) - **NÚCLEO DO SISTEMA**

**Arquivo:** `backend/services/grupotarefa.service.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import { GrupoTarefaDAO } from '../repositories/grupotarefa.repository';
import { UsuarioXGrupoTarefaDAO } from '../repositories/usuarioxgrupotarefa.repository';
import { TarefaAcademicaDAO } from '../repositories/tarefaacademica.repository';
import { MatriculaDAO } from '../repositories/matricula.repository';
import { TarefaAcademicaMatriculaDAO } from '../repositories/tarefaacademica-matricula.repository';
import { HistoricoGrupoTarefaService } from './historicogrupotarefa.service';
import ErrorResponse from '../utils/ErrorResponse';
import MysqlDatabase from '../database/MysqlDatabase';
import {
  GrupoTarefaComMembrosDTO,
  GrupoTarefaCreateDTO
} from '../entities/grupotarefa.model';

export default class GrupoTarefaService {
  #grupoTarefaDAO: GrupoTarefaDAO;
  #usuarioXGrupoDAO: UsuarioXGrupoTarefaDAO;
  #tarefaDAO: TarefaAcademicaDAO;
  #matriculaDAO: MatriculaDAO;
  #tarefaMatriculaDAO: TarefaAcademicaMatriculaDAO;
  #historicoService: HistoricoGrupoTarefaService;
  #database: MysqlDatabase;

  constructor(
    grupoTarefaDAO: GrupoTarefaDAO,
    usuarioXGrupoDAO: UsuarioXGrupoTarefaDAO,
    tarefaDAO: TarefaAcademicaDAO,
    matriculaDAO: MatriculaDAO,
    tarefaMatriculaDAO: TarefaAcademicaMatriculaDAO,
    historicoService: HistoricoGrupoTarefaService,
    database: MysqlDatabase
  ) {
    console.log('⬆️  GrupoTarefaService.constructor()');
    this.#grupoTarefaDAO = grupoTarefaDAO;
    this.#usuarioXGrupoDAO = usuarioXGrupoDAO;
    this.#tarefaDAO = tarefaDAO;
    this.#matriculaDAO = matriculaDAO;
    this.#tarefaMatriculaDAO = tarefaMatriculaDAO;
    this.#historicoService = historicoService;
    this.#database = database;
  }

  /**
   * CRIAR GRUPOS AUTOMATICAMENTE ao criar tarefa compartilhada
   * Chamado por TarefaAcademicaService.criarTarefa()
   * 
   * @returns Quantidade de grupos criados
   */
  async criarGruposAutomaticos(tarefaGUID: string, turmasGUID: string[]): Promise<number> {
    console.log('🟣 GrupoTarefaService.criarGruposAutomaticos()');

    // 1. Validar tarefa
    const tarefa = await this.#tarefaDAO.findById(tarefaGUID);
    if (!tarefa) {
      throw new ErrorResponse(404, 'Tarefa não encontrada');
    }

    if (!tarefa.TarefaCompartilhada) {
      throw new ErrorResponse(400, 'Tarefa não é compartilhada');
    }

    let gruposCriados = 0;

    // 2. Para cada turma, criar grupos para todos os alunos matriculados
    for (const turmaGUID of turmasGUID) {
      const matriculas = await this.#matriculaDAO.findAll({
        TurmaGUID: turmaGUID,
        MatriculaStatus: 'Ativa'
      });

      for (const matricula of matriculas) {
        try {
          // Criar grupo com aluno como líder
          const grupoData: GrupoTarefaCreateDTO = {
            TarefaGUID: tarefaGUID,
            TurmaGUID: turmaGUID,
            UsuarioCPFLider: matricula.UsuarioCPF,
            GrupoNome: null  // Será gerado automaticamente no frontend
          };

          await this.#grupoTarefaDAO.create(grupoData);
          gruposCriados++;
        } catch (error: any) {
          console.error(`Erro ao criar grupo para ${matricula.UsuarioCPF}:`, error.message);
          // Continuar criando outros grupos mesmo se um falhar
        }
      }
    }

    return gruposCriados;
  }

  /**
   * LISTAR GRUPOS de uma tarefa
   */
  async listarGruposDaTarefa(tarefaGUID: string, usuarioCPF: string): Promise<GrupoTarefaComMembrosDTO[]> {
    console.log('🟣 GrupoTarefaService.listarGruposDaTarefa()');

    // 1. Validar acesso do usuário à tarefa
    const tarefa = await this.#tarefaDAO.findById(tarefaGUID);
    if (!tarefa) {
      throw new ErrorResponse(404, 'Tarefa não encontrada');
    }

    // 2. Buscar grupos
    const grupos = await this.#grupoTarefaDAO.findAll({ TarefaGUID: tarefaGUID });

    // 3. Buscar detalhes de cada grupo (com membros)
    const gruposDetalhados: GrupoTarefaComMembrosDTO[] = [];
    
    for (const grupo of grupos) {
      const grupoComMembros = await this.#grupoTarefaDAO.findByIdComMembros(grupo.GrupoTarefaGUID);
      if (grupoComMembros) {
        gruposDetalhados.push(grupoComMembros);
      }
    }

    return gruposDetalhados;
  }

  /**
   * BUSCAR GRUPO ESPECÍFICO (com membros)
   */
  async buscarGrupo(grupoGUID: string, usuarioCPF: string): Promise<GrupoTarefaComMembrosDTO> {
    console.log('🟣 GrupoTarefaService.buscarGrupo()');

    const grupo = await this.#grupoTarefaDAO.findByIdComMembros(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    // Validar se usuário tem acesso ao grupo (é membro ou líder)
    const temAcesso = await this.#grupoTarefaDAO.usuarioPertenceAoGrupo(usuarioCPF, grupoGUID);
    if (!temAcesso) {
      throw new ErrorResponse(403, 'Você não tem acesso a este grupo');
    }

    return grupo;
  }

  /**
   * EXPULSAR MEMBRO do grupo
   * Apenas líder pode expulsar
   * Membro expulso recebe grupo próprio novamente
   */
  async expulsarMembro(
    grupoGUID: string,
    membroCPF: string,
    liderCPF: string
  ): Promise<{ mensagem: string; novoGrupoGUID: string }> {
    console.log('🟣 GrupoTarefaService.expulsarMembro()');

    const pool = await this.#database.getPool();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Validar grupo
      const grupo = await this.#grupoTarefaDAO.findById(grupoGUID);
      if (!grupo) {
        throw new ErrorResponse(404, 'Grupo não encontrado');
      }

      // 2. Validar se quem expulsa é o líder
      if (grupo.UsuarioCPFLider !== liderCPF) {
        throw new ErrorResponse(403, 'Apenas o líder pode expulsar membros');
      }

      // 3. Validar se membro a ser expulso não é o líder
      if (membroCPF === liderCPF) {
        throw new ErrorResponse(400, 'Líder não pode expulsar a si mesmo');
      }

      // 4. Validar se membro realmente pertence ao grupo
      const isMembro = await this.#usuarioXGrupoDAO.isMembroNaoLider(membroCPF, grupoGUID);
      if (!isMembro) {
        throw new ErrorResponse(404, 'Usuário não é membro deste grupo');
      }

      // 5. Remover membro do grupo
      await this.#usuarioXGrupoDAO.deleteByGrupoAndUsuario(grupoGUID, membroCPF);

      // 6. Criar novo grupo para o membro expulso (ele vira líder do próprio grupo)
      const novoGrupoData: GrupoTarefaCreateDTO = {
        TarefaGUID: grupo.TarefaGUID,
        TurmaGUID: grupo.TurmaGUID,
        UsuarioCPFLider: membroCPF,
        GrupoNome: null
      };
      
      const novoGrupo = await this.#grupoTarefaDAO.create(novoGrupoData);

      // 7. Registrar no histórico
      await this.#historicoService.registrar({
        GrupoTarefaGUID: grupoGUID,
        HistoricoTipo: 'Expulsao',
        UsuarioCPFAtor: liderCPF,
        UsuarioCPFAlvo: membroCPF,
        HistoricoDetalhes: {
          novoGrupoGUID: novoGrupo.GrupoTarefaGUID
        }
      });

      await connection.commit();

      return {
        mensagem: 'Membro expulso com sucesso',
        novoGrupoGUID: novoGrupo.GrupoTarefaGUID
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * TRANSFERIR LIDERANÇA
   * Líder atual designa novo líder
   * Transação: líder vira membro, membro vira líder
   */
  async transferirLideranca(
    grupoGUID: string,
    novoLiderCPF: string,
    liderAtualCPF: string
  ): Promise<{ mensagem: string }> {
    console.log('🟣 GrupoTarefaService.transferirLideranca()');

    const pool = await this.#database.getPool();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Validar grupo
      const grupo = await this.#grupoTarefaDAO.findById(grupoGUID);
      if (!grupo) {
        throw new ErrorResponse(404, 'Grupo não encontrado');
      }

      // 2. Validar se quem transfere é o líder atual
      if (grupo.UsuarioCPFLider !== liderAtualCPF) {
        throw new ErrorResponse(403, 'Apenas o líder pode transferir a liderança');
      }

      // 3. Validar se novo líder é membro do grupo
      const isMembroNaoLider = await this.#usuarioXGrupoDAO.isMembroNaoLider(novoLiderCPF, grupoGUID);
      if (!isMembroNaoLider) {
        throw new ErrorResponse(400, 'Novo líder deve ser um membro do grupo');
      }

      // 4. TRANSAÇÃO:
      //    a) Remover novo líder de usuarioxgrupotarefa
      await this.#usuarioXGrupoDAO.deleteByGrupoAndUsuario(grupoGUID, novoLiderCPF);

      //    b) Adicionar líder antigo em usuarioxgrupotarefa
      await this.#usuarioXGrupoDAO.create({
        GrupoTarefaGUID: grupoGUID,
        UsuarioCPF: liderAtualCPF
      });

      //    c) Atualizar GrupoTarefa.UsuarioCPFLider
      await this.#grupoTarefaDAO.update(grupoGUID, {
        UsuarioCPFLider: novoLiderCPF
      });

      // 5. Registrar no histórico
      await this.#historicoService.registrar({
        GrupoTarefaGUID: grupoGUID,
        HistoricoTipo: 'TransferenciaLider',
        UsuarioCPFAtor: liderAtualCPF,
        UsuarioCPFAlvo: novoLiderCPF
      });

      await connection.commit();

      return {
        mensagem: 'Liderança transferida com sucesso'
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * ATUALIZAR NOME DO GRUPO
   * Apenas líder pode alterar
   */
  async atualizarNomeGrupo(
    grupoGUID: string,
    novoNome: string,
    usuarioCPF: string
  ): Promise<{ mensagem: string }> {
    console.log('🟣 GrupoTarefaService.atualizarNomeGrupo()');

    // 1. Validar grupo
    const grupo = await this.#grupoTarefaDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    // 2. Validar se usuário é o líder
    if (grupo.UsuarioCPFLider !== usuarioCPF) {
      throw new ErrorResponse(403, 'Apenas o líder pode alterar o nome do grupo');
    }

    // 3. Validar nome (máximo 128 caracteres)
    if (novoNome.length > 128) {
      throw new ErrorResponse(400, 'Nome do grupo não pode exceder 128 caracteres');
    }

    // 4. Atualizar
    await this.#grupoTarefaDAO.update(grupoGUID, { GrupoNome: novoNome.trim() });

    return {
      mensagem: 'Nome do grupo atualizado com sucesso'
    };
  }

  /**
   * AUXILIAR - Validar se usuário está sozinho no grupo
   * (Pré-condição para aceitar convite ou solicitação)
   */
  async usuarioEstaSozinhoNoGrupo(usuarioCPF: string, grupoGUID: string): Promise<boolean> {
    console.log('🟣 GrupoTarefaService.usuarioEstaSozinhoNoGrupo()');

    // 1. Verificar se é líder
    const grupo = await this.#grupoTarefaDAO.findById(grupoGUID);
    if (!grupo || grupo.UsuarioCPFLider !== usuarioCPF) {
      return false;
    }

    // 2. Contar membros além do líder
    const membros = await this.#usuarioXGrupoDAO.findByGrupo(grupoGUID);
    
    // Se tem 0 membros (além do líder), está sozinho
    return membros.length === 0;
  }

  /**
   * AUXILIAR - Buscar grupo onde usuário é líder (por tarefa)
   */
  async buscarGrupoOndeEhLider(usuarioCPF: string, tarefaGUID: string) {
    console.log('🟣 GrupoTarefaService.buscarGrupoOndeEhLider()');
    
    return await this.#grupoTarefaDAO.findGrupoOndeEhLider(usuarioCPF, tarefaGUID);
  }
}
```

---

## 📊 CONTRATOS REST API - RESUMO EXECUTIVO

### Endpoints Obrigatórios (Fase 1)

| Método | Endpoint | Descrição | Autenticação |
|--------|----------|-----------|--------------|
| **POST** | `/api/tarefa` | Criar tarefa (individual ou compartilhada) | ✅ Professor |
| **PUT** | `/api/tarefa/:id` | Editar limites de tarefa compartilhada | ✅ Professor |
| **GET** | `/api/grupotarefa/:tarefaGUID` | Listar grupos da tarefa | ✅ Aluno/Professor |
| **GET** | `/api/grupotarefa/grupo/:grupoGUID` | Buscar grupo específico com membros | ✅ Membro do grupo |
| **POST** | `/api/grupotarefa/:grupoGUID/convites` | Líder envia convite | ✅ Líder |
| **POST** | `/api/grupotarefa/:grupoGUID/solicitacoes` | Aluno solicita entrada | ✅ Aluno |
| **PATCH** | `/api/convitegrupotarefa/:conviteGUID/aceitar` | Aceitar convite/solicitação | ✅ Destinatário |
| **PATCH** | `/api/convitegrupotarefa/:conviteGUID/recusar` | Recusar convite/solicitação | ✅ Destinatário |
| **DELETE** | `/api/grupotarefa/:grupoGUID/membros/:cpf` | Expulsar membro | ✅ Líder |
| **PATCH** | `/api/grupotarefa/:grupoGUID/transferir-lider` | Transferir liderança | ✅ Líder |
| **PATCH** | `/api/grupotarefa/:grupoGUID/nome` | Atualizar nome do grupo | ✅ Líder |
| **PATCH** | `/api/tarefa/:tarefaGUID/marcar-feito` | Marcar tarefa física como feita | ✅ Membro |

---

## ✅ CRITÉRIOS DE ACEITE - CHECKLIST

### Funcionalidades Obrigatórias

- [ ] **RF01 - Criação de tarefa compartilhada**
  - [ ] POST /api/tarefa valida campos `TarefaCompartilhada`, `TarefaMinPessoas`, `TarefaMaxPessoas`
  - [ ] Sistema cria grupos automaticamente para todos os alunos
  - [ ] Response retorna quantidade de grupos criados

- [ ] **RF02 - Gerenciamento de grupos**
  - [ ] GET /api/grupotarefa/:tarefaGUID lista todos os grupos da tarefa
  - [ ] GET /api/grupotarefa/grupo/:grupoGUID retorna detalhes com lista de membros
  - [ ] Apenas membros do grupo podem acessar seus detalhes

- [ ] **RF03 - Sistema de convites**
  - [ ] POST /api/grupotarefa/:grupoGUID/convites valida lotação antes de enviar
  - [ ] POST /api/grupotarefa/:grupoGUID/solicitacoes valida se aluno está sozinho
  - [ ] PATCH /api/convitegrupotarefa/:conviteGUID/aceitar executa transação atômica
  - [ ] Convites pendentes são excluídos quando grupo atinge limite

- [ ] **RF04 - Expulsão e liderança**
  - [ ] DELETE /api/grupotarefa/:grupoGUID/membros/:cpf recria grupo para expulso
  - [ ] PATCH /api/grupotarefa/:grupoGUID/transferir-lider troca liderança em transação
  - [ ] Histórico registra todas as mudanças

- [ ] **RF05 - Entrega de tarefa**
  - [ ] Marcar tarefa física propaga status para grupo inteiro
  - [ ] Validação impede marcar digital manualmente
  - [ ] Entrega digital via anexos marca grupo completo como feito

---

## 🧪 TESTES - CASOS PRIORITÁRIOS

### Testes Unitários (Services)

1. **GrupoTarefaService.criarGruposAutomaticos()**
   - ✅ Cria 1 grupo por aluno matriculado
   - ❌ Falha se tarefa não é compartilhada
   - ❌ Falha se tarefa não existe

2. **GrupoTarefaService.expulsarMembro()**
   - ✅ Expulsa membro e cria novo grupo
   - ❌ Líder não pode expulsar a si mesmo
   - ❌ Apenas líder pode expulsar

3. **GrupoTarefaService.transferirLideranca()**
   - ✅ Troca liderança atomicamente
   - ❌ Novo líder deve ser membro do grupo
   - ❌ Rollback se transação falhar

4. **ConviteGrupoTarefaService.aceitarConvite()**
   - ✅ Aceita convite e move usuário para grupo
   - ❌ Rejeita se grupo está cheio
   - ❌ Rejeita se usuário não está sozinho

### Testes de Integração (API)

1. **POST /api/tarefa (compartilhada)**
   ```bash
   curl -X POST /api/tarefa \
     -H "Authorization: Bearer TOKEN" \
     -d '{
       "TarefaCompartilhada": true,
       "TarefaMinPessoas": 2,
       "TarefaMaxPessoas": 4,
       ...
     }'
   ```
   - **Expect 201:** Response com `GruposCriados: N`

2. **POST /api/grupotarefa/:grupoGUID/convites**
   ```bash
   curl -X POST /api/grupotarefa/{guid}/convites \
     -H "Authorization: Bearer TOKEN_LIDER" \
     -d '{ "UsuarioCPFConvidado": "12345678901" }'
   ```
   - **Expect 201:** Convite criado com status Pendente
   - **Expect 400:** "Grupo já atingiu o limite de membros"

3. **PATCH /api/convitegrupotarefa/:conviteGUID/aceitar**
   ```bash
   curl -X PATCH /api/convitegrupotarefa/{guid}/aceitar \
     -H "Authorization: Bearer TOKEN_CONVIDADO"
   ```
   - **Expect 200:** Usuário adicionado ao grupo, grupo antigo excluído
   - **Expect 409:** "Você não pode entrar em outro grupo com membros"

---

## 📁 ESTRUTURA DE ARQUIVOS CRIADOS/MODIFICADOS

### Novos Arquivos Backend (CRIAR)

```
backend/
├── entities/
│   ├── grupotarefa.model.ts                        [NOVO]
│   ├── usuarioxgrupotarefa.model.ts               [NOVO]
│   ├── convitegrupotarefa.model.ts                [NOVO]
│   └── historicogrupotarefa.model.ts              [NOVO]
│
├── repositories/
│   ├── grupotarefa.repository.ts                  [NOVO]
│   ├── usuarioxgrupotarefa.repository.ts         [NOVO]
│   ├── convitegrupotarefa.repository.ts          [NOVO]
│   └── historicogrupotarefa.repository.ts        [NOVO]
│
├── services/
│   ├── grupotarefa.service.ts                     [NOVO]
│   ├── convitegrupotarefa.service.ts             [NOVO]
│   └── historicogrupotarefa.service.ts           [NOVO]
│
├── middlewares/
│   ├── grupotarefa.middleware.ts                  [NOVO]
│   └── convitegrupotarefa.middleware.ts          [NOVO]
│
└── controllers/
    ├── grupotarefa.controller.ts                  [NOVO]
    └── convitegrupotarefa.controller.ts          [NOVO]
```

### Arquivos a Modificar

```
backend/
├── entities/
│   └── tarefaacademica.model.ts                   [MODIFICAR +3 campos]
│
├── repositories/
│   └── tarefaacademica.repository.ts              [MODIFICAR queries]
│
├── services/
│   └── tarefaacademica.service.ts                 [MODIFICAR criar/editar]
│
├── middlewares/
│   └── tarefaacademica.middleware.ts              [MODIFICAR validações]
│
└── controllers/
    └── tarefaacademica.controller.ts              [MODIFICAR responses]

routes/
├── grupotarefa.routes.ts                          [NOVO]
├── convitegrupotarefa.routes.ts                  [NOVO]
└── tarefaacademica.routes.ts                     [MODIFICAR]
```

---

## 📅 CRONOGRAMA SUGERIDO (5-7 dias)

### Dia 1 (8h) - Migrations e Entities
- ✅ Executar todas as migrations (1-2h)
- ✅ Criar 4 entities novas (4-5h)
- ✅ Modificar entity TarefaAcademica (1h)
- ✅ Testes unitários de validação das entities (1h)

### Dia 2 (8h) - Repositories Principais
- ✅ GrupoTarefaDAO completo (2-3h)
- ✅ UsuarioXGrupoTarefaDAO completo (1.5-2h)
- ✅ ConviteGrupoTarefaDAO completo (2-2.5h)
- ✅ Testes básicos de CRUD (1-1.5h)

### Dia 3 (8h) - Service Núcleo
- ✅ GrupoTarefaService (6-8h)
  - Criação automática de grupos
  - Expulsão de membros
  - Transferência de liderança
  - Validações de lotação

### Dia 4 (8h) - Services Auxiliares + Middlewares
- ✅ ConviteGrupoTarefaService (4-5h)
- ✅ HistoricoGrupoTarefaService (2h)
- ✅ Middlewares de validação (2h)

### Dia 5 (8h) - Controllers + Routes
- ✅ GrupoTarefaController (3-4h)
- ✅ ConviteGrupoTarefaController (2-3h)
- ✅ Routes e integração (2h)

### Dia 6 (8h) - Modificações TarefaAcademica
- ✅ Modificar service de tarefa (3h)
- ✅ Modificar controller e middleware (2h)
- ✅ Modificar routes (1h)
- ✅ Testes de integração (2h)

### Dia 7 (8h) - Testes e Ajustes Finais
- ✅ Testes de todos os endpoints (4h)
- ✅ Testes de casos negativos (2h)
- ✅ Correções e refatoração (2h)

---

## 🚀 PRÓXIMOS PASSOS

### Após Conclusão da REST API

1. **Frontend - Tela CRUD Tarefa**
   - Adicionar checkbox "Tarefa Compartilhada"
   - Campos condicionais Min/Max Pessoas
   - Validações no formulário

2. **Frontend - Tela de Gerenciamento de Grupos**
   - Listar grupos da tarefa
   - Visualizar membros
   - Enviar convites
   - Aceitar/recusar solicitações
   - Expulsar membros
   - Transferir liderança

3. **Frontend - Integração com Calendário**
   - Exibir tarefas compartilhadas diferenciadas
   - Mostrar status do grupo no card
   - Link para gerenciar grupo

4. **Sistema de Notificações**
   - Notificar convites recebidos
   - Notificar mudanças no grupo
   - Notificar entrega de tarefa

5. **Dashboard de Professor**
   - Visualizar todos os grupos da tarefa
   - Acompanhar progresso de entregas
   - Estatísticas por grupo

---

## 📚 REFERÊNCIAS

- **Documento funcional:** [PLANO_IMPLEMENTACAO_TAREFA_COMPARTILHADA.md](PLANO_IMPLEMENTACAO_TAREFA_COMPARTILHADA.md)
- **Padrão de arquitetura:** [PLANO_IMPLEMENTACAO_MODULOS_ACADEMICOS.md](PLANO_IMPLEMENTACAO_MODULOS_ACADEMICOS.md)
- **Padrão de validações:** [PLANO_IMPLEMENTACAO_ANOTACOES.md](PLANO_IMPLEMENTACAO_ANOTACOES.md)
- **Service atual de tarefa:** [backend/services/tarefaacademica.service.ts](../backend/services/tarefaacademica.service.ts)

---

**Última atualização:** 27/05/2026  
**Autor:** Assistente AI  
**Status:** Pronto para implementação
