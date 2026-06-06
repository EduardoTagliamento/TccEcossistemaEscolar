# 🌐 Guia de Migração para Web

Planejamento detalhado para transformar a aplicação desktop em um sistema web completo.

## 📋 Visão Geral

A aplicação atual está estruturada pensando em facilitar a migração futura. Os componentes já estão separados de forma lógica:

- **`data_manager.py`**: Lógica de negócio (será o backend)
- **`gui.py`**: Interface visual (será substituída pelo frontend web)
- **`stickers.json`**: Dados (será migrado para banco de dados)

## 🏗️ Arquitetura Proposta

```
┌─────────────────┐
│   Frontend      │  React/Vue.js + TailwindCSS
│   (Browser)     │  
└────────┬────────┘
         │ HTTP/REST API
         │
┌────────▼────────┐
│   Backend       │  Flask/FastAPI + SQLAlchemy
│   (Server)      │  
└────────┬────────┘
         │
┌────────▼────────┐
│   Database      │  PostgreSQL/SQLite
│                 │  
└─────────────────┘
```

## 🔧 Fase 1: Backend API

### 1.1 Escolher Framework

**Recomendação: FastAPI**
- Moderno e rápido
- Documentação automática (Swagger)
- Type hints nativos
- Suporte a async/await

**Alternativa: Flask**
- Mais tradicional
- Grande comunidade
- Mais simples para iniciantes

### 1.2 Criar API REST

**Endpoints necessários:**

```python
# Figurinhas
GET    /api/stickers              # Listar todas
GET    /api/stickers/{code}       # Buscar por código
GET    /api/stickers/search       # Busca com filtros
PUT    /api/stickers/{code}       # Atualizar status

# Álbuns
GET    /api/albums                # Listar álbuns
GET    /api/albums/{album}/stats  # Estatísticas
GET    /api/albums/{album}/missing # Figurinhas faltantes

# Estatísticas
GET    /api/stats                 # Estatísticas gerais
GET    /api/stats/complete        # Figurinhas completas
```

### 1.3 Exemplo de Implementação (FastAPI)

```python
# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sys
sys.path.append('..')
from src.data_manager import DataManager

app = FastAPI(title="Figurinhas Copa 2026 API")

# CORS para permitir requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar DataManager
dm = DataManager()

# Models
class StickerUpdate(BaseModel):
    album: str
    status: bool

# Endpoints
@app.get("/api/stickers")
async def get_all_stickers():
    return dm.get_all_stickers()

@app.get("/api/stickers/{code}")
async def get_sticker(code: str):
    sticker = dm.get_sticker_by_code(code)
    if not sticker:
        raise HTTPException(status_code=404, detail="Figurinha não encontrada")
    return sticker

@app.put("/api/stickers/{code}")
async def update_sticker(code: str, update: StickerUpdate):
    success = dm.update_sticker_status(code, update.album, update.status)
    if not success:
        raise HTTPException(status_code=400, detail="Erro ao atualizar")
    return {"message": "Atualizado com sucesso"}

@app.get("/api/albums/{album}/stats")
async def get_album_stats(album: str):
    return dm.get_album_statistics(album)

@app.get("/api/search")
async def search_stickers(
    q: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    album: Optional[str] = None
):
    filters = {}
    if type: filters["type"] = type
    if status: filters["status"] = status
    if album: filters["album"] = album
    
    return dm.search_stickers(q or "", filters if filters else None)
```

### 1.4 Executar Backend

```bash
# Instalar FastAPI
pip install fastapi uvicorn

# Executar servidor
uvicorn backend.main:app --reload --port 8000

# Documentação automática em:
# http://localhost:8000/docs
```

## 💾 Fase 2: Migração para Banco de Dados

### 2.1 Escolher Banco

**Para MVP/Teste: SQLite**
- Arquivo local, sem instalação
- Simples de usar
- Suficiente para uso pessoal

