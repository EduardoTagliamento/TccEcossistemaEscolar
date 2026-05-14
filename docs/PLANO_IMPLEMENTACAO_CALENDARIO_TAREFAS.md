# 📋 PLANO DE IMPLEMENTAÇÃO - Sistema de Calendário e Tarefas

**Data:** 14/05/2026  
**Base:** [PLANEJAMENTO_TAREFAS_MATERIAS_PENDENCIAS.md](PLANEJAMENTO_TAREFAS_MATERIAS_PENDENCIAS.md)  
**Status:** Planejamento Executável

---

## 🎯 VISÃO GERAL

### Objetivo
Implementar sistema completo de calendário acadêmico com 4 tipos de avisos (tarefas, provas, pendências, eventos), sistema de anexos bidirecional e endpoint especializado para visualização em calendário.

### Módulos a Implementar
1. **Tarefas Acadêmicas** - Atividades obrigatórias entregáveis por alunos
2. **Provas Agendadas** - Avisos de avaliações futuras
3. **Pendências** - Lembretes administrativos/pedagógicos genéricos
4. **Eventos** - Avisos informativos gerais da escola
5. **Anexos** - Sistema de upload/download de arquivos
6. **Calendário** - Endpoint UNION para visualização integrada

### Dependências de Implementação
```
1. Anexo (independente - base para todos)
2. Tarefa Acadêmica (depende de: Matrícula, MateriaxProfessorxTurma)
3. Prova Agendada (depende de: Turma, Matéria)
4. Pendência (depende de: Usuário, Escola)
5. Evento + EventoDestinatarios (depende de: Escola, Função, Turma)
6. Relações Anexos (depende de: Anexo + cada entidade)
7. Calendário (depende de: todos os anteriores)
```

### Estimativa de Tempo
- **Anexo:** 6-8 horas (upload/storage/validações)
- **Tarefa Acadêmica:** 8-10 horas (lógica bidirecionais, anexos duplos)
- **Prova Agendada:** 4-6 horas (mais simples, unidirecional)
- **Pendência:** 6-8 horas (similar a tarefa)
- **Evento + Destinatários:** 8-10 horas (segmentação complexa)
- **Relações Anexos:** 4-6 horas (4 tabelas pivô)
- **Calendário:** 6-8 horas (query UNION + filtros + detalhes por dia)
- **TOTAL:** 42-56 horas (~6-7 dias de trabalho)

---

## 📦 PRÉ-REQUISITOS

### ✅ Antes de Começar

#### 1. Executar Migrations no Banco
```sql
-- 1. Tabela: tarefaacademica
CREATE TABLE tarefaacademica (
  TarefaGUID CHAR(36) PRIMARY KEY,
  MatriculaGUID CHAR(36) NOT NULL,
  matXprofXturxescGUID CHAR(36) NOT NULL,
  TarefaTitulo VARCHAR(128) NOT NULL,
  TarefaConteudo VARCHAR(1024),
  TarefaPostagemData DATETIME NOT NULL,
  TarefaPrazoData DATETIME NOT NULL,
  TarefaTipoEntrega ENUM('digital', 'fisica') NOT NULL,
  TarefaFeito BOOLEAN DEFAULT FALSE,
  TarefaRealizacaoData DATETIME,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (MatriculaGUID) REFERENCES matricula(MatriculaGUID),
  FOREIGN KEY (matXprofXturxescGUID) REFERENCES materiaxprofessorxturma(matXprofXturxescGUID),
  INDEX idx_matricula (MatriculaGUID),
  INDEX idx_prazo (TarefaPrazoData),
  INDEX idx_feito (TarefaFeito),
  INDEX idx_tipo_entrega (TarefaTipoEntrega)
);

-- 2. Tabela: provaagendada
CREATE TABLE provaagendada (
  ProvaAgendadaGUID CHAR(36) PRIMARY KEY,
  TurmaGUID CHAR(36) NOT NULL,
  MateriaGUID CHAR(36) NOT NULL,
  ProvaData DATETIME NOT NULL,
  ProvaDescricao VARCHAR(1024),
  ProvaStatus ENUM('Agendada', 'Realizada', 'Cancelada') DEFAULT 'Agendada',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (TurmaGUID) REFERENCES turma(TurmaGUID),
  FOREIGN KEY (MateriaGUID) REFERENCES materia(MateriaGUID),
  INDEX idx_data (ProvaData),
  INDEX idx_status (ProvaStatus),
  INDEX idx_turma (TurmaGUID)
);

-- 3. Tabela: pendencia
CREATE TABLE pendencia (
  PendenciaGUID CHAR(36) PRIMARY KEY,
  UsuarioCPF VARCHAR(14) NOT NULL,
  EscolaGUID CHAR(36) NOT NULL,
  PendenciaTitulo VARCHAR(128) NOT NULL,
  PendenciaConteudo VARCHAR(1024),
  PendenciaPostagemData DATETIME NOT NULL,
  PendenciaPrazoData DATETIME NOT NULL,
  PendenciaFeito BOOLEAN DEFAULT FALSE,
  PendenciaRealizacaoData DATETIME,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (UsuarioCPF) REFERENCES usuario(UsuarioCPF),
  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID),
  INDEX idx_usuario (UsuarioCPF),
  INDEX idx_prazo (PendenciaPrazoData),
  INDEX idx_feito (PendenciaFeito),
  INDEX idx_escola (EscolaGUID)
);

-- 4. Tabela: evento
CREATE TABLE evento (
  EventoGUID CHAR(36) PRIMARY KEY,
  EscolaGUID CHAR(36) NOT NULL,
  UsuarioCPF VARCHAR(14) NOT NULL,
  EventoTitulo VARCHAR(128) NOT NULL,
  EventoConteudo VARCHAR(1024),
  EventoDataHora DATETIME NOT NULL,
  EventoStatus ENUM('Agendado', 'Realizado', 'Cancelado') DEFAULT 'Agendado',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID),
  FOREIGN KEY (UsuarioCPF) REFERENCES usuario(UsuarioCPF),
  INDEX idx_escola (EscolaGUID),
  INDEX idx_data (EventoDataHora),
  INDEX idx_status (EventoStatus)
);

-- 5. Tabela: eventodestinatarios
CREATE TABLE eventodestinatarios (
  EventoDestinatarioGUID CHAR(36) PRIMARY KEY,
  EventoGUID CHAR(36) NOT NULL,
  FuncaoId INT,
  TurmaGUID CHAR(36),
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (EventoGUID) REFERENCES evento(EventoGUID) ON DELETE CASCADE,
  FOREIGN KEY (FuncaoId) REFERENCES funcao(FuncaoId),
  FOREIGN KEY (TurmaGUID) REFERENCES turma(TurmaGUID),
  INDEX idx_evento (EventoGUID),
  INDEX idx_funcao (FuncaoId),
  INDEX idx_turma (TurmaGUID)
);

-- 6. Tabela: anexo
CREATE TABLE anexo (
  AnexoGUID CHAR(36) PRIMARY KEY,
  UsuarioCPF VARCHAR(14) NOT NULL,
  EscolaGUID CHAR(36) NOT NULL,
  AnexoCaminho VARCHAR(500) NOT NULL,
  AnexoNomeOriginal VARCHAR(255),
  AnexoTamanho INT,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (UsuarioCPF) REFERENCES usuario(UsuarioCPF),
  FOREIGN KEY (EscolaGUID) REFERENCES escola(EscolaGUID),
  INDEX idx_usuario (UsuarioCPF),
  INDEX idx_escola (EscolaGUID)
);

-- 7. Tabela: relacaoanexostarefa
CREATE TABLE relacaoanexostarefa (
  RelacaoAnexoTarefaGUID CHAR(36) PRIMARY KEY,
  AnexoGUID CHAR(36) NOT NULL,
  TarefaGUID CHAR(36) NOT NULL,
  AnexoTipo ENUM('descricao', 'entrega') NOT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (AnexoGUID) REFERENCES anexo(AnexoGUID) ON DELETE CASCADE,
  FOREIGN KEY (TarefaGUID) REFERENCES tarefaacademica(TarefaGUID) ON DELETE CASCADE,
  INDEX idx_tarefa (TarefaGUID),
  INDEX idx_anexo (AnexoGUID),
  INDEX idx_tipo (AnexoTipo)
);

-- 8. Tabela: relacaoanexospendencia
CREATE TABLE relacaoanexospendencia (
  RelacaoAnexoPendenciaGUID CHAR(36) PRIMARY KEY,
  AnexoGUID CHAR(36) NOT NULL,
  PendenciaGUID CHAR(36) NOT NULL,
  AnexoTipo ENUM('descricao', 'entrega') NOT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (AnexoGUID) REFERENCES anexo(AnexoGUID) ON DELETE CASCADE,
  FOREIGN KEY (PendenciaGUID) REFERENCES pendencia(PendenciaGUID) ON DELETE CASCADE,
  INDEX idx_pendencia (PendenciaGUID),
  INDEX idx_anexo (AnexoGUID),
  INDEX idx_tipo (AnexoTipo)
);

-- 9. Tabela: relacaoanexosevento
CREATE TABLE relacaoanexosevento (
  RelacaoAnexoEventoGUID CHAR(36) PRIMARY KEY,
  AnexoGUID CHAR(36) NOT NULL,
  EventoGUID CHAR(36) NOT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (AnexoGUID) REFERENCES anexo(AnexoGUID) ON DELETE CASCADE,
  FOREIGN KEY (EventoGUID) REFERENCES evento(EventoGUID) ON DELETE CASCADE,
  INDEX idx_evento (EventoGUID),
  INDEX idx_anexo (AnexoGUID)
);

-- 10. Tabela: relacaoanexosprova
CREATE TABLE relacaoanexosprova (
  RelacaoAnexoProvaGUID CHAR(36) PRIMARY KEY,
  AnexoGUID CHAR(36) NOT NULL,
  ProvaAgendadaGUID CHAR(36) NOT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (AnexoGUID) REFERENCES anexo(AnexoGUID) ON DELETE CASCADE,
  FOREIGN KEY (ProvaAgendadaGUID) REFERENCES provaagendada(ProvaAgendadaGUID) ON DELETE CASCADE,
  INDEX idx_prova (ProvaAgendadaGUID),
  INDEX idx_anexo (AnexoGUID)
);
```

