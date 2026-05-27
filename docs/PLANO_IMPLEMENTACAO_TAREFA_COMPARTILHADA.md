# 📋 PLANO DE IMPLEMENTAÇÃO - Tarefa Compartilhada (Sistema de Grupos)

**Data de criação:** 27/05/2026  
**Status:** 🔴 Pendente de definições  
**Complexidade:** Alta

---

## 📖 RESUMO EXECUTIVO

Implementação de um sistema de tarefas compartilhadas onde alunos podem formar grupos colaborativos. Cada aluno inicialmente é líder do próprio grupo e pode convidar outros ou ser convidado. O líder do grupo gerencia membros e delega pendências individuais.

---

## 🎯 REQUISITOS FUNCIONAIS

### RF01 - Criação de Tarefa Compartilhada
- Professor marca checkbox "Tarefa Compartilhada" ao criar tarefa
- Campos adicionais:
  - `MinimoPessoas` (padrão: 1, mínimo: 1)
  - `MaximoPessoas` (padrão: 5, mínimo: igual a MinimoPessoas)
- Validações:
  - MinimoPessoas ≥ 1
  - MaximoPessoas ≥ MinimoPessoas
  - **IMPORTANTE:** Como tarefa pode ser aplicada a múltiplas turmas simultaneamente, MaximoPessoas é um limite global (não por turma). Exemplo: MaxPessoas=5 significa que cada grupo pode ter no máximo 5 pessoas, independente da turma.

---

## 🔧 ALTERAÇÕES EM CRUD DE TAREFA

### Backend - REST API Modificações

#### POST /api/tarefa (Criar Tarefa)
**Body Request - Novos Campos:**
```json
{
  "TarefaTitulo": "Trabalho de Matemática",
  "TarefaDescricao": "Resolver exercícios do capítulo 5",
  "TarefaCompartilhada": true,           // NOVO - boolean
  "TarefaMinPessoas": 2,                 // NOVO - int (obrigatório se compartilhada=true)
  "TarefaMaxPessoas": 4,                 // NOVO - int (obrigatório se compartilhada=true)
  "TarefaPrazoData": "2026-06-15T23:59:59",
  "TarefaTipoEntrega": "digital",
  "MateriaCod": "MAT101",
  "TurmaGUIDs": ["turma-guid-1", "turma-guid-2"]
}
```

**Validações Backend:**
1. Se `TarefaCompartilhada = false`:
   - `TarefaMinPessoas` e `TarefaMaxPessoas` devem ser **NULL**
   - Se fornecidos, retornar erro 400: "Tarefa individual não pode ter limites de pessoas"

2. Se `TarefaCompartilhada = true`:
   - `TarefaMinPessoas` é **obrigatório** (não pode ser null)
   - `TarefaMaxPessoas` é **obrigatório** (não pode ser null)
   - `TarefaMinPessoas >= 1`
   - `TarefaMaxPessoas >= TarefaMinPessoas`
   - Erro 400 se alguma validação falhar

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "TarefaGUID": "abc-123",
    "TarefaCompartilhada": true,
    "TarefaMinPessoas": 2,
    "TarefaMaxPessoas": 4,
    "GruposCriados": 45  // Quantidade de grupos criados automaticamente
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "error": "TarefaMinPessoas deve ser >= 1",
  "field": "TarefaMinPessoas"
}
```

#### PUT /api/tarefa/:tarefaGUID (Editar Tarefa)
**Regra Importante:** 
- ⚠️ **NÃO é possível alterar** `TarefaCompartilhada` após criação (imutável)
- Se tentar alterar, retornar erro 400: "Não é possível alterar o tipo de tarefa após criação"
- `TarefaMinPessoas` e `TarefaMaxPessoas` podem ser editados, mas:
  - Não pode diminuir MaxPessoas se já existem grupos com mais membros
  - Não pode aumentar MinPessoas se já existem grupos com menos membros
  - Backend deve validar e retornar erro específico se houver conflito

#### GET /api/tarefa/:tarefaGUID (Buscar Tarefa)
**Response - Incluir Novos Campos:**
```json
{
  "TarefaGUID": "abc-123",
  "TarefaTitulo": "Trabalho de Matemática",
  "TarefaCompartilhada": true,
  "TarefaMinPessoas": 2,
  "TarefaMaxPessoas": 4,
  // ... outros campos existentes
}
```

---

### Frontend - Tela CRUD de Tarefa

**Arquivo:** `frontend/app/dashboard/[escolaGUID]/crud-tarefa/page.tsx`

#### Modificações no Formulário

1. **Adicionar Checkbox "Tarefa Compartilhada":**
```tsx
<div className={styles.formGroup}>
  <label htmlFor="tarefaCompartilhada" className={styles.checkboxLabel}>
    <input
      type="checkbox"
      id="tarefaCompartilhada"
      name="tarefaCompartilhada"
      checked={formData.tarefaCompartilhada}
      onChange={(e) => setFormData({
        ...formData,
        tarefaCompartilhada: e.target.checked,
        // Resetar campos se desmarcar
        tarefaMinPessoas: e.target.checked ? 1 : null,
        tarefaMaxPessoas: e.target.checked ? 5 : null
      })}
    />
    <span>Tarefa Compartilhada (alunos trabalham em grupos)</span>
  </label>
  <p className={styles.helpText}>
    Ao marcar esta opção, cada aluno receberá um grupo próprio e poderá convidar colegas.
  </p>
