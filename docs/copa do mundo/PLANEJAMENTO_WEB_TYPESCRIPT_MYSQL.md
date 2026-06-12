# 🚀 Planejamento: Migração Web com TypeScript + MySQL

**Projeto:** Sistema de Gerenciamento de Figurinhas - Copa do Mundo 2026  
**Stack Tecnológica:** TypeScript (Node.js) + MySQL + React  
**Data:** 06 de Junho de 2026

---

## 📋 Índice

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Stack Tecnológica Detalhada](#stack-tecnológica-detalhada)
3. [Arquitetura Backend (TypeScript)](#arquitetura-backend-typescript)
4. [Modelagem do Banco MySQL](#modelagem-do-banco-mysql)
5. [API REST Endpoints](#api-rest-endpoints)
6. [Frontend (React + TypeScript)](#frontend-react-typescript)
7. [Autenticação e Segurança](#autenticação-e-segurança)
8. [Plano de Implementação](#plano-de-implementação)
9. [Deploy e DevOps](#deploy-e-devops)

---

## 🏗️ Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  React 18 + TypeScript + Vite                    │   │
│  │  - TailwindCSS (estilização)                     │   │
│  │  - React Query (cache e estado servidor)        │   │
│  │  - Zustand (estado global)                       │   │
│  │  - Axios (requisições HTTP)                      │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS/REST API
                     │ (JSON)
┌────────────────────▼────────────────────────────────────┐
│                    BACKEND                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Node.js + TypeScript + Express/NestJS          │   │
│  │  - Express (framework web) ou NestJS (completo) │   │
│  │  - TypeORM ou Prisma (ORM)                      │   │
│  │  - JWT (autenticação)                            │   │
│  │  - Class Validator (validação)                   │   │
│  │  - Winston (logs)                                │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │ TCP/IP (Pool de conexões)
                     │ 
┌────────────────────▼────────────────────────────────────┐
│                  BANCO DE DADOS                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  MySQL 8.0+                                      │   │
│  │  - InnoDB (engine)                               │   │
│  │  - Índices otimizados                            │   │
│  │  - Triggers para auditoria                       │   │
│  │  - Views para relatórios                         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológica Detalhada

### Backend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Node.js** | 20.x LTS | Runtime JavaScript |
| **TypeScript** | 5.x | Type Safety |
| **Express.js** | 4.x | Framework web minimalista |
| **NestJS** (alternativa) | 10.x | Framework completo enterprise |
| **TypeORM** | 0.3.x | ORM para MySQL |
| **Prisma** (alternativa) | 5.x | ORM moderno type-safe |
| **MySQL2** | 3.x | Driver MySQL nativo |
| **class-validator** | 0.14.x | Validação de dados |
| **class-transformer** | 0.5.x | Transformação de objetos |
| **jsonwebtoken** | 9.x | Autenticação JWT |
| **bcrypt** | 5.x | Hash de senhas |
| **helmet** | 7.x | Segurança HTTP headers |
| **cors** | 2.x | CORS middleware |
| **dotenv** | 16.x | Variáveis de ambiente |
| **winston** | 3.x | Sistema de logs |

### Frontend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **React** | 18.x | Framework UI |
| **TypeScript** | 5.x | Type Safety |
| **Vite** | 5.x | Build tool |
| **TailwindCSS** | 3.x | Framework CSS |
| **React Query** | 5.x | Data fetching & cache |
| **Zustand** | 4.x | Estado global |
| **Axios** | 1.x | Cliente HTTP |
| **React Router** | 6.x | Roteamento |
| **React Hook Form** | 7.x | Formulários |
| **Zod** | 3.x | Validação runtime |

### Banco de Dados

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **MySQL** | 8.0+ | SGBD relacional |
| **mysql-workbench** | 8.x | Modelagem e administração |

### DevOps

| Tecnologia | Propósito |
|------------|-----------|
| **Docker** | Containerização |
| **Docker Compose** | Orquestração local |
| **GitHub Actions** | CI/CD |
| **PM2** | Process manager (produção) |
| **Nginx** | Reverse proxy |

---

## 🔧 Arquitetura Backend (TypeScript)

### Estrutura de Diretórios

```
backend/
├── src/
│   ├── config/              # Configurações
│   │   ├── database.ts      # Config do MySQL
│   │   ├── jwt.ts           # Config do JWT
│   │   └── cors.ts          # Config CORS
│   │
│   ├── entities/            # Entidades TypeORM
│   │   ├── User.ts
│   │   ├── Sticker.ts
│   │   ├── Album.ts
│   │   └── StickerStatus.ts
│   │
│   ├── dto/                 # Data Transfer Objects
│   │   ├── create-user.dto.ts
│   │   ├── update-sticker.dto.ts
│   │   ├── search-query.dto.ts
│   │   └── response.dto.ts
│   │
│   ├── repositories/        # Camada de acesso a dados
│   │   ├── UserRepository.ts
│   │   ├── StickerRepository.ts
│   │   ├── AlbumRepository.ts
│   │   └── StickerStatusRepository.ts
│   │
│   ├── services/            # Lógica de negócio
│   │   ├── AuthService.ts
│   │   ├── StickerService.ts
│   │   ├── AlbumService.ts
│   │   └── StatisticsService.ts
│   │
│   ├── controllers/         # Controladores HTTP
│   │   ├── AuthController.ts
│   │   ├── StickerController.ts
│   │   ├── AlbumController.ts
│   │   └── StatisticsController.ts
│   │
│   ├── middlewares/         # Middlewares
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── logger.middleware.ts
│   │
│   ├── routes/              # Definição de rotas
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── stickers.routes.ts
│   │   ├── albums.routes.ts
│   │   └── statistics.routes.ts
│   │
│   ├── utils/               # Utilitários
│   │   ├── logger.ts
│   │   ├── validators.ts
│   │   └── helpers.ts
│   │
│   ├── types/               # Tipos TypeScript
│   │   ├── express.d.ts
│   │   └── custom.types.ts
│   │
│   ├── migrations/          # Migrações do banco
│   │   ├── 001_create_tables.ts
│   │   ├── 002_add_indexes.ts
│   │   └── 003_seed_data.ts
│   │
│   ├── app.ts              # Configuração do Express
│   └── server.ts           # Ponto de entrada
│
├── tests/                  # Testes
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example            # Exemplo de variáveis
├── .eslintrc.js           # ESLint config
├── .prettierrc            # Prettier config
├── tsconfig.json          # TypeScript config
├── package.json           # Dependências
└── docker-compose.yml     # Docker setup
```

### Exemplo de Código: Entity (TypeORM)

```typescript
// src/entities/Sticker.ts
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  OneToMany, 
  Index, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';
import { StickerStatus } from './StickerStatus';

@Entity('stickers')
@Index(['prefix', 'number'], { unique: true })
export class Sticker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  @Index()
  prefix: string;

  @Column({ type: 'int' })
  number: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Index()
  code: string;

  @Column({ type: 'enum', enum: ['FWC', 'TEAM', 'COCA_COLA'] })
  type: 'FWC' | 'TEAM' | 'COCA_COLA';

  @Column({ type: 'varchar', length: 100, nullable: true })
  description?: string;

  @OneToMany(() => StickerStatus, status => status.sticker)
  statuses: StickerStatus[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

```typescript
// src/entities/Album.ts
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  OneToMany 
} from 'typeorm';
import { StickerStatus } from './StickerStatus';

@Entity('albums')
export class Album {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  key: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 7 })
  color: string;

  @Column({ type: 'varchar', length: 10 })
  icon: string;

  @OneToMany(() => StickerStatus, status => status.album)
  statuses: StickerStatus[];
}
```

```typescript
// src/entities/StickerStatus.ts
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  JoinColumn, 
  Index,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { Sticker } from './Sticker';
import { Album } from './Album';
import { User } from './User';

@Entity('sticker_status')
@Index(['user', 'sticker', 'album'], { unique: true })
export class StickerStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.statuses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Sticker, sticker => sticker.statuses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sticker_id' })
  sticker: Sticker;

  @ManyToOne(() => Album, album => album.statuses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'album_id' })
  album: Album;

  @Column({ type: 'boolean', default: false })
  hasSticker: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

```typescript
// src/entities/User.ts
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { StickerStatus } from './StickerStatus';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => StickerStatus, status => status.user)
  statuses: StickerStatus[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Exemplo de Código: Service

```typescript
// src/services/StickerService.ts
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Sticker } from '../entities/Sticker';
import { StickerStatus } from '../entities/StickerStatus';
import { Album } from '../entities/Album';
import { User } from '../entities/User';

export class StickerService {
  private stickerRepo: Repository<Sticker>;
  private statusRepo: Repository<StickerStatus>;
  private albumRepo: Repository<Album>;

  constructor() {
    this.stickerRepo = AppDataSource.getRepository(Sticker);
    this.statusRepo = AppDataSource.getRepository(StickerStatus);
    this.albumRepo = AppDataSource.getRepository(Album);
  }

  /**
   * Buscar todas as figurinhas com status do usuário
   */
  async getAllStickers(userId: number): Promise<any[]> {
    const stickers = await this.stickerRepo
      .createQueryBuilder('sticker')
      .leftJoinAndSelect('sticker.statuses', 'status', 'status.userId = :userId', { userId })
      .leftJoinAndSelect('status.album', 'album')
      .orderBy('sticker.code', 'ASC')
      .getMany();

    return this.formatStickersResponse(stickers);
  }

  /**
   * Buscar figurinha por código
   */
  async getStickerByCode(code: string, userId: number): Promise<any> {
    const sticker = await this.stickerRepo
      .createQueryBuilder('sticker')
      .leftJoinAndSelect('sticker.statuses', 'status', 'status.userId = :userId', { userId })
      .leftJoinAndSelect('status.album', 'album')
      .where('sticker.code = :code', { code: code.toUpperCase() })
      .getOne();

    if (!sticker) {
      throw new Error('Figurinha não encontrada');
    }

    return this.formatStickerResponse(sticker);
  }

  /**
   * Buscar figurinhas por prefixo (ex: GHA)
   */
  async getStickersByPrefix(prefix: string, userId: number): Promise<any[]> {
    const stickers = await this.stickerRepo
      .createQueryBuilder('sticker')
      .leftJoinAndSelect('sticker.statuses', 'status', 'status.userId = :userId', { userId })
      .leftJoinAndSelect('status.album', 'album')
      .where('sticker.prefix = :prefix', { prefix: prefix.toUpperCase() })
      .orderBy('sticker.number', 'ASC')
      .getMany();

    return this.formatStickersResponse(stickers);
  }

  /**
   * Buscar com filtros avançados
   */
  async searchStickers(userId: number, filters: {
    query?: string;
    type?: string;
    status?: 'complete' | 'missing';
    album?: string;
  }): Promise<any[]> {
    const queryBuilder = this.stickerRepo
      .createQueryBuilder('sticker')
      .leftJoinAndSelect('sticker.statuses', 'status', 'status.userId = :userId', { userId })
      .leftJoinAndSelect('status.album', 'album');

    // Filtro por query (código ou prefixo)
    if (filters.query) {
      const query = filters.query.toUpperCase();
      queryBuilder.andWhere(
        '(sticker.code LIKE :query OR sticker.prefix LIKE :query)',
        { query: `${query}%` }
      );
    }

    // Filtro por tipo
    if (filters.type && filters.type !== 'all') {
      queryBuilder.andWhere('sticker.type = :type', { type: filters.type });
    }

    const stickers = await queryBuilder
      .orderBy('sticker.code', 'ASC')
      .getMany();

    let result = this.formatStickersResponse(stickers);

    // Filtro por status (completo ou faltando)
    if (filters.status === 'complete') {
      result = result.filter(s => s.prata && s.normal && s.ouro);
    } else if (filters.status === 'missing') {
      result = result.filter(s => !s.prata || !s.normal || !s.ouro);
    }

    // Filtro por álbum específico
    if (filters.album && filters.album !== 'all') {
      result = result.filter(s => !s[filters.album!]);
    }

    return result;
  }

  /**
   * Atualizar status de figurinha em álbum
   */
  async updateStickerStatus(
    userId: number,
    code: string,
    albumKey: string,
    hasSticker: boolean
  ): Promise<void> {
    const sticker = await this.stickerRepo.findOne({
      where: { code: code.toUpperCase() }
    });

    if (!sticker) {
      throw new Error('Figurinha não encontrada');
    }

    const album = await this.albumRepo.findOne({
      where: { key: albumKey }
    });

    if (!album) {
      throw new Error('Álbum não encontrado');
    }

    // Buscar ou criar status
    let status = await this.statusRepo.findOne({
      where: {
        user: { id: userId },
        sticker: { id: sticker.id },
        album: { id: album.id }
      }
    });

    if (status) {
      status.hasSticker = hasSticker;
      await this.statusRepo.save(status);
    } else {
      status = this.statusRepo.create({
        user: { id: userId } as User,
        sticker: { id: sticker.id } as Sticker,
        album: { id: album.id } as Album,
        hasSticker
      });
      await this.statusRepo.save(status);
    }
  }

  /**
   * Formatar resposta de múltiplas figurinhas
   */
  private formatStickersResponse(stickers: Sticker[]): any[] {
    return stickers.map(sticker => this.formatStickerResponse(sticker));
  }

  /**
   * Formatar resposta de uma figurinha
   */
  private formatStickerResponse(sticker: Sticker): any {
    const statusMap = new Map();
    
    sticker.statuses?.forEach(status => {
      if (status.album) {
        statusMap.set(status.album.key, status.hasSticker);
      }
    });

    return {
      code: sticker.code,
      prefix: sticker.prefix,
      number: sticker.number,
      type: sticker.type,
      prata: statusMap.get('prata') || false,
      normal: statusMap.get('normal') || false,
      ouro: statusMap.get('ouro') || false,
      isComplete: statusMap.get('prata') && statusMap.get('normal') && statusMap.get('ouro')
    };
  }
}
```

### Exemplo de Código: Controller

```typescript
// src/controllers/StickerController.ts
import { Request, Response, NextFunction } from 'express';
import { StickerService } from '../services/StickerService';
import { UpdateStickerDto } from '../dto/update-sticker.dto';
import { SearchQueryDto } from '../dto/search-query.dto';

export class StickerController {
  private stickerService: StickerService;

  constructor() {
    this.stickerService = new StickerService();
  }

  /**
   * GET /api/stickers
   * Listar todas as figurinhas
   */
  getAllStickers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const stickers = await this.stickerService.getAllStickers(userId);
      
      res.json({
        success: true,
        data: stickers,
        count: stickers.length
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/stickers/:code
   * Buscar figurinha por código
   */
  getStickerByCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const userId = req.user!.id;
      
      const sticker = await this.stickerService.getStickerByCode(code, userId);
      
      res.json({
        success: true,
        data: sticker
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/stickers/prefix/:prefix
   * Buscar por prefixo (ex: GHA)
   */
  getStickersByPrefix = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prefix } = req.params;
      const userId = req.user!.id;
      
      const stickers = await this.stickerService.getStickersByPrefix(prefix, userId);
      
      res.json({
        success: true,
        data: stickers,
        count: stickers.length
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/stickers/search
   * Busca com filtros
   */
  searchStickers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const filters: SearchQueryDto = {
        query: req.query.q as string,
        type: req.query.type as string,
        status: req.query.status as 'complete' | 'missing',
        album: req.query.album as string
      };
      
      const stickers = await this.stickerService.searchStickers(userId, filters);
      
      res.json({
        success: true,
        data: stickers,
        count: stickers.length
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/stickers/:code
   * Atualizar status de figurinha
   */
  updateStickerStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const userId = req.user!.id;
      const { album, hasSticker }: UpdateStickerDto = req.body;
      
      await this.stickerService.updateStickerStatus(userId, code, album, hasSticker);
      
      res.json({
        success: true,
        message: 'Status atualizado com sucesso'
      });
    } catch (error) {
      next(error);
    }
  };
}
```

### Exemplo de Código: Routes

```typescript
// src/routes/stickers.routes.ts
import { Router } from 'express';
import { StickerController } from '../controllers/StickerController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const controller = new StickerController();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Busca
router.get('/search', controller.searchStickers);

// CRUD
router.get('/', controller.getAllStickers);
router.get('/:code', controller.getStickerByCode);
router.get('/prefix/:prefix', controller.getStickersByPrefix);
router.put('/:code', controller.updateStickerStatus);

export default router;
```

---

## 🗄️ Modelagem do Banco MySQL

### Schema Completo

```sql
-- ============================================
-- DATABASE: figurinhas_copa2026
-- VERSÃO: 1.0
-- ENGINE: InnoDB
-- CHARSET: utf8mb4
-- COLLATION: utf8mb4_unicode_ci
-- ============================================

CREATE DATABASE IF NOT EXISTS figurinhas_copa2026
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE figurinhas_copa2026;

-- ============================================
-- TABELA: users
-- Armazena os usuários do sistema
-- ============================================
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt',
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Usuários do sistema';

-- ============================================
-- TABELA: albums
-- Armazena os 3 tipos de álbuns
-- ============================================
CREATE TABLE albums (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(20) NOT NULL UNIQUE COMMENT 'prata, normal, ouro',
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL COMMENT 'Cor hex: #C0C0C0',
  icon VARCHAR(10) NOT NULL COMMENT 'Emoji: 🥈',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tipos de álbuns disponíveis';

-- ============================================
-- TABELA: stickers
-- Armazena todas as 994 figurinhas
-- ============================================
CREATE TABLE stickers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prefix VARCHAR(10) NOT NULL COMMENT 'FWC, GHA, BRA, CC, etc',
  number INT NOT NULL COMMENT '01 a 20 (ou 00-19 para FWC)',
  code VARCHAR(20) NOT NULL UNIQUE COMMENT 'Código completo: GHA01',
  type ENUM('FWC', 'TEAM', 'COCA_COLA') NOT NULL,
  description VARCHAR(255) NULL COMMENT 'Descrição opcional',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY idx_prefix_number (prefix, number),
  INDEX idx_code (code),
  INDEX idx_prefix (prefix),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Catálogo de 994 figurinhas';

-- ============================================
-- TABELA: sticker_status
-- Relacionamento: Usuário possui figurinha em álbum
-- ============================================
CREATE TABLE sticker_status (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  sticker_id INT UNSIGNED NOT NULL,
  album_id INT UNSIGNED NOT NULL,
  has_sticker BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY idx_user_sticker_album (user_id, sticker_id, album_id),
  INDEX idx_user_album (user_id, album_id),
  INDEX idx_sticker (sticker_id),
  INDEX idx_has_sticker (has_sticker),
  
  CONSTRAINT fk_status_user FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
    
  CONSTRAINT fk_status_sticker FOREIGN KEY (sticker_id)
    REFERENCES stickers(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
    
  CONSTRAINT fk_status_album FOREIGN KEY (album_id)
    REFERENCES albums(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Status de posse de figurinhas por usuário e álbum';

-- ============================================
-- TABELA: audit_log (OPCIONAL - para auditoria)
-- ============================================
CREATE TABLE audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  action VARCHAR(50) NOT NULL COMMENT 'INSERT, UPDATE, DELETE',
  table_name VARCHAR(50) NOT NULL,
  record_id INT UNSIGNED NOT NULL,
  old_value JSON NULL,
  new_value JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user (user_id),
  INDEX idx_table (table_name),
  INDEX idx_created (created_at),
  
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Log de auditoria de alterações';
```

### Views para Consultas Otimizadas

```sql
-- ============================================
-- VIEW: vw_user_statistics
-- Estatísticas gerais por usuário
-- ============================================
CREATE OR REPLACE VIEW vw_user_statistics AS
SELECT 
  u.id AS user_id,
  u.name AS user_name,
  a.id AS album_id,
  a.key AS album_key,
  a.name AS album_name,
  COUNT(DISTINCT s.id) AS total_stickers,
  SUM(CASE WHEN ss.has_sticker = TRUE THEN 1 ELSE 0 END) AS stickers_owned,
  ROUND(
    (SUM(CASE WHEN ss.has_sticker = TRUE THEN 1 ELSE 0 END) * 100.0) / COUNT(DISTINCT s.id),
    2
  ) AS completion_percentage
FROM users u
CROSS JOIN albums a
CROSS JOIN stickers s
LEFT JOIN sticker_status ss ON 
  ss.user_id = u.id AND 
  ss.album_id = a.id AND 
  ss.sticker_id = s.id
WHERE u.is_active = TRUE
GROUP BY u.id, u.name, a.id, a.key, a.name;

-- ============================================
-- VIEW: vw_missing_stickers
-- Figurinhas faltantes por usuário e álbum
-- ============================================
CREATE OR REPLACE VIEW vw_missing_stickers AS
SELECT 
  u.id AS user_id,
  u.name AS user_name,
  a.id AS album_id,
  a.key AS album_key,
  a.name AS album_name,
  s.id AS sticker_id,
  s.code AS sticker_code,
  s.prefix,
  s.number,
  s.type
FROM users u
CROSS JOIN albums a
CROSS JOIN stickers s
LEFT JOIN sticker_status ss ON 
  ss.user_id = u.id AND 
  ss.album_id = a.id AND 
  ss.sticker_id = s.id
WHERE 
  u.is_active = TRUE AND
  (ss.id IS NULL OR ss.has_sticker = FALSE)
ORDER BY u.id, a.display_order, s.code;

-- ============================================
-- VIEW: vw_complete_stickers
-- Figurinhas completas em todos os álbuns
-- ============================================
CREATE OR REPLACE VIEW vw_complete_stickers AS
SELECT 
  u.id AS user_id,
  u.name AS user_name,
  s.id AS sticker_id,
  s.code AS sticker_code,
  s.prefix,
  s.type,
  COUNT(DISTINCT ss.album_id) AS albums_count
FROM users u
CROSS JOIN stickers s
INNER JOIN sticker_status ss ON 
  ss.user_id = u.id AND 
  ss.sticker_id = s.id AND
  ss.has_sticker = TRUE
WHERE u.is_active = TRUE
GROUP BY u.id, u.name, s.id, s.code, s.prefix, s.type
HAVING albums_count = 3
ORDER BY s.code;
```

### Stored Procedures

```sql
-- ============================================
-- PROCEDURE: sp_update_sticker_status
-- Atualiza ou insere status de figurinha
-- ============================================
DELIMITER $$

CREATE PROCEDURE sp_update_sticker_status(
  IN p_user_id INT UNSIGNED,
  IN p_sticker_code VARCHAR(20),
  IN p_album_key VARCHAR(20),
  IN p_has_sticker BOOLEAN
)
BEGIN
  DECLARE v_sticker_id INT UNSIGNED;
  DECLARE v_album_id INT UNSIGNED;
  
  -- Buscar IDs
  SELECT id INTO v_sticker_id FROM stickers WHERE code = p_sticker_code;
  SELECT id INTO v_album_id FROM albums WHERE `key` = p_album_key;
  
  -- Verificar se existem
  IF v_sticker_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Figurinha não encontrada';
  END IF;
  
  IF v_album_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Álbum não encontrado';
  END IF;
  
  -- Inserir ou atualizar
  INSERT INTO sticker_status (user_id, sticker_id, album_id, has_sticker)
  VALUES (p_user_id, v_sticker_id, v_album_id, p_has_sticker)
  ON DUPLICATE KEY UPDATE
    has_sticker = p_has_sticker,
    updated_at = CURRENT_TIMESTAMP;
    
END$$

DELIMITER ;

-- ============================================
-- PROCEDURE: sp_get_album_statistics
-- Retorna estatísticas detalhadas de um álbum
-- ============================================
DELIMITER $$

CREATE PROCEDURE sp_get_album_statistics(
  IN p_user_id INT UNSIGNED,
  IN p_album_key VARCHAR(20)
)
BEGIN
  SELECT 
    a.name AS album_name,
    a.color,
    a.icon,
    COUNT(DISTINCT s.id) AS total_stickers,
    SUM(CASE WHEN ss.has_sticker = TRUE THEN 1 ELSE 0 END) AS stickers_owned,
    COUNT(DISTINCT s.id) - SUM(CASE WHEN ss.has_sticker = TRUE THEN 1 ELSE 0 END) AS stickers_missing,
    ROUND(
      (SUM(CASE WHEN ss.has_sticker = TRUE THEN 1 ELSE 0 END) * 100.0) / COUNT(DISTINCT s.id),
      2
    ) AS completion_percentage,
    SUM(CASE WHEN s.type = 'FWC' AND ss.has_sticker = TRUE THEN 1 ELSE 0 END) AS fwc_owned,
    SUM(CASE WHEN s.type = 'TEAM' AND ss.has_sticker = TRUE THEN 1 ELSE 0 END) AS teams_owned,
    SUM(CASE WHEN s.type = 'COCA_COLA' AND ss.has_sticker = TRUE THEN 1 ELSE 0 END) AS cocacola_owned
  FROM albums a
  CROSS JOIN stickers s
  LEFT JOIN sticker_status ss ON 
    ss.user_id = p_user_id AND 
    ss.album_id = a.id AND 
    ss.sticker_id = s.id
  WHERE a.key = p_album_key
  GROUP BY a.id, a.name, a.color, a.icon;
END$$

DELIMITER ;
```

### Triggers para Auditoria (Opcional)

```sql
-- ============================================
-- TRIGGER: trg_audit_sticker_status_update
-- Registra alterações no log de auditoria
-- ============================================
DELIMITER $$

CREATE TRIGGER trg_audit_sticker_status_update
AFTER UPDATE ON sticker_status
FOR EACH ROW
BEGIN
  IF OLD.has_sticker != NEW.has_sticker THEN
    INSERT INTO audit_log (
      user_id,
      action,
      table_name,
      record_id,
      old_value,
      new_value
    ) VALUES (
      NEW.user_id,
      'UPDATE',
      'sticker_status',
      NEW.id,
      JSON_OBJECT('has_sticker', OLD.has_sticker),
      JSON_OBJECT('has_sticker', NEW.has_sticker)
    );
  END IF;
END$$

DELIMITER ;
```

### Script de Seed (Dados Iniciais)

```sql
-- ============================================
-- SEED DATA: Albums
-- ============================================
INSERT INTO albums (`key`, name, color, icon, display_order) VALUES
('prata', 'Álbum Prata', '#C0C0C0', '🥈', 1),
('normal', 'Álbum Normal', '#0066CC', '📘', 2),
('ouro', 'Álbum Ouro', '#FFD700', '🥇', 3);

-- ============================================
-- SEED DATA: Stickers - FWC (00-19)
-- ============================================
INSERT INTO stickers (prefix, number, code, type) VALUES
('FWC', 0, 'FWC00', 'FWC'),
('FWC', 1, 'FWC01', 'FWC'),
('FWC', 2, 'FWC02', 'FWC'),
('FWC', 3, 'FWC03', 'FWC'),
('FWC', 4, 'FWC04', 'FWC'),
('FWC', 5, 'FWC05', 'FWC'),
('FWC', 6, 'FWC06', 'FWC'),
('FWC', 7, 'FWC07', 'FWC'),
('FWC', 8, 'FWC08', 'FWC'),
('FWC', 9, 'FWC09', 'FWC'),
('FWC', 10, 'FWC10', 'FWC'),
('FWC', 11, 'FWC11', 'FWC'),
('FWC', 12, 'FWC12', 'FWC'),
('FWC', 13, 'FWC13', 'FWC'),
('FWC', 14, 'FWC14', 'FWC'),
('FWC', 15, 'FWC15', 'FWC'),
('FWC', 16, 'FWC16', 'FWC'),
('FWC', 17, 'FWC17', 'FWC'),
('FWC', 18, 'FWC18', 'FWC'),
('FWC', 19, 'FWC19', 'FWC');

-- ============================================
-- SEED DATA: Stickers - Coca-Cola (CC1-14)
-- ============================================
INSERT INTO stickers (prefix, number, code, type) VALUES
('CC', 1, 'CC1', 'COCA_COLA'),
('CC', 2, 'CC2', 'COCA_COLA'),
('CC', 3, 'CC3', 'COCA_COLA'),
('CC', 4, 'CC4', 'COCA_COLA'),
('CC', 5, 'CC5', 'COCA_COLA'),
('CC', 6, 'CC6', 'COCA_COLA'),
('CC', 7, 'CC7', 'COCA_COLA'),
('CC', 8, 'CC8', 'COCA_COLA'),
('CC', 9, 'CC9', 'COCA_COLA'),
('CC', 10, 'CC10', 'COCA_COLA'),
('CC', 11, 'CC11', 'COCA_COLA'),
('CC', 12, 'CC12', 'COCA_COLA'),
('CC', 13, 'CC13', 'COCA_COLA'),
('CC', 14, 'CC14', 'COCA_COLA');

-- ============================================
-- SEED DATA: Stickers - Seleções (48 × 20 = 960)
-- Lista de todas as seleções (exemplo)
-- ============================================

-- GRUPO A
INSERT INTO stickers (prefix, number, code, type) SELECT 'CAN', n, CONCAT('CAN', LPAD(n, 2, '0')), 'TEAM' FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20) numbers;

INSERT INTO stickers (prefix, number, code, type) SELECT 'MEX', n, CONCAT('MEX', LPAD(n, 2, '0')), 'TEAM' FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20) numbers;

INSERT INTO stickers (prefix, number, code, type) SELECT 'USA', n, CONCAT('USA', LPAD(n, 2, '0')), 'TEAM' FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20) numbers;

-- ... Repetir para todas as 48 seleções
-- GRUPO B: BRA, ARG, URU, CHI
-- GRUPO C: GHA, NGA, SEN, etc.
-- ... continuar com todas as seleções

-- Script completo disponível em: migrations/002_seed_stickers.sql
```

### Índices de Performance

```sql
-- ============================================
-- ÍNDICES ADICIONAIS PARA OTIMIZAÇÃO
-- ============================================

-- Índice composto para busca filtrada
CREATE INDEX idx_sticker_type_prefix 
ON stickers (type, prefix);

-- Índice para ordenação por código
CREATE INDEX idx_sticker_code_asc 
ON stickers (code ASC);

-- Índice para queries de estatísticas
CREATE INDEX idx_status_user_album_has 
ON sticker_status (user_id, album_id, has_sticker);

-- Índice para auditoria por data
CREATE INDEX idx_audit_user_date 
ON audit_log (user_id, created_at DESC);
```

---

## 🔌 API REST Endpoints

### Documentação Completa da API

#### Base URL
```
http://localhost:3000/api/v1
```

### 1. Autenticação

#### POST /auth/register
Registrar novo usuário

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SenhaSegura123!",
  "name": "João Silva"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "João Silva"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /auth/login
Fazer login

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SenhaSegura123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "João Silva"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### GET /auth/me
Obter usuário autenticado

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "João Silva",
    "isActive": true
  }
}
```

---

### 2. Figurinhas

#### GET /stickers
Listar todas as figurinhas com status do usuário

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "code": "FWC00",
      "prefix": "FWC",
      "number": 0,
      "type": "FWC",
      "prata": true,
      "normal": true,
      "ouro": false,
      "isComplete": false
    },
    {
      "code": "GHA01",
      "prefix": "GHA",
      "number": 1,
      "type": "TEAM",
      "prata": true,
      "normal": true,
      "ouro": true,
      "isComplete": true
    }
  ],
  "count": 994
}
```

#### GET /stickers/:code
Buscar figurinha específica

**Headers:**
```
Authorization: Bearer {token}
```

**Example:** `GET /stickers/GHA01`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "code": "GHA01",
    "prefix": "GHA",
    "number": 1,
    "type": "TEAM",
    "prata": true,
    "normal": false,
    "ouro": true,
    "isComplete": false
  }
}
```

#### GET /stickers/prefix/:prefix
Buscar todas as figurinhas de um prefixo (seleção)

**Headers:**
```
Authorization: Bearer {token}
```

**Example:** `GET /stickers/prefix/GHA`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "code": "GHA01",
      "prefix": "GHA",
      "number": 1,
      "type": "TEAM",
      "prata": true,
      "normal": true,
      "ouro": true,
      "isComplete": true
    },
    {
      "code": "GHA02",
      "prefix": "GHA",
      "number": 2,
      "type": "TEAM",
      "prata": false,
      "normal": true,
      "ouro": false,
      "isComplete": false
    }
    // ... até GHA20
  ],
  "count": 20
}
```

#### GET /stickers/search
Busca com filtros avançados

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `q` (string): Termo de busca (código ou prefixo)
- `type` (string): Tipo de figurinha (`FWC`, `TEAM`, `COCA_COLA`, `all`)
- `status` (string): Status (`complete`, `missing`, `all`)
- `album` (string): Álbum específico (`prata`, `normal`, `ouro`, `all`)

**Example:** 
```
GET /stickers/search?q=GHA&type=TEAM&status=missing&album=normal
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "code": "GHA02",
      "prefix": "GHA",
      "number": 2,
      "type": "TEAM",
      "prata": true,
      "normal": false,
      "ouro": true,
      "isComplete": false
    }
  ],
  "count": 1,
  "filters": {
    "query": "GHA",
    "type": "TEAM",
    "status": "missing",
    "album": "normal"
  }
}
```

#### PUT /stickers/:code
Atualizar status de uma figurinha em um álbum

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "album": "normal",
  "hasSticker": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Status atualizado com sucesso",
  "data": {
    "code": "GHA01",
    "album": "normal",
    "hasSticker": true,
    "updatedAt": "2026-06-06T10:30:00Z"
  }
}
```