**Para Produção: PostgreSQL**
- Robusto e escalável
- Suporte a múltiplos usuários
- Deploy fácil (Railway, Render, Heroku)

### 2.2 Schema do Banco

```sql
-- Tabela de álbuns
CREATE TABLE albums (
    id SERIAL PRIMARY KEY,
    key VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL
);

-- Tabela de figurinhas
CREATE TABLE stickers (
    id SERIAL PRIMARY KEY,
    prefix VARCHAR(10) NOT NULL,
    number INTEGER NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    UNIQUE(prefix, number)
);

-- Tabela de status (relação many-to-many)
CREATE TABLE sticker_status (
    id SERIAL PRIMARY KEY,
    sticker_id INTEGER REFERENCES stickers(id),
    album_id INTEGER REFERENCES albums(id),
    has_sticker BOOLEAN DEFAULT FALSE,
    UNIQUE(sticker_id, album_id)
);

-- Índices para performance
CREATE INDEX idx_sticker_code ON stickers(code);
CREATE INDEX idx_sticker_prefix ON stickers(prefix);
CREATE INDEX idx_status_lookup ON sticker_status(sticker_id, album_id);
```

### 2.3 Migração dos Dados

```python
# migrate_to_db.py
import json
import sqlite3

def migrate_json_to_db():
    # Conectar ao banco
    conn = sqlite3.connect('figurinhas.db')
    cursor = conn.cursor()
    
    # Criar tabelas
    cursor.execute('''CREATE TABLE IF NOT EXISTS stickers ...''')
    # ... criar todas as tabelas
    
    # Carregar JSON
    with open('data/stickers.json', 'r') as f:
        data = json.load(f)
    
    # Inserir álbuns
    for key, info in data['meta']['albums'].items():
        cursor.execute(
            'INSERT INTO albums (key, name, color) VALUES (?, ?, ?)',
            (key, info['name'], info['color'])
        )
    
    # Inserir figurinhas
    for sticker in data['stickers']:
        cursor.execute(
            'INSERT INTO stickers (prefix, number, code) VALUES (?, ?, ?)',
            (sticker['prefix'], sticker['number'], sticker['code'])
        )
        
        sticker_id = cursor.lastrowid
        
        # Inserir status para cada álbum
        for album in ['prata', 'normal', 'ouro']:
            cursor.execute(
                'INSERT INTO sticker_status (sticker_id, album_id, has_sticker) ...'
            )
    
    conn.commit()
    conn.close()
```

## 🎨 Fase 3: Frontend Web

### 3.1 Escolher Framework

**Recomendação: React + Vite**
- Componentes reutilizáveis
- Ecossistema rico
- Performance excelente

**Alternativa: Vue.js**
- Mais simples de aprender
- Template syntax intuitivo
- Bom para projetos menores

### 3.2 Estrutura do Projeto

```
frontend/
├── src/
│   ├── components/
│   │   ├── StickerCard.jsx
│   │   ├── StickerModal.jsx
│   │   ├── SearchBar.jsx
│   │   ├── AlbumTab.jsx
│   │   └── Statistics.jsx
│   ├── services/
│   │   └── api.js
│   ├── hooks/
│   │   └── useStickers.js
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── vite.config.js
```

### 3.3 Exemplo de Componente

```jsx
// StickerCard.jsx
import { useState } from 'react';

function StickerCard({ sticker, onUpdate }) {
  const [showModal, setShowModal] = useState(false);
  
  const isComplete = sticker.prata && sticker.normal && sticker.ouro;
  
  return (
    <div 
      className={`card ${isComplete ? 'border-green-500' : 'border-gray-500'}`}
      onClick={() => setShowModal(true)}
    >
      <h3 className="font-bold">{sticker.code}</h3>
      
      <div className="flex gap-1">
        <span className={`badge ${sticker.prata ? 'bg-gray-400' : 'bg-gray-800'}`}>
          P
        </span>
        <span className={`badge ${sticker.normal ? 'bg-blue-600' : 'bg-gray-800'}`}>
          N
        </span>
        <span className={`badge ${sticker.ouro ? 'bg-yellow-500' : 'bg-gray-800'}`}>
          O
        </span>
      </div>
      
      {showModal && (
        <StickerModal 
          sticker={sticker}
          onClose={() => setShowModal(false)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
```

