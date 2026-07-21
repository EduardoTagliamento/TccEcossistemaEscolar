/**
 * Aplicação de preferências visuais e de acessibilidade (tema
 * claro/escuro/sistema, modo daltônico, escala de fonte, redução de
 * movimento e alto contraste) no `<html>`, via atributos `data-*`.
 *
 * Persistência é 100% server-side, por conta (`UsuarioTema` /
 * `UsuarioModoDaltonico` / `UsuarioEscalaFonte` / `UsuarioReduzirMovimento` /
 * `UsuarioAltoContraste` em `backend/entities/usuario.model.ts`) — não usa
 * `localStorage`. Este módulo só cuida da aplicação client-side dos
 * atributos; quem decide o VALOR a aplicar é o `AuthContext` (usuário
 * autenticado) ou o script de boot em `frontend/app/layout.tsx` (fallback
 * de sistema pra antes do usuário carregar / rotas sem login).
 */

export type PreferenciaTema = 'light' | 'dark' | 'system';
export type EscalaFonte = 'small' | 'medium' | 'large';

const ATRIBUTO_TEMA = 'data-theme';
const ATRIBUTO_DALTONICO = 'data-daltonico';
const ATRIBUTO_ESCALA_FONTE = 'data-font-scale';
const ATRIBUTO_REDUZIR_MOVIMENTO = 'data-reduzir-movimento';
const ATRIBUTO_ALTO_CONTRASTE = 'data-alto-contraste';

let mediaQuery: MediaQueryList | null = null;
let listenerAtivo: ((evento: MediaQueryListEvent) => void) | null = null;

function pararDeOuvirSistema(): void {
  if (mediaQuery && listenerAtivo) {
    mediaQuery.removeEventListener('change', listenerAtivo);
  }
  mediaQuery = null;
  listenerAtivo = null;
}

function resolverTemaDoSistema(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Aplica a preferência de tema no elemento `<html>`. Quando a preferência é
 * `'system'`, resolve para o tema atual do sistema operacional
 * (`prefers-color-scheme`) e mantém um listener pra reagir em tempo real se
 * o usuário trocar o tema do SO enquanto 'system' estiver selecionado.
 */
export function aplicarTema(preferencia: PreferenciaTema): void {
  if (typeof document === 'undefined') return;

  pararDeOuvirSistema();

  if (preferencia === 'system') {
    document.documentElement.setAttribute(ATRIBUTO_TEMA, resolverTemaDoSistema());
    if (window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      listenerAtivo = (evento) => {
        document.documentElement.setAttribute(ATRIBUTO_TEMA, evento.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', listenerAtivo);
    }
    return;
  }

  document.documentElement.setAttribute(ATRIBUTO_TEMA, preferencia);
}

/** Ativa/desativa a paleta segura pra daltonismo (verde/vermelho -> azul/laranja nos estados semânticos). */
export function aplicarModoDaltonico(ativo: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute(ATRIBUTO_DALTONICO, ativo ? 'true' : 'false');
}

/**
 * Aplica a escala de fonte no `<html>` — `frontend/styles/globals.css`
 * mapeia o atributo pra um `font-size` maior/menor na raiz, o que escala
 * automaticamente todo conteúdo dimensionado em `rem` (a maioria dos
 * formulários/textos do dashboard). Conteúdo em `px` (comum em títulos
 * grandes/decorativos herdados do design system) não escala — limitação
 * conhecida, não coberta nesta rodada.
 */
export function aplicarEscalaFonte(escala: EscalaFonte): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute(ATRIBUTO_ESCALA_FONTE, escala);
}

/** Força redução de animações/transições em todo o app, independente do `prefers-reduced-motion` do SO. */
export function aplicarReduzirMovimento(ativo: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute(ATRIBUTO_REDUZIR_MOVIMENTO, ativo ? 'true' : 'false');
}

/** Ativa/desativa reforço de contraste (texto/bordas/indicador de foco) — ortogonal ao tema claro/escuro. */
export function aplicarAltoContraste(ativo: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute(ATRIBUTO_ALTO_CONTRASTE, ativo ? 'true' : 'false');
}