#### PATCH /stickers/:code/batch
Atualizar status em múltiplos álbuns de uma vez

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "updates": {
    "prata": true,
    "normal": true,
    "ouro": false
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Status atualizado em 3 álbuns",
  "data": {
    "code": "GHA01",
    "prata": true,
    "normal": true,
    "ouro": false,
    "isComplete": false
  }
}
```

---

### 3. Álbuns

#### GET /albums
Listar todos os álbuns

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "key": "prata",
      "name": "Álbum Prata",
      "color": "#C0C0C0",
      "icon": "🥈"
    },
    {
      "id": 2,
      "key": "normal",
      "name": "Álbum Normal",
      "color": "#0066CC",
      "icon": "📘"
    },
    {
      "id": 3,
      "key": "ouro",
      "name": "Álbum Ouro",
      "color": "#FFD700",
      "icon": "🥇"
    }
  ]
}
```

#### GET /albums/:key/stats
Estatísticas detalhadas de um álbum

**Headers:**
```
Authorization: Bearer {token}
```

**Example:** `GET /albums/prata/stats`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "album": {
      "key": "prata",
      "name": "Álbum Prata",
      "color": "#C0C0C0",
      "icon": "🥈"
    },
    "stats": {
      "total": 994,
      "owned": 977,
      "missing": 17,
      "completionPercentage": 98.3,
      "byType": {
        "FWC": {
          "total": 20,
          "owned": 20,
          "missing": 0
        },
        "TEAM": {
          "total": 960,
          "owned": 943,
          "missing": 17
        },
        "COCA_COLA": {
          "total": 14,
          "owned": 14,
          "missing": 0
        }
      }
    }
  }
}
```

#### GET /albums/:key/missing
Figurinhas faltantes em um álbum

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `groupBy` (string): Agrupar por (`prefix`, `type`, `none`)

**Example:** `GET /albums/ouro/missing?groupBy=prefix`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "album": "ouro",
    "missing": 277,
    "grouped": {
      "GHA": [
        {"code": "GHA03", "number": 3},
        {"code": "GHA07", "number": 7},
        {"code": "GHA15", "number": 15}
      ],
      "BRA": [
        {"code": "BRA01", "number": 1},
        {"code": "BRA12", "number": 12}
      ]
      // ... outros prefixos
    }
  }
}
```

