# 📋 PLANO DE IMPLEMENTAÇÃO - Sistema de Avisos, Tarefas e Eventos

**Data:** 14/05/2026  
**Ordem de Implementação:** Anexo → Tarefa Acadêmica → Prova Agendada → Pendência → Evento → RelacaoAnexos  
**Status:** Planejamento Executável  
**Base Técnica:** [PLANEJAMENTO_TAREFAS_MATERIAS_PENDENCIAS.md](PLANEJAMENTO_TAREFAS_MATERIAS_PENDENCIAS.md)

---

## 🎯 VISÃO GERAL

### Objetivo
Implementar sistema completo de gestão acadêmica e administrativa com:
- **Tarefas Acadêmicas:** Atividades entregáveis por alunos
- **Provas Agendadas:** Avisos de avaliações para turmas
- **Pendências:** Lembretes administrativos/pedagógicos com resposta
- **Eventos:** Avisos gerais da escola (festas, reuniões, etc)
- **Anexos:** Sistema de upload/download de arquivos
- **RelacaoAnexos:** Vinculação N:N entre anexos e tarefas/pendências/eventos

### Dependências de Implementação
```
1. Anexo (independente) - base para todos os uploads
2. TarefaAcademica (depende de: Matricula, MateriaxProfessorxTurma, Anexo)
3. ProvaAgendada (depende de: Turma, Materia)
4. Pendencia (depende de: Usuario, Escola, Anexo)
5. Evento (depende de: Escola, Anexo)
6. RelacaoAnexos (depende de: Anexo, TarefaAcademica, Pendencia, Evento)
```

### Estimativa de Tempo
- **Anexo:** 6-8 horas (upload, validação, storage)
- **TarefaAcademica:** 8-10 horas (CRUD + lógica de entrega)
- **ProvaAgendada:** 6-8 horas (CRUD + notificação)
- **Pendencia:** 8-10 horas (CRUD + resposta com anexo)
- **Evento:** 6-8 horas (CRUD + anexo único)
- **RelacaoAnexos:** 4-6 horas (pivot table + queries)
- **TOTAL:** 38-50 horas (~5-7 dias de trabalho)

---

## 📦 PRÉ-REQUISITOS

### ✅ Antes de Começar