#### 2. Criar Diretório de Upload
```bash
mkdir -p uploads/anexos
chmod 755 uploads/anexos
```

#### 3. Instalar Dependências de Upload
```bash
npm install multer @types/multer
```

#### 4. Configurar Express Static
```typescript
// app.ts
import express from 'express';
import path from 'path';

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

---

## 🔧 FASE 1: ANEXO (6-8h)

### Ordem de Criação de Arquivos:

#### 1.1 Entity (15 min)
**Arquivo:** `backend/entities/anexo.model.ts`

```typescript
export interface Anexo {
  AnexoGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  AnexoCaminho: string;           // Ex: /uploads/anexos/uuid.pdf
  AnexoNomeOriginal: string;      // Ex: trabalho.pdf
  AnexoTamanho: number;           // Bytes
  CreatedAt: Date;
}

export interface AnexoCreateDTO {
  EscolaGUID: string;
  file: Express.Multer.File;      // Vem do multer
}

export interface AnexoFilters {
  UsuarioCPF?: string;
  EscolaGUID?: string;
  DataInicio?: Date;
  DataFim?: Date;
}
```

**Validações:**
- AnexoGUID: UUID v4
- UsuarioCPF: CPF válido (11 dígitos)
- EscolaGUID: UUID v4, deve existir
- AnexoCaminho: path válido, não vazio
- AnexoNomeOriginal: 1-255 chars
- AnexoTamanho: > 0, < 50MB (configurável)

---

#### 1.2 Middleware de Upload (1h)
**Arquivo:** `backend/middlewares/upload.middleware.ts`

```typescript
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { ErrorResponse } from '../utils/ErrorResponse';

class UploadMiddleware {
  // Configuração de storage
  private storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../../uploads/anexos'));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `${uuidv4()}${ext}`;
      cb(null, filename);
    }
  });
  
  // Filtro de tipos permitidos
  private fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ErrorResponse('Tipo de arquivo não permitido', 400) as any);
    }
  };
  
  // Instância do multer
  public upload = multer({
    storage: this.storage,
    fileFilter: this.fileFilter,
    limits: {
      fileSize: 50 * 1024 * 1024  // 50MB
    }
  });
  
  // Middleware para upload único
  public single(fieldName: string) {
    return this.upload.single(fieldName);
  }
  
  // Middleware para múltiplos arquivos
  public array(fieldName: string, maxCount: number = 5) {
    return this.upload.array(fieldName, maxCount);
  }
}

export default new UploadMiddleware();
```

---

#### 1.3 Repository (1-1.5h)
**Arquivo:** `backend/repositories/anexo.repository.ts`

**Métodos Obrigatórios:**
```typescript
import { MysqlDatabase } from '../database/MysqlDatabase';
import { Anexo, AnexoFilters } from '../entities/anexo.model';
import { RowDataPacket } from 'mysql2';

export class AnexoDAO {
  constructor(private db: MysqlDatabase) {}
  