---

### 4. Estatísticas

#### GET /statistics/general
Estatísticas gerais de todos os álbuns

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalStickers": 994,
    "albums": {
      "prata": {
        "owned": 977,
        "missing": 17,
        "percentage": 98.3
      },
      "normal": {
        "owned": 955,
        "missing": 39,
        "percentage": 96.1
      },
      "ouro": {
        "owned": 717,
        "missing": 277,
        "percentage": 72.1
      }
    },
    "completeInAll": 715,
    "completePercentage": 71.9
  }
}
```

#### GET /statistics/complete
Figurinhas completas em todos os álbuns

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "count": 715,
    "percentage": 71.9,
    "stickers": [
      {
        "code": "FWC00",
        "prefix": "FWC",
        "type": "FWC"
      },
      {
        "code": "GHA01",
        "prefix": "GHA",
        "type": "TEAM"
      }
      // ... todas as completas
    ]
  }
}
```

#### GET /statistics/progress
Progresso ao longo do tempo (histórico)

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `period` (string): Período (`week`, `month`, `all`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "period": "month",
    "timeline": [
      {
        "date": "2026-05-06",
        "prata": 950,
        "normal": 920,
        "ouro": 650
      },
      {
        "date": "2026-05-13",
        "prata": 965,
        "normal": 935,
        "ouro": 680
      },
      {
        "date": "2026-06-06",
        "prata": 977,
        "normal": 955,
        "ouro": 717
      }
    ]
  }
}
```

---

### Códigos de Status HTTP

| Código | Significado | Quando Usar |
|--------|-------------|-------------|
| `200` | OK | Requisição bem-sucedida |
| `201` | Created | Recurso criado |
| `204` | No Content | Sucesso sem corpo de resposta |
| `400` | Bad Request | Dados inválidos |
| `401` | Unauthorized | Não autenticado |
| `403` | Forbidden | Sem permissão |
| `404` | Not Found | Recurso não encontrado |
| `409` | Conflict | Conflito (ex: email já existe) |
| `422` | Unprocessable Entity | Validação falhou |
| `500` | Internal Server Error | Erro no servidor |

### Formato de Erros

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": [
      {
        "field": "email",
        "message": "Email inválido"
      }
    ]
  }
}
```