#### 1. Executar Migrations no Banco
```sql
-- Tabela: anexo
CREATE TABLE `tccecossistemaescolar`.`anexo` (
  `AnexoGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `AnexoCaminho` VARCHAR(500) NOT NULL,
  `AnexoNomeOriginal` VARCHAR(255) NOT NULL,
  `AnexoTamanho` INT NOT NULL,
  `AnexoTipo` ENUM('professor', 'aluno', 'admin') NOT NULL,
  `AnexoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario`(`UsuarioCPF`) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (`EscolaGUID`) REFERENCES `escola`(`EscolaGUID`) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX `idx_anexo_usuario` (`UsuarioCPF`),
  INDEX `idx_anexo_escola` (`EscolaGUID`),
  INDEX `idx_anexo_tipo` (`AnexoTipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: tarefaacademica
CREATE TABLE `tccecossistemaescolar`.`tarefaacademica` (
  `TarefaGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `MatriculaGUID` VARCHAR(36) NOT NULL,
  `MatProfTurGUID` CHAR(36) NOT NULL,
  `TarefaTitulo` VARCHAR(128) NOT NULL,
  `TarefaConteudo` VARCHAR(1024) NULL,
  `TarefaPostagemData` DATETIME NOT NULL,
  `TarefaPrazoData` DATETIME NOT NULL,
  `TarefaTipoEntrega` ENUM('digital', 'fisica') NOT NULL,
  `TarefaFeito` BOOLEAN NOT NULL DEFAULT FALSE,
  `TarefaRealizacaoData` DATETIME NULL,
  `TarefaCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `TarefaUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`MatriculaGUID`) REFERENCES `matricula`(`MatriculaGUID`) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (`MatProfTurGUID`) REFERENCES `materiaxprofessorxturma`(`MatProfTurGUID`) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX `idx_tarefa_matricula` (`MatriculaGUID`),
  INDEX `idx_tarefa_prazo` (`TarefaPrazoData`),
  INDEX `idx_tarefa_feito` (`TarefaFeito`),
  INDEX `idx_tarefa_tipo_entrega` (`TarefaTipoEntrega`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: provaagendada
CREATE TABLE `tccecossistemaescolar`.`provaagendada` (
  `ProvaAgendadaGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `TurmaGUID` CHAR(36) NOT NULL,
  `MateriaGUID` CHAR(36) NOT NULL,
  `ProvaData` DATETIME NOT NULL,
  `ProvaDescricao` VARCHAR(1024) NULL,
  `ProvaStatus` ENUM('Agendada', 'Realizada', 'Cancelada') NOT NULL DEFAULT 'Agendada',
  `ProvaCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ProvaUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`TurmaGUID`) REFERENCES `turma`(`TurmaGUID`) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (`MateriaGUID`) REFERENCES `materia`(`MateriaGUID`) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX `idx_prova_data` (`ProvaData`),
  INDEX `idx_prova_status` (`ProvaStatus`),
  INDEX `idx_prova_turma` (`TurmaGUID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: pendencia
CREATE TABLE `tccecossistemaescolar`.`pendencia` (
  `PendenciaGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `PendenciaTitulo` VARCHAR(128) NOT NULL,
  `PendenciaConteudo` VARCHAR(1024) NULL,
  `PendenciaPostagemData` DATETIME NOT NULL,
  `PendenciaPrazoData` DATETIME NOT NULL,
  `PendenciaFeito` BOOLEAN NOT NULL DEFAULT FALSE,
  `PendenciaRealizacaoData` DATETIME NULL,
  `PendenciaCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `PendenciaUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`UsuarioCPF`) REFERENCES `usuario`(`UsuarioCPF`) ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY (`EscolaGUID`) REFERENCES `escola`(`EscolaGUID`) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX `idx_pendencia_usuario` (`UsuarioCPF`),
  INDEX `idx_pendencia_prazo` (`PendenciaPrazoData`),
  INDEX `idx_pendencia_feito` (`PendenciaFeito`),
  INDEX `idx_pendencia_escola` (`EscolaGUID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: evento (NOVA)
CREATE TABLE `tccecossistemaescolar`.`evento` (
  `EventoGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `EscolaGUID` CHAR(36) NOT NULL,
  `EventoTitulo` VARCHAR(128) NOT NULL,
  `EventoDescricao` VARCHAR(1024) NULL,
  `EventoData` DATETIME NOT NULL,
  `EventoStatus` ENUM('Agendado', 'Realizado', 'Cancelado') NOT NULL DEFAULT 'Agendado',
  `EventoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `EventoUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`EscolaGUID`) REFERENCES `escola`(`EscolaGUID`) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX `idx_evento_escola` (`EscolaGUID`),
  INDEX `idx_evento_data` (`EventoData`),
  INDEX `idx_evento_status` (`EventoStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela: relacaoanexos (Pivot N:N:N)
CREATE TABLE `tccecossistemaescolar`.`relacaoanexos` (
  `RelacaoAnexoGUID` CHAR(36) NOT NULL PRIMARY KEY,
  `AnexoGUID` CHAR(36) NOT NULL,
  `TarefaGUID` CHAR(36) NULL,
  `PendenciaGUID` CHAR(36) NULL,
  `EventoGUID` CHAR(36) NULL,
  `RelacaoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`AnexoGUID`) REFERENCES `anexo`(`AnexoGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`TarefaGUID`) REFERENCES `tarefaacademica`(`TarefaGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`PendenciaGUID`) REFERENCES `pendencia`(`PendenciaGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`EventoGUID`) REFERENCES `evento`(`EventoGUID`) ON UPDATE CASCADE ON DELETE CASCADE,
  CHECK (
    (TarefaGUID IS NOT NULL AND PendenciaGUID IS NULL AND EventoGUID IS NULL) OR
    (TarefaGUID IS NULL AND PendenciaGUID IS NOT NULL AND EventoGUID IS NULL) OR
    (TarefaGUID IS NULL AND PendenciaGUID IS NULL AND EventoGUID IS NOT NULL)
  ),
  INDEX `idx_relacao_tarefa` (`TarefaGUID`),
  INDEX `idx_relacao_pendencia` (`PendenciaGUID`),
  INDEX `idx_relacao_evento` (`EventoGUID`),
  INDEX `idx_relacao_anexo` (`AnexoGUID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 2. Criar Pasta de Uploads
```bash
mkdir -p uploads/anexos
```

#### 3. Instalar Dependências (se não instaladas)
```bash
npm install multer
npm install @types/multer --save-dev
```

---

## 🔧 FASE 1: ANEXO (6-8h)

### Ordem de Criação de Arquivos:

#### 1.1 Entity (20 min)
**Arquivo:** `backend/entities/anexo.model.ts`

```typescript
export interface Anexo {
  AnexoGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  AnexoCaminho: string;               // /uploads/anexos/{GUID}.{ext}
  AnexoNomeOriginal: string;          // arquivo.pdf
  AnexoTamanho: number;               // bytes
  AnexoTipo: 'professor' | 'aluno' | 'admin';
  AnexoCreatedAt: Date;
}

export class AnexoEntity {
  #anexoGUID: string;
  #usuarioCPF: string;
  #escolaGUID: string;
  #anexoCaminho: string;
  #anexoNomeOriginal: string;
  #anexoTamanho: number;
  #anexoTipo: 'professor' | 'aluno' | 'admin';
  #anexoCreatedAt: Date;

  constructor(data: Anexo) {
    this.#anexoGUID = data.AnexoGUID;
    this.#usuarioCPF = data.UsuarioCPF;
    this.#escolaGUID = data.EscolaGUID;
    this.#anexoCaminho = data.AnexoCaminho;
    this.#anexoNomeOriginal = data.AnexoNomeOriginal;
    this.#anexoTamanho = data.AnexoTamanho;
    this.#anexoTipo = data.AnexoTipo;
    this.#anexoCreatedAt = data.AnexoCreatedAt;
  }

  // Getters
  get anexoGUID() { return this.#anexoGUID; }
  get usuarioCPF() { return this.#usuarioCPF; }
  get escolaGUID() { return this.#escolaGUID; }
  get anexoCaminho() { return this.#anexoCaminho; }
  get anexoNomeOriginal() { return this.#anexoNomeOriginal; }
  get anexoTamanho() { return this.#anexoTamanho; }
  get anexoTipo() { return this.#anexoTipo; }
  get anexoCreatedAt() { return this.#anexoCreatedAt; }

  // Validações
  validar(): void {
    if (this.#anexoGUID.length !== 36) {
      throw new Error('AnexoGUID deve ter 36 caracteres (UUID)');
    }
    if (this.#usuarioCPF.length !== 11) {
      throw new Error('UsuarioCPF deve ter 11 dígitos');
    }
    if (!['professor', 'aluno', 'admin'].includes(this.#anexoTipo)) {
      throw new Error('AnexoTipo inválido');
    }
    if (this.#anexoTamanho <= 0) {
      throw new Error('AnexoTamanho deve ser positivo');
    }
  }

  toJSON(): Anexo {
    return {
      AnexoGUID: this.#anexoGUID,
      UsuarioCPF: this.#usuarioCPF,
      EscolaGUID: this.#escolaGUID,
      AnexoCaminho: this.#anexoCaminho,
      AnexoNomeOriginal: this.#anexoNomeOriginal,
      AnexoTamanho: this.#anexoTamanho,
      AnexoTipo: this.#anexoTipo,
      AnexoCreatedAt: this.#anexoCreatedAt
    };
  }
}
```

**Validações:**
- AnexoGUID: UUID v4
- UsuarioCPF: 11 dígitos
- AnexoCaminho: 1-500 chars
- AnexoNomeOriginal: 1-255 chars
- AnexoTamanho: > 0 bytes (máx 10MB no middleware)
- AnexoTipo: enum

---

#### 1.2 Repository (1.5-2h)
**Arquivo:** `backend/repositories/anexo.repository.ts`

```typescript
import { getPool } from '../database/mysql';
import { Anexo, AnexoEntity } from '../entities/anexo.model';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface AnexoFilters {
  UsuarioCPF?: string;
  EscolaGUID?: string;
  AnexoTipo?: 'professor' | 'aluno' | 'admin';
}

export class AnexoDAO {
  // CREATE
  async create(anexo: Anexo): Promise<Anexo> {
    const pool = getPool();
    const query = `
      INSERT INTO anexo (
        AnexoGUID, UsuarioCPF, EscolaGUID, AnexoCaminho, 
        AnexoNomeOriginal, AnexoTamanho, AnexoTipo
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await pool.execute<ResultSetHeader>(query, [
      anexo.AnexoGUID,
      anexo.UsuarioCPF,
      anexo.EscolaGUID,
      anexo.AnexoCaminho,
      anexo.AnexoNomeOriginal,
      anexo.AnexoTamanho,
      anexo.AnexoTipo
    ]);
    
    return anexo;
  }

  // FIND ALL (com filtros)
  async findAll(filters: AnexoFilters = {}): Promise<Anexo[]> {
    const pool = getPool();
    let query = 'SELECT * FROM anexo WHERE 1=1';
    const params: any[] = [];
    
    if (filters.UsuarioCPF) {
      query += ' AND UsuarioCPF = ?';
      params.push(filters.UsuarioCPF);
    }
    if (filters.EscolaGUID) {
      query += ' AND EscolaGUID = ?';
      params.push(filters.EscolaGUID);
    }
    if (filters.AnexoTipo) {
      query += ' AND AnexoTipo = ?';
      params.push(filters.AnexoTipo);
    }
    
    query += ' ORDER BY AnexoCreatedAt DESC';
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return this.mapRows(rows);
  }

  // FIND BY ID
  async findById(guid: string): Promise<Anexo | null> {
    const pool = getPool();
    const query = 'SELECT * FROM anexo WHERE AnexoGUID = ?';
    const [rows] = await pool.execute<RowDataPacket[]>(query, [guid]);
    
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  // DELETE
  async delete(guid: string): Promise<boolean> {
    const pool = getPool();
    const query = 'DELETE FROM anexo WHERE AnexoGUID = ?';
    const [result] = await pool.execute<ResultSetHeader>(query, [guid]);
    return result.affectedRows > 0;
  }

  // Helper: map row
  private mapRow(row: RowDataPacket): Anexo {
    return {
      AnexoGUID: row.AnexoGUID,
      UsuarioCPF: row.UsuarioCPF,
      EscolaGUID: row.EscolaGUID,
      AnexoCaminho: row.AnexoCaminho,
      AnexoNomeOriginal: row.AnexoNomeOriginal,
      AnexoTamanho: row.AnexoTamanho,
      AnexoTipo: row.AnexoTipo,
      AnexoCreatedAt: new Date(row.AnexoCreatedAt)
    };
  }

  private mapRows(rows: RowDataPacket[]): Anexo[] {
    return rows.map(row => this.mapRow(row));
  }
}
```

---

#### 1.3 Service (2-2.5h)
**Arquivo:** `backend/services/anexo.service.ts`

```typescript
import { AnexoDAO } from '../repositories/anexo.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../repositories/escolaxusuarioxfuncao.repository';
import { Anexo } from '../entities/anexo.model';
import { ErrorResponse } from '../utils/ErrorResponse';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export interface AnexoUploadDTO {
  file: Express.Multer.File;
  escolaGUID: string;
  usuarioCPF: string;
  anexoTipo: 'professor' | 'aluno' | 'admin';
}

export class AnexoService {
  constructor(
    private anexoDAO: AnexoDAO,
    private escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {}

  // UPLOAD (CREATE)
  async uploadAnexo(data: AnexoUploadDTO): Promise<Anexo> {
    // 1. Validar permissão do usuário na escola
    const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(
      data.escolaGUID,
      data.usuarioCPF
    );
    
    if (!vinculo || vinculo.Status !== 'Ativo') {
      throw new ErrorResponse('Usuário não vinculado à escola', 403);
    }

    // 2. Validar tipo de anexo baseado em FuncaoId
    await this.validarTipoAnexo(vinculo.FuncaoId, data.anexoTipo);

    // 3. Gerar nome único para arquivo
    const extensao = path.extname(data.file.originalname);
    const anexoGUID = uuidv4();
    const nomeArquivo = `${anexoGUID}${extensao}`;
    const caminhoCompleto = path.join('uploads', 'anexos', nomeArquivo);

    // 4. Mover arquivo para pasta definitiva
    fs.renameSync(data.file.path, caminhoCompleto);

    // 5. Criar registro no banco
    const anexo: Anexo = {
      AnexoGUID: anexoGUID,
      UsuarioCPF: data.usuarioCPF,
      EscolaGUID: data.escolaGUID,
      AnexoCaminho: caminhoCompleto,
      AnexoNomeOriginal: data.file.originalname,
      AnexoTamanho: data.file.size,
      AnexoTipo: data.anexoTipo,
      AnexoCreatedAt: new Date()
    };

    return await this.anexoDAO.create(anexo);
  }

  // DOWNLOAD
  async downloadAnexo(guid: string, usuarioCPF: string): Promise<{ caminho: string; nomeOriginal: string }> {
    // 1. Buscar anexo
    const anexo = await this.anexoDAO.findById(guid);
    if (!anexo) {
      throw new ErrorResponse('Anexo não encontrado', 404);
    }

    // 2. Validar permissão (usuário deve estar na mesma escola)
    const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(
      anexo.EscolaGUID,
      usuarioCPF
    );
    
    if (!vinculo || vinculo.Status !== 'Ativo') {
      throw new ErrorResponse('Sem permissão para acessar anexo', 403);
    }

    // 3. Verificar se arquivo existe
    if (!fs.existsSync(anexo.AnexoCaminho)) {
      throw new ErrorResponse('Arquivo não encontrado no servidor', 404);
    }

    return {
      caminho: anexo.AnexoCaminho,
      nomeOriginal: anexo.AnexoNomeOriginal
    };
  }

  // DELETE
  async excluirAnexo(guid: string, usuarioCPF: string): Promise<void> {
    // 1. Buscar anexo
    const anexo = await this.anexoDAO.findById(guid);
    if (!anexo) {
      throw new ErrorResponse('Anexo não encontrado', 404);
    }

    // 2. Validar permissão (apenas dono ou admin)
    if (anexo.UsuarioCPF !== usuarioCPF) {
      const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(
        anexo.EscolaGUID,
        usuarioCPF
      );
      
      if (!vinculo || ![1, 6].includes(vinculo.FuncaoId)) {
        throw new ErrorResponse('Sem permissão para excluir anexo', 403);
      }
    }

    // 3. Deletar arquivo físico
    if (fs.existsSync(anexo.AnexoCaminho)) {
      fs.unlinkSync(anexo.AnexoCaminho);
    }

    // 4. Deletar registro
    await this.anexoDAO.delete(guid);
  }

  // LIST
  async listarAnexos(filters: any): Promise<Anexo[]> {
    return await this.anexoDAO.findAll(filters);
  }

  // Helper: validar tipo de anexo
  private async validarTipoAnexo(funcaoId: number, anexoTipo: string): Promise<void> {
    const mapaTipos: { [key: number]: string[] } = {
      1: ['admin'],           // Coordenação
      2: ['admin'],           // Secretaria
      3: ['professor'],       // Professor
      4: ['aluno'],           // Responsável (pode enviar como aluno)
      5: ['aluno'],           // Aluno
      6: ['admin']            // Direção
    };

    const tiposPermitidos = mapaTipos[funcaoId] || [];
    if (!tiposPermitidos.includes(anexoTipo)) {
      throw new ErrorResponse(
        `Função não autorizada a enviar anexo do tipo '${anexoTipo}'`,
        403
      );
    }
  }
}
```

---

#### 1.4 Middleware (1h)
**Arquivo:** `backend/middlewares/anexo.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { ErrorResponse } from '../utils/ErrorResponse';

// Configurar multer para upload temporário
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Extensões permitidas
  const extensoesPermitidas = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt', '.zip'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!extensoesPermitidas.includes(ext)) {
    return cb(new ErrorResponse('Tipo de arquivo não permitido', 400));
  }
  
  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024  // 10MB
  }
});