  async create(anexo: Anexo): Promise<Anexo> {
    const query = `
      INSERT INTO anexo 
      (AnexoGUID, UsuarioCPF, EscolaGUID, AnexoCaminho, AnexoNomeOriginal, AnexoTamanho)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.query(query, [
      anexo.AnexoGUID,
      anexo.UsuarioCPF,
      anexo.EscolaGUID,
      anexo.AnexoCaminho,
      anexo.AnexoNomeOriginal,
      anexo.AnexoTamanho
    ]);
    
    return anexo;
  }
  
  async findById(guid: string): Promise<Anexo | null> {
    const query = `SELECT * FROM anexo WHERE AnexoGUID = ?`;
    const [rows] = await this.db.query<RowDataPacket[]>(query, [guid]);
    return rows.length > 0 ? (rows[0] as Anexo) : null;
  }
  
  async findAll(filters: AnexoFilters): Promise<Anexo[]> {
    let query = `SELECT * FROM anexo WHERE 1=1`;
    const params: any[] = [];
    
    if (filters.UsuarioCPF) {
      query += ` AND UsuarioCPF = ?`;
      params.push(filters.UsuarioCPF);
    }
    
    if (filters.EscolaGUID) {
      query += ` AND EscolaGUID = ?`;
      params.push(filters.EscolaGUID);
    }
    
    if (filters.DataInicio) {
      query += ` AND CreatedAt >= ?`;
      params.push(filters.DataInicio);
    }
    
    if (filters.DataFim) {
      query += ` AND CreatedAt <= ?`;
      params.push(filters.DataFim);
    }
    
    query += ` ORDER BY CreatedAt DESC`;
    
    const [rows] = await this.db.query<RowDataPacket[]>(query, params);
    return rows as Anexo[];
  }
  
  async delete(guid: string): Promise<boolean> {
    const query = `DELETE FROM anexo WHERE AnexoGUID = ?`;
    const [result] = await this.db.query(query, [guid]);
    return (result as any).affectedRows > 0;
  }
  
  // Query auxiliar: buscar anexos de uma tarefa
  async findByTarefa(tarefaGUID: string, tipo?: 'descricao' | 'entrega'): Promise<Anexo[]> {
    let query = `
      SELECT a.* 
      FROM anexo a
      JOIN relacaoanexostarefa rat ON a.AnexoGUID = rat.AnexoGUID
      WHERE rat.TarefaGUID = ?
    `;
    const params: any[] = [tarefaGUID];
    
    if (tipo) {
      query += ` AND rat.AnexoTipo = ?`;
      params.push(tipo);
    }
    
    query += ` ORDER BY a.CreatedAt DESC`;
    
    const [rows] = await this.db.query<RowDataPacket[]>(query, params);
    return rows as Anexo[];
  }
  
  // Idem para pendência, evento, prova...
  async findByPendencia(pendenciaGUID: string, tipo?: 'descricao' | 'entrega'): Promise<Anexo[]> {
    let query = `
      SELECT a.* 
      FROM anexo a
      JOIN relacaoanexospendencia rap ON a.AnexoGUID = rap.AnexoGUID
      WHERE rap.PendenciaGUID = ?
    `;
    const params: any[] = [pendenciaGUID];
    
    if (tipo) {
      query += ` AND rap.AnexoTipo = ?`;
      params.push(tipo);
    }
    
    query += ` ORDER BY a.CreatedAt DESC`;
    
    const [rows] = await this.db.query<RowDataPacket[]>(query, params);
    return rows as Anexo[];
  }
  
  async findByEvento(eventoGUID: string): Promise<Anexo[]> {
    const query = `
      SELECT a.* 
      FROM anexo a
      JOIN relacaoanexosevento rae ON a.AnexoGUID = rae.AnexoGUID
      WHERE rae.EventoGUID = ?
      ORDER BY a.CreatedAt DESC
    `;
    
    const [rows] = await this.db.query<RowDataPacket[]>(query, [eventoGUID]);
    return rows as Anexo[];
  }
  
  async findByProva(provaGUID: string): Promise<Anexo[]> {
    const query = `
      SELECT a.* 
      FROM anexo a
      JOIN relacaoanexosprova rap ON a.AnexoGUID = rap.AnexoGUID
      WHERE rap.ProvaAgendadaGUID = ?
      ORDER BY a.CreatedAt DESC
    `;
    
    const [rows] = await this.db.query<RowDataPacket[]>(query, [provaGUID]);
    return rows as Anexo[];
  }
}
```

---

#### 1.4 Service (2-3h)
**Arquivo:** `backend/services/anexo.service.ts`

```typescript
import { AnexoDAO } from '../repositories/anexo.repository';
import { EscolaDAO } from '../repositories/escola.repository';
import { Anexo, AnexoCreateDTO } from '../entities/anexo.model';
import { ErrorResponse } from '../utils/ErrorResponse';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export class AnexoService {
  constructor(
    private anexoDAO: AnexoDAO,
    private escolaDAO: EscolaDAO
  ) {}
  
  // CREATE: Upload de anexo
  async uploadAnexo(data: AnexoCreateDTO, usuarioCPF: string): Promise<Anexo> {
    // 1. Validar escola
    const escola = await this.escolaDAO.findById(data.EscolaGUID);
    if (!escola) {
      throw new ErrorResponse('Escola não encontrada', 404);
    }
    
    // 2. Validar arquivo
    if (!data.file) {
      throw new ErrorResponse('Nenhum arquivo enviado', 400);
    }
    
    // 3. Criar registro
    const anexo: Anexo = {
      AnexoGUID: uuidv4(),
      UsuarioCPF: usuarioCPF,
      EscolaGUID: data.EscolaGUID,
      AnexoCaminho: `/uploads/anexos/${data.file.filename}`,
      AnexoNomeOriginal: data.file.originalname,
      AnexoTamanho: data.file.size,
      CreatedAt: new Date()
    };
    
    return await this.anexoDAO.create(anexo);
  }
  
  // READ: Buscar por ID
  async buscarAnexo(guid: string): Promise<Anexo> {
    const anexo = await this.anexoDAO.findById(guid);
    if (!anexo) {
      throw new ErrorResponse('Anexo não encontrado', 404);
    }
    return anexo;
  }
  
  // READ: Download de anexo
  async downloadAnexo(guid: string, usuarioCPF: string): Promise<{ path: string, nome: string }> {
    const anexo = await this.buscarAnexo(guid);
    
    // Validar permissão (precisa estar vinculado a uma entidade que o usuário pode ver)
    await this.validarPermissaoLeitura(guid, usuarioCPF);
    
    const filePath = path.join(__dirname, '../../', anexo.AnexoCaminho);
    
    if (!fs.existsSync(filePath)) {
      throw new ErrorResponse('Arquivo físico não encontrado', 404);
    }
    
    return {
      path: filePath,
      nome: anexo.AnexoNomeOriginal
    };
  }
  
  // DELETE: Remover anexo
  async excluirAnexo(guid: string, usuarioCPF: string): Promise<void> {
    const anexo = await this.buscarAnexo(guid);
    
    // Validar permissão (só quem enviou ou admin pode deletar)
    if (anexo.UsuarioCPF !== usuarioCPF) {
      // Verificar se é admin da escola
      await this.validarPermissaoEscrita(usuarioCPF, anexo.EscolaGUID);
    }
    
    // Deletar arquivo físico
    const filePath = path.join(__dirname, '../../', anexo.AnexoCaminho);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Deletar registro (CASCADE deleta relações)
    await this.anexoDAO.delete(guid);
  }
  
  // Helper: validar permissão de leitura
  private async validarPermissaoLeitura(anexoGUID: string, usuarioCPF: string): Promise<void> {
    // Verificar se anexo está vinculado a alguma entidade que o usuário pode acessar
    // Caso contrário, throw ErrorResponse('Sem permissão', 403)
    // TODO: implementar lógica complexa de verificação
  }
  
  // Helper: validar permissão de escrita
  private async validarPermissaoEscrita(cpf: string, escolaGUID: string): Promise<void> {
    // Verificar se usuário é Coordenação/Direção da escola
    // TODO: implementar
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
  
  // POST /api/anexo (multipart/form-data)
  upload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = req.usuario?.UsuarioCPF;
      const file = req.file; // Vem do multer
      const { EscolaGUID } = req.body;
      
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum arquivo enviado'
        });
      }
      
      const anexo = await this.anexoService.uploadAnexo(
        { EscolaGUID, file },
        usuarioCPF
      );
      
      return res.status(201).json({
        success: true,
        message: 'Anexo enviado com sucesso',
        data: { anexo }
      });
    } catch (error) {
      next(error);
    }
  };
  
  // GET /api/anexo/:guid
  show = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const anexo = await this.anexoService.buscarAnexo(req.params.guid);
      
      return res.json({
        success: true,
        message: 'Anexo encontrado',
        data: { anexo }
      });
    } catch (error) {
      next(error);
    }
  };
  
  // GET /api/anexo/:guid/download
  download = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = req.usuario?.UsuarioCPF;
      const { path: filePath, nome } = await this.anexoService.downloadAnexo(
        req.params.guid,
        usuarioCPF
      );
      
      return res.download(filePath, nome);
    } catch (error) {
      next(error);
    }
  };
  
  // DELETE /api/anexo/:guid
  destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = req.usuario?.UsuarioCPF;
      await this.anexoService.excluirAnexo(req.params.guid, usuarioCPF);
      
      return res.json({
        success: true,
        message: 'Anexo excluído com sucesso',
        data: null
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
import { EscolaDAO } from '../backend/repositories/escola.repository';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';
import UploadMiddleware from '../backend/middlewares/upload.middleware';
import { MysqlDatabase } from '../backend/database/MysqlDatabase';

class AnexoRoutes {
  #router: Router;
  #controller: AnexoController;
  
  constructor() {
    this.#router = Router();
    
    const db = MysqlDatabase.getInstance();
    const anexoDAO = new AnexoDAO(db);
    const escolaDAO = new EscolaDAO(db);
    const anexoService = new AnexoService(anexoDAO, escolaDAO);
    this.#controller = new AnexoController(anexoService);
    
    this.#setupRoutes();
  }
  
  #setupRoutes() {
    this.#router.use(AuthMiddleware.verificarToken);
    
    // POST /api/anexo (upload)
    this.#router.post(
      '/',
      UploadMiddleware.single('file'),
      this.#controller.upload
    );
    
    // GET /api/anexo/:guid
    this.#router.get('/:guid', this.#controller.show);
    
    // GET /api/anexo/:guid/download
    this.#router.get('/:guid/download', this.#controller.download);
    
    // DELETE /api/anexo/:guid
    this.#router.delete('/:guid', this.#controller.destroy);
  }
  
  get router() {
    return this.#router;
  }
}

export default new AnexoRoutes().router;
```

---

## 🔧 FASE 2: TAREFA ACADÊMICA (8-10h)

### Ordem de Criação de Arquivos:

#### 2.1 Entity (15 min)
**Arquivo:** `backend/entities/tarefaacademica.model.ts`

```typescript
export interface TarefaAcademica {
  TarefaGUID: string;
  MatriculaGUID: string;
  matXprofXturxescGUID: string;
  TarefaTitulo: string;
  TarefaConteudo?: string;
  TarefaPostagemData: Date;
  TarefaPrazoData: Date;
  TarefaTipoEntrega: 'digital' | 'fisica';
  TarefaFeito: boolean;
  TarefaRealizacaoData?: Date;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface TarefaCreateDTO {
  MatriculaGUID: string;
  matXprofXturxescGUID: string;
  TarefaTitulo: string;
  TarefaConteudo?: string;
  TarefaPrazoData: Date;
  TarefaTipoEntrega: 'digital' | 'fisica';
  anexosDescricao?: string[];  // GUIDs de anexos já enviados
}

export interface TarefaUpdateDTO {
  TarefaTitulo?: string;
  TarefaConteudo?: string;
  TarefaPrazoData?: Date;
  TarefaTipoEntrega?: 'digital' | 'fisica';
  TarefaFeito?: boolean;
}

export interface TarefaFilters {
  MatriculaGUID?: string;
  matXprofXturxescGUID?: string;
  TarefaFeito?: boolean;
  DataInicio?: Date;
  DataFim?: Date;
}
```

---

#### 2.2 Repository (2-3h)
**Arquivo:** `backend/repositories/tarefaacademica.repository.ts`

```typescript
import { MysqlDatabase } from '../database/MysqlDatabase';
import { TarefaAcademica, TarefaFilters } from '../entities/tarefaacademica.model';
import { RowDataPacket } from 'mysql2';

export class TarefaAcademicaDAO {
  constructor(private db: MysqlDatabase) {}
  
  async create(tarefa: TarefaAcademica): Promise<TarefaAcademica> {
    const query = `
      INSERT INTO tarefaacademica 
      (TarefaGUID, MatriculaGUID, matXprofXturxescGUID, TarefaTitulo, TarefaConteudo,
       TarefaPostagemData, TarefaPrazoData, TarefaTipoEntrega, TarefaFeito)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.query(query, [
      tarefa.TarefaGUID,
      tarefa.MatriculaGUID,
      tarefa.matXprofXturxescGUID,
      tarefa.TarefaTitulo,
      tarefa.TarefaConteudo || null,
      tarefa.TarefaPostagemData,
      tarefa.TarefaPrazoData,
      tarefa.TarefaTipoEntrega,
      tarefa.TarefaFeito
    ]);
    
    return tarefa;
  }
  