---

## ⚛️ Frontend (React + TypeScript)

### Estrutura de Diretórios

```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
│
├── src/
│   ├── assets/             # Imagens, fontes, etc
│   │   └── images/
│   │
│   ├── components/         # Componentes reutilizáveis
│   │   ├── common/         # Componentes genéricos
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   │
│   │   ├── layout/         # Componentes de layout
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── MainLayout.tsx
│   │   │
│   │   └── stickers/       # Componentes específicos
│   │       ├── StickerCard.tsx
│   │       ├── StickerModal.tsx
│   │       ├── StickerGrid.tsx
│   │       └── StickerSearch.tsx
│   │
│   ├── pages/              # Páginas principais
│   │   ├── HomePage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── AlbumPage.tsx
│   │   ├── StatisticsPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   │
│   ├── hooks/              # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useStickers.ts
│   │   ├── useAlbums.ts
│   │   ├── useStatistics.ts
│   │   └── useDebounce.ts
│   │
│   ├── services/           # Serviços de API
│   │   ├── api.ts          # Cliente Axios
│   │   ├── auth.service.ts
│   │   ├── sticker.service.ts
│   │   ├── album.service.ts
│   │   └── statistics.service.ts
│   │
│   ├── store/              # Estado global (Zustand)
│   │   ├── authStore.ts
│   │   ├── stickerStore.ts
│   │   └── uiStore.ts
│   │
│   ├── types/              # Tipos TypeScript
│   │   ├── sticker.types.ts
│   │   ├── album.types.ts
│   │   ├── user.types.ts
│   │   └── api.types.ts
│   │
│   ├── utils/              # Utilitários
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   │
│   ├── styles/             # Estilos globais
│   │   └── index.css
│   │
│   ├── App.tsx             # Componente principal
│   ├── main.tsx            # Ponto de entrada
│   └── vite-env.d.ts       # Tipos Vite
│
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.ts
```