export class AnexoMiddleware {
  // Validar upload
  static validarUpload(req: Request, res: Response, next: NextFunction) {
    if (!req.file) {
      return next(new ErrorResponse('Arquivo não enviado', 400));
    }
    
    const { escolaGUID, anexoTipo } = req.body;
    
    if (!escolaGUID) {
      return next(new ErrorResponse('EscolaGUID é obrigatório', 400));
    }
    
    if (!['professor', 'aluno', 'admin'].includes(anexoTipo)) {
      return next(new ErrorResponse('AnexoTipo inválido', 400));
    }
    
    next();
  }

  // Validar GUID
  static validarGUID(req: Request, res: Response, next: NextFunction) {
    const { guid } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(guid)) {
      return next(new ErrorResponse('GUID inválido', 400));
    }
    
    next();
  }
}
```

---

#### 1.5 Controller (1h)
**Arquivo:** `backend/controllers/anexo.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { AnexoService } from '../services/anexo.service';

export class AnexoController {
  constructor(private anexoService: AnexoService) {}

  // POST /api/anexo (upload)
  upload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { escolaGUID, anexoTipo } = req.body;
      
      const anexo = await this.anexoService.uploadAnexo({
        file: req.file!,
        escolaGUID,
        usuarioCPF,
        anexoTipo
      });
      
      return res.status(201).json({
        success: true,
        message: 'Anexo enviado com sucesso',
        data: anexo
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/anexo/:guid/download
  download = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { guid } = req.params;
      
      const { caminho, nomeOriginal } = await this.anexoService.downloadAnexo(guid, usuarioCPF);
      
      return res.download(caminho, nomeOriginal);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/anexo
  index = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        UsuarioCPF: req.query.UsuarioCPF as string,
        EscolaGUID: req.query.EscolaGUID as string,
        AnexoTipo: req.query.AnexoTipo as any
      };
      
      const anexos = await this.anexoService.listarAnexos(filters);
      
      return res.json({
        success: true,
        data: anexos,
        total: anexos.length
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/anexo/:guid
  destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { guid } = req.params;
      
      await this.anexoService.excluirAnexo(guid, usuarioCPF);
      
      return res.json({
        success: true,
        message: 'Anexo excluído com sucesso'
      });
    } catch (error) {
      next(error);
    }
  };
}
```

---

#### 1.6 Routes (30 min)
**Arquivo:** `routes/anexo.routes.ts`

```typescript
import { Router } from 'express';
import { AnexoController } from '../backend/controllers/anexo.controller';
import { AnexoService } from '../backend/services/anexo.service';
import { AnexoDAO } from '../backend/repositories/anexo.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../backend/repositories/escolaxusuarioxfuncao.repository';
import { AnexoMiddleware, uploadMiddleware } from '../backend/middlewares/anexo.middleware';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';

export function anexoRouterFactory() {
  const router = Router();
  
  // Dependências
  const anexoDAO = new AnexoDAO();
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO();
  const anexoService = new AnexoService(anexoDAO, escolaxUsuarioxFuncaoDAO);
  const controller = new AnexoController(anexoService);
  
  // Todas as rotas requerem autenticação
  router.use(AuthMiddleware.authenticate);
  
  // POST /api/anexo (upload)
  router.post(
    '/',
    uploadMiddleware.single('arquivo'),
    AnexoMiddleware.validarUpload,
    controller.upload
  );
  
  // GET /api/anexo
  router.get('/', controller.index);
  
  // GET /api/anexo/:guid/download
  router.get(
    '/:guid/download',
    AnexoMiddleware.validarGUID,
    controller.download
  );
  
  // DELETE /api/anexo/:guid
  router.delete(
    '/:guid',
    AnexoMiddleware.validarGUID,
    controller.destroy
  );
  
  return router;
}
```

---

#### 1.7 Registrar no Server (5 min)
**Arquivo:** `backend/Server.ts`

```typescript
// Importar
import { anexoRouterFactory } from '../routes/anexo.routes';

// Registrar
const anexoRouter = anexoRouterFactory();
this.#app.use('/api/anexo', anexoRouter);
console.log('✅ Rotas de Anexo registradas em /api/anexo');
```

---

### ✅ Checklist Fase 1 - Anexo

- [ ] Pasta `uploads/anexos` e `uploads/temp` criadas
- [ ] Migration executada (tabela `anexo` criada)
- [ ] Multer instalado
- [ ] Entity criada (`anexo.model.ts`)
- [ ] Repository com 4 métodos (create, findAll, findById, delete)
- [ ] Service com validações (upload, download, delete, list)
- [ ] Middleware com multer + validações
- [ ] Controller com 4 endpoints
- [ ] Routes configuradas
- [ ] Rotas registradas no Server.ts
- [ ] **Teste:** Upload de PDF (10MB ou menos)
- [ ] **Teste:** Download de anexo
- [ ] **Teste:** Listar anexos por escola
- [ ] **Teste:** Deletar anexo (apenas dono ou admin)
- [ ] **Teste:** Erro ao enviar arquivo > 10MB
- [ ] **Teste:** Erro ao enviar tipo não permitido (.exe, .sh)

---

## 🔧 FASE 2: TAREFA ACADÊMICA (8-10h)

### Ordem de Criação de Arquivos:

#### 2.1 Entity (25 min)
**Arquivo:** `backend/entities/tarefaacademica.model.ts`

```typescript
export interface TarefaAcademica {
  TarefaGUID: string;
  MatriculaGUID: string;
  MatProfTurGUID: string;
  TarefaTitulo: string;
  TarefaConteudo: string | null;
  TarefaPostagemData: Date;
  TarefaPrazoData: Date;
  TarefaTipoEntrega: 'digital' | 'fisica';
  TarefaFeito: boolean;
  TarefaRealizacaoData: Date | null;
  TarefaCreatedAt: Date;
  TarefaUpdatedAt: Date;
}
```

**Validações:**
- TarefaGUID: UUID v4
- MatriculaGUID: 1-36 chars (RA customizado)
- MatProfTurGUID: UUID v4
- TarefaTitulo: 3-128 chars
- TarefaConteudo: 0-1024 chars (opcional)
- TarefaPrazoData: > TarefaPostagemData
- TarefaTipoEntrega: enum
- TarefaFeito: boolean

---

#### 2.2 Repository (2-2.5h)
**Arquivo:** `backend/repositories/tarefaacademica.repository.ts`

**Métodos Obrigatórios:**
```typescript
class TarefaAcademicaDAO {
  async create(tarefa: TarefaAcademica): Promise<TarefaAcademica>
  async findAll(filters: TarefaFilters): Promise<TarefaAcademica[]>
  async findById(guid: string): Promise<TarefaAcademica | null>
  async update(guid: string, data: Partial<TarefaAcademica>): Promise<TarefaAcademica>
  async delete(guid: string): Promise<boolean>
  async findByMatricula(matriculaGUID: string): Promise<TarefaAcademica[]>
  async findByProfessor(matProfTurGUID: string): Promise<TarefaAcademica[]>
  async marcarComoFeito(guid: string): Promise<boolean>
}
```

**Queries Principais:**
```sql
-- CREATE
INSERT INTO tarefaacademica (
  TarefaGUID, MatriculaGUID, MatProfTurGUID, TarefaTitulo, TarefaConteudo,
  TarefaPostagemData, TarefaPrazoData, TarefaTipoEntrega
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)

-- FIND ALL (com filtros opcionais)
SELECT * FROM tarefaacademica
WHERE 1=1
  AND (? IS NULL OR MatriculaGUID = ?)
  AND (? IS NULL OR MatProfTurGUID = ?)
  AND (? IS NULL OR TarefaFeito = ?)
  AND (? IS NULL OR TarefaPrazoData >= ?)
ORDER BY TarefaPrazoData ASC

-- MARCAR COMO FEITO
UPDATE tarefaacademica
SET TarefaFeito = TRUE, TarefaRealizacaoData = CURRENT_TIMESTAMP
WHERE TarefaGUID = ?
```

---

#### 2.3 Service (2.5-3h)
**Arquivo:** `backend/services/tarefaacademica.service.ts`

**Dependências:**
```typescript
import { TarefaAcademicaDAO } from '../repositories/tarefaacademica.repository';
import { MatriculaDAO } from '../repositories/matricula.repository';
import { MaterialProfessorTurmaDAO } from '../repositories/materiaxprofessorxturma.repository';
import { ErrorResponse } from '../utils/ErrorResponse';
import { v4 as uuidv4 } from 'uuid';
```

**Regras de Negócio:**
```typescript
class TarefaAcademicaService {
  // CREATE
  async criarTarefa(data: TarefaCreateDTO, usuarioCPF: string) {
    // 1. Validar MatriculaGUID existe
    const matricula = await this.matriculaDAO.findById(data.MatriculaGUID);
    if (!matricula) throw new ErrorResponse('Matrícula não encontrada', 404);

    // 2. Validar MatProfTurGUID existe e pertence ao professor
    const alocacao = await this.materialProfessorTurmaDAO.findById(data.MatProfTurGUID);
    if (!alocacao) throw new ErrorResponse('Alocação não encontrada', 404);
    if (alocacao.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse('Professor não leciona nesta turma/matéria', 403);
    }

    // 3. Validar Matricula pertence à Turma da alocação
    if (matricula.TurmaGUID !== alocacao.TurmaGUID) {
      throw new ErrorResponse('Aluno não está nesta turma', 400);
    }

    // 4. Validar prazo > postagem
    if (new Date(data.TarefaPrazoData) <= new Date()) {
      throw new ErrorResponse('Prazo deve ser futuro', 400);
    }

    // 5. Criar tarefa
    const tarefa: TarefaAcademica = {
      TarefaGUID: uuidv4(),
      MatriculaGUID: data.MatriculaGUID,
      MatProfTurGUID: data.MatProfTurGUID,
      TarefaTitulo: data.TarefaTitulo.trim(),
      TarefaConteudo: data.TarefaConteudo?.trim() || null,
      TarefaPostagemData: new Date(),
      TarefaPrazoData: new Date(data.TarefaPrazoData),
      TarefaTipoEntrega: data.TarefaTipoEntrega,
      TarefaFeito: false,
      TarefaRealizacaoData: null,
      TarefaCreatedAt: new Date(),
      TarefaUpdatedAt: new Date()
    };

    return await this.tarefaDAO.create(tarefa);
  }

