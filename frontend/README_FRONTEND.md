# Bauá Frontend - Next.js 14

Frontend do Ecossistema Educacional Bauá desenvolvido com Next.js 14, React 18 e TypeScript.

## 🚀 Tecnologias

- **Next.js 14.2.0** - Framework React com App Router
- **React 18.3.0** - Biblioteca UI
- **TypeScript 5.7.3** - Tipagem estática
- **react-icons 5.0.0** - Ícones (FiEye, FiEyeOff, etc)
- **CSS Modules** - Estilização com escopo

## 📁 Estrutura de Diretórios

```
frontend/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Layout raiz com AuthProvider
│   ├── page.tsx                 # Landing page
│   ├── page.module.css
│   ├── login/                   # Página de login
│   │   ├── page.tsx             # Auto-detecção CPF/email/tel
│   │   └── page.module.css
│   ├── cadastro/                # Registro de usuário
│   │   ├── page.tsx             # Validações em tempo real
│   │   └── page.module.css
│   ├── verificar-email/         # Verificação código 6 dígitos
│   │   ├── page.tsx
│   │   └── page.module.css
│   ├── selecionar-escola/       # Grid de escolas do usuário
│   │   ├── page.tsx
│   │   └── page.module.css
│   ├── criar-escola/            # Criação com ColorPicker
│   │   ├── page.tsx             # 4 cores + logo + preview
│   │   └── page.module.css
│   ├── dashboard/               # Dashboard dinâmico
│   │   └── [escolaGUID]/
│   │       ├── page.tsx         # Tema aplicado por escola
│   │       └── page.module.css
│   └── saiba-mais/              # Página informativa
│       ├── page.tsx
│       └── page.module.css
├── components/                   # Componentes reutilizáveis
│   ├── ColorPicker.tsx          # Seletor de cor com HEX
│   └── ColorPicker.module.css
├── lib/                         # Utilitários e contextos
│   ├── auth/
│   │   └── AuthContext.tsx      # Context API para auth
│   └── validators/              # Validadores reutilizáveis
│       ├── cpf.ts               # Validação + formatação CPF
│       ├── email.ts             # Validação email
│       ├── telefone.ts          # Validação + formatação tel
│       └── senha.ts             # Validação força da senha
├── styles/
│   └── globals.css              # Tema Bauá + CSS variables
├── public/                      # Arquivos estáticos
├── next.config.js               # Configuração Next.js
├── tsconfig.json                # Configuração TypeScript
└── package.json                 # Dependências

```

## 🎨 Sistema de Temas

### Tema Bauá (Default)
```css
--color-primary: #00CED1;  /* Verde-água */
--color-light: #FFFFFF;    /* Branco */
--color-dark: #000000;     /* Preto */
--color-accent: #FFD700;   /* Dourado */
```

### Tema por Escola (Dinâmico)
Cada escola pode definir 4 cores personalizadas (EscolaCor1-4) que sobrescrevem as CSS variables:

```tsx
// Aplicado no dashboard/[escolaGUID]/page.tsx
document.documentElement.style.setProperty('--color-primary', escola.EscolaCor1);
document.documentElement.style.setProperty('--color-secondary', escola.EscolaCor2);
// ...
```

## 🔐 Autenticação

### AuthContext (`lib/auth/AuthContext.tsx`)
Gerencia estado global de autenticação com React Context API:

```tsx
const { usuario, token, isAuthenticated, isLoading, login, logout, refreshUser } = useAuth();
```

**Funcionalidades:**
- Login com identifier (CPF/email/telefone) + senha
- Token JWT armazenado em localStorage
- Auto-fetch do usuário ao carregar (GET /api/auth/me)
- Logout com limpeza de estado

**Uso em páginas:**
```tsx
import { useAuth } from '@/lib/auth/AuthContext';

// Redirecionar não autenticados
useEffect(() => {
  if (!authLoading && !usuario) {
    router.push('/login');
  }
}, [usuario, authLoading]);
```

## 📋 Validadores