### Exemplo de Componente: StickerCard

```typescript
// src/components/stickers/StickerCard.tsx
import React, { useState } from 'react';
import { Sticker } from '../../types/sticker.types';
import StickerModal from './StickerModal';

interface StickerCardProps {
  sticker: Sticker;
  onUpdate: (code: string, album: string, hasSticker: boolean) => void;
}

const StickerCard: React.FC<StickerCardProps> = ({ sticker, onUpdate }) => {
  const [showModal, setShowModal] = useState(false);

  const isComplete = sticker.prata && sticker.normal && sticker.ouro;
  const borderColor = isComplete ? 'border-green-500' : 'border-gray-600';

  return (
    <>
      <div
        className={`
          bg-gray-800 rounded-lg p-4 cursor-pointer
          hover:scale-105 transition-transform duration-200
          border-2 ${borderColor}
        `}
        onClick={() => setShowModal(true)}
      >
        {/* Código */}
        <h3 className="text-lg font-bold text-white text-center mb-3">
          {sticker.code}
        </h3>

        {/* Status nos 3 álbuns */}
        <div className="flex justify-center gap-2">
          {/* Prata */}
          <span
            className={`
              px-2 py-1 rounded text-xs font-semibold
              ${sticker.prata ? 'bg-gray-400 text-gray-900' : 'bg-gray-700 text-gray-500'}
            `}
          >
            P
          </span>

          {/* Normal */}
          <span
            className={`
              px-2 py-1 rounded text-xs font-semibold
              ${sticker.normal ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-500'}
            `}
          >
            N
          </span>

          {/* Ouro */}
          <span
            className={`
              px-2 py-1 rounded text-xs font-semibold
              ${sticker.ouro ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-500'}
            `}
          >
            O
          </span>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <StickerModal
          sticker={sticker}
          onClose={() => setShowModal(false)}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
};

export default StickerCard;
```

### Exemplo de Serviço: API Client

```typescript
// src/services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para adicionar token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor para tratar erros
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // GET
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  // POST
  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  // PUT
  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  // PATCH
  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data);
    return response.data;
  }

  // DELETE
  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

```typescript
// src/services/sticker.service.ts
import { apiClient } from './api';
import { Sticker, SearchFilters } from '../types/sticker.types';
import { ApiResponse } from '../types/api.types';

export const stickerService = {
  // Buscar todas
  async getAll(): Promise<Sticker[]> {
    const response = await apiClient.get<ApiResponse<Sticker[]>>('/stickers');
    return response.data;
  },

  // Buscar por código
  async getByCode(code: string): Promise<Sticker> {
    const response = await apiClient.get<ApiResponse<Sticker>>(`/stickers/${code}`);
    return response.data;
  },

  // Buscar por prefixo
  async getByPrefix(prefix: string): Promise<Sticker[]> {
    const response = await apiClient.get<ApiResponse<Sticker[]>>(`/stickers/prefix/${prefix}`);
    return response.data;
  },

  // Buscar com filtros
  async search(filters: SearchFilters): Promise<Sticker[]> {
    const response = await apiClient.get<ApiResponse<Sticker[]>>('/stickers/search', filters);
    return response.data;
  },

  // Atualizar status
  async updateStatus(code: string, album: string, hasSticker: boolean): Promise<void> {
    await apiClient.put(`/stickers/${code}`, { album, hasSticker });
  },

  // Atualizar múltiplos álbuns
  async updateBatch(code: string, updates: Record<string, boolean>): Promise<Sticker> {
    const response = await apiClient.patch<ApiResponse<Sticker>>(
      `/stickers/${code}/batch`,
      { updates }
    );
    return response.data;
  },
};
```

### Exemplo de Hook Personalizado

```typescript
// src/hooks/useStickers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stickerService } from '../services/sticker.service';
import { SearchFilters } from '../types/sticker.types';
import { toast } from 'react-hot-toast';

export const useStickers = () => {
  const queryClient = useQueryClient();

  // Buscar todas as figurinhas
  const { data: stickers, isLoading, error } = useQuery({
    queryKey: ['stickers'],
    queryFn: stickerService.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Atualizar status
  const updateMutation = useMutation({
    mutationFn: ({ code, album, hasSticker }: {
      code: string;
      album: string;
      hasSticker: boolean;
    }) => stickerService.updateStatus(code, album, hasSticker),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stickers'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      toast.success('Status atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  return {
    stickers: stickers || [],
    isLoading,
    error,
    updateStatus: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};

// Hook para busca com filtros
export const useStickerSearch = (filters: SearchFilters) => {
  return useQuery({
    queryKey: ['stickers', 'search', filters],
    queryFn: () => stickerService.search(filters),
    enabled: !!filters.query || filters.status !== 'all',
  });
};

// Hook para buscar por prefixo
export const useStickersByPrefix = (prefix: string) => {
  return useQuery({
    queryKey: ['stickers', 'prefix', prefix],
    queryFn: () => stickerService.getByPrefix(prefix),
    enabled: !!prefix && prefix.length >= 2,
  });
};
```

---

## 🔐 Autenticação e Segurança

### JWT (JSON Web Tokens)

```typescript
// src/config/jwt.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'seu-secret-super-seguro';
const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: number;
  email: string;
}

export const jwtConfig = {
  secret: JWT_SECRET,
  expiresIn: JWT_EXPIRES_IN,

  // Gerar token
  generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  },

  // Verificar token
  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  },
};
```

### Middleware de Autenticação

```typescript
// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { jwtConfig } from '../config/jwt';

// Extender tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
      };
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token não fornecido',
        },
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    const decoded = jwtConfig.verifyToken(token);

    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token inválido ou expirado',
      },
    });
  }
};
```

### Senha: Hash com Bcrypt

```typescript
// src/utils/password.ts
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const passwordUtils = {
  // Hash de senha
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  // Comparar senha
  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  // Validar força da senha
  validate(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Senha deve ter no mínimo 8 caracteres' };
    }

    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Senha deve conter letra maiúscula' };
    }

    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Senha deve conter letra minúscula' };
    }

    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Senha deve conter número' };
    }

    if (!/[!@#$%^&*]/.test(password)) {
      return { valid: false, message: 'Senha deve conter caractere especial' };
    }

    return { valid: true };
  },
};
```

### Proteção de Rotas no Frontend

```typescript
// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
```

### Variáveis de Ambiente

```bash
# .env.example (Backend)
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=figurinhas_copa2026
DB_USER=root
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