</div>
```

2. **Campos Condicionais Min/Max Pessoas:**
```tsx
{formData.tarefaCompartilhada && (
  <div className={styles.grupoConfiguracao}>
    <h3>Configuração de Grupos</h3>
    
    <div className={styles.formRow}>
      <div className={styles.formGroup}>
        <label htmlFor="minPessoas">Mínimo de Pessoas *</label>
        <input
          type="number"
          id="minPessoas"
          name="minPessoas"
          min="1"
          value={formData.tarefaMinPessoas || 1}
          onChange={(e) => {
            const min = parseInt(e.target.value);
            setFormData({
              ...formData,
              tarefaMinPessoas: min,
              // Ajustar max se necessário
              tarefaMaxPessoas: Math.max(min, formData.tarefaMaxPessoas || min)
            });
          }}
          required
        />
        <p className={styles.helpText}>Quantidade mínima de pessoas por grupo</p>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="maxPessoas">Máximo de Pessoas *</label>
        <input
          type="number"
          id="maxPessoas"
          name="maxPessoas"
          min={formData.tarefaMinPessoas || 1}
          value={formData.tarefaMaxPessoas || 5}
          onChange={(e) => setFormData({
            ...formData,
            tarefaMaxPessoas: parseInt(e.target.value)
          })}
          required
        />
        <p className={styles.helpText}>Quantidade máxima de pessoas por grupo</p>
      </div>
    </div>

    {/* Preview de configuração */}
    <div className={styles.configPreview}>
      <strong>Grupos serão criados com:</strong>
      <ul>
        <li>Mínimo: {formData.tarefaMinPessoas || 1} pessoa(s)</li>
        <li>Máximo: {formData.tarefaMaxPessoas || 5} pessoa(s)</li>
        <li>Cada aluno começa como líder do próprio grupo</li>
      </ul>
    </div>
  </div>
)}
```

#### Validações no Frontend

```tsx
const validarFormulario = () => {
  const erros = [];

  // Validações existentes...

  // Novas validações de tarefa compartilhada
  if (formData.tarefaCompartilhada) {
    if (!formData.tarefaMinPessoas || formData.tarefaMinPessoas < 1) {
      erros.push('Mínimo de pessoas deve ser pelo menos 1');
    }
    
    if (!formData.tarefaMaxPessoas || formData.tarefaMaxPessoas < 1) {
      erros.push('Máximo de pessoas deve ser pelo menos 1');
    }
    
    if (formData.tarefaMinPessoas > formData.tarefaMaxPessoas) {
      erros.push('Máximo de pessoas deve ser maior ou igual ao mínimo');
    }

    // Aviso (não erro): sugerir limites razoáveis
    if (formData.tarefaMaxPessoas > 10) {
      avisos.push('Grupos muito grandes (>10) podem dificultar a organização');
    }
  } else {
    // Garantir que campos estão null quando não compartilhada
    if (formData.tarefaMinPessoas !== null || formData.tarefaMaxPessoas !== null) {
      formData.tarefaMinPessoas = null;
      formData.tarefaMaxPessoas = null;
    }
  }

  return { erros, avisos };
};
```

#### Estilos CSS

**Arquivo:** `frontend/app/dashboard/[escolaGUID]/crud-tarefa/page.module.css`

```css
/* Seção de configuração de grupos */
.grupoConfiguracao {
  background-color: #f8f9fa;
  border: 2px solid #4CAF50;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1rem;
  animation: slideDown 0.3s ease-out;
}

.grupoConfiguracao h3 {
  color: #2e7d32;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.formRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.configPreview {
  background-color: white;
  border-left: 4px solid #4CAF50;
  padding: 1rem;
  margin-top: 1rem;
}

.configPreview ul {
  margin: 0.5rem 0 0 1.5rem;
  color: #555;
}

.checkboxLabel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
}

.helpText {
  font-size: 0.85rem;
  color: #666;
  margin-top: 0.25rem;
  font-style: italic;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

#### State Management

```tsx
interface TarefaFormData {
  // Campos existentes...
  tarefaTitulo: string;
  tarefaDescricao: string;
  
  // Novos campos
  tarefaCompartilhada: boolean;
  tarefaMinPessoas: number | null;
  tarefaMaxPessoas: number | null;
}

const [formData, setFormData] = useState<TarefaFormData>({
  // ... outros campos
  tarefaCompartilhada: false,
  tarefaMinPessoas: null,
  tarefaMaxPessoas: null
});
```

#### Modo Edição - Tratamento Especial

```tsx
useEffect(() => {
  if (modoEdicao && tarefaGUID) {
    buscarTarefa(tarefaGUID).then(tarefa => {
      setFormData({
        ...tarefa,
        // Campos compartilhados são readonly em edição
        tarefaCompartilhada: tarefa.TarefaCompartilhada
      });
      
      // Desabilitar checkbox se já existe grupos
      setCompartilhadaReadonly(tarefa.TarefaCompartilhada);
    });
  }
}, [modoEdicao, tarefaGUID]);

// No render:
<input
  type="checkbox"
  disabled={compartilhadaReadonly}
  {...}
/>
{compartilhadaReadonly && (
  <p className={styles.warning}>
    ⚠️ Não é possível alterar o tipo de tarefa após criação
  </p>
)}
```

---

### Backend - Service Layer

**Arquivo:** `backend/services/tarefaacademica.service.ts`

```typescript
async criarTarefa(data: TarefaCreateDTO): Promise<TarefaResponse> {
  // Validações
  this.validarCamposCompartilhada(data);
  
  // Criar tarefa
  const tarefa = await this.tarefaRepository.insert({
    TarefaGUID: uuidv4(),
    TarefaTitulo: data.titulo,
    TarefaCompartilhada: data.compartilhada || false,
    TarefaMinPessoas: data.compartilhada ? data.minPessoas : null,
    TarefaMaxPessoas: data.compartilhada ? data.maxPessoas : null,
    // ... outros campos
  });

  // Se compartilhada, criar grupos automaticamente
  let gruposCriados = 0;
  if (data.compartilhada) {
    gruposCriados = await this.grupoTarefaService.criarGruposAutomaticos(
      tarefa.TarefaGUID,
      data.turmaGUIDs
    );
  }

  return {
    tarefa,
    gruposCriados
  };
}

private validarCamposCompartilhada(data: TarefaCreateDTO): void {
  if (data.compartilhada) {
    if (!data.minPessoas || data.minPessoas < 1) {
      throw new ErrorResponse('TarefaMinPessoas deve ser >= 1', 400);
    }
    
    if (!data.maxPessoas || data.maxPessoas < data.minPessoas) {
      throw new ErrorResponse('TarefaMaxPessoas deve ser >= TarefaMinPessoas', 400);
    }
  } else {
    // Garantir que campos estão null
    if (data.minPessoas !== null || data.maxPessoas !== null) {
      throw new ErrorResponse('Tarefa individual não pode ter limites de pessoas', 400);
    }
  }
}
```

---

### RF02 - Criação Automática de Grupos
- Quando tarefa compartilhada é criada:
  - Sistema cria 1 grupo para cada aluno matriculado
  - Aluno é automaticamente líder do próprio grupo
  - Grupo começa com 1 membro (o líder)

### RF03 - Convite e Solicitação de Entrada
- **Líder pode convidar** outros alunos da mesma turma
- Convite só pode ser enviado se:
  - Grupo não atingiu MaximoPessoas
  - Convidado ainda não faz parte do grupo
  - Convidado está na mesma turma
  - Convidado está sozinho no próprio grupo (sem outros membros)
  
- **Aluno pode pedir para entrar** em outro grupo (solicitação)
- Solicitação só pode ser enviada se:
  - Aluno está sozinho no próprio grupo (sem membros além dele)
  - Grupo alvo não atingiu MaximoPessoas
  - Grupo alvo é da mesma turma

### RF04 - Aceitar Convite/Solicitação
- **Pré-condição:** Aluno só pode aceitar convite se estiver sozinho no próprio grupo
- **Validação no aceite:** Se grupo alvo já atingiu MaximoPessoas, retornar erro e excluir convite
- Quando aluno aceita convite ou líder aceita solicitação:
  - Sistema valida se grupo destino não está cheio
  - Grupo original do aluno (onde ele era líder) é DELETADO
  - Aluno vira membro do grupo do convidante/solicitado
  - Registro criado em `UsuarioXGrupoTarefa`
  - Convite/solicitação marcado como "Aceito"

### RF05 - Gerenciamento de Membros
- **Expulsar membro:**
  - Apenas líder pode expulsar
  - Membro expulso volta a ter grupo próprio (recriado automaticamente)
  - Líder não pode se auto-expulsar
  ou transferir liderança)