  async findAll(filters: TarefaFilters): Promise<TarefaAcademica[]> {
    let query = `SELECT * FROM tarefaacademica WHERE 1=1`;
    const params: any[] = [];
    
    if (filters.MatriculaGUID) {
      query += ` AND MatriculaGUID = ?`;
      params.push(filters.MatriculaGUID);
    }
    
    if (filters.matXprofXturxescGUID) {
      query += ` AND matXprofXturxescGUID = ?`;
      params.push(filters.matXprofXturxescGUID);
    }
    
    if (filters.TarefaFeito !== undefined) {
      query += ` AND TarefaFeito = ?`;
      params.push(filters.TarefaFeito);
    }
    
    if (filters.DataInicio) {
      query += ` AND TarefaPrazoData >= ?`;
      params.push(filters.DataInicio);
    }
    
    if (filters.DataFim) {
      query += ` AND TarefaPrazoData <= ?`;
      params.push(filters.DataFim);
    }
    
    query += ` ORDER BY TarefaPrazoData ASC`;
    
    const [rows] = await this.db.query<RowDataPacket[]>(query, params);
    return rows as TarefaAcademica[];
  }
  
  async findById(guid: string): Promise<TarefaAcademica | null> {
    const query = `SELECT * FROM tarefaacademica WHERE TarefaGUID = ?`;
    const [rows] = await this.db.query<RowDataPacket[]>(query, [guid]);
    return rows.length > 0 ? (rows[0] as TarefaAcademica) : null;
  }
  
  async update(guid: string, tarefa: Partial<TarefaAcademica>): Promise<TarefaAcademica> {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (tarefa.TarefaTitulo !== undefined) {
      fields.push('TarefaTitulo = ?');
      values.push(tarefa.TarefaTitulo);
    }
    if (tarefa.TarefaConteudo !== undefined) {
      fields.push('TarefaConteudo = ?');
      values.push(tarefa.TarefaConteudo);
    }
    if (tarefa.TarefaPrazoData !== undefined) {
      fields.push('TarefaPrazoData = ?');
      values.push(tarefa.TarefaPrazoData);
    }
    if (tarefa.TarefaTipoEntrega !== undefined) {
      fields.push('TarefaTipoEntrega = ?');
      values.push(tarefa.TarefaTipoEntrega);
    }
    if (tarefa.TarefaFeito !== undefined) {
      fields.push('TarefaFeito = ?');
      values.push(tarefa.TarefaFeito);
      if (tarefa.TarefaFeito) {
        fields.push('TarefaRealizacaoData = CURRENT_TIMESTAMP');
      }
    }
    
    values.push(guid);
    
    const query = `
      UPDATE tarefaacademica 
      SET ${fields.join(', ')}, UpdatedAt = CURRENT_TIMESTAMP
      WHERE TarefaGUID = ?
    `;
    
    await this.db.query(query, values);
    
    return (await this.findById(guid))!;
  }
  
  async delete(guid: string): Promise<boolean> {
    const query = `DELETE FROM tarefaacademica WHERE TarefaGUID = ?`;
    const [result] = await this.db.query(query, [guid]);
    return (result as any).affectedRows > 0;
  }
  
  // Vincular anexo
  async vincularAnexo(tarefaGUID: string, anexoGUID: string, tipo: 'descricao' | 'entrega'): Promise<void> {
    const query = `
      INSERT INTO relacaoanexostarefa (RelacaoAnexoTarefaGUID, AnexoGUID, TarefaGUID, AnexoTipo)
      VALUES (UUID(), ?, ?, ?)
    `;
    await this.db.query(query, [anexoGUID, tarefaGUID, tipo]);
  }
  
  // Desvincular anexo
  async desvincularAnexo(tarefaGUID: string, anexoGUID: string): Promise<void> {
    const query = `DELETE FROM relacaoanexostarefa WHERE TarefaGUID = ? AND AnexoGUID = ?`;
    await this.db.query(query, [tarefaGUID, anexoGUID]);
  }
}
```

---

#### 2.3 Service (3-4h)
**Arquivo:** `backend/services/tarefaacademica.service.ts`

```typescript
import { TarefaAcademicaDAO } from '../repositories/tarefaacademica.repository';
import { AnexoDAO } from '../repositories/anexo.repository';
import { MatriculaDAO } from '../repositories/matricula.repository';
import { TarefaAcademica, TarefaCreateDTO, TarefaUpdateDTO } from '../entities/tarefaacademica.model';
import { ErrorResponse } from '../utils/ErrorResponse';
import { v4 as uuidv4 } from 'uuid';

export class TarefaAcademicaService {
  constructor(
    private tarefaDAO: TarefaAcademicaDAO,
    private anexoDAO: AnexoDAO,
    private matriculaDAO: MatriculaDAO
  ) {}
  
  // CREATE
  async criarTarefa(data: TarefaCreateDTO, usuarioCPF: string): Promise<TarefaAcademica> {
    // 1. Validar permissão (Professor da matéria)
    await this.validarPermissaoProfessor(usuarioCPF, data.matXprofXturxescGUID);
    
    // 2. Validar matrícula existe
    const matricula = await this.matriculaDAO.findById(data.MatriculaGUID);
    if (!matricula) {
      throw new ErrorResponse('Matrícula não encontrada', 404);
    }
    
    // 3. Validar prazo (não pode ser no passado)
    if (new Date(data.TarefaPrazoData) < new Date()) {
      throw new ErrorResponse('Prazo não pode ser no passado', 400);
    }
    
    // 4. Criar tarefa
    const tarefa: TarefaAcademica = {
      TarefaGUID: uuidv4(),
      MatriculaGUID: data.MatriculaGUID,
      matXprofXturxescGUID: data.matXprofXturxescGUID,
      TarefaTitulo: data.TarefaTitulo.trim(),
      TarefaConteudo: data.TarefaConteudo?.trim(),
      TarefaPostagemData: new Date(),
      TarefaPrazoData: new Date(data.TarefaPrazoData),
      TarefaTipoEntrega: data.TarefaTipoEntrega,
      TarefaFeito: false,
      CreatedAt: new Date(),
      UpdatedAt: new Date()
    };
    
    const tarefaCriada = await this.tarefaDAO.create(tarefa);
    
    // 5. Vincular anexos de descrição (se houver)
    if (data.anexosDescricao && data.anexosDescricao.length > 0) {
      for (const anexoGUID of data.anexosDescricao) {
        await this.tarefaDAO.vincularAnexo(tarefaCriada.TarefaGUID, anexoGUID, 'descricao');
      }
    }
    
    return tarefaCriada;
  }
  
  // READ: Listar tarefas
  async listarTarefas(filters: any, usuarioCPF: string): Promise<TarefaAcademica[]> {
    // Se for aluno, filtrar por suas matrículas
    // Se for professor, filtrar por suas disciplinas
    // TODO: implementar filtro por papel
    
    return await this.tarefaDAO.findAll(filters);
  }
  
  // READ: Buscar por ID
  async buscarTarefa(guid: string, usuarioCPF: string): Promise<TarefaAcademica> {
    const tarefa = await this.tarefaDAO.findById(guid);
    if (!tarefa) {
      throw new ErrorResponse('Tarefa não encontrada', 404);
    }
    
    // Validar permissão de leitura
    await this.validarPermissaoLeitura(tarefa, usuarioCPF);
    
    return tarefa;
  }
  
  // UPDATE
  async atualizarTarefa(guid: string, data: TarefaUpdateDTO, usuarioCPF: string): Promise<TarefaAcademica> {
    const tarefa = await this.buscarTarefa(guid, usuarioCPF);
    
    // Se for professor, pode editar título/conteúdo/prazo
    // Se for aluno, pode apenas marcar como feito
    const isAluno = await this.isAlunoOwner(tarefa.MatriculaGUID, usuarioCPF);
    
    if (isAluno) {
      // Aluno só pode marcar como feito
      if (Object.keys(data).length > 1 || !('TarefaFeito' in data)) {
        throw new ErrorResponse('Aluno só pode marcar tarefa como feita', 403);
      }
    } else {
      // Professor pode editar tudo exceto TarefaFeito
      await this.validarPermissaoProfessor(usuarioCPF, tarefa.matXprofXturxescGUID);
      
      if (data.TarefaPrazoData && new Date(data.TarefaPrazoData) < new Date()) {
        throw new ErrorResponse('Novo prazo não pode ser no passado', 400);
      }
    }
    
    return await this.tarefaDAO.update(guid, data);
  }
  