```bash
# .env.example (Frontend)
VITE_API_URL=http://localhost:3000/api/v1
VITE_APP_NAME=Figurinhas Copa 2026
```

---

## 📋 Plano de Implementação

### Fase 1: Setup Inicial (Semana 1)

#### Dia 1-2: Configuração do Ambiente
- [ ] Criar repositório Git
- [ ] Configurar Node.js e TypeScript
- [ ] Instalar dependências backend
- [ ] Configurar ESLint e Prettier
- [ ] Setup Docker Compose (MySQL + Backend)

#### Dia 3-4: Banco de Dados
- [ ] Criar schema MySQL
- [ ] Implementar migrations com TypeORM
- [ ] Criar script de seed com dados iniciais
- [ ] Testar conexões e queries

#### Dia 5-7: Backend Base
- [ ] Configurar Express + TypeScript
- [ ] Implementar estrutura de pastas
- [ ] Criar entities (User, Sticker, Album, StickerStatus)
- [ ] Configurar middlewares (CORS, helmet, etc)
- [ ] Implementar sistema de logs

---

### Fase 2: API Backend (Semana 2)

#### Dia 8-10: Autenticação
- [ ] Implementar registro de usuário
- [ ] Implementar login
- [ ] Configurar JWT
- [ ] Criar middleware de autenticação
- [ ] Testar endpoints de auth