  // MARCAR COMO FEITO
  async marcarComoFeito(guid: string, usuarioCPF: string) {
    // 1. Buscar tarefa
    const tarefa = await this.tarefaDAO.findById(guid);
    if (!tarefa) throw new ErrorResponse('Tarefa não encontrada', 404);

    // 2. Validar permissão (aluno dono OU professor da alocação)
    const matricula = await this.matriculaDAO.findById(tarefa.MatriculaGUID);
    const alocacao = await this.materialProfessorTurmaDAO.findById(tarefa.MatProfTurGUID);
    
    const isAluno = matricula?.UsuarioCPF === usuarioCPF;
    const isProfessor = alocacao?.UsuarioCPF === usuarioCPF;
    
    if (!isAluno && !isProfessor) {
      throw new ErrorResponse('Sem permissão', 403);
    }

    // 3. Marcar como feito
    await this.tarefaDAO.marcarComoFeito(guid);
    return await this.tarefaDAO.findById(guid);
  }

  // LIST (por aluno ou professor)
  async listarTarefas(filters: any, usuarioCPF: string) {
    // Filtrar apenas tarefas do aluno OU do professor
    return await this.tarefaDAO.findAll(filters);
  }
}
```

---

#### 2.4 Middleware (30 min)
**Arquivo:** `backend/middlewares/tarefaacademica.middleware.ts`

```typescript
export class TarefaAcademicaMiddleware {
  static validarCriacao(req: Request, res: Response, next: NextFunction) {
    const {
      MatriculaGUID,
      MatProfTurGUID,
      TarefaTitulo,
      TarefaPrazoData,
      TarefaTipoEntrega
    } = req.body.tarefa || {};
    
    if (!MatriculaGUID || !MatProfTurGUID || !TarefaTitulo || !TarefaPrazoData) {
      return next(new ErrorResponse('Campos obrigatórios faltando', 400));
    }
    
    if (TarefaTitulo.length < 3 || TarefaTitulo.length > 128) {
      return next(new ErrorResponse('Título deve ter 3-128 caracteres', 400));
    }
    
    if (!['digital', 'fisica'].includes(TarefaTipoEntrega)) {
      return next(new ErrorResponse('TipoEntrega inválido', 400));
    }
    
    next();
  }
}
```

---

#### 2.5 Controller (1-1.5h)
**Arquivo:** `backend/controllers/tarefaacademica.controller.ts`

```typescript
export class TarefaAcademicaController {
  constructor(private tarefaService: TarefaAcademicaService) {}
  
  // POST /api/tarefaacademica
  store = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const tarefa = await this.tarefaService.criarTarefa(req.body.tarefa, usuarioCPF);
      
      return res.status(201).json({
        success: true,
        message: 'Tarefa criada com sucesso',
        data: tarefa
      });
    } catch (error) {
      next(error);
    }
  };
  
  // GET /api/tarefaacademica
  index = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const filters = {
        MatriculaGUID: req.query.MatriculaGUID as string,
        MatProfTurGUID: req.query.MatProfTurGUID as string,
        TarefaFeito: req.query.TarefaFeito === 'true'
      };
      
      const tarefas = await this.tarefaService.listarTarefas(filters, usuarioCPF);
      
      return res.json({
        success: true,
        data: tarefas,
        total: tarefas.length
      });
    } catch (error) {
      next(error);
    }
  };
  
  // PATCH /api/tarefaacademica/:guid/marcar-feito
  marcarFeito = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const tarefa = await this.tarefaService.marcarComoFeito(req.params.guid, usuarioCPF);
      
      return res.json({
        success: true,
        message: 'Tarefa marcada como concluída',
        data: tarefa
      });
    } catch (error) {
      next(error);
    }
  };
}
```

---

#### 2.6 Routes (30 min)
**Arquivo:** `routes/tarefaacademica.routes.ts`

```typescript
export function tarefaAcademicaRouterFactory() {
  const router = Router();
  
  // Dependências (similar ao padrão)
  const tarefaDAO = new TarefaAcademicaDAO();
  const matriculaDAO = new MatriculaDAO();
  const materialProfessorTurmaDAO = new MaterialProfessorTurmaDAO();
  const service = new TarefaAcademicaService(tarefaDAO, matriculaDAO, materialProfessorTurmaDAO);
  const controller = new TarefaAcademicaController(service);
  
  router.use(AuthMiddleware.authenticate);
  
  router.post('/', TarefaAcademicaMiddleware.validarCriacao, controller.store);
  router.get('/', controller.index);
  router.get('/:guid', controller.show);
  router.patch('/:guid/marcar-feito', controller.marcarFeito);
  router.put('/:guid', controller.update);
  router.delete('/:guid', controller.destroy);
  
  return router;
}
```

---

#### 2.7 Registrar no Server (5 min)
**Arquivo:** `backend/Server.ts`

```typescript
const tarefaRouter = tarefaAcademicaRouterFactory();
this.#app.use('/api/tarefaacademica', tarefaRouter);
console.log('✅ Rotas de Tarefa Acadêmica registradas em /api/tarefaacademica');
```

---

### ✅ Checklist Fase 2 - Tarefa Acadêmica

- [ ] Migration executada
- [ ] Entity criada
- [ ] Repository com 8 métodos
- [ ] Service com validações (aluno em turma, prazo futuro)
- [ ] Middleware de validação
- [ ] Controller com 6 endpoints
- [ ] Routes configuradas
- [ ] Rotas registradas
- [ ] **Teste:** Professor cria tarefa para aluno
- [ ] **Teste:** Aluno marca tarefa como feita
- [ ] **Teste:** Professor marca tarefa como feita
- [ ] **Teste:** Erro ao criar tarefa para aluno de outra turma
- [ ] **Teste:** Erro ao criar tarefa com prazo passado

---

## 🔧 FASE 3: PROVA AGENDADA (6-8h)

### Ordem de Criação de Arquivos:

#### 3.1 Entity (20 min)
**Arquivo:** `backend/entities/provaagendada.model.ts`

```typescript
export interface ProvaAgendada {
  ProvaAgendadaGUID: string;
  TurmaGUID: string;
  MateriaGUID: string;
  ProvaData: Date;
  ProvaDescricao: string | null;
  ProvaStatus: 'Agendada' | 'Realizada' | 'Cancelada';
  ProvaCreatedAt: Date;
  ProvaUpdatedAt: Date;
}
```

**Validações:**
- ProvaAgendadaGUID: UUID v4
- TurmaGUID: UUID v4, deve existir
- MateriaGUID: UUID v4, deve existir
- ProvaData: data futura (>= hoje)
- ProvaDescricao: 0-1024 chars (opcional)
- ProvaStatus: enum

---

#### 3.2 Repository (1.5h)
**Arquivo:** `backend/repositories/provaagendada.repository.ts`

**Métodos:**
```typescript
class ProvaAgendadaDAO {
  async create(prova: ProvaAgendada): Promise<ProvaAgendada>
  async findAll(filters: ProvaFilters): Promise<ProvaAgendada[]>
  async findById(guid: string): Promise<ProvaAgendada | null>
  async update(guid: string, data: Partial<ProvaAgendada>): Promise<ProvaAgendada>
  async delete(guid: string): Promise<boolean>
  async findByTurma(turmaGUID: string): Promise<ProvaAgendada[]>
  async findByProfessor(usuarioCPF: string): Promise<ProvaAgendada[]>
}
```

**Query Especial (provas de um professor):**
```sql
SELECT pa.* FROM provaagendada pa
JOIN materiaxprofessorxturma mpt ON mpt.TurmaGUID = pa.TurmaGUID 
  AND mpt.MateriaGUID = pa.MateriaGUID
WHERE mpt.UsuarioCPF = ?
  AND mpt.AlocacaoStatus = 'Ativa'
ORDER BY pa.ProvaData ASC
```

---

#### 3.3 Service (2h)
**Arquivo:** `backend/services/provaagendada.service.ts`

**Regras de Negócio:**
```typescript
class ProvaAgendadaService {
  // CREATE
  async criarProva(data: ProvaCreateDTO, usuarioCPF: string) {
    // 1. Validar Turma existe
    const turma = await this.turmaDAO.findById(data.TurmaGUID);
    if (!turma) throw new ErrorResponse('Turma não encontrada', 404);

    // 2. Validar Matéria existe
    const materia = await this.materiaDAO.findById(data.MateriaGUID);
    if (!materia) throw new ErrorResponse('Matéria não encontrada', 404);

    // 3. Validar Turma e Matéria mesma escola
    if (turma.EscolaGUID !== materia.EscolaGUID) {
      throw new ErrorResponse('Turma e Matéria de escolas diferentes', 400);
    }

    // 4. Validar Professor leciona essa Matéria nessa Turma
    const alocacao = await this.materialProfessorTurmaDAO.findByMateriaTurmaProfessor(
      data.MateriaGUID,
      data.TurmaGUID,
      usuarioCPF
    );
    if (!alocacao || alocacao.AlocacaoStatus !== 'Ativa') {
      throw new ErrorResponse('Professor não leciona esta matéria nesta turma', 403);
    }

    // 5. Validar data futura
    if (new Date(data.ProvaData) < new Date()) {
      throw new ErrorResponse('Data da prova deve ser futura', 400);
    }

    // 6. Criar prova
    const prova: ProvaAgendada = {
      ProvaAgendadaGUID: uuidv4(),
      TurmaGUID: data.TurmaGUID,
      MateriaGUID: data.MateriaGUID,
      ProvaData: new Date(data.ProvaData),
      ProvaDescricao: data.ProvaDescricao?.trim() || null,
      ProvaStatus: 'Agendada',
      ProvaCreatedAt: new Date(),
      ProvaUpdatedAt: new Date()
    };

    return await this.provaDAO.create(prova);
  }