### 3.4 Serviço de API

```javascript
// services/api.js
const API_URL = 'http://localhost:8000/api';

export const api = {
  // Buscar todas as figurinhas
  async getAllStickers() {
    const response = await fetch(`${API_URL}/stickers`);
    return response.json();
  },
  
  // Buscar por código
  async getSticker(code) {
    const response = await fetch(`${API_URL}/stickers/${code}`);
    return response.json();
  },
  
  // Atualizar status
  async updateSticker(code, album, status) {
    const response = await fetch(`${API_URL}/stickers/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ album, status })
    });
    return response.json();
  },
  
  // Buscar com filtros
  async searchStickers(query, filters) {
    const params = new URLSearchParams({ q: query, ...filters });
    const response = await fetch(`${API_URL}/search?${params}`);
    return response.json();
  },
  
  // Estatísticas
  async getAlbumStats(album) {
    const response = await fetch(`${API_URL}/albums/${album}/stats`);
    return response.json();
  }
};
```

## 🚀 Fase 4: Deploy

### 4.1 Backend

**Opções de Hospedagem:**

1. **Railway** (Recomendado)
   - Deploy automático do GitHub
   - PostgreSQL incluído
   - Domínio gratuito

2. **Render**
   - Plano gratuito generoso
   - Fácil configuração

3. **Heroku**
   - Tradicional e confiável
   - Addons disponíveis

### 4.2 Frontend

**Opções de Hospedagem:**

1. **Vercel** (Recomendado para React)
   - Deploy automático
   - CDN global
   - HTTPS gratuito

2. **Netlify**
   - Simples e rápido
   - Funções serverless

3. **GitHub Pages**
   - Gratuito
   - Integração direta

### 4.3 Exemplo de Deploy (Railway)

```bash
# Backend
railway login
railway init
railway add postgresql
railway up

# Frontend (Vercel)
vercel login
vercel
```

## 🔐 Fase 5: Recursos Adicionais

### 5.1 Autenticação

```python
# Adicionar sistema de login
from fastapi_users import FastAPIUsers

# Cada usuário terá sua própria coleção
```

### 5.2 Múltiplas Coleções

```sql
-- Adicionar tabela de usuários e coleções
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255)
);

CREATE TABLE collections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(100),
    album_type VARCHAR(20)
);
```

### 5.3 Sistema de Trocas

```javascript
// Feature: Sistema de trocas entre usuários
POST /api/trades/create
GET  /api/trades/mine
PUT  /api/trades/{id}/accept
```

### 5.4 Estatísticas Avançadas

- Gráficos de progresso ao longo do tempo
- Comparação entre álbuns
- Seleções mais difíceis de completar
- Valor estimado da coleção

## 📱 Fase 6: Progressive Web App (PWA)

Transformar em PWA para funcionar offline:

```javascript
// sw.js (Service Worker)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('figurinhas-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/app.js'
      ]);
    })
  );
});
```

## 📊 Cronograma Sugerido

- **Semana 1-2**: Backend API + testes
- **Semana 3-4**: Migração para banco de dados
- **Semana 5-7**: Frontend web básico
- **Semana 8**: Integração e testes
- **Semana 9**: Deploy e ajustes
- **Semana 10+**: Recursos adicionais

## 📚 Recursos de Aprendizado

- FastAPI: https://fastapi.tiangolo.com/
- React: https://react.dev/
- SQLAlchemy: https://www.sqlalchemy.org/
- Tailwind CSS: https://tailwindcss.com/

---

**Boa sorte na migração! 🚀**