#### Dia 11-12: Endpoints de Figurinhas
- [ ] GET /stickers (listar todas)
- [ ] GET /stickers/:code
- [ ] GET /stickers/prefix/:prefix
- [ ] GET /stickers/search
- [ ] PUT /stickers/:code
- [ ] Testar todos os endpoints

#### Dia 13-14: Endpoints de Álbuns e Estatísticas
- [ ] GET /albums
- [ ] GET /albums/:key/stats
- [ ] GET /albums/:key/missing
- [ ] GET /statistics/general
- [ ] GET /statistics/complete
- [ ] Documentar API com Swagger

---

### Fase 3: Frontend (Semana 3-4)

#### Dia 15-17: Setup Frontend
- [ ] Criar projeto Vite + React + TypeScript
- [ ] Configurar TailwindCSS
- [ ] Configurar React Router
- [ ] Configurar React Query
- [ ] Criar estrutura de pastas

#### Dia 18-20: Autenticação Frontend
- [ ] Tela de login
- [ ] Tela de registro
- [ ] Sistema de autenticação (context/store)
- [ ] Proteção de rotas
- [ ] Persistência de token

#### Dia 21-24: Componentes de Figurinhas
- [ ] StickerCard component
- [ ] StickerModal component
- [ ] StickerGrid component
- [ ] SearchBar component
- [ ] Filtros avançados