  // DELETE
  async excluirTarefa(guid: string, usuarioCPF: string): Promise<void> {
    const tarefa = await this.buscarTarefa(guid, usuarioCPF);
    await this.validarPermissaoProfessor(usuarioCPF, tarefa.matXprofXturxescGUID);
    await this.tarefaDAO.delete(guid);
  }
  
  // Enviar anexo de entrega (aluno)
  async enviarAnexoEntrega(tarefaGUID: string, anexoGUID: string, usuarioCPF: string): Promise<void> {
    const tarefa = await this.buscarTarefa(tarefaGUID, usuarioCPF);
    
    // Validar que é o aluno dono
    const isAluno = await this.isAlunoOwner(tarefa.MatriculaGUID, usuarioCPF);
    if (!isAluno) {
      throw new ErrorResponse('Apenas o aluno pode enviar anexo de entrega', 403);
    }
    
    // Validar tipo de entrega
    if (tarefa.TarefaTipoEntrega !== 'digital') {
      throw new ErrorResponse('Tarefa não aceita entrega digital', 400);
    }
    
    // Validar que anexo existe e pertence ao usuário
    const anexo = await this.anexoDAO.findById(anexoGUID);
    if (!anexo || anexo.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse('Anexo inválido', 400);
    }
    
    await this.tarefaDAO.vincularAnexo(tarefaGUID, anexoGUID, 'entrega');
  }
  
  // Helpers de validação
  private async validarPermissaoProfessor(cpf: string, matXprofXturxescGUID: string): Promise<void> {
    // Query em materiaxprofessorxturma
    // Validar que CPF está vinculado via escolaxusuarioxfuncao com FuncaoId = 5
    // TODO: implementar
  }
  
  private async validarPermissaoLeitura(tarefa: TarefaAcademica, cpf: string): Promise<void> {
    // Verificar se é o aluno dono OU o professor da matéria OU admin
    // TODO: implementar
  }
  
  private async isAlunoOwner(matriculaGUID: string, cpf: string): Promise<boolean> {
    // Query em matricula JOIN escolaxusuarioxfuncao
    // Retornar true se CPF é o aluno da matrícula
    // TODO: implementar
    return false;
  }
}
```

---

#### 2.4 Controller (1h)
**Arquivo:** `backend/controllers/tarefaacademica.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { TarefaAcademicaService } from '../services/tarefaacademica.service';

export class TarefaAcademicaController {
  constructor(private tarefaService: TarefaAcademicaService) {}
  
  // POST /api/tarefa
  store = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = req.usuario?.UsuarioCPF;
      const tarefa = await this.tarefaService.criarTarefa(req.body.tarefa, usuarioCPF);
      
      return res.status(201).json({
        success: true,
        message: 'Tarefa criada com sucesso',
        data: { tarefa }
      });
    } catch (error) {
      next(error);
    }
  };
  
  // GET /api/tarefa?MatriculaGUID=&TarefaFeito=
  index = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = req.usuario?.UsuarioCPF;
      const filters = {
        MatriculaGUID: req.query.MatriculaGUID as string,
        matXprofXturxescGUID: req.query.matXprofXturxescGUID as string,
        TarefaFeito: req.query.TarefaFeito === 'true'
      };
      
      const tarefas = await this.tarefaService.listarTarefas(filters, usuarioCPF);
      
      return res.json({
        success: true,
        message: 'Tarefas listadas',
        data: { tarefas, total: tarefas.length }
      });
    } catch (error) {
      next(error);
    }
  };
  
  // GET /api/tarefa/:guid
  show = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = req.usuario?.UsuarioCPF;
      const tarefa = await this.tarefaService.buscarTarefa(req.params.guid, usuarioCPF);
      
      return res.json({
        success: true,
        message: 'Tarefa encontrada',
        data: { tarefa }
      });
    } catch (error) {
      next(error);
    }
  };
  
  // PUT /api/tarefa/:guid
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = req.usuario?.UsuarioCPF;
      const tarefa = await this.tarefaService.atualizarTarefa(
        req.params.guid,
        req.body.tarefa,
        usuarioCPF
      );
      
      return res.json({
        success: true,
        message: 'Tarefa atualizada',
        data: { tarefa }
      });
    } catch (error) {
      next(error);
    }
  };
  
  // DELETE /api/tarefa/:guid
  destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = req.usuario?.UsuarioCPF;
      await this.tarefaService.excluirTarefa(req.params.guid, usuarioCPF);
      
      return res.json({
        success: true,
        message: 'Tarefa excluída',
        data: null
      });
    } catch (error) {
      next(error);
    }
  };
  
  // POST /api/tarefa/:guid/anexo-entrega
  enviarAnexoEntrega = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = req.usuario?.UsuarioCPF;
      const { anexoGUID } = req.body;
      
      await this.tarefaService.enviarAnexoEntrega(req.params.guid, anexoGUID, usuarioCPF);
      
      return res.json({
        success: true,
        message: 'Anexo de entrega vinculado',
        data: null
      });
    } catch (error) {
      next(error);
    }
  };
}
```

---

#### 2.5 Routes (30 min)
**Arquivo:** `routes/tarefaacademica.routes.ts`

```typescript
import { Router } from 'express';
import { TarefaAcademicaController } from '../backend/controllers/tarefaacademica.controller';
import { TarefaAcademicaService } from '../backend/services/tarefaacademica.service';
import { TarefaAcademicaDAO } from '../backend/repositories/tarefaacademica.repository';
import { AnexoDAO } from '../backend/repositories/anexo.repository';
import { MatriculaDAO } from '../backend/repositories/matricula.repository';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';
import { MysqlDatabase } from '../backend/database/MysqlDatabase';

class TarefaAcademicaRoutes {
  #router: Router;
  #controller: TarefaAcademicaController;
  
  constructor() {
    this.#router = Router();
    
    const db = MysqlDatabase.getInstance();
    const tarefaDAO = new TarefaAcademicaDAO(db);
    const anexoDAO = new AnexoDAO(db);
    const matriculaDAO = new MatriculaDAO(db);
    const tarefaService = new TarefaAcademicaService(tarefaDAO, anexoDAO, matriculaDAO);
    this.#controller = new TarefaAcademicaController(tarefaService);
    
    this.#setupRoutes();
  }
  
  #setupRoutes() {
    this.#router.use(AuthMiddleware.verificarToken);
    
    this.#router.post('/', this.#controller.store);
    this.#router.get('/', this.#controller.index);
    this.#router.get('/:guid', this.#controller.show);
    this.#router.put('/:guid', this.#controller.update);
    this.#router.delete('/:guid', this.#controller.destroy);
    this.#router.post('/:guid/anexo-entrega', this.#controller.enviarAnexoEntrega);
  }
  
  get router() {
    return this.#router;
  }
}