### CPF (`lib/validators/cpf.ts`)
```tsx
import { validarCPF, formatarCPF, limparCPF } from '@/lib/validators/cpf';

validarCPF('123.456.789-00');  // true/false
formatarCPF('12345678900');     // '123.456.789-00'
limparCPF('123.456.789-00');    // '12345678900'
```

### Email (`lib/validators/email.ts`)
```tsx
import { validarEmail, normalizarEmail } from '@/lib/validators/email';

validarEmail('user@example.com');  // true/false
normalizarEmail('User@Example.COM'); // 'user@example.com'
```

### Telefone (`lib/validators/telefone.ts`)
```tsx
import { validarTelefone, formatarTelefone } from '@/lib/validators/telefone';

validarTelefone('11987654321');     // true/false
formatarTelefone('11987654321');    // '(11) 98765-4321'
```

### Senha (`lib/validators/senha.ts`)
```tsx
import { validarSenha, verificarForcaSenha } from '@/lib/validators/senha';

// Retorna objeto com valida: boolean e erros: string[]
const resultado = validarSenha('Abc12!');
// { valida: true, erros: [] }

verificarForcaSenha('password');  // 'fraca' | 'média' | 'forte'
```

**Requisitos de senha:**
- Mínimo 6 caracteres
- Pelo menos 1 número
- Pelo menos 1 caractere especial (!@#$%^&*...)

## 🎨 ColorPicker Component

Componente reutilizável para seleção de cores com preview e input HEX:

```tsx
import ColorPicker from '@/components/ColorPicker';

<ColorPicker
  label="Cor Principal"
  color={cor1}
  onChange={setCor1}
  disabled={isLoading}
/>
```

**Features:**
- Input nativo `type="color"`
- Preview visual da cor
- Input HEX manual com validação
- Auto-format HEX (#RRGGBB)

## 🔄 Fluxo de Navegação

```
1. Landing (/) 
   ↓ [Começar Agora / Entrar]
   
2a. Login (/login)
    ↓ [identifier + senha]
    → Selecionar Escola
    
2b. Cadastro (/cadastro)
    ↓ [CPF, email, tel, nome, senha]
    → Verificar Email (/verificar-email?email=...)
    ↓ [código 6 dígitos]
    → Login
    
3. Selecionar Escola (/selecionar-escola)
   ↓ [Click em escola OU Criar Nova]
   
4a. Dashboard (/dashboard/[escolaGUID])
    - Tema aplicado com cores da escola
    - Sidebar com navegação
    - Stats cards
    
4b. Criar Escola (/criar-escola)
    ↓ [nome, email, 4 cores, logo]
    → Selecionar Escola
```

## 🌐 Integração com Backend

### Proxy Configuration (`next.config.js`)
```js
async rewrites() {
  return [{
    source: '/api/:path*',
    destination: 'http://localhost:3000/api/:path*'
  }];
}
```

Permite chamar backend sem CORS:
```tsx
// ✅ Funciona
fetch('/api/auth/login', { ... })

// ❌ Não precisa
fetch('http://localhost:3000/api/auth/login', { ... })
```

### Endpoints Utilizados

**Autenticação:**
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Dados do usuário

**Usuário:**
- `POST /api/usuario` - Criar usuário
- `GET /api/usuario/:cpf/escolas` - Escolas do usuário

**Verificação Email:**
- `POST /api/verificacao-email/validar` - Validar código
- `POST /api/verificacao-email/reenviar` - Reenviar código

**Escola:**
- `POST /api/escola` - Criar escola
- `GET /api/escola/:guid` - Dados da escola

**Upload:**
- `POST /api/upload/logo/:guid` - Upload logo (multipart/form-data)

## 🎭 Validações em Tempo Real

### Login (`app/login/page.tsx`)
- Auto-detecção de tipo (CPF/email/telefone)
- Formatação automática de CPF e telefone
- Indicador de tipo detectado
- Toggle de visibilidade de senha

### Cadastro (`app/cadastro/page.tsx`)
- Validação CPF com ícone ✓/✗
- Validação email com ícone ✓/✗
- Validação telefone com ícone ✓/✗
- Indicador de força da senha (fraca/média/forte)
- Lista de requisitos de senha não atendidos
- Confirmação de senha com match visual

### Criar Escola (`app/criar-escola/page.tsx`)
- Preview em tempo real do tema
- Preview do logo ao selecionar
- Validação de tipo de arquivo (PNG/JPG)
- Validação de tamanho (1MB máximo)
- Card de exemplo com cores aplicadas
- Paleta de cores visual

## 📱 Responsividade

Todos os componentes são responsivos com breakpoints:

```css
@media (max-width: 1024px) { /* Tablet */ }
@media (max-width: 768px)  { /* Mobile landscape */ }
@media (max-width: 640px)  { /* Mobile portrait */ }
@media (max-width: 480px)  { /* Small mobile */ }
```

**Adaptações principais:**
- Grid → Stack em mobile
- Sidebar horizontal em tablet
- Header flexível
- Botões full-width em mobile
- Font sizes reduzidos

## 🚀 Comandos

### Desenvolvimento
```bash
npm run dev         # Inicia dev server (localhost:3001)
npm run build       # Build de produção
npm run start       # Serve build de produção
npm run lint        # Lint com ESLint
npm run type-check  # Verificação TypeScript
```

### Instalação
```bash
cd frontend
npm install
```

## 🔧 Configurações

### TypeScript (`tsconfig.json`)
- JSX preserve (Next.js)
- Module resolution: bundler
- Path aliases: `@/*` → `./`
- Strict mode habilitado

### Next.js (`next.config.js`)
- React Strict Mode: ✅
- Powered by header: ❌ (removido)
- Console removal em produção: ✅
- Security headers: ✅
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block

## 🎨 Design System

### Spacing
```css
--spacing-xs: 0.25rem   /* 4px */
--spacing-sm: 0.5rem    /* 8px */
--spacing-md: 1rem      /* 16px */
--spacing-lg: 1.5rem    /* 24px */
--spacing-xl: 2rem      /* 32px */
--spacing-2xl: 3rem     /* 48px */
```

### Typography
```css
--font-size-xs: 0.75rem    /* 12px */
--font-size-sm: 0.875rem   /* 14px */
--font-size-md: 1rem       /* 16px */
--font-size-lg: 1.125rem   /* 18px */
--font-size-xl: 1.25rem    /* 20px */
--font-size-2xl: 1.5rem    /* 24px */
--font-size-3xl: 1.875rem  /* 30px */
--font-size-4xl: 2.25rem   /* 36px */
```

### Border Radius
```css
--radius-sm: 0.25rem   /* 4px */
--radius-md: 0.5rem    /* 8px */
--radius-lg: 0.75rem   /* 12px */
--radius-xl: 1rem      /* 16px */
--radius-full: 9999px  /* Circle */
```

### Z-index
```css
--z-dropdown: 1000
--z-sticky: 1020
--z-fixed: 1030
--z-modal-backdrop: 1040
--z-modal: 1050
--z-popover: 1060
--z-tooltip: 1070
```

## 📝 Notas

### Estado da Aplicação
- ✅ Autenticação completa (login/logout/me)
- ✅ Cadastro com validações
- ✅ Verificação de email
- ✅ Seleção de escola multi-escola
- ✅ Criação de escola com tema personalizado
- ✅ Dashboard básico com tema aplicado
- ⏳ CRUD completo de usuários (futuro)
- ⏳ Relatórios (futuro)
- ⏳ Gestão de alunos (futuro)

### Security
- Tokens JWT armazenados em localStorage (client-side)
- Headers de segurança configurados
- Validação de inputs em todas as formas
- CORS controlado via proxy

### Performance
- CSS Modules (scoped styles)
- Image optimization (Next.js)
- Console removal em produção
- Lazy loading de páginas (Next.js App Router)

---

**Desenvolvido por:** Eduardo Tagliamento  
**Tecnologia:** Next.js 14 + React 18 + TypeScript  
**Data:** Março 2026