#### Dia 25-28: Páginas Principais
- [ ] HomePage (dashboard)
- [ ] SearchPage
- [ ] AlbumPage (3 abas)
- [ ] StatisticsPage
- [ ] Integração com API

---

### Fase 4: Integração e Testes (Semana 5)

#### Dia 29-31: Integração
- [ ] Conectar frontend com backend
- [ ] Testar todos os fluxos
- [ ] Corrigir bugs
- [ ] Otimizar performance

#### Dia 32-35: Testes
- [ ] Testes unitários (backend)
- [ ] Testes de integração (API)
- [ ] Testes E2E (frontend)
- [ ] Testes de carga

---

### Fase 5: Deploy e Documentação (Semana 6)

#### Dia 36-38: Deploy
- [ ] Configurar Docker para produção
- [ ] Deploy do banco MySQL
- [ ] Deploy do backend (Railway/Render)
- [ ] Deploy do frontend (Vercel/Netlify)
- [ ] Configurar domínio e SSL

#### Dia 39-42: Documentação Final
- [ ] Documentar código
- [ ] Atualizar README
- [ ] Criar guia de instalação
- [ ] Criar guia de uso
- [ ] Criar vídeo demo

---

## 🚀 Deploy e DevOps

### Docker Setup

#### docker-compose.yml

```yaml
version: '3.8'

services:
  # MySQL Database
  mysql:
    image: mysql:8.0
    container_name: figurinhas_mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    ports:
      - '3306:3306'
    volumes:
      - mysql_data:/var/lib/mysql
      - ./migrations:/docker-entrypoint-initdb.d
    networks:
      - app_network

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: figurinhas_backend
    restart: always
    environment:
      NODE_ENV: production
      DB_HOST: mysql
      DB_PORT: 3306
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - '3000:3000'
    depends_on:
      - mysql
    networks:
      - app_network

  # Frontend (opcional - para deploy local)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: figurinhas_frontend
    restart: always
    ports:
      - '80:80'
    depends_on:
      - backend
    networks:
      - app_network

volumes:
  mysql_data:

networks:
  app_network:
    driver: bridge
```

#### Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Build do TypeScript
RUN npm run build

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["node", "dist/server.js"]
```

#### Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Servidor nginx para servir arquivos estáticos
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### CI/CD com GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
        working-directory: ./backend
      
      - name: Run tests
        run: npm test
        working-directory: ./backend

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm install -g @railway/cli
          railway up

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: |
          npm install -g vercel
          vercel --prod --token $VERCEL_TOKEN
```

---

## 📚 Recursos Adicionais

### Documentação Recomendada

- **TypeScript**: https://www.typescriptlang.org/docs/
- **Node.js**: https://nodejs.org/docs/
- **Express**: https://expressjs.com/
- **TypeORM**: https://typeorm.io/
- **MySQL**: https://dev.mysql.com/doc/
- **React**: https://react.dev/
- **React Query**: https://tanstack.com/query/
- **TailwindCSS**: https://tailwindcss.com/docs

### Ferramentas Úteis

- **MySQL Workbench**: Modelagem e administração
- **Postman**: Teste de APIs
- **TablePlus**: Cliente MySQL moderno
- **VS Code Extensions**:
  - TypeScript
  - ESLint
  - Prettier
  - MySQL (weijan chen)
  - Thunder Client

---

## ✅ Checklist Final

### Backend
- [ ] TypeScript configurado
- [ ] Express rodando
- [ ] MySQL conectado
- [ ] TypeORM configurado
- [ ] Todas as entities criadas
- [ ] Migrations executadas
- [ ] Seed data populado
- [ ] Todos os endpoints implementados
- [ ] Autenticação JWT funcionando
- [ ] Validações implementadas
- [ ] Tratamento de erros
- [ ] Logs configurados
- [ ] Testes escritos
- [ ] Docker funcionando

### Frontend
- [ ] React + TypeScript configurado
- [ ] TailwindCSS configurado
- [ ] React Router configurado
- [ ] React Query configurado
- [ ] Todos os componentes criados
- [ ] Todas as páginas implementadas
- [ ] Integração com API completa
- [ ] Autenticação funcionando
- [ ] Loading states
- [ ] Error handling
- [ ] Responsividade
- [ ] Build otimizado

### Deploy
- [ ] Backend deployado
- [ ] Frontend deployado
- [ ] Banco de dados em produção
- [ ] SSL configurado
- [ ] CI/CD configurado
- [ ] Monitoramento ativo

---

## 🎯 Próximos Passos

Após a conclusão:

1. **Fase 7: Features Avançadas**
   - Sistema de múltiplos usuários
   - Compartilhamento de listas
   - Sistema de troca entre usuários
   - Notificações push
   - Modo offline (PWA)

2. **Fase 8: Mobile**
   - App React Native
   - Sincronização com web
   - Câmera para scan de figurinhas

3. **Fase 9: Analytics**
   - Dashboard de métricas
   - Relatórios exportáveis
   - Gráficos de progresso

---

**Última atualização:** 06 de Junho de 2026  
**Versão do documento:** 1.0.0