- **Transferir liderança:**
  - Líder pode designar outro membro como novo líder
  - Sistema executa em TRANSAÇÃO:
    1. Líder atual vira membro (INSERT em UsuarioXGrupoTarefa)
    2. Novo líder é removido de UsuarioXGrupoTarefa
    3. GrupoTarefa.UsuarioCPFLider é atualizado para n usando **tabela `pendencia` existente**
- Pendência vinculada a: GrupoTarefaGUID + UsuarioCPF
- Líder pode ver status de pendências (feita/não feita) de cada membro
- Sistema reutiliza API REST de pendências já implementada
- **Definir:** Como vincular p e Anexos
- **Envio digital:**
  - Qualquer membro pode enviar anexos
  - Todos os membros veem todos os anexos que o grupo enviou
  - Anexos vinculados ao `GrupoTarefaGUID`
  - Envio de 1 anexo = tarefa marcada como enviada para TODO o grupo
  - Todos os membros compartilham o mesmo status "TarefaFeito"

- **Tarefa física:**
  - Qualquer membro pode marcar checkbox "Entregue"
  - Marcação por 1 membro = tarefa marcada como feita para TODO o grupo
  - Frontend mostra quem marcou (informativo)

### RF06 - Pendências Individuais
- Líder pode criar pendências para membros específicos
- Modal reutiliza sistema existente de pendências
- Pendência vinculada a: GrupoTarefaGUID + UsuarioCPF

### RF07 - Submissão de Tarefa
- Qualquer membro pode enviar a tarefa
- Envio de 1 membro = tarefa enviada para TODO o grupo
- Todos os membros compartilham o mesmo status "TarefaFeito"

---

## 🗄️ ESTRUTURA DE BANCO DE DADOS

### Tabela: `tarefaacademica` (ALTERAÇÃO)
```sql
ALTER TABLE tarefaacademica
ADD COLUMN TarefaCompartilhada BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN TarefaMinPessoas INT NULL,
ADD COLUMN TarefaMaxPessoas INT NULL,
ADD CONSTRAINT CHK_TarefaMinPessoas CHECK (TarefaMinPessoas >= 1),
ADD CONSTRAINT CHK_TarefaMaxPessoas CHECK (TarefaMaxPessoas >= TarefaMinPessoas);
```

**Regra de negócio:**
- Se `TarefaCompartilhada = FALSE`: TarefaMinPessoas e TarefaMaxPessoas devem ser NULL
- Se `TarefaCompartilhada = TRUE`: ambos campos são obrigatórios

---

### Tabela: `tarefaacademica_matricula` (ALTERAÇÃO)
```sql
ALTER TABLE tarefaacademica_matricula
ADD COLUMN GrupoTarefaGUID CHAR(36) NULL COMMENT 'Vínculo opcional para rastrear grupo',
ADD INDEX idx_grupo (GrupoTarefaGUID);
```

**Nota:** Campo nullable para manter compatibilidade com tarefas individuais.

---

### Tabela: `pendencia` (ALTERAÇÃO)
```sql
ALTER TABLE pendencia
ADD COLUMN GrupoTarefaGUID CHAR(36) NULL COMMENT 'Vínculo opcional para pendências de grupo',
ADD INDEX idx_grupo_tarefa (GrupoTarefaGUID);
```

**Nota:** Permite reutilizar sistema de pendências para grupos. Filtrar por GrupoTarefaGUID ao buscar pendências do grupo.

---

### Tabela: `grupotarefa` (NOVA)
```sql
CREATE TABLE IF NOT EXISTS grupotarefa (
  GrupoTarefaGUID CHAR(36) NOT NULL,
  TarefaGUID CHAR(36) NOT NULL,
  TurmaGUID CHAR(36) NOT NULL,
  UsuarioCPFLider VARCHAR(14) NOT NULL COMMENT 'CPF do líder do grupo',
  GrupoNome VARCHAR(128) NULL COMMENT 'Nome opcional do grupo',
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (GrupoTarefaGUID),
  
  UNIQUE KEY UK_TarefaTurmaLider (TarefaGUID, TurmaGUID, UsuarioCPFLider)
    COMMENT 'Um usuário só pode liderar 1 grupo por tarefa/turma',
  
  INDEX idx_tarefa (TarefaGUID),
  INDEX idx_turma (TurmaGUID),
  -- NOTA: UsuarioCPFLider NÃO é foreign key para permitir transferência de liderança
  -- Validação de existência deve ser feita em application layer
  INDEX idx_lider_validacao (UsuarioCPFLider)
    FOREIGN KEY (TarefaGUID) REFERENCES tarefaacademica(TarefaGUID)
    ON UPDATE CASCADE ON DELETE CASCADE,
    
  CONSTRAINT FK_GrupoTarefa_Turma
    FOREIGN KEY (TurmaGUID) REFERENCES turma(TurmaGUID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
    
  CONSTRAINT FK_GrupoTarefa_Lider
    FOREIGN KEY (UsuarioCPFLider) REFERENCES usuario(UsuarioCPF)
    ON UPDATE CASCADE ON DELETE RESTRICT
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### Tabela: `usuarioxgrupotarefa` (NOVA)
```sql
CREATE TABLE IF NOT EXISTS usuarioxgrupotarefa (
  UsuarioXGrupoTarefaGUID CHAR(36) NOT NULL,
  GrupoTarefaGUID CHAR(36) NOT NULL,
  UsuarioCPF VARCHAR(14) NOT NULL COMMENT 'CPF do membro (não-líder)',
  DataEntrada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (UsuarioXGrupoTarefaGUID),
  
  UNIQUE KEY UK_GrupoUsuario (GrupoTarefaGUID, UsuarioCPF)
    COMMENT 'Um usuário não pode estar duplicado no mesmo grupo',
  
  INDEX idx_grupo (GrupoTarefaGUID),
  INDEX idx_usuario (UsuarioCPF),
  
  CONSTRAINT FK_UsuarioXGrupoTarefa_Grupo
    FOREIGN KEY (GrupoTarefaGUID) REFERENCES grupotarefa(GrupoTarefaGUID)
    ON UPDATE CASCADE ON DELETE CASCADE,
    brigatória)