export default new TarefaAcademicaRoutes().router;
```

---

## 🔧 FASE 3: PROVA AGENDADA (4-6h)

*[Estrutura similar à Tarefa, mas mais simples - sem AnexoTipo, sem TarefaFeito, apenas visualização para alunos]*

#### 3.1 Entity
**Arquivo:** `backend/entities/provaagendada.model.ts`

```typescript
export interface ProvaAgendada {
  ProvaAgendadaGUID: string;
  TurmaGUID: string;
  MateriaGUID: string;
  ProvaData: Date;
  ProvaDescricao?: string;
  ProvaStatus: 'Agendada' | 'Realizada' | 'Cancelada';
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ProvaCreateDTO {
  TurmaGUID: string;
  MateriaGUID: string;
  ProvaData: Date;
  ProvaDescricao?: string;
  anexosDescricao?: string[];  // GUIDs de anexos (opcional)
}

export interface ProvaUpdateDTO {
  ProvaData?: Date;
  ProvaDescricao?: string;
  ProvaStatus?: 'Agendada' | 'Realizada' | 'Cancelada';
}
```

**Implementação:** Seguir o mesmo padrão de Repository, Service, Controller, Routes da Tarefa, mas com lógica simplificada:
- Apenas professores podem criar/editar/excluir
- Alunos da turma podem apenas visualizar
- Sem campo `TarefaFeito` ou lógica de entrega
- Anexos são apenas descritivos (sem `AnexoTipo`)

---

## 🔧 FASE 4: PENDÊNCIA (6-8h)

*[Estrutura similar à Tarefa - com AnexoTipo, mas destinatário é Usuário genérico]*

#### 4.1 Entity
**Arquivo:** `backend/entities/pendencia.model.ts`

```typescript
export interface Pendencia {
  PendenciaGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  PendenciaTitulo: string;
  PendenciaConteudo?: string;
  PendenciaPostagemData: Date;
  PendenciaPrazoData: Date;
  PendenciaFeito: boolean;
  PendenciaRealizacaoData?: Date;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface PendenciaCreateDTO {
  UsuarioCPF: string;
  EscolaGUID: string;
  PendenciaTitulo: string;
  PendenciaConteudo?: string;
  PendenciaPrazoData: Date;
  anexosDescricao?: string[];
}

export interface PendenciaUpdateDTO {
  PendenciaTitulo?: string;
  PendenciaConteudo?: string;
  PendenciaPrazoData?: Date;
  PendenciaFeito?: boolean;
}
```

**Implementação:** Seguir padrão similar à Tarefa:
- Coordenação/Direção podem criar/editar/excluir
- Destinatário pode visualizar, marcar como feita, enviar anexos de entrega
- Anexos com `AnexoTipo` ('descricao' ou 'entrega')

---

## 🔧 FASE 5: EVENTO + DESTINATÁRIOS (8-10h)

### Ordem de Criação:

#### 5.1 Entity - Evento
**Arquivo:** `backend/entities/evento.model.ts`

```typescript
export interface Evento {
  EventoGUID: string;
  EscolaGUID: string;
  UsuarioCPF: string;  // Quem criou
  EventoTitulo: string;
  EventoConteudo?: string;
  EventoDataHora: Date;
  EventoStatus: 'Agendado' | 'Realizado' | 'Cancelado';
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface EventoDestinatario {
  EventoDestinatarioGUID: string;
  EventoGUID: string;
  FuncaoId?: number;      // NULL = broadcast por função
  TurmaGUID?: string;     // NULL = broadcast por turma
  CreatedAt: Date;
}

export interface EventoCreateDTO {
  EscolaGUID: string;
  EventoTitulo: string;
  EventoConteudo?: string;
  EventoDataHora: Date;
  anexosDescricao?: string[];
  destinatarios?: {      // Se vazio = broadcast total
    FuncaoId?: number;
    TurmaGUID?: string;
  }[];
}
```

#### 5.2 Repository - Evento
**Arquivo:** `backend/repositories/evento.repository.ts`

**Métodos Adicionais:**
```typescript
// Criar destinatários
async criarDestinatarios(eventoGUID: string, destinatarios: EventoDestinatario[]): Promise<void>

// Buscar destinatários
async buscarDestinatarios(eventoGUID: string): Promise<EventoDestinatario[]>

// Verificar se usuário pode ver evento
async usuarioPodeVerEvento(eventoGUID: string, usuarioCPF: string): Promise<boolean>
```

**Queries Especiais:**
```sql
-- Broadcast: sem destinatários específicos
SELECT * FROM evento e
WHERE e.EventoGUID = ?
  AND NOT EXISTS (SELECT 1 FROM eventodestinatarios WHERE EventoGUID = e.EventoGUID)

-- Segmentado por função
SELECT e.* FROM evento e
JOIN eventodestinatarios ed ON e.EventoGUID = ed.EventoGUID
JOIN escolaxusuarioxfuncao euf ON ed.FuncaoId = euf.FuncaoId
WHERE euf.UsuarioCPF = ?

-- Segmentado por turma
SELECT e.* FROM evento e
JOIN eventodestinatarios ed ON e.EventoGUID = ed.EventoGUID
JOIN matricula m ON ed.TurmaGUID = m.TurmaGUID
JOIN escolaxusuarioxfuncao euf ON m.MatriculaGUID = ... -- join complexo
WHERE euf.UsuarioCPF = ?
```

#### 5.3 Service - Evento
**Regras Especiais:**
```typescript
// CREATE
async criarEvento(data: EventoCreateDTO, usuarioCPF: string) {
  // 1. Validar permissão (Coordenação/Direção/Secretaria)
  // 2. Criar evento
  // 3. Se destinatarios vazio = broadcast total (não inserir na tabela eventodestinatarios)
  // 4. Se destinatarios preenchido, inserir cada um
  // 5. Vincular anexos (sem AnexoTipo)
}

// READ
async listarEventosVisiveis(usuarioCPF: string, escolaGUID: string) {
  // Query complexa: broadcast OU segmentado para o usuário
}
```

---

## 🔧 FASE 6: CALENDÁRIO (6-8h)

### Endpoint Especializado

#### 6.1 Entity
**Arquivo:** `backend/entities/calendario.model.ts`

```typescript
export interface CalendarioAviso {
  TipoAviso: 'tarefa' | 'prova' | 'pendencia' | 'evento';
  AvisoId: string;
  DataPrazo: Date;
  Titulo: string;
  Descricao?: string;
  StatusBoolean?: boolean;
  StatusTexto: string;
  TipoEntrega?: 'digital' | 'fisica';
  QtdAnexosDescricao: number;
  QtdAnexosEntrega?: number;
  PermiteMarcarFeito: boolean;
  PermiteEnviarAnexo: boolean;
  IconeTipo: string;
  CreatedAt: Date;
}

export interface CalendarioFilters {
  DataInicio?: Date;
  DataFim?: Date;
  TipoAviso?: 'tarefa' | 'prova' | 'pendencia' | 'evento';
}
```

#### 6.2 Repository
**Arquivo:** `backend/repositories/calendario.repository.ts`

```typescript
export class CalendarioDAO {
  constructor(private db: MysqlDatabase) {}
  
