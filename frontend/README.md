# 🦜 Frontend - Bauá

Frontend do Ecossistema Educacional Bauá desenvolvido em HTML5, CSS3 e JavaScript.

## ✅ Pronto para Usar!

O frontend está **totalmente funcional** e não precisa de compilação! Tudo está em um único arquivo HTML.

## 🚀 Como Executar

### Opção 1: Abrir Diretamente no Navegador (Mais Simples)

```bash
# Windows
start frontend/public/index.html

# Ou simplesmente abra o arquivo no navegador
```

### Opção 2: Servidor HTTP (Recomendado para desenvolvimento)

```bash
# Instale o servidor HTTP simples (uma vez)
npm install -g http-server

# Execute na pasta public
cd frontend/public
http-server -p 3000 -o
```

### Opção 3: Live Server (VS Code)

1. Instale a extensão "Live Server" no VS Code
2. Clique com botão direito em `frontend/public/index.html`
3. Selecione "Open with Live Server"

### Opção 4: Python

```bash
cd frontend/public
python -m http.server 3000
```

Acesse: http://localhost:3000

## 📁 Estrutura

```
frontend/
├── public/
│   ├── index.html         # Página principal (auto-contida)
│   └── assets/
│       └── baua-logo.svg  # Logo do projeto (SVG)
├── src/
│   ├── assets/
│   │   └── baua-logo.svg  # Logo original
│   ├── styles/
│   │   └── main.css       # Estilos (duplicados no HTML)
│   └── main.ts           # Script TS (não usado - tudo está no HTML)
├── tsconfig.json         # Config TypeScript (para futuro)
├── package.json          # Dependências (opcional)
└── README.md
```

## 🎨 Design

- **Cores:** Verde-água (#1ABC9C, #16A085)
- **Logo:** Pássaro SVG com capelo (Bauá)
- **Estilo:** Moderno, limpo e totalmente responsivo
- **Animações:** Fade-in, float, hover effects

## ✨ Recursos Implementados

### 🎯 Funcionalidades
- ✅ Logo SVG animado do Bauá
- ✅ Smooth scroll nos links de navegação
- ✅ Animações ao scroll (fade-in)
- ✅ Efeitos hover em cards e botões
- ✅ Easter egg no logo (clique 5 vezes)
- ✅ Console logs informativos

### 📱 Responsividade
- ✅ Mobile (< 768px)
- ✅ Tablet (768px - 1024px)
- ✅ Desktop (> 1024px)

### 🎨 Seções
1. **Header/Navbar** - Logo Bauá + Links
2. **Hero** - Apresentação com CTAs
3. **Sobre** - 3 cards explicativos
4. **Recursos** - 6 features principais
5. **Tecnologias** - Stack tecnológico
6. **CTA** - Call-to-action
7. **Footer** - Créditos

## 🖼️ Sobre o Logo

O logo SVG criado representa:
- 🦜 **Bauá:** Pássaro brasileiro conhecido pela inteligência
- 🎓 **Capelo:** Símbolo de educação e conhecimento
- 🎨 **Verde-Água:** Cor principal do projeto (#1ABC9C)

**Opcional:** Você pode substituir `baua-logo.svg` pela imagem PNG fornecida:
1. Salve a imagem como `baua-logo.png`
2. Coloque em `frontend/public/assets/`
3. Edite o HTML para usar `.png` ao invés de `.svg`

## 🛠️ Tecnologias

- **HTML5** - Estrutura semântica
- **CSS3** - Estilos com variáveis CSS, Grid, Flexbox
- **JavaScript (ES6+)** - Interatividade e animações
- **SVG** - Logo vetorial escalável

## 🐛 Sem Erros!

✅ Nenhuma dependência externa necessária  
✅ Nenhuma compilação necessária  
✅ Totalmente funcional offline  
✅ Compatível com todos navegadores modernos

## 🎯 Próximos Passos

- [ ] Adicionar formulários de login/cadastro
- [ ] Integrar com backend API REST
- [ ] Adicionar autenticação JWT
- [ ] Criar dashboard administrativo
- [ ] Migrar para React/Vue (opcional)

## 📸 Preview

Abra `index.html` no navegador para ver:
- Landing page completa
- Design verde-água
- Animações suaves
- Logo do Bauá
- Todas as seções funcionais

---

**Bauá - Ecossistema Educacional** 🎓  
**Desenvolvido com 💚 por Eduardo Tagliamento**