  // LIST (aluno vê provas da sua turma)
  async listarProvas(filters: any, usuarioCPF: string, funcaoId: number) {
    // Se aluno: filtrar por turmas que está matriculado
    // Se professor: filtrar por alocações ativas
    return await this.provaDAO.findAll(filters);
  }
}
```

---

#### 3.4 Middleware, Controller, Routes (2h)
Seguir mesmo padrão de TarefaAcademica.

---

### ✅ Checklist Fase 3 - Prova Agendada

- [ ] Migration executada
- [ ] Entity criada
- [ ] Repository com 7 métodos
- [ ] Service com validações (professor leciona matéria+turma)
- [ ] Controller com 5 endpoints
- [ ] Routes configuradas
- [ ] Rotas registradas
- [ ] **Teste:** Professor agenda prova
- [ ] **Teste:** Aluno visualiza provas da sua turma
- [ ] **Teste:** Erro ao agendar prova em matéria que não leciona
- [ ] **Teste:** Erro ao agendar prova com data passada

---

## 🔧 FASE 4: PENDÊNCIA (8-10h)

### Ordem de Criação de Arquivos:

#### 4.1 Entity (25 min)
**Arquivo:** `backend/entities/pendencia.model.ts`

```typescript
export interface Pendencia {
  PendenciaGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  PendenciaTitulo: string;
  PendenciaConteudo: string | null;
  PendenciaPostagemData: Date;
  PendenciaPrazoData: Date;
  PendenciaFeito: boolean;
  PendenciaRealizacaoData: Date | null;
  PendenciaCreatedAt: Date;
  PendenciaUpdatedAt: Date;
}
```

---

#### 4.2 Repository (2h)
**Arquivo:** `backend/repositories/pendencia.repository.ts`

Similar a TarefaAcademica, com filtros por UsuarioCPF e EscolaGUID.

---

#### 4.3 Service (2.5h)
**Arquivo:** `backend/services/pendencia.service.ts`

**Regras de Negócio:**
```typescript
class PendenciaService {
  // CREATE (apenas Coordenação, Direção ou Secretaria)
  async criarPendencia(data: PendenciaCreateDTO, usuarioCPF: string) {
    // 1. Validar permissão de escrita
    await this.validarPermissaoCriar(usuarioCPF, data.EscolaGUID);

    // 2. Validar UsuarioCPF destino existe e está na escola
    const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(
      data.EscolaGUID,
      data.UsuarioCPFDestino
    );
    if (!vinculo || vinculo.Status !== 'Ativo') {
      throw new ErrorResponse('Usuário não encontrado nesta escola', 404);
    }

    // 3. Validar prazo futuro
    if (new Date(data.PendenciaPrazoData) <= new Date()) {
      throw new ErrorResponse('Prazo deve ser futuro', 400);
    }

    // 4. Criar pendência
    const pendencia: Pendencia = {
      PendenciaGUID: uuidv4(),
      UsuarioCPF: data.UsuarioCPFDestino,
      EscolaGUID: data.EscolaGUID,
      PendenciaTitulo: data.PendenciaTitulo.trim(),
      PendenciaConteudo: data.PendenciaConteudo?.trim() || null,
      PendenciaPostagemData: new Date(),
      PendenciaPrazoData: new Date(data.PendenciaPrazoData),
      PendenciaFeito: false,
      PendenciaRealizacaoData: null,
      PendenciaCreatedAt: new Date(),
      PendenciaUpdatedAt: new Date()
    };

    return await this.pendenciaDAO.create(pendencia);
  }

  // MARCAR COMO FEITO (usuário destinatário)
  async marcarComoFeito(guid: string, usuarioCPF: string) {
    const pendencia = await this.pendenciaDAO.findById(guid);
    if (!pendencia) throw new ErrorResponse('Pendência não encontrada', 404);

    if (pendencia.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse('Sem permissão', 403);
    }

    await this.pendenciaDAO.marcarComoFeito(guid);
    return await this.pendenciaDAO.findById(guid);
  }

  // Helper: validar permissão criar (Coordenação, Direção, Secretaria)
  private async validarPermissaoCriar(cpf: string, escolaGUID: string) {
    const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(escolaGUID, cpf);
    
    if (!vinculo || ![1, 2, 6].includes(vinculo.FuncaoId) || vinculo.Status !== 'Ativo') {
      throw new ErrorResponse('Sem permissão para criar pendências', 403);
    }
  }
}
```

---

#### 4.4 Middleware, Controller, Routes (2.5h)
Seguir padrão estabelecido.

---

### ✅ Checklist Fase 4 - Pendência

- [ ] Migration executada
- [ ] Entity criada
- [ ] Repository com 7 métodos
- [ ] Service com validações (permissão criar = Coord/Dir/Sec)
- [ ] Controller com 6 endpoints
- [ ] Routes configuradas
- [ ] Rotas registradas
- [ ] **Teste:** Coordenador cria pendência para professor
- [ ] **Teste:** Professor marca pendência como feita
- [ ] **Teste:** Erro ao professor criar pendência (sem permissão)
- [ ] **Teste:** Usuário só vê suas próprias pendências

---

## 🔧 FASE 5: EVENTO (6-8h)

### Conceito da Tabela Evento

**Propósito:** Avisos gerais da escola para eventos, festas, reuniões, feriados, etc.

**Características:**
- ❌ Não exige resposta do usuário (ao contrário de Pendência)
- ❌ Não tem entrega (ao contrário de Tarefa)
- ✅ Pode ter anexo (cartaz, convite, cronograma)
- ✅ Visível para toda a escola
- ✅ Pode ser criado por: Coordenação, Direção ou Secretaria

**Exemplos:**
- "Festa Junina - 24/06/2026"
- "Reunião de Pais - 15/05/2026"
- "Feriado Prolongado - 02/09/2026"
- "Palestra sobre Saúde Mental - 10/06/2026"

---

### Ordem de Criação de Arquivos:

#### 5.1 Entity (20 min)
**Arquivo:** `backend/entities/evento.model.ts`

```typescript
export interface Evento {
  EventoGUID: string;
  EscolaGUID: string;
  EventoTitulo: string;
  EventoDescricao: string | null;
  EventoData: Date;
  EventoStatus: 'Agendado' | 'Realizado' | 'Cancelado';
  EventoCreatedAt: Date;
  EventoUpdatedAt: Date;
}

export class EventoEntity {
  #eventoGUID: string;
  #escolaGUID: string;
  #eventoTitulo: string;
  #eventoDescricao: string | null;
  #eventoData: Date;
  #eventoStatus: 'Agendado' | 'Realizado' | 'Cancelado';
  #eventoCreatedAt: Date;
  #eventoUpdatedAt: Date;

  constructor(data: Evento) {
    this.#eventoGUID = data.EventoGUID;
    this.#escolaGUID = data.EscolaGUID;
    this.#eventoTitulo = data.EventoTitulo;
    this.#eventoDescricao = data.EventoDescricao;
    this.#eventoData = data.EventoData;
    this.#eventoStatus = data.EventoStatus;
    this.#eventoCreatedAt = data.EventoCreatedAt;
    this.#eventoUpdatedAt = data.EventoUpdatedAt;
  }