  // Query UNION para calendário do aluno/professor
  async buscarAvisosCalendario(
    usuarioCPF: string,
    escolaGUID: string,
    filters: CalendarioFilters
  ): Promise<CalendarioAviso[]> {
    const query = `
      -- TAREFAS
      SELECT 
        'tarefa' as TipoAviso,
        t.TarefaGUID as AvisoId,
        t.TarefaPrazoData as DataPrazo,
        t.TarefaTitulo as Titulo,
        t.TarefaConteudo as Descricao,
        t.TarefaFeito as StatusBoolean,
        CASE 
          WHEN t.TarefaFeito THEN 'Feita'
          WHEN t.TarefaPrazoData < NOW() THEN 'Atrasada'
          ELSE 'Pendente'
        END as StatusTexto,
        t.TarefaTipoEntrega as TipoEntrega,
        (SELECT COUNT(*) FROM relacaoanexostarefa rat 
         WHERE rat.TarefaGUID = t.TarefaGUID AND rat.AnexoTipo = 'descricao') as QtdAnexosDescricao,
        (SELECT COUNT(*) FROM relacaoanexostarefa rat 
         WHERE rat.TarefaGUID = t.TarefaGUID AND rat.AnexoTipo = 'entrega') as QtdAnexosEntrega,
        TRUE as PermiteMarcarFeito,
        TRUE as PermiteEnviarAnexo,
        'tarefa' as IconeTipo,
        t.CreatedAt
      FROM tarefaacademica t
      JOIN matricula m ON t.MatriculaGUID = m.MatriculaGUID
      JOIN escolaxusuarioxfuncao euf ON m.UsuarioCPF = euf.UsuarioCPF
      WHERE euf.UsuarioCPF = ?
        AND euf.EscolaGUID = ?
        AND (t.TarefaFeito = FALSE OR t.TarefaPrazoData >= DATE_SUB(NOW(), INTERVAL 30 DAY))
        AND (? IS NULL OR t.TarefaPrazoData >= ?)
        AND (? IS NULL OR t.TarefaPrazoData <= ?)
      
      UNION ALL
      
      -- PROVAS
      SELECT 
        'prova' as TipoAviso,
        p.ProvaAgendadaGUID as AvisoId,
        p.ProvaData as DataPrazo,
        CONCAT(mat.MateriaNome, ' - ', p.ProvaDescricao) as Titulo,
        p.ProvaDescricao as Descricao,
        NULL as StatusBoolean,
        p.ProvaStatus as StatusTexto,
        NULL as TipoEntrega,
        (SELECT COUNT(*) FROM relacaoanexosprova rap 
         WHERE rap.ProvaAgendadaGUID = p.ProvaAgendadaGUID) as QtdAnexosDescricao,
        0 as QtdAnexosEntrega,
        FALSE as PermiteMarcarFeito,
        FALSE as PermiteEnviarAnexo,
        'prova' as IconeTipo,
        p.CreatedAt
      FROM provaagendada p
      JOIN turma tur ON p.TurmaGUID = tur.TurmaGUID
      JOIN materia mat ON p.MateriaGUID = mat.MateriaGUID
      JOIN matricula m ON tur.TurmaGUID = m.TurmaGUID
      JOIN escolaxusuarioxfuncao euf ON m.UsuarioCPF = euf.UsuarioCPF
      WHERE euf.UsuarioCPF = ?
        AND mat.EscolaGUID = ?
        AND p.ProvaStatus IN ('Agendada', 'Realizada')
        AND (? IS NULL OR p.ProvaData >= ?)
        AND (? IS NULL OR p.ProvaData <= ?)
      
      UNION ALL
      
      -- PENDÊNCIAS
      SELECT 
        'pendencia' as TipoAviso,
        pend.PendenciaGUID as AvisoId,
        pend.PendenciaPrazoData as DataPrazo,
        pend.PendenciaTitulo as Titulo,
        pend.PendenciaConteudo as Descricao,
        pend.PendenciaFeito as StatusBoolean,
        CASE 
          WHEN pend.PendenciaFeito THEN 'Resolvida'
          WHEN pend.PendenciaPrazoData < NOW() THEN 'Atrasada'
          ELSE 'Pendente'
        END as StatusTexto,
        NULL as TipoEntrega,
        (SELECT COUNT(*) FROM relacaoanexospendencia rap 
         WHERE rap.PendenciaGUID = pend.PendenciaGUID AND rap.AnexoTipo = 'descricao') as QtdAnexosDescricao,
        (SELECT COUNT(*) FROM relacaoanexospendencia rap 
         WHERE rap.PendenciaGUID = pend.PendenciaGUID AND rap.AnexoTipo = 'entrega') as QtdAnexosEntrega,
        TRUE as PermiteMarcarFeito,
        TRUE as PermiteEnviarAnexo,
        'pendencia' as IconeTipo,
        pend.CreatedAt
      FROM pendencia pend
      WHERE pend.UsuarioCPF = ?
        AND pend.EscolaGUID = ?
        AND (pend.PendenciaFeito = FALSE OR pend.PendenciaPrazoData >= DATE_SUB(NOW(), INTERVAL 30 DAY))
        AND (? IS NULL OR pend.PendenciaPrazoData >= ?)
        AND (? IS NULL OR pend.PendenciaPrazoData <= ?)
      
      UNION ALL
      
      -- EVENTOS
      SELECT 
        'evento' as TipoAviso,
        e.EventoGUID as AvisoId,
        e.EventoDataHora as DataPrazo,
        e.EventoTitulo as Titulo,
        e.EventoConteudo as Descricao,
        NULL as StatusBoolean,
        e.EventoStatus as StatusTexto,
        NULL as TipoEntrega,
        (SELECT COUNT(*) FROM relacaoanexosevento rae 
         WHERE rae.EventoGUID = e.EventoGUID) as QtdAnexosDescricao,
        0 as QtdAnexosEntrega,
        FALSE as PermiteMarcarFeito,
        FALSE as PermiteEnviarAnexo,
        'evento' as IconeTipo,
        e.CreatedAt
      FROM evento e
      LEFT JOIN eventodestinatarios ed ON e.EventoGUID = ed.EventoGUID
      LEFT JOIN escolaxusuarioxfuncao euf ON ed.FuncaoId = euf.FuncaoId
      LEFT JOIN matricula m ON ed.TurmaGUID = m.TurmaGUID
      WHERE e.EscolaGUID = ?
        AND e.EventoStatus IN ('Agendado', 'Realizado')
        AND (
          -- Broadcast
          NOT EXISTS (SELECT 1 FROM eventodestinatarios WHERE EventoGUID = e.EventoGUID)
          OR
          -- Segmentado por função
          (ed.FuncaoId = euf.FuncaoId AND ed.TurmaGUID IS NULL AND euf.UsuarioCPF = ?)
          OR
          -- Segmentado por turma
          (ed.TurmaGUID = m.TurmaGUID AND m.UsuarioCPF = ?)
        )
        AND (? IS NULL OR e.EventoDataHora >= ?)
        AND (? IS NULL OR e.EventoDataHora <= ?)
      
      ORDER BY DataPrazo ASC
    `;
    
    const params = [
      // Tarefas
      usuarioCPF, escolaGUID, 
      filters.DataInicio || null, filters.DataInicio || null,
      filters.DataFim || null, filters.DataFim || null,
      // Provas
      usuarioCPF, escolaGUID,
      filters.DataInicio || null, filters.DataInicio || null,
      filters.DataFim || null, filters.DataFim || null,
      // Pendências
      usuarioCPF, escolaGUID,
      filters.DataInicio || null, filters.DataInicio || null,
      filters.DataFim || null, filters.DataFim || null,
      // Eventos
      escolaGUID, usuarioCPF, usuarioCPF,
      filters.DataInicio || null, filters.DataInicio || null,
      filters.DataFim || null, filters.DataFim || null
    ];
    
    const [rows] = await this.db.query<RowDataPacket[]>(query, params);
    return rows as CalendarioAviso[];
  }
  
  // Query para coordenação (apenas pendências + eventos)
  async buscarAvisosCalendarioCoordenacao(
    usuarioCPF: string,
    escolaGUID: string,
    filters: CalendarioFilters
  ): Promise<CalendarioAviso[]> {
    // Similar, mas apenas PENDÊNCIAS e EVENTOS
    // TODO: implementar
  }
  
  // Buscar detalhes de um dia específico
  async buscarDetalhesDia(
    usuarioCPF: string,
    escolaGUID: string,
    data: Date
  ): Promise<CalendarioAviso[]> {
    // Chamar buscarAvisosCalendario com filtro de 1 dia
    return this.buscarAvisosCalendario(usuarioCPF, escolaGUID, {
      DataInicio: data,
      DataFim: data
    });
  }
}
```

#### 6.3 Service
**Arquivo:** `backend/services/calendario.service.ts`

```typescript
export class CalendarioService {
  constructor(private calendarioDAO: CalendarioDAO) {}
  
  async buscarCalendario(
    usuarioCPF: string,
    escolaGUID: string,
    filters: CalendarioFilters
  ): Promise<CalendarioAviso[]> {
    // Detectar papel do usuário
    const isCoordenacao = await this.isCoordenacao(usuarioCPF, escolaGUID);
    
    if (isCoordenacao) {
      return this.calendarioDAO.buscarAvisosCalendarioCoordenacao(
        usuarioCPF,
        escolaGUID,
        filters
      );
    } else {
      return this.calendarioDAO.buscarAvisosCalendario(
        usuarioCPF,
        escolaGUID,
        filters
      );
    }
  }
  
  async buscarDetalhesDia(
    usuarioCPF: string,
    escolaGUID: string,
    data: string
  ): Promise<CalendarioAviso[]> {
    const dataFormatada = new Date(data);
    return this.calendarioDAO.buscarDetalhesDia(usuarioCPF, escolaGUID, dataFormatada);
  }
  
  private async isCoordenacao(cpf: string, escolaGUID: string): Promise<boolean> {
    // Query em escolaxusuarioxfuncao
    // Retornar true se FuncaoId = 1 ou 6
    // TODO: implementar
    return false;
  }
}
```

#### 6.4 Controller
**Arquivo:** `backend/controllers/calendario.controller.ts`

```typescript
export class CalendarioController {
  constructor(private calendarioService: CalendarioService) {}
  
  // GET /api/calendario?EscolaGUID=&DataInicio=&DataFim=
  index = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = req.usuario?.UsuarioCPF;
      const escolaGUID = req.query.EscolaGUID as string;
      const filters = {
        DataInicio: req.query.DataInicio ? new Date(req.query.DataInicio as string) : undefined,
        DataFim: req.query.DataFim ? new Date(req.query.DataFim as string) : undefined
      };
      
      const avisos = await this.calendarioService.buscarCalendario(
        usuarioCPF,
        escolaGUID,
        filters
      );
      
      return res.json({
        success: true,
        message: 'Calendário carregado',
        data: { avisos, total: avisos.length }
      });
    } catch (error) {
      next(error);
    }
  };
  
  // GET /api/calendario/dia/:data?EscolaGUID=
  showDia = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = req.usuario?.UsuarioCPF;
      const escolaGUID = req.query.EscolaGUID as string;
      const data = req.params.data; // Formato: 2026-05-15
      
      const avisos = await this.calendarioService.buscarDetalhesDia(
        usuarioCPF,
        escolaGUID,
        data
      );
      
      return res.json({
        success: true,
        message: 'Detalhes do dia carregados',
        data: { avisos, total: avisos.length }
      });
    } catch (error) {
      next(error);
    }
  };
}
```

#### 6.5 Routes
**Arquivo:** `routes/calendario.routes.ts`

```typescript
class CalendarioRoutes {
  #router: Router;
  #controller: CalendarioController;
  
  constructor() {
    this.#router = Router();
    
    const db = MysqlDatabase.getInstance();
    const calendarioDAO = new CalendarioDAO(db);
    const calendarioService = new CalendarioService(calendarioDAO);
    this.#controller = new CalendarioController(calendarioService);
    
    this.#setupRoutes();
  }
  