```sql
-- Armazena convites e solicitações de entrada em grupos
CREATE TABLE IF NOT EXISTS convitegrupotarefa (
  ConviteGUID CHAR(36) NOT NULL,
  GrupoTarefaGUID CHAR(36) NOT NULL,
  UsuarioCPFConvidado VARCHAR(14) NOT NULL,
  ConviteTipo ENUM('Convite', 'Solicitacao') NOT NULL DEFAULT 'Convite' 
    COMMENT 'Convite=líder convidou, Solicitacao=aluno pediu para entrar'

---

### Tabela: `convitegrupotarefa` (NOVA - Opcional)
```sql
-- Armazena convites pendentes
CREATE TABLE IF NOT EXISTS convitegrupotarefa (
  ConviteGUID CHAR(36) NOT NULL,
  GrupoTarefaGUID CHAR(36) NOT NULL,
  UsuarioCPFConvidado VARCHAR(14) NOT NULL,
  ConviteStatus ENUM('Pendente', 'Aceito', 'Recusado', 'Expirado') NOT NULL DEFAULT 'Pendente',
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (ConviteGUID),
  
  INDEX idx_grupo (GrupoTarefaGUID),
  INDEX idx_convidado (UsuarioCPFConvidado),
  INDEX idx_status (ConviteStatus),
  
  CONSTRAINT FK_ConviteGrupoTarefa_Grupo
    FOREIGN KEY (GrupoTarefaGUID) REFERENCES grupotarefa(GrupoTarefaGUID)
    ON UPDATE CASCADE ON DELETE CASCADE,
    
  CONSTRAINT FK_ConviteGrupoTarefa_Usuario
    FOREIGN KEY (UsuarioCPFConvidado) REFERENCES usuario(UsuarioCPF)
    ON UPDATE CASCADE ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Limpeza automática de convites (CRON Job):**
```sql
-- Job executado diariamente às 03:00 UTC-3
DELETE FROM convitegrupotarefa 
WHERE 
  -- Aceitos/Recusados/Expirados há mais de 24h
  (ConviteStatus IN ('Aceito', 'Recusado', 'Expirado') AND CreatedAt < NOW() - INTERVAL 24 HOUR)
  -- Pendentes há mais de 7 dias
  OR (ConviteStatus = 'Pendente' AND CreatedAt < NOW() - INTERVAL 7 DAY)
  -- Pendentes de tarefas que já passaram do prazo
  OR (ConviteStatus = 'Pendente' AND GrupoTarefaGUID IN (
    SELECT gt.GrupoTarefaGUID 
    FROM grupotarefa gt
    INNER JOIN tarefaacademica t ON t.TarefaGUID = gt.TarefaGUID
    WHERE t.TarefaPrazoData < NOW()
  ));
```

---

### Tabela: `relacaoanexosgrupotarefa` (NOVA)
```sql
-- Vincula anexos a grupos (todos os membros veem todos os anexos do grupo)
-- Anexos ficam como rascunho até grupo clicar em "Concluir"
CREATE TABLE IF NOT EXISTS relacaoanexosgrupotarefa (
  RelacaoAnexoGrupoGUID CHAR(36) NOT NULL,
  AnexoGUID CHAR(36) NOT NULL,
  GrupoTarefaGUID CHAR(36) NOT NULL,
  UsuarioCPFEnvio VARCHAR(14) NOT NULL COMMENT 'Quem anexou o arquivo (auditoria)',
  AnexoStatus ENUM('Rascunho', 'Enviado') NOT NULL DEFAULT 'Rascunho' COMMENT 'Rascunho até clicar Concluir',
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  EnviadoAt TIMESTAMP NULL COMMENT 'Timestamp do clique em Concluir',
  
  PRIMARY KEY (RelacaoAnexoGrupoGUID),
  
  INDEX idx_anexo (AnexoGUID),
  INDEX idx_grupo (GrupoTarefaGUID),
  INDEX idx_usuario_envio (UsuarioCPFEnvio),
  
  CONSTRAINT FK_RelacaoAnexoGrupo_Anexo 
    FOREIGN KEY (AnexoGUID) REFERENCES anexo(AnexoGUID)
    ON UPDATE CASCADE ON DELETE CASCADE,
    
  CONSTRAINT FK_RelacaoAnexoGrupo_Grupo
    FOREIGN KEY (GrupoTarefaGUID) REFERENCES grupotarefa(GrupoTarefaGUID)
    ON UPDATE CASCADE ON DELETE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### Tabela: `historicogrupotarefa` (NOVA - Auditoria)
```sql
-- Registra mudanças em grupos para auditoria
CREATE TABLE IF NOT EXISTS historicogrupotarefa (
  HistoricoGUID CHAR(36) NOT NULL,
  GrupoTarefaGUID CHAR(36) NOT NULL,
  HistoricoTipo ENUM('TransferenciaLider', 'Expulsao', 'Saida', 'Entrada', 'PendenciaDelegada') NOT NULL,
  UsuarioCPFAtor VARCHAR(14) NOT NULL COMMENT 'Quem executou a ação',
  UsuarioCPFAlvo VARCHAR(14) NULL COMMENT 'Quem recebeu a ação (se aplicável)',
  HistoricoDetalhes TEXT NULL COMMENT 'JSON com dados adicionais',
  CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (HistoricoGUID),
  
  INDEX idx_grupo (GrupoTarefaGUID),
  INDEX idx_ator (UsuarioCPFAtor),
  INDEX idx_tipo (HistoricoTipo),
  INDEX idx_data (CreatedAt)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🔄 FLUXOS DE OPERAÇÃO

### Fluxo 1: Criação de Tarefa Compartilhada

```
[Professor cria tarefa]
    ↓
[Marca "Compartilhada" = true]
    ↓
[Define MinPessoas=1, MaxPessoas=5]
    ↓
[Backend valida e cria tarefa]
    ↓
[Trigger/Service cria grupos automáticos]
    ↓
[Para cada aluno da turma:]
    - Cria GrupoTarefa
    - Define aluno como líder
    - Não adiciona em UsuarioXGrupoTarefa
``Resposta:** Criar grupos na mesma transação (síncrono) é tecnicamente mais seguro:
- ✅ **Prós:** Garantia de atomicidade, não há estado intermediário inconsistente, professor recebe feedback imediato se algo falhar
- ❌ **Contras:** Tempo de resposta maior (pode levar alguns segundos para turmas grandes), lock de tabelas por mais tempo
- 💡 **Recomendação:** Iniciar com criação síncrona (transação) e, se houver problemas de performance, migrar para job assíncrono com fila

**Questão 1:** Criar grupos na mesma transação ou em background job assíncrono?

---

### Fluxo 2: Convite e Entrada em Grupo

```
[Líder A envia convite para Aluno B]
    ↓
[Sistema valida:]
    - Grupo A não atingiu limite?
    - B não é membro de A?
    - B está na mesma turma?
    ↓
[Cria ConviteGrupoTarefa (status: Pendente)]
    ↓
[B recebe notificação]
    ↓
[B aceita convite]
    ↓
[Sistema executa em TRANSAÇÃO:]
    1. DELETE GrupoTarefa WHERE UsuarioCPFLider = B AND TarefaGUID = X
    2. DELETE UsuarioXGrupoTarefa WHERE UsuarioCPF = B AND GrupoTarefaGUID IN (...)
    3. INSERT UsuarioXGrupoTarefa (GrupoA, UsuarioB)
  Resposta DEFINIDA:** B **NÃO PODE** entrar em outro grupo se tiver membros no seu grupo (além dele mesmo). Apenas líder solitário pode trocar de grupo. Frontend deve validar e impedir ação.
    ↓
[Retorna sucesso]
```

**Questão 2:** O que acontece com membros do grupo de B quando B entra em outro grupo?

---

### Fluxo 3: Expulsão de Membro

```
[Líder A expulsa Membro B do grupo]
    ↓
[Sistema valida:]
    - A é líder?
    - B é membro (não-líder)?
    ↓
[Sistema executa em TRANSAÇÃO:]
    1. DELETE UsuarioXGrupoTarefa WHERE GrupoA AND UsuarioB
    2. INSERT GrupoTarefa (novo grupo, B como líder)
    ↓
[B volta a ter grupo próprio]
```

---

### Fluxo 4: Submissão de Tarefa (Modelo Draft)

```
[Membro X anexa arquivo]
    ↓
[Sistema cria registro em relacaoanexosgrupotarefa]
    - AnexoStatus = 'Rascunho'
    - Todos membros veem anexo instantaneamente
    ↓
[Membro Y pode adicionar mais anexos]
[Membros podem remover anexos em rascunho]
    ↓
[Membro Z clica "Concluir/Enviar"]
    ↓
[Sistema valida: tem pelo menos 1 anexo?]
    ↓ SIM
[Sistema executa em TRANSAÇÃO:]
    1. UPDATE relacaoanexosgrupotarefa SET AnexoStatus='Enviado', EnviadoAt=NOW()
    2. Busca líder + todos membros do GrupoA
    3. Para cada pessoa do grupo:
       - UPDATE tarefaacademica_matricula SET TarefaFeito = TRUE
    4. Registra em historicogrupotarefa quem concluiu
    ↓
[Toda a equipe fica com status "Feito"]
[Anexos agora são imutáveis (não pode mais adicionar/remover)]
```

**Questão 3:** Como vincular anexos enviados? Por matrícula individual ou por grupo?
✅ RESOLVIDO 1: Hierarquia de Matrícula vs Grupo
**Decisão:** Opção A confirmada.
- Cada membro mantém registro individual em `tarefaacademica_matricula`
- Campo `TarefaFeito` é atualizado para TODOS os membros do grupo quando qualquer um envia
- Adicionar campo `GrupoTarefaGUID` nullable em `tarefaacademica_matricula` para rastreio (opcional
- **A)** Cada membro mantém registro individual em `tarefaacademica_matricula`, mas TarefaFeito é atualizado para todos quando 1 envia
- **B)** Criar `tarefaacademica_grupo` separada, sem usar matrícula
- **C)** Manter matrícula mas adicionar campo `GrupoTarefaGUID` nullable

**Recomendação:** Opção A (menos invasivo)

---
✅ RESOLVIDO 2: Anexos e Entregas
**Decisão (modelo Google Classroom):**
1. ✅ Anexos ficam como rascunho até clicar em "Concluir"
2. ✅ Qualquer membro pode anexar/remover arquivos enquanto em rascunho
3. ✅ Criar nova tabela `relacaoanexosgrupotarefa` com campos:
   - `GrupoTarefaGUID` (vincula ao grupo)
   - `UsuarioCPFEnvio` (quem anexou - auditoria)
   - `AnexoGUID` (referência ao arquivo)
   - `AnexoStatus` (Rascunho / Enviado)
   - `EnviadoAt` (timestamp do clique em Concluir)
4. ✅ Todos os membros veem todos os anexos do grupo (transparência total)
5. ✅ Botão "Concluir" só habilitado se houver anexos
6. ✅ Após conclusão, anexos ficam imutáveis (não pode adicionar/remover)
- Usar MatriculaGUID do líder como referência?

---

### 🔴 CRÍTICO 3: Status "TarefaFeito" Compartilhado
**Problema:** Se TarefaFeito é compartilhado, como rastrear contribuição individual?

**Questões:**
- Pr✅ RESOLVIDO 3: Status "TarefaFeito" Compartilhado
**Decisão:**
- ✅ TarefaFeito é compartilhado (todos ficam com status igual)
- ❌ **NÃO** rastrear contribuição individual neste momento (implementar no futuro se necessário)
- ✅ Professor vê grupo como unidade, não indivíduos
- ⏸️ Sistema de correção/nota individual será definido posteriormente
**Problema:** Se aluno B tem membros no seu grupo quando aceita convite de A, o que acontece com esses membros?

**Opções:**
- **A)** Recusar convite se grupo tem membros (só líder solitário pode mudar)
- **B)** Dissolver grupo de B e recriar grupos individuais para cada ex-membro
- **C)** Mover todos membros de B para grupo de A (se couber)

**Impacto:** Grande - define UX de reorganização

---✅ RESOLVIDO 4: Grupos Pré-existentes
**Decisão:** Opção A confirmada.
- ❌ Aluno NÃO pode aceitar convite se tiver membros no grupo
- ✅ Apenas líder solitário pode trocar de grupo
- ✅ Frontend deve validar e mostrar mensagem: "Você não pode entrar em outro grupo enquanto tiver membros no seu grupo. Dissolva o grupo primeiro."

---

### 🟡 IMPORTANTE 6: Pendências vs Tarefa
**Problema:** Sistema já tem `tarefaacademica`. Pendências são entidades diferentes ou sub-tarefas?

**Dúvidas:**
- Pe✅ RESOLVIDO 5: Limite de Grupo Atingido
**Decisão:**
- ✅ Frontend desabilita botão "Convidar" quando grupo atinge limite
- ✅ Backend valida e retorna erro 400 se tentar convidar com grupo cheio
- ✅ Convites pendentes são AUTOMATICAMENTE EXCLUÍDOS quando grupo enche
- ✅ Se aluno aceita convite de grupo que já está cheio, backend retorna erro: "Grupo já atingiu o limite de membros" e exclui o convite
### 🟡 IMPORTANTE 7: Tarefa Digital vs Física
**Problema:** Sistema tem TarefaTipoEntrega ('digital' | 'fisica'). Como fica em grupos?

**Questões:**
- Ta✅ RESOLVIDO 6: Pendências vs Tarefa
**Decisão:**
- ✅ Reutilizar tabela `pendencia` existente no sistema
- ✅ Adicionar campo `GrupoTarefaGUID` nullable em `pendencia` para vincular ao contexto de grupo
- ✅ Líder designa pendências para membros específicos usando API REST de pendências existente
- ✅ Líder pode ver status (feita/não feita) de todas as pendências do grupo
- ✅ Pendência tem prazo próprio, independente da tarefa principalu apenas "Grupo de [Nome do Líder]"?

**Impacto:** UI/UX, validação de unicidade

---
✅ RESOLVIDO 7: Tarefa Digital vs Física
**Decisão:**
- **Digital (modelo Google Classroom):**
  - ✅ Cada membro pode anexar arquivos (ficam como rascunho)
  - ✅ Anexos podem ser adicionados/removidos enquanto em modo rascunho
  - ✅ Botão "Concluir/Enviar" só habilitado se houver anexos
  - ✅ Ao clicar "Concluir": tarefa marcada como "Feito" para grupo inteiro
  - ✅ Todos os membros veem todos os anexos que o grupo enviou
  - ✅ Após conclusão: anexos ficam imutáveis
  
- **Física:**
  - ✅ Qualquer membro pode marcar checkbox "Entregue"
  - ✅ Marcação por 1 membro = tarefa marcada como "Feito" para grupo inteiro
  - ✅ Frontend mostra "Marcado como entregue por [Nome]" (informativo)

---

### ✅ RESOLVIDO 8: Nome do Grupo
**Decisão:**
- ✅ Grupos podem ter nomes customizados (campo `GrupoNome` nullable)
- ✅ Apenas o LÍDER pode alterar o nome do grupo
- ✅ Nome padrão ao criar: "Grupo de [Nome do Líder]"
- ❌ Não validar unicidade (pode haver grupos com mesmo nome)

---

### ⏸️ PENDENTE 9: Notificações
**Decisão:** Implementar sistema de notificações em FASE FUTURA (após funcionalidades básicas de grupo estarem estáveis).

**Eventos a notificar (futuro):**
- Convite recebido
- Convite aceito/recusado
- Expulsão do grupo
- Novo membro entrou
- Pendência atribuída
- Tarefa enviada por colega
- Transferência de liderança

---

### ✅ RESOLVIDO 10: Histórico e Auditoria
**Decisão:**
- ✅ Implementar tabela `historicogrupotarefa` para auditoria completa:
  - Trocas de grupo (quem saiu, de onde, para onde)
  - Expulsões (quem expulsou quem, quando)
  - Transferências de liderança (líder anterior, novo líder)
  - Pendências delegadas (quem delegou para quem, quando)
- ✅ Apenas para auditoria administrativa, não exposto para alunos inicialmente

## 🏗️ ESTRUTURA DE ARQUIVOS A CRIAR/MODIFICAR

### Backend - Entidades
```
backend/entities/
  ├── grupotarefa.model.ts                    [NOVO]
  ├── usuarioxgrupotarefa.model.ts           [NOVO]
  ├── convitegrupotarefa.model.ts            [NOVO]
  └── tarefaacademica.model.ts               [MODIFICAR]
```

### Backend - Repositories
```
backend/repositories/
  ├── grupotarefa.repository.ts              [NOVO]
  ├── usuarioxgrupotarefa.repository.ts     [NOVO]
  ├── convitegrupotarefa.repository.ts      [NOVO]
  └── tarefaacademica.repository.ts         [MODIFICAR]
```

### Backend - Services
```
backend/services/
  ├── grupotarefa.service.ts                 [NOVO]
  ├── convitegrupotarefa.service.ts         [NOVO]
  └── tarefaacademica.service.ts            [MODIFICAR]
```

### Backend - Controllers
```
backend/controllers/
  ├── grupotarefa.controller.ts              [NOVO]
  └── tarefaacademica.controller.ts         [MODIFICAR]
```

### Backend - Middlewares
```
backend/middlewares/
  ├── grupotarefa.middleware.ts              [NOVO]
  └── tarefaacademica.middleware.ts         [MODIFICAR]
```

### Backend - Routes
```
routes/
  ├── grupotarefa.routes.ts                  [NOVO]
  └── tarefaacademica.routes.ts             [MODIFICAR]
```

### Backend - Migrations
```
backend/database/migrations/
  ├── alter-tarefaacademica-add-compartilhada.ts    [NOVO]
  ├── create-grupotarefa.ts                            [NOVO]
  ├── alter-tarefaacademica-matricula-add-grupo.ts     [NOVO]
  ├── alter-pendencia-add-grupo.ts                     [NOVO]
  ├── create-grupotarefa.ts                            [NOVO]
  ├── create-usuarioxgrupotarefa.ts                   [NOVO]
  ├── create-convitegrupotarefa.ts                    [NOVO]
  ├── create-relacaoanexosgrupotarefa.ts              [NOVO]
  ├── create-historicogrupotarefa.ts                  [NOVO]
  └── create-cron-limpeza-convites.ts

### Frontend - Types
```
frontend/types/
  ├── grupotarefa.ts                         [NOVO]
  └── tarefaacademica.ts                    [MODIFICAR]
```

### Frontend - API
```
frontend/lib/api/
  ├── grupotarefa.api.ts                     [NOVO]
  └── tarefaacademica.api.ts                [MODIFICAR]
```

### Frontend - Páginas
```
frontend/app/dashboard/[escolaGUID]/
  ├── crud-tarefa/
  │   └── page.tsx                          [MODIFICAR - adicionar checkbox compartilhada]
  │
  ├── tarefas/
  │   ├── page.tsx                          [NOVO - lista estilo Google Classroom]
  │   ├── page.module.css                   [NOVO]
  │   └── [tarefaGUID]/
  │       ├── page.tsx                      [NOVO - detalhes + gestão de grupos]
  │       ├── page.module.css               [NOVO]
  │       └── components/
  │           ├── GestaoGrupo.tsx          [NOVO - seção de grupos]
  │           ├── AnexosRascunho.tsx       [NOVO - área de anexos draft]
  │           └── PendenciasGrupo.tsx      [NOVO - pendências]
  │
  └── calendario/
      └── page.tsx                          [MODIFICAR - link para nova tela tarefas]
```

### Frontend - Components
```
frontend/components/
  ├── GrupoCard.tsx                          [NOVO]
  ├── MembroGrupoCard.tsx                   [NOVO]
  ├── ConviteGrupoModal.tsx                 [NOVO]
  ├── PendenciaGrupoModal.tsx               [NOVO]
  └── StatusGrupoTarefa.tsx                 [NOVO]
```
         # Listar grupos do usuário
GET    /api/grupo-tarefa/:grupoGUID                   # Detalhes do grupo
PUT    /api/grupo-tarefa/:grupoGUID                   # Atualizar nome do grupo (só líder)
DELETE /api/grupo-tarefa/:grupoGUID                   # Dissolver grupo (só líder)

# Membros
GET    /api/grupo-tarefa/:grupoGUID/membros           # Listar membros
DELETE /api/grupo-tarefa/:grupoGUID/membros/:cpf      # Expulsar membro (só líder)
POST   /api/grupo-tarefa/:grupoGUID/sair              # Sair do grupo (só membro não-líder)
PATCH  /api/grupo-tarefa/:grupoGUID/transferir-lider  # Transferir liderança (só líder atual)

# Convites (líder convida)
POST   /api/grupo-tarefa/:grupoGUID/convite           # Convidar membro
GET    /api/convite-grupo                             # Meus convites recebidos
PATCH  /api/convite-grupo/:conviteGUID/aceitar        # Aceitar convite
PATCH  /api/convite-grupo/:conviteGUID/recusar        # Recusar convite

# Solicitações (aluno pede para entrar)
POST   /api/grupo-tarefa/:grupoGUID/solicitar         # Solicitar entrada
GET    /api/grupo-tarefa/:grupoGUID/solicitacoes      # Listar : TarefaCompartilhada, MinPessoas, MaxPessoas
GET    /api/tarefa/:tarefaGUID/grupos        # Listar todos os grupos da tarefa
GET    /api/tarefa/:tarefaGUID/grupos/:grupoGUID  # Detalhes de um grupo específico
```

### Pendências (reutilização)
```
# Endpoints existentes, adicionar GrupoTarefaGUID no body quando aplicável
POST   /api/pendencia                        # Criar pendência (líder para membro)
GET    /api/pendencia                        # Listar pendências (filtrar por grupo)
PUT    /api/pendencia/:pendenciaGUID         # Atualizar pendência
DELETE /api/pendencia/:pendenciaGUID         # Deletar pendência
```

### Anexos (modelo draft para grupos)
```
POST   /api/grupo-tarefa/:grupoGUID/anexos            # Anexar arquivo (status=Rascunho)
GET    /api/grupo-tarefa/:grupoGUID/anexos            # Listar todos anexos do grupo
DELETE /api/grupo-tarefa/:grupoGUID/anexos/:anexoGUID # Deletar anexo rascunho (qualquer membro)
PATCH  /api/grupo-tarefa/:grupoGUID/concluir          # Concluir tarefa (marca anexos como Enviado + TarefaFeito=TRUE)
```

### Tarefas (nova tela de listagem)
```
GET    /api/tarefas                                    # Lista tarefas do aluno (não concluídas, agrupadas por prazo)
GET    /api/tarefas/:tarefaGUID                        # Detalhes completos da tarefa
```

---

## ⚠️ RISCOS E CONSIDERAÇÕES

### Risco 1: Condições de Corrida
**Problema:** Dois líderes convidam o mesmo aluno simultaneamente

**Mitigação:**
- Usar transações ACID
- Lock otimista em ConviteGrupoTarefa
- Validação de constraints no banco

---

### Risco 2: Órfãos de Dados
**Problema:** Grupo deletado mas membros ficam referenciados

**Mitigação:**
- ON DELETE CASCADE bem configurado
- Service layer valida integridade antes de deletar
- Testes de integridade referencial

---

### Risco 3: Performance
**Problema:** Query "buscar todos os grupos e membros" pode ser pesada

**Mitigação:**
- Índices nas foreign keys
- Paginação nos endpoints
- Cache de contagem de membros

---

## ✅ CHECKLIST PRÉ-IMPLEMENTAÇÃO

Todas as dúvidas críticas foram respondidas:

- [x] **Dúvida 1:** Matrícula individual, TarefaFeito compartilhado
- [x] **Dúvida 2:** B não pode mudar se tiver membros
- [x] **Dúvida 3:** Anexos vinculados a grupo via nova tabela
- [x] **Dúvida 4:** Professor vê grupo como unidade (sem rastreio individual)
- [x] **Dúvida 5:** Frontend desabilita, backend valida, convites pendentes excluídos
- [x] **Dúvida 6:** Reutilizar tabela pendencia existente
- [x] **Dúvida 7:** Qualquer membro pode marcar (física) ou enviar (digital)
- [x] **Dúvida 8:** Sim, nomes customizados (só líder edita)
- [x] **Dúvida 9:** Notificações em fase futura
- [x] **Dúvida 10:** Sim, tabela historicogrupotarefa

**Novos requisitos adicionados:**
- [x] Transferência de liderança implementada
- [x] Solicitação de entrada (aluno pede para entrar)
- [x] CRON job para limpeza de convites
- [x] MaximoPessoas é limite global (não por turma)
- [x] Nova tabela relacaoanexosgrupotarefa
- [x] Nova tabela historicogrupotarefa

**✅ PRONTO PARA IMPLEMENTAÇÃO!**
## 📊 ESTIMATIVA DE ESFORÇO

| Fase | Descrição | Esforço | Dependências |
|------|-----------|---------|--------------|
| **1. Análise e Design** | Resolver dúvidas deste documento | 4h | - |
| **2. Modelagem de Dados** | Migrations + entidades (incluindo AnexoStatus) | 8h | Fase 1 |
| **2.1. Alterações CRUD Tarefa** | Backend: validações + API REST; Frontend: campos condicionais | 6h | Fase 2 |
| **3. Backend - CRUD Básico** | Repositories + services + controllers | 12h | Fase 2.1 |
| **4. Backend - Lógica de Grupos** | Convites, expulsão, entrada | 16h | Fase 3 |
| **5. Backend - Sistema de Anexos Draft** | Lógica de rascunho + conclusão | 8h | Fase 3 |
| **6. Backend - Submissão de Tarefa** | Marcar feito para todos membros | 6h | Fase 5 |
| **7. Backend - Transferência Liderança** | Trocar líder do grupo | 6h | Fase 4 |
| **8. Backend - Solicitação Entrada** | Aluno pede para entrar | 6h | Fase 4 |
| **9. Backend - APIs de Listagem Tarefas** | Endpoints de listagem temporal | 8h | Fase 2.1 |
| **10. Frontend - Tela Listagem Tarefas** | Lista estilo Google Classroom | 12h | Fase 9 |
| **11. Frontend - Tela Detalhes Tarefa** | Individual + compartilhada (gestão grupos) | 20h | Fase 10 |
| **12. Frontend - Sistema Anexos Draft** | Upload, preview, remoção, botão concluir | 10h | Fase 11 |
| **13. Frontend - Componentes de Grupo** | Membros, convites, pendências | 16h | Fase 11 |
| **14. Frontend - Modals** | Convite, solicitação, pendências, transferir | 10h | Fase 13 |
| **15. CRON Job Limpeza** | Serviço de limpeza automática | 4h | Fase 2.1 |
| **16. Histórico/Auditoria** | Registrar mudanças | 8h | Fase 3 |
| **17. Testes Integrados** | Backend + frontend + banco | 12h | Todas |
| **TOTAL** | | **172h** | (~22 dias úteis) |

**Detalhamento Fase 2.1 - Alterações CRUD Tarefa (6h):**
- Backend (3h):
  - Modificar POST /api/tarefa para aceitar novos campos
  - Modificar PUT /api/tarefa com validações de imutabilidade
  - Modificar GET /api/tarefa para retornar novos campos
  - Validações: TarefaCompartilhada, MinPessoas, MaxPessoas
  - Service layer: método `validarCamposCompartilhada()`
  
- Frontend (3h):
  - Adicionar checkbox "Tarefa Compartilhada" no formulário
  - Campos condicionais Min/Max Pessoas (show/hide)
  - Validações client-side
  - Preview de configuração de grupos
  - Estilos CSS para seção de grupos
  - Tratamento especial no modo edição (readonly)

---
   - Confirmação: "Tem certeza? Você se tornará membro comum."
   - Botão "Confirmar Transferência"istema de notificações real-time?
- [ ] **Dúvida 10:** Precisa histórico de mudanças de grupo?

---

## 🎨 MOCKUPS SUGERIDOS (A CRIAR)

1. **Tela Criar Tarefa (modificada)** - PRIORIDADE 1
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ Criar Nova Tarefa                                           │
   ├─────────────────────────────────────────────────────────────┤
   │                                                             │
   │ Título da Tarefa *                                          │
   │ [___________________________________________________]       │
   │                                                             │
   │ Descrição                                                   │
   │ [                                                     ]     │
   │ [                                                     ]     │
   │ [                                                     ]     │
   │                                                             │
   │ Prazo * [DD/MM/AAAA] [HH:MM]                               │
   │                                                             │
   │ Matéria * [Matemática ▼]                                   │
   │                                                             │
   │ Turmas *                                                    │
   │ ☑ 9º Ano A   ☑ 9º Ano B   ☐ 9º Ano C                       │
   │                                                             │
   │ ┌───────────────────────────────────────────────────────┐  │
   │ │ ☑ Tarefa Compartilhada (alunos trabalham em grupos) │  │
   │ │   ℹ️ Cada aluno receberá um grupo próprio e poderá   │  │
   │ │   convidar colegas para trabalhar juntos.            │  │
   │ └───────────────────────────────────────────────────────┘  │
   │                                                             │
   │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
   │ ┃ Configuração de Grupos                              ┃  │
   │ ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
   │ ┃                                                      ┃  │
   │ ┃ Mínimo de Pessoas *          Máximo de Pessoas *    ┃  │
   │ ┃ [ 2  ]                       [ 4  ]                 ┃  │
   │ ┃ Quantidade mínima por grupo  Quantidade máxima      ┃  │
   │ ┃                                                      ┃  │
   │ ┃ ┌────────────────────────────────────────────────┐  ┃  │
   │ ┃ │ Grupos serão criados com:                      │  ┃  │
   │ ┃ │ • Mínimo: 2 pessoa(s)                          │  ┃  │
   │ ┃ │ • Máximo: 4 pessoa(s)                          │  ┃  │
   │ ┃ │ • Cada aluno começa como líder do próprio grupo│  ┃  │
   │ ┃ └────────────────────────────────────────────────┘  ┃  │
   │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
   │                                                             │
   │ [Cancelar]                                 [Criar Tarefa]  │
   └─────────────────────────────────────────────────────────────┘
   ```
   **Comportamentos:**
   - Checkbox desmarcado: seção "Configuração de Grupos" oculta
   - Checkbox marcado: seção aparece com animação slideDown
   - Campo Min: mínimo=1, valor padrão=1
   - Campo Max: mínimo={valor de Min}, valor padrão=5
   - Ao alterar Min para valor > Max, Max é ajustado automaticamente
   - Botão "Criar Tarefa" valida antes de enviar
   - **Modo Edição:** Checkbox fica readonly se tarefa já foi criada
   
   **Validações Frontend:**
   - Min >= 1
   - Max >= Min
   - Warning (não bloqueia): Max > 10 (grupos muito grandes)

2. **Tela "Tarefas" - Lista estilo Google Classroom** [NOVO]
   - Seções temporais: "Amanhã", "Esta semana", "Este mês", "Mês que vem"
   - Cards de tarefa mostrando:
     - Ícone da matéria (colorido)
     - Título da tarefa
     - Prazo (data/hora)
     - Badge "Compartilhada" (se aplicável)
     - Badge de status: "Rascunho", "Atrasada", "Pendente"
   - Ordenação: mais recente no topo
   - Filtros: por matéria, por tipo (individual/compartilhada)
   - **NÃO** exibe tarefas concluídas

3. **Tela "Detalhes da Tarefa" - Individual**
   - Header: ícone matéria, nome matéria, nome professor
   - Título da tarefa (grande)
   - Descrição completa
   - Prazo (destaque)
   - Seção "Seu trabalho":
     - Lista de anexos em rascunho (com botão X para remover)
     - Botão "Adicionar arquivo" (upload)
     - Botão "Concluir Tarefa" (disabled se sem anexos, destaque verde)

4. **Tela "Detalhes da Tarefa" - Compartilhada** [PRINCIPAL]
   - Header: ícone matéria, nome matéria, nome professor
   - Título da tarefa (grande)
   - Descrição completa
   - Prazo (destaque)
   - **Seção "Seu Grupo":**
     - Nome do grupo (editável se líder)
     - Lista de membros com avatares + badge "Líder"
     - Contador: "3/5 membros"
     - Ações de grupo:
       - Botão "Convidar" (se líder e < max)
       - Botão "Solicitar Entrada em Outro Grupo" (se sozinho)
       - Botão "Sair do Grupo" (se membro não-líder)
       - Botão "Expulsar" em cada membro (se líder)
       - Botão "Transferir Liderança" (se líder)
     - Convites pendentes (badge com contador)
     - Solicitações recebidas (só líder vê)
   - **Seção "Pendências Individuais":**
     - Lista de pendências do grupo (líder vê todas, membro vê só as suas)
     - Botão "Criar Pendência" (só líder)
   - **Seção "Trabalho do Grupo":**
     - Lista de anexos em rascunho (com nome de quem anexou)
     - Qualquer membro pode adicionar/remover anexos
     - Botão "Adicionar arquivo" (upload)
     - Botão "Concluir Tarefa" (disabled se sem anexos, destaque verde)
     - Mensagem: "Ao concluir, todos os membros terão a tarefa marcada como feita"

5. **Tela "Lista de Grupos da Tarefa"** (visão professor) [NOVO]
   - Visualização de todos os grupos formados para uma tarefa específica
   - Filtro por turma
   - Cards de grupo mostrando:
     - Nome do grupo
     - Líder (nome + avatar)
     - Quantidade de membros (3/5)
     - Status: "Concluída" / "Em andamento" / "Atrasada"
     - Botão "Ver Composição"
   - Estatísticas: X grupos formados, Y tarefas concluídas

6. **Modal Convite**
   - Lista de alunos disponíveis (mesma turma, não membros)
   - Filtro por nome
   - Indicador visual: "Sozinho no grupo" ou "Tem X membros"
   - Desabilitar convite se aluno tem membros

7. **Modal Solicitações** [NOVO]
   - Lista de solicitações pendentes para o grupo
   - Informações do solicitante
   - Botões "Aceitar" / "Recusar"

8. **Modal Pendências**
   - Reutilizar componente existente
   - Dropdown para selecionar membro
   - Descrição da pendência
   - Prazo (opcional)
   - Status (feita/não feita)

9. **Modal Transferir Liderança** [NOVO]
   - Lista de membros do grupo
   - Confirmação: "Tem certeza? Você se tornará membro comum."
   - Botão "Confirmar Transferência"

---

## 📚 REFERÊNCIAS TÉCNICAS

- Tabelas atuais: `tarefaacademica`, `tarefaacademica_matricula`, `relacaoanexostarefa`
- Padrão de nomenclatura: PascalCase para colunas
- Foreign keys: ON UPDATE CASCADE, ON DELETE varia por contexto
- Charset: utf8mb4_unicode_ci

---

## 🚀 PRÓXIMOS PASSOS

1. **Reunião de alinhamento** para resolver as 10 dúvidas críticas
2. **Aprovação do modelo de dados** proposto
3. **Protótipo de UX** para validar fluxos com usuários
4. **Implementação iterativa** seguindo estimativa de esforço
5. **Testes em ambiente de staging** antes de produção

---

**⚠️ IMPORTANTE:** Este é um documento vivo. Atualize conforme decisões forem tomadas e novas questões surgirem durante a implementação.
