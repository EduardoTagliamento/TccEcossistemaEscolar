# Padrão: cor da escola vs. cores fixas de sinalização

**Data:** 2026-07-31
**Contexto:** investigação de por que a cor escolhida pela escola (tela de Configurações → "Identidade da Escola") não aparecia em boa parte do dashboard, e por que o verde-água do Bauá aparecia em lugares que pareciam não fazer sentido.

## Mecanismo técnico (já existia, funciona)

`DashboardNavbar.tsx` busca a escola uma vez (montada no `layout.tsx` do dashboard) e seta 4 CSS custom properties direto no `<html>`:

- `--color-primary` ← `EscolaCorPriEs` (Primária Escura)
- `--color-secondary` ← `EscolaCorPriCl` (Primária Clara)
- `--color-tertiary` ← `EscolaCorSecEs` (Secundária Escura)
- `--color-accent` ← `EscolaCorSecCl` (Secundária Clara)

Isso sobrescreve os defaults Bauá declarados em `frontend/styles/globals.css` (`:root`). Qualquer CSS Module que referencie `var(--color-primary, var(--green-500))` (fallback pro verde Bauá quando a variável não está setada, ex. fora do dashboard) automaticamente reflete a cor da escola.

## Decisão: onde aplicar a cor da escola

**Regra:** cor da escola é só para cenários **estéticos/de marca** — elementos que identificam visualmente "isto é desta escola". Botões e indicadores cuja cor **sinaliza um significado** (ação, estado) ficam **fixos**, independente da cor escolhida pela escola.

### Usa a cor da escola (`var(--color-primary, ...)`)
- Navegação: item de menu ativo/hover na navbar, abas ativas, chips de filtro/seleção
- Avatares e ícones de marca (fallback do logo, avatar do usuário, ícone de matéria)
- Bordas de destaque/hover genéricas (card, input em foco)
- Badges que não representam status (ex. "Compartilhada")
- Gradientes decorativos (ex. avatar de matéria)

### Fica fixo (verde/vermelho/dourado/azul — não a cor da escola)
- **Botões de ação com significado**: Salvar, Criar, Cadastrar, Adicionar, Confirmar, Concluir, Convidar, Solicitar, Transferir, Entrar, Importar — a cor sinaliza "ação positiva/segura", igual Cancelar (cinza/neutro) e Excluir (vermelho/perigo). Se a escola escolhe vermelho como cor de marca, um botão "Salvar" nessa cor pareceria um botão de exclusão.
- **Indicadores de status**: badges/bordas tipo Feito, Aberto, Ativo, Realizado, Pendente vs. Atrasada — fazem parte de um sistema de cores (verde=ok, vermelho=atrasado/urgente, dourado=rascunho/aviso) que precisa de contraste fixo entre si pra continuar legível, não pode virar tudo a mesma cor.
- **Ícones de sucesso/erro semânticos** (ex. "✓ Você não tem tarefas pendentes!")
- Wordmark "bauá" no rodapé "powered by bauá" — é a marca do próprio Bauá, não da escola
- Telas de login/cadastro/landing — antes de entrar em qualquer escola, não há tenant ainda

## Como aplicar em CSS novo

```css
/* Elemento decorativo/marca — segue a escola, cai pro verde Bauá fora do dashboard */
.itemAtivo {
  color: var(--color-primary, var(--green-500));
}

/* Botão de ação com significado — sempre fixo */
.botaoSalvar {
  background: var(--green-500);
}
```

Não envolver `--green-600`/`--green-700` (variantes de hover/texto) em `var(--color-primary, ...)` sem also revisar o token irmão na mesma regra (ex. `.diaChipAtivo` tem bg+border+text — só vale trocar todos juntos pra não ficar com cores desencontradas; tokens de "tint" leve tipo `--green-50` geralmente ficam fixos mesmo quando o token principal vira `--color-primary`, porque não há como computar um tint de uma cor arbitrária só em CSS).

## Onde já foi aplicado

Varredura feita em 2026-07-31 nos módulos: `cadastro`, `cadastro-evento`, `cadastro-pendencia`, `calendario`, `tarefas`, `pendencias`, `projetos`, `gestao-dados`, `materias`, `perfil`, `_components/DashboardNavbar`. Ver histórico de commits/diffs desses `*.module.css` pra exemplos concretos de cada categoria acima.