  #setupRoutes() {
    this.#router.use(AuthMiddleware.verificarToken);
    
    this.#router.get('/', this.#controller.index);
    this.#router.get('/dia/:data', this.#controller.showDia);
  }
  
  get router() {
    return this.#router;
  }
}

export default new CalendarioRoutes().router;
```

---

## 📝 REGISTRO DE ROTAS NO APP.TS

**Adicionar em:** `app.ts`

```typescript
import anexoRoutes from './routes/anexo.routes';
import tarefaRoutes from './routes/tarefaacademica.routes';
import provaRoutes from './routes/provaagendada.routes';
import pendenciaRoutes from './routes/pendencia.routes';
import eventoRoutes from './routes/evento.routes';
import calendarioRoutes from './routes/calendario.routes';

// Registrar rotas
app.use('/api/anexo', anexoRoutes);
app.use('/api/tarefa', tarefaRoutes);
app.use('/api/prova', provaRoutes);
app.use('/api/pendencia', pendenciaRoutes);
app.use('/api/evento', eventoRoutes);
app.use('/api/calendario', calendarioRoutes);
```

---

## 📊 RESUMO DE ENDPOINTS

### Anexo
- `POST /api/anexo` - Upload de arquivo (multipart/form-data)
- `GET /api/anexo/:guid` - Buscar metadados
- `GET /api/anexo/:guid/download` - Download do arquivo
- `DELETE /api/anexo/:guid` - Excluir anexo

### Tarefa Acadêmica
- `POST /api/tarefa` - Criar tarefa (Professor)
- `GET /api/tarefa` - Listar tarefas (filtros)
- `GET /api/tarefa/:guid` - Buscar detalhes
- `PUT /api/tarefa/:guid` - Atualizar tarefa
- `DELETE /api/tarefa/:guid` - Excluir tarefa
- `POST /api/tarefa/:guid/anexo-entrega` - Vincular anexo de entrega (Aluno)

### Prova Agendada
- `POST /api/prova` - Criar prova (Professor)
- `GET /api/prova` - Listar provas
- `GET /api/prova/:guid` - Buscar detalhes
- `PUT /api/prova/:guid` - Atualizar prova
- `DELETE /api/prova/:guid` - Excluir prova

### Pendência
- `POST /api/pendencia` - Criar pendência (Coordenação/Direção)
- `GET /api/pendencia` - Listar pendências
- `GET /api/pendencia/:guid` - Buscar detalhes
- `PUT /api/pendencia/:guid` - Atualizar pendência
- `DELETE /api/pendencia/:guid` - Excluir pendência
- `POST /api/pendencia/:guid/anexo-entrega` - Vincular anexo de entrega (Destinatário)

### Evento
- `POST /api/evento` - Criar evento (Coordenação/Direção/Secretaria)
- `GET /api/evento` - Listar eventos visíveis
- `GET /api/evento/:guid` - Buscar detalhes
- `PUT /api/evento/:guid` - Atualizar evento
- `DELETE /api/evento/:guid` - Excluir evento

### Calendário
- `GET /api/calendario?EscolaGUID=&DataInicio=&DataFim=` - Listar avisos do calendário (UNION)
- `GET /api/calendario/dia/:data?EscolaGUID=` - Detalhes de um dia específico

---

## 🔐 MATRIZ DE PERMISSÕES

| Endpoint | Aluno (4) | Professor (5) | Coordenação (1) | Direção (6) |
|----------|-----------|---------------|-----------------|-------------|
| **POST /api/tarefa** | ❌ | ✅ Suas disciplinas | ❌ | ❌ |
| **PUT /api/tarefa/:guid** | ✅ Marcar feita | ✅ Editar suas | ❌ | ❌ |
| **POST /api/tarefa/:guid/anexo-entrega** | ✅ Suas | ❌ | ❌ | ❌ |
| **POST /api/prova** | ❌ | ✅ Suas turmas | ❌ | ❌ |
| **POST /api/pendencia** | ❌ | ❌ | ✅ | ✅ |
| **PUT /api/pendencia/:guid** | ✅ Marcar resolvida | ✅ Marcar resolvida | ✅ Editar suas | ✅ |
| **POST /api/evento** | ❌ | ❌ | ✅ | ✅ |
| **GET /api/calendario** | ✅ Seus avisos | ✅ Seus avisos | ✅ Pendências+Eventos | ✅ |

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Anexo
- [ ] Migration executada
- [ ] Diretório `/uploads/anexos` criado
- [ ] Multer instalado e configurado
- [ ] Entity criado
- [ ] Middleware de upload criado
- [ ] Repository criado com queries auxiliares
- [ ] Service criado com validações
- [ ] Controller criado
- [ ] Routes configuradas
- [ ] Testado upload via Postman
- [ ] Testado download
- [ ] Testado exclusão

### Fase 2: Tarefa Acadêmica
- [ ] Migration executada
- [ ] Entity criado
- [ ] Repository criado (incluindo vincularAnexo)
- [ ] Service criado com validações de permissão
- [ ] Controller criado
- [ ] Routes configuradas
- [ ] Testado criar tarefa com anexo de descrição
- [ ] Testado aluno enviar anexo de entrega
- [ ] Testado marcar como feita
- [ ] Testado listar tarefas por aluno

### Fase 3: Prova Agendada
- [ ] Migration executada
- [ ] Entity criado
- [ ] Repository criado
- [ ] Service criado
- [ ] Controller criado
- [ ] Routes configuradas
- [ ] Testado criar prova
- [ ] Testado alunos visualizarem prova
- [ ] Testado anexar material de prova

### Fase 4: Pendência
- [ ] Migration executada
- [ ] Entity criado
- [ ] Repository criado
- [ ] Service criado
- [ ] Controller criado
- [ ] Routes configuradas
- [ ] Testado criar pendência
- [ ] Testado usuário enviar anexo de entrega
- [ ] Testado marcar como resolvida

### Fase 5: Evento + Destinatários
- [ ] Migrations executadas (2 tabelas)
- [ ] Entities criados
- [ ] Repository criado com queries de segmentação
- [ ] Service criado com lógica de broadcast
- [ ] Controller criado
- [ ] Routes configuradas
- [ ] Testado evento broadcast (sem destinatários)
- [ ] Testado evento segmentado por função
- [ ] Testado evento segmentado por turma
- [ ] Testado evento com múltiplos destinatários

### Fase 6: Calendário
- [ ] Entity criado
- [ ] Repository criado com query UNION complexa
- [ ] Service criado com detecção de papel
- [ ] Controller criado
- [ ] Routes configuradas
- [ ] Testado endpoint /api/calendario (aluno)
- [ ] Testado endpoint /api/calendario (professor)
- [ ] Testado endpoint /api/calendario (coordenação)
- [ ] Testado endpoint /api/calendario/dia/:data
- [ ] Validado campos retornados (14 campos)
- [ ] Validado contagens de anexos (subconsultas)

---

## 🚀 PRÓXIMOS PASSOS PÓS-IMPLEMENTAÇÃO

1. **Notificações Automáticas**
   - Implementar job diário às 3h da manhã
   - Enviar e-mail + WhatsApp para tarefas que vencem no dia seguinte
   - Documentar em tabela `notificacao` conforme [plano-tecnico-tarefas-calendario-notificacoes.md](plano-tecnico-tarefas-calendario-notificacoes.md)

2. **Frontend**
   - Implementar componente de calendário (grid mensal)
   - Implementar modal de detalhes do dia
   - Implementar upload de anexos via drag-and-drop
   - Implementar visualização diferenciada por tipo (ícones/cores)

3. **Testes Automatizados**
   - Criar testes unitários para Services
   - Criar testes de integração para endpoints
   - Criar testes E2E para fluxos completos

4. **Documentação API**
   - Gerar Swagger/OpenAPI
   - Documentar exemplos de payloads
   - Documentar códigos de erro

---

## 📚 REFERÊNCIAS

- [PLANEJAMENTO_TAREFAS_MATERIAS_PENDENCIAS.md](PLANEJAMENTO_TAREFAS_MATERIAS_PENDENCIAS.md) - Planejamento arquitetural
- [plano-tecnico-tarefas-calendario-notificacoes.md](plano-tecnico-tarefas-calendario-notificacoes.md) - Lógica de notificações
- [PLANO_IMPLEMENTACAO_MODULOS_ACADEMICOS.md](PLANO_IMPLEMENTACAO_MODULOS_ACADEMICOS.md) - Padrão de implementação MVC

---

**Data de Criação:** 14/05/2026  
**Última Atualização:** 14/05/2026  
**Autor:** Sistema de Planejamento TCC