  // Getters
  get eventoGUID() { return this.#eventoGUID; }
  get escolaGUID() { return this.#escolaGUID; }
  get eventoTitulo() { return this.#eventoTitulo; }
  get eventoDescricao() { return this.#eventoDescricao; }
  get eventoData() { return this.#eventoData; }
  get eventoStatus() { return this.#eventoStatus; }
  get eventoCreatedAt() { return this.#eventoCreatedAt; }
  get eventoUpdatedAt() { return this.#eventoUpdatedAt; }

  // Setters
  set eventoTitulo(titulo: string) {
    if (titulo.length < 3 || titulo.length > 128) {
      throw new Error('EventoTitulo deve ter entre 3 e 128 caracteres');
    }
    this.#eventoTitulo = titulo.trim();
  }

  set eventoDescricao(descricao: string | null) {
    if (descricao && descricao.length > 1024) {
      throw new Error('EventoDescricao deve ter no máximo 1024 caracteres');
    }
    this.#eventoDescricao = descricao?.trim() || null;
  }

  set eventoStatus(status: 'Agendado' | 'Realizado' | 'Cancelado') {
    if (!['Agendado', 'Realizado', 'Cancelado'].includes(status)) {
      throw new Error('EventoStatus inválido');
    }
    this.#eventoStatus = status;
  }

  validar(): void {
    if (this.#eventoGUID.length !== 36) {
      throw new Error('EventoGUID deve ter 36 caracteres (UUID)');
    }
    if (this.#escolaGUID.length !== 36) {
      throw new Error('EscolaGUID deve ter 36 caracteres (UUID)');
    }
    if (this.#eventoData <= new Date()) {
      throw new Error('EventoData deve ser futura');
    }
  }

  toJSON(): Evento {
    return {
      EventoGUID: this.#eventoGUID,
      EscolaGUID: this.#escolaGUID,
      EventoTitulo: this.#eventoTitulo,
      EventoDescricao: this.#eventoDescricao,
      EventoData: this.#eventoData,
      EventoStatus: this.#eventoStatus,
      EventoCreatedAt: this.#eventoCreatedAt,
      EventoUpdatedAt: this.#eventoUpdatedAt
    };
  }
}
```

**Validações:**
- EventoGUID: UUID v4
- EscolaGUID: UUID v4, deve existir
- EventoTitulo: 3-128 chars
- EventoDescricao: 0-1024 chars (opcional)
- EventoData: data futura
- EventoStatus: enum

---

#### 5.2 Repository (1.5h)
**Arquivo:** `backend/repositories/evento.repository.ts`

```typescript
import { getPool } from '../database/mysql';
import { Evento, EventoEntity } from '../entities/evento.model';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface EventoFilters {
  EscolaGUID?: string;
  EventoStatus?: 'Agendado' | 'Realizado' | 'Cancelado';
  dataInicio?: Date;
  dataFim?: Date;
}

export class EventoDAO {
  // CREATE
  async create(evento: Evento): Promise<Evento> {
    const pool = getPool();
    const query = `
      INSERT INTO evento (
        EventoGUID, EscolaGUID, EventoTitulo, EventoDescricao,
        EventoData, EventoStatus
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await pool.execute<ResultSetHeader>(query, [
      evento.EventoGUID,
      evento.EscolaGUID,
      evento.EventoTitulo,
      evento.EventoDescricao,
      evento.EventoData,
      evento.EventoStatus
    ]);
    
    return evento;
  }

  // FIND ALL (com filtros)
  async findAll(filters: EventoFilters = {}): Promise<Evento[]> {
    const pool = getPool();
    let query = 'SELECT * FROM evento WHERE 1=1';
    const params: any[] = [];
    
    if (filters.EscolaGUID) {
      query += ' AND EscolaGUID = ?';
      params.push(filters.EscolaGUID);
    }
    if (filters.EventoStatus) {
      query += ' AND EventoStatus = ?';
      params.push(filters.EventoStatus);
    }
    if (filters.dataInicio) {
      query += ' AND EventoData >= ?';
      params.push(filters.dataInicio);
    }
    if (filters.dataFim) {
      query += ' AND EventoData <= ?';
      params.push(filters.dataFim);
    }
    
    query += ' ORDER BY EventoData ASC';
    
    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return this.mapRows(rows);
  }

  // FIND BY ID
  async findById(guid: string): Promise<Evento | null> {
    const pool = getPool();
    const query = 'SELECT * FROM evento WHERE EventoGUID = ?';
    const [rows] = await pool.execute<RowDataPacket[]>(query, [guid]);
    
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  // UPDATE
  async update(guid: string, data: Partial<Evento>): Promise<Evento> {
    const pool = getPool();
    const fields: string[] = [];
    const values: any[] = [];
    
    if (data.EventoTitulo !== undefined) {
      fields.push('EventoTitulo = ?');
      values.push(data.EventoTitulo);
    }
    if (data.EventoDescricao !== undefined) {
      fields.push('EventoDescricao = ?');
      values.push(data.EventoDescricao);
    }
    if (data.EventoData !== undefined) {
      fields.push('EventoData = ?');
      values.push(data.EventoData);
    }
    if (data.EventoStatus !== undefined) {
      fields.push('EventoStatus = ?');
      values.push(data.EventoStatus);
    }
    
    fields.push('EventoUpdatedAt = CURRENT_TIMESTAMP');
    values.push(guid);
    
    const query = `UPDATE evento SET ${fields.join(', ')} WHERE EventoGUID = ?`;
    await pool.execute<ResultSetHeader>(query, values);
    
    const updated = await this.findById(guid);
    if (!updated) throw new Error('Evento não encontrado após atualização');
    return updated;
  }

  // DELETE (soft delete)
  async delete(guid: string): Promise<boolean> {
    const pool = getPool();
    const query = 'UPDATE evento SET EventoStatus = ? WHERE EventoGUID = ?';
    const [result] = await pool.execute<ResultSetHeader>(query, ['Cancelado', guid]);
    return result.affectedRows > 0;
  }

  // Helper: map row
  private mapRow(row: RowDataPacket): Evento {
    return {
      EventoGUID: row.EventoGUID,
      EscolaGUID: row.EscolaGUID,
      EventoTitulo: row.EventoTitulo,
      EventoDescricao: row.EventoDescricao,
      EventoData: new Date(row.EventoData),
      EventoStatus: row.EventoStatus,
      EventoCreatedAt: new Date(row.EventoCreatedAt),
      EventoUpdatedAt: new Date(row.EventoUpdatedAt)
    };
  }

  private mapRows(rows: RowDataPacket[]): Evento[] {
    return rows.map(row => this.mapRow(row));
  }
}
```

---

#### 5.3 Service (2h)
**Arquivo:** `backend/services/evento.service.ts`

```typescript
import { EventoDAO } from '../repositories/evento.repository';
import { EscolaDAO } from '../repositories/escola.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../repositories/escolaxusuarioxfuncao.repository';
import { Evento } from '../entities/evento.model';
import { ErrorResponse } from '../utils/ErrorResponse';
import { v4 as uuidv4 } from 'uuid';

export interface EventoCreateDTO {
  EscolaGUID: string;
  EventoTitulo: string;
  EventoDescricao?: string;
  EventoData: string | Date;
}

export interface EventoUpdateDTO {
  EventoTitulo?: string;
  EventoDescricao?: string;
  EventoData?: string | Date;
  EventoStatus?: 'Agendado' | 'Realizado' | 'Cancelado';
}

export class EventoService {
  constructor(
    private eventoDAO: EventoDAO,
    private escolaDAO: EscolaDAO,
    private escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {}

  // CREATE (apenas Coordenação, Direção ou Secretaria)
  async criarEvento(data: EventoCreateDTO, usuarioCPF: string): Promise<Evento> {
    // 1. Validar permissão de escrita (Coordenação=1, Secretaria=2, Direção=6)
    await this.validarPermissaoEscrita(usuarioCPF, data.EscolaGUID);

    // 2. Validar existência da escola
    const escola = await this.escolaDAO.findById(data.EscolaGUID);
    if (!escola) {
      throw new ErrorResponse('Escola não encontrada', 404);
    }

    // 3. Validar data futura
    const eventoData = new Date(data.EventoData);
    if (eventoData <= new Date()) {
      throw new ErrorResponse('Data do evento deve ser futura', 400);
    }

    // 4. Criar evento
    const evento: Evento = {
      EventoGUID: uuidv4(),
      EscolaGUID: data.EscolaGUID,
      EventoTitulo: data.EventoTitulo.trim(),
      EventoDescricao: data.EventoDescricao?.trim() || null,
      EventoData: eventoData,
      EventoStatus: 'Agendado',
      EventoCreatedAt: new Date(),
      EventoUpdatedAt: new Date()
    };

    return await this.eventoDAO.create(evento);
  }

  // LIST (todos os usuários da escola podem visualizar)
  async listarEventos(filters: any, usuarioCPF: string): Promise<Evento[]> {
    // Usuário só vê eventos da escola que está vinculado
    if (filters.EscolaGUID) {
      const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(
        filters.EscolaGUID,
        usuarioCPF
      );
      
      if (!vinculo || vinculo.Status !== 'Ativo') {
        throw new ErrorResponse('Usuário não vinculado a esta escola', 403);
      }
    }

    return await this.eventoDAO.findAll(filters);
  }

  // SHOW
  async buscarEvento(guid: string, usuarioCPF: string): Promise<Evento> {
    const evento = await this.eventoDAO.findById(guid);
    if (!evento) {
      throw new ErrorResponse('Evento não encontrado', 404);
    }

    // Validar usuário está na escola do evento
    const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(
      evento.EscolaGUID,
      usuarioCPF
    );
    
    if (!vinculo || vinculo.Status !== 'Ativo') {
      throw new ErrorResponse('Sem permissão para visualizar este evento', 403);
    }

    return evento;
  }

  // UPDATE (apenas quem criou ou Coordenação/Direção)
  async atualizarEvento(
    guid: string,
    data: EventoUpdateDTO,
    usuarioCPF: string
  ): Promise<Evento> {
    // 1. Buscar evento
    const evento = await this.eventoDAO.findById(guid);
    if (!evento) {
      throw new ErrorResponse('Evento não encontrado', 404);
    }

    // 2. Validar permissão
    await this.validarPermissaoEscrita(usuarioCPF, evento.EscolaGUID);

    // 3. Validar campos se fornecidos
    if (data.EventoData) {
      const novaData = new Date(data.EventoData);
      if (novaData <= new Date()) {
        throw new ErrorResponse('Data do evento deve ser futura', 400);
      }
    }

    // 4. Atualizar
    return await this.eventoDAO.update(guid, data);
  }

  // DELETE (soft delete - marca como Cancelado)
  async excluirEvento(guid: string, usuarioCPF: string): Promise<void> {
    const evento = await this.eventoDAO.findById(guid);
    if (!evento) {
      throw new ErrorResponse('Evento não encontrado', 404);
    }

    await this.validarPermissaoEscrita(usuarioCPF, evento.EscolaGUID);
    await this.eventoDAO.delete(guid);
  }

  // Helper: validar permissão de escrita
  private async validarPermissaoEscrita(cpf: string, escolaGUID: string): Promise<void> {
    const vinculo = await this.escolaxUsuarioxFuncaoDAO.findByEscolaAndUsuario(
      escolaGUID,
      cpf
    );
    
    if (!vinculo || ![1, 2, 6].includes(vinculo.FuncaoId) || vinculo.Status !== 'Ativo') {
      throw new ErrorResponse(
        'Sem permissão. Apenas Coordenação, Direção e Secretaria podem gerenciar eventos.',
        403
      );
    }
  }
}
```

---

#### 5.4 Middleware (30 min)
**Arquivo:** `backend/middlewares/evento.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../utils/ErrorResponse';

export class EventoMiddleware {
  // Validar body do POST
  static validarCriacao(req: Request, res: Response, next: NextFunction) {
    const { EscolaGUID, EventoTitulo, EventoData } = req.body.evento || {};
    
    if (!EscolaGUID || !EventoTitulo || !EventoData) {
      return next(new ErrorResponse('Campos obrigatórios faltando (EscolaGUID, EventoTitulo, EventoData)', 400));
    }
    
    if (EventoTitulo.length < 3 || EventoTitulo.length > 128) {
      return next(new ErrorResponse('EventoTitulo deve ter entre 3 e 128 caracteres', 400));
    }
    
    // Validar formato de data
    const data = new Date(EventoData);
    if (isNaN(data.getTime())) {
      return next(new ErrorResponse('EventoData deve ser uma data válida', 400));
    }
    
    next();
  }
  
  // Validar GUID no param
  static validarGUID(req: Request, res: Response, next: NextFunction) {
    const { guid } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(guid)) {
      return next(new ErrorResponse('GUID inválido', 400));
    }
    
    next();
  }
  
  // Validar body do PUT
  static validarAtualizacao(req: Request, res: Response, next: NextFunction) {
    const { EventoTitulo, EventoDescricao, EventoData, EventoStatus } = req.body.evento || {};
    
    if (!EventoTitulo && !EventoDescricao && !EventoData && !EventoStatus) {
      return next(new ErrorResponse('É necessário fornecer ao menos um campo para atualização', 400));
    }
    
    if (EventoTitulo && (EventoTitulo.length < 3 || EventoTitulo.length > 128)) {
      return next(new ErrorResponse('EventoTitulo deve ter entre 3 e 128 caracteres', 400));
    }
    
    if (EventoStatus && !['Agendado', 'Realizado', 'Cancelado'].includes(EventoStatus)) {
      return next(new ErrorResponse('EventoStatus inválido', 400));
    }
    
    next();
  }
}
```

---

#### 5.5 Controller (1h)
**Arquivo:** `backend/controllers/evento.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { EventoService } from '../services/evento.service';

export class EventoController {
  constructor(private eventoService: EventoService) {}
  
  // POST /api/evento
  store = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const evento = await this.eventoService.criarEvento(req.body.evento, usuarioCPF);
      
      return res.status(201).json({
        success: true,
        message: 'Evento criado com sucesso',
        data: evento
      });
    } catch (error) {
      next(error);
    }
  };
  
  // GET /api/evento?EscolaGUID=&EventoStatus=&dataInicio=&dataFim=
  index = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const filters = {
        EscolaGUID: req.query.EscolaGUID as string,
        EventoStatus: req.query.EventoStatus as any,
        dataInicio: req.query.dataInicio ? new Date(req.query.dataInicio as string) : undefined,
        dataFim: req.query.dataFim ? new Date(req.query.dataFim as string) : undefined
      };
      
      const eventos = await this.eventoService.listarEventos(filters, usuarioCPF);
      
      return res.json({
        success: true,
        data: eventos,
        total: eventos.length
      });
    } catch (error) {
      next(error);
    }
  };
  
  // GET /api/evento/:guid
  show = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const evento = await this.eventoService.buscarEvento(req.params.guid, usuarioCPF);
      
      return res.json({
        success: true,
        data: evento
      });
    } catch (error) {
      next(error);
    }
  };
  
  // PUT /api/evento/:guid
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const evento = await this.eventoService.atualizarEvento(
        req.params.guid,
        req.body.evento,
        usuarioCPF
      );
      
      return res.json({
        success: true,
        message: 'Evento atualizado com sucesso',
        data: evento
      });
    } catch (error) {
      next(error);
    }
  };
  
  // DELETE /api/evento/:guid
  destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      await this.eventoService.excluirEvento(req.params.guid, usuarioCPF);
      
      return res.json({
        success: true,
        message: 'Evento cancelado com sucesso'
      });
    } catch (error) {
      next(error);
    }
  };
}
```

---

#### 5.6 Routes (30 min)
**Arquivo:** `routes/evento.routes.ts`

```typescript
import { Router } from 'express';
import { EventoController } from '../backend/controllers/evento.controller';
import { EventoService } from '../backend/services/evento.service';
import { EventoDAO } from '../backend/repositories/evento.repository';
import { EscolaDAO } from '../backend/repositories/escola.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../backend/repositories/escolaxusuarioxfuncao.repository';
import { EventoMiddleware } from '../backend/middlewares/evento.middleware';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';

export function eventoRouterFactory() {
  const router = Router();
  
  // Dependências
  const eventoDAO = new EventoDAO();
  const escolaDAO = new EscolaDAO();
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO();
  const eventoService = new EventoService(eventoDAO, escolaDAO, escolaxUsuarioxFuncaoDAO);
  const controller = new EventoController(eventoService);
  
  // Todas as rotas requerem autenticação
  router.use(AuthMiddleware.authenticate);
  
  // POST /api/evento
  router.post(
    '/',
    EventoMiddleware.validarCriacao,
    controller.store
  );
  
  // GET /api/evento
  router.get('/', controller.index);
  
  // GET /api/evento/:guid
  router.get(
    '/:guid',
    EventoMiddleware.validarGUID,
    controller.show
  );
  
  // PUT /api/evento/:guid
  router.put(
    '/:guid',
    EventoMiddleware.validarGUID,
    EventoMiddleware.validarAtualizacao,
    controller.update
  );
  
  // DELETE /api/evento/:guid
  router.delete(
    '/:guid',
    EventoMiddleware.validarGUID,
    controller.destroy
  );
  
  return router;
}
```

---

#### 5.7 Registrar no Server (5 min)
**Arquivo:** `backend/Server.ts`

```typescript
// Importar
import { eventoRouterFactory } from '../routes/evento.routes';

// Registrar
const eventoRouter = eventoRouterFactory();
this.#app.use('/api/evento', eventoRouter);
console.log('✅ Rotas de Evento registradas em /api/evento');
```

---

### ✅ Checklist Fase 5 - Evento

- [ ] Migration executada (tabela `evento` criada)
- [ ] Entity criada (`evento.model.ts`)
- [ ] Repository com 5 métodos (create, findAll, findById, update, delete)
- [ ] Service com validações (permissão criar = Coord/Dir/Sec, data futura)
- [ ] Middleware de validação
- [ ] Controller com 5 endpoints
- [ ] Routes configuradas
- [ ] Rotas registradas no Server.ts
- [ ] **Teste:** Coordenador cria evento "Festa Junina"
- [ ] **Teste:** Aluno visualiza eventos da sua escola
- [ ] **Teste:** Secretaria atualiza evento
- [ ] **Teste:** Direção cancela evento (soft delete)
- [ ] **Teste:** Erro ao professor criar evento (sem permissão)
- [ ] **Teste:** Erro ao criar evento com data passada
- [ ] **Teste:** Usuário só vê eventos da escola que está vinculado

---

## 🔧 FASE 6: RELAÇÃO ANEXOS (4-6h)

### Ordem de Criação de Arquivos:

#### 6.1 Entity (15 min)
**Arquivo:** `backend/entities/relacaoanexos.model.ts`

```typescript
export interface RelacaoAnexos {
  RelacaoAnexoGUID: string;
  AnexoGUID: string;
  TarefaGUID: string | null;
  PendenciaGUID: string | null;
  EventoGUID: string | null;
  RelacaoCreatedAt: Date;
}
```

---

#### 6.2 Repository (2h)
**Arquivo:** `backend/repositories/relacaoanexos.repository.ts`

**Métodos Especiais:**
```typescript
class RelacaoAnexosDAO {
  async vincularAnexoTarefa(anexoGUID: string, tarefaGUID: string): Promise<RelacaoAnexos>
  async vincularAnexoPendencia(anexoGUID: string, pendenciaGUID: string): Promise<RelacaoAnexos>
  async vincularAnexoEvento(anexoGUID: string, eventoGUID: string): Promise<RelacaoAnexos>
  async findAnexosByTarefa(tarefaGUID: string): Promise<Anexo[]>
  async findAnexosByPendencia(pendenciaGUID: string): Promise<Anexo[]>
  async findAnexosByEvento(eventoGUID: string): Promise<Anexo[]>
  async delete(guid: string): Promise<boolean>
}
```

**Query JOIN (anexos de tarefa):**
```sql
SELECT a.* FROM anexo a
JOIN relacaoanexos ra ON ra.AnexoGUID = a.AnexoGUID
WHERE ra.TarefaGUID = ?
ORDER BY a.AnexoCreatedAt ASC
```

---

#### 6.3 Service (1.5h)
**Arquivo:** `backend/services/relacaoanexos.service.ts`

```typescript
class RelacaoAnexosService {
  async vincularAnexo(
    anexoGUID: string,
    targetType: 'tarefa' | 'pendencia' | 'evento',
    targetGUID: string,
    usuarioCPF: string
  ) {
    // 1. Validar anexo existe
    const anexo = await this.anexoDAO.findById(anexoGUID);
    if (!anexo) throw new ErrorResponse('Anexo não encontrado', 404);

    // 2. Validar target existe conforme tipo
    // 3. Validar permissão do usuário
    // 4. Criar vínculo

    switch (targetType) {
      case 'tarefa':
        return await this.relacaoDAO.vincularAnexoTarefa(anexoGUID, targetGUID);
      case 'pendencia':
        return await this.relacaoDAO.vincularAnexoPendencia(anexoGUID, targetGUID);
      case 'evento':
        return await this.relacaoDAO.vincularAnexoEvento(anexoGUID, targetGUID);
    }
  }
}
```

---

#### 6.4 Controller, Routes (1.5h)
Endpoints especiais:
- `GET /api/tarefaacademica/:guid/anexos` (lista anexos da tarefa)
- `POST /api/tarefaacademica/:guid/anexos` (vincula anexo)
- `GET /api/pendencia/:guid/anexos`
- `POST /api/pendencia/:guid/anexos`
- `GET /api/evento/:guid/anexos`
- `POST /api/evento/:guid/anexos`

---

### ✅ Checklist Fase 6 - RelacaoAnexos

- [ ] Migration executada
- [ ] Entity criada
- [ ] Repository com 7 métodos
- [ ] Service com validações
- [ ] Endpoints adicionados aos controllers existentes
- [ ] **Teste:** Vincular anexo a tarefa
- [ ] **Teste:** Listar anexos de pendência
- [ ] **Teste:** Vincular anexo a evento
- [ ] **Teste:** Erro ao vincular anexo inexistente

---

## 📊 RESUMO FINAL

### Total de Arquivos Criados: ~45 arquivos

| Módulo | Entity | Repository | Service | Middleware | Controller | Routes | Total |
|--------|--------|------------|---------|------------|------------|--------|-------|
| Anexo | 1 | 1 | 1 | 1 | 1 | 1 | 6 |
| TarefaAcademica | 1 | 1 | 1 | 1 | 1 | 1 | 6 |
| ProvaAgendada | 1 | 1 | 1 | 1 | 1 | 1 | 6 |
| Pendencia | 1 | 1 | 1 | 1 | 1 | 1 | 6 |
| Evento | 1 | 1 | 1 | 1 | 1 | 1 | 6 |
| RelacaoAnexos | 1 | 1 | 1 | - | - | - | 3 |
| Migrations | - | - | - | - | - | - | 1 |
| **TOTAL** | **6** | **6** | **6** | **5** | **5** | **5** | **34** |

### Ordem de Execução Recomendada:
1. ✅ Migrations (criar todas as tabelas)
2. ✅ Anexo (base para todos)
3. ✅ TarefaAcademica
4. ✅ ProvaAgendada
5. ✅ Pendencia
6. ✅ Evento
7. ✅ RelacaoAnexos

### Endpoints Totais: ~30 endpoints
- Anexo: 4 endpoints
- TarefaAcademica: 6 endpoints
- ProvaAgendada: 5 endpoints
- Pendencia: 8 endpoints
- Evento: 5 endpoints
- RelacaoAnexos: 6 endpoints (integrados nos controllers)

---

## 📋 ROTAS REST API IMPLEMENTADAS

### 🔹 Fase 4 - Pendências (`/api/pendencia`)

**Base URL:** `/api/pendencia`  
**Autenticação:** Obrigatória (Bearer Token)

| Método | Rota | Descrição | Permissão |
|--------|------|-----------|-----------|
| `POST` | `/` | Criar pendência | Coord/Sec/Dir |
| `GET` | `/` | Listar pendências | Usuário vinculado à escola |
| `GET` | `/:PendenciaGUID` | Buscar pendência específica | Usuário vinculado à escola |
| `PUT` | `/:PendenciaGUID` | Atualizar pendência | Coord/Sec/Dir |
| `DELETE` | `/:PendenciaGUID` | Excluir pendência | Coord/Sec/Dir |
| `PATCH` | `/:PendenciaGUID/marcar-feito` | Marcar como concluída | Destinatário |
| `GET` | `/contador/pendentes` | Contar pendências pendentes | Usuário vinculado |
| `GET` | `/contador/atrasadas` | Contar pendências atrasadas | Usuário vinculado |

**Query Params (`GET /`):**
- `UsuarioCPF` (string): Filtrar por destinatário
- `EscolaGUID` (string): Filtrar por escola
- `PendenciaFeito` (boolean): Filtrar por status conclusão
- `atrasadas` (boolean): Filtrar apenas atrasadas
- `limit` (number): Limitar resultados
- `offset` (number): Paginação

**Body Example (`POST /`):**
```json
{
  "pendencia": {
    "UsuarioCPFDestino": "12345678901",
    "EscolaGUID": "uuid-escola",
    "PendenciaTitulo": "Enviar relatório de notas",
    "PendenciaConteudo": "Relatório do 1º bimestre",
    "PendenciaPrazoData": "2026-05-25T23:59:59Z"
  }
}
```

---

### 🔹 Fase 5 - Eventos (`/api/evento`)

**Base URL:** `/api/evento`  
**Autenticação:** Obrigatória (Bearer Token)

| Método | Rota | Descrição | Permissão |
|--------|------|-----------|-----------|
| `POST` | `/` | Criar evento | Coord/Sec/Dir |
| `GET` | `/` | Listar eventos | Todos os usuários da escola |
| `GET` | `/:EventoGUID` | Buscar evento específico | Usuário vinculado à escola |
| `PUT` | `/:EventoGUID` | Atualizar evento | Coord/Sec/Dir |
| `DELETE` | `/:EventoGUID` | Cancelar evento (soft delete) | Coord/Sec/Dir |

**Query Params (`GET /`):**
- `EscolaGUID` (string): Filtrar por escola
- `EventoStatus` (enum): `"Agendado"` \| `"Realizado"` \| `"Cancelado"`
- `dataInicio` (ISO date): Data início do range
- `dataFim` (ISO date): Data fim do range

**Body Example (`POST /`):**
```json
{
  "evento": {
    "EscolaGUID": "uuid-escola",
    "EventoTitulo": "Festa Junina 2026",
    "EventoDescricao": "Festa tradicional com quadrilha, comidas típicas e jogos",
    "EventoData": "2026-06-24T18:00:00Z"
  }
}
```

---

### 🔹 Fase 6 - RelacaoAnexos (Endpoints integrados)

**Vinculação de Anexos a Recursos Acadêmicos**

#### Tarefas (`/api/tarefaacademica/:TarefaGUID/anexos`)

| Método | Rota | Descrição | Permissão |
|--------|------|-----------|-----------|
| `GET` | `/:TarefaGUID/anexos` | Listar anexos da tarefa | Aluno/Professor vinculado |
| `POST` | `/:TarefaGUID/anexos` | Vincular anexo existente | Professor |

**Body Example (`POST`):**
```json
{
  "AnexoGUID": "uuid-anexo-existente"
}
```

---

#### Pendências (`/api/pendencia/:PendenciaGUID/anexos`)

| Método | Rota | Descrição | Permissão |
|--------|------|-----------|-----------|
| `GET` | `/:PendenciaGUID/anexos` | Listar anexos da pendência | Destinatário/Criador |
| `POST` | `/:PendenciaGUID/anexos` | Vincular anexo | Coord/Sec/Dir |

---

#### Eventos (`/api/evento/:EventoGUID/anexos`)

| Método | Rota | Descrição | Permissão |
|--------|------|-----------|-----------|
| `GET` | `/:EventoGUID/anexos` | Listar anexos do evento | Todos da escola |
| `POST` | `/:EventoGUID/anexos` | Vincular anexo (cartaz, convite) | Coord/Sec/Dir |

---

### 🔹 Notas sobre RelacaoAnexos

**Fluxo Completo:**
1. Upload de anexo via `/api/anexo` (retorna `AnexoGUID`)
2. Vinculação do anexo a um recurso via `POST /:RecursoGUID/anexos`
3. Listagem de anexos vinculados via `GET /:RecursoGUID/anexos`

**Validações:**
- Anexo e recurso devem pertencer à mesma escola
- Não permite vincular o mesmo anexo duas vezes ao mesmo recurso
- Retorna anexos com metadados completos (nome, tamanho, tipo, data)

---

## 🔧 ENDPOINTS DE SUPORTE

### Calendário Unificado (`/api/calendario`)

**Rota:** `GET /api/calendario`  
**Descrição:** Retorna todos os avisos (tarefas, provas, pendências, eventos) em formato unificado para exibição em calendário.

**Query Params:**
- `EscolaGUID` (string, obrigatório)
- `DataInicio` (ISO date, obrigatório)
- `DataFim` (ISO date, obrigatório)

**Response Example:**
```json
{
  "success": true,
  "data": {
    "avisos": [
      {
        "TipoAviso": "tarefa",
        "AvisoId": "uuid-tarefa",
        "DataPrazo": "2026-05-20T23:59:59Z",
        "Titulo": "Trabalho de Matemática",
        "Descricao": "Resolver exercícios do capítulo 5",
        "StatusTexto": "Pendente",
        "TipoEntrega": "digital"
      },
      {
        "TipoAviso": "prova",
        "AvisoId": "uuid-prova",
        "DataPrazo": "2026-05-22T14:00:00Z",
        "Titulo": "Prova de História",
        "Descricao": "Conteúdo: Revolução Industrial",
        "StatusTexto": "Agendada",
        "TipoEntrega": null
      },
      {
        "TipoAviso": "pendencia",
        "AvisoId": "uuid-pendencia",
        "DataPrazo": "2026-05-25T17:00:00Z",
        "Titulo": "Entregar relatório",
        "Descricao": "Relatório de frequência",
        "StatusTexto": "Não concluída",
        "TipoEntrega": null
      },
      {
        "TipoAviso": "evento",
        "AvisoId": "uuid-evento",
        "DataPrazo": "2026-06-24T18:00:00Z",
        "Titulo": "Festa Junina",
        "Descricao": "Festa tradicional da escola",
        "StatusTexto": "Agendado",
        "TipoEntrega": null
      }
    ]
  }
}
```

---

## 🎯 PRÓXIMOS PASSOS APÓS IMPLEMENTAÇÃO

### ✅ Concluído
- ✅ **Integração com Calendário** - Endpoint `/api/calendario` com query UNION implementado
- ✅ **Frontend: Tela de Calendário Unificado** - Interface de calendário grid com modal implementada
  - Grid 7x6 (semanas x dias)
  - Fitas coloridas por tipo de aviso (tarefa, prova, evento)
  - Modal com detalhes ao clicar em qualquer dia
  - Navegação entre meses e dias com eventos
  - Suporte para dias sem avisos (mensagem informativa)

### 🔄 Em Planejamento
1. **Job Diário de Lembretes** (conforme plano-tecnico-tarefas-calendario-notificacoes.md)
   - Verificar tarefas/provas próximas do prazo
   - Notificar alunos e professores via email/WhatsApp
2. **Notificações Email/WhatsApp**
   - Integração com serviços de envio (Brevo/Resend para email, Twilio para WhatsApp)
   - Templates de notificação personalizados
3. **Dashboard Administrativo**
   - Estatísticas de tarefas concluídas/atrasadas
   - Relatórios de eventos e pendências
   - Visão geral de anexos por escola

---

**Fim do Plano de Implementação**
