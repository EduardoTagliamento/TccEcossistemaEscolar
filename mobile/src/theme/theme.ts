/**
 * Monta o tema final combinando 3 eixos independentes do usuário — escuro
 * (`UsuarioTema`), daltônico (`UsuarioModoDaltonico`), alto contraste
 * (`UsuarioAltoContraste`) — com a cor real da escola atual
 * (`Escola.EscolaCorPriEs/PriCl/SecEs/SecCl`). Lógica portada do mockup
 * "Etapa Escola Mobile" (`theme()`/`neutrals()`/`semantic()`), adaptada para
 * usar a cor de escola vinda da API real em vez do `schoolsData` de demo.
 */
import { brand, neutrals, semantic } from './tokens';
import { daltonSafe, luminance, mix, onColor } from './colorMath';

export interface EscolaCores {
  primariaEscura: string;
  primariaClara: string;
  secundariaEscura: string;
  secundariaClara: string;
}

/** Fallback quando a escola ainda não tem cores próprias configuradas. */
export const CORES_ESCOLA_PADRAO: EscolaCores = {
  primariaEscura: brand.green500,
  primariaClara: brand.green50,
  secundariaEscura: brand.gold600,
  secundariaClara: brand.gold500,
};

export interface AppTheme {
  dark: boolean;
  dalton: boolean;
  altoContraste: boolean;
  canvas: string;
  card: string;
  card2: string;
  text: string;
  muted: string;
  faint: string;
  border: string;
  borderStrong: string;
  borderWidth: number;
  shadow: {
    shadowColor: string;
    shadowOpacity: number;
    shadowRadius: number;
    shadowOffset: { width: number; height: number };
    elevation: number;
  };
  spDark: string; // cor primária (dark) da escola — CTAs, ícones ativos
  onSpDark: string;
  spLight: string; // fundo suave da cor primária
  onSpLight: string;
  ssDark: string; // cor secundária (dark) da escola
  onSsDark: string;
  ssLight: string;
  onSsLight: string;
  heroBg: string;
  onHero: string;
  heroBorder: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warn: string;
}

export function buildTheme(
  escola: EscolaCores,
  opts: { dark: boolean; dalton: boolean; altoContraste: boolean }
): AppTheme {
  const { dark, dalton, altoContraste: alto } = opts;
  const n = neutrals(dark, alto);
  const sem = semantic(dark, dalton, alto);

  let pDark = escola.primariaEscura;
  if (dalton) {
    pDark = alto ? (dark ? '#7FB3FF' : '#1C3AA0') : dark ? '#5B7DF0' : '#2F6FED';
  } else {
    if (dark && luminance(pDark) < 0.2) pDark = mix(pDark, '#FFFFFF', alto ? 0.42 : 0.32);
    if (alto && !dark) pDark = luminance(escola.primariaEscura) > 0.4 ? mix(escola.primariaEscura, '#000000', 0.35) : escola.primariaEscura;
    if (alto && dark && luminance(pDark) < 0.42) pDark = mix(pDark, '#FFFFFF', 0.3);
    // A escola pode ter cadastrado uma cor "escura" que na prática é clara
    // (ex.: um pastel) — sem isso, o cartão de CTA/cabeçalho fica quase
    // invisível contra o fundo claro do app (bug real visto em produção).
    if (!dark && luminance(pDark) > 0.45) pDark = mix(pDark, '#000000', 0.5);
  }

  const pBase = dalton ? (dark ? '#2558C7' : '#2F6FED') : escola.primariaEscura;
  const heroBg = dark
    ? mix(pBase, n.canvas, alto ? 0.55 : 0.7)
    : alto
    ? n.card
    : dalton
    ? mix(pBase, '#FFFFFF', 0.86)
    : escola.primariaClara;
  const spLight = dark
    ? mix(pBase, n.canvas, alto ? 0.62 : 0.74)
    : dalton
    ? mix(pBase, '#FFFFFF', 0.88)
    : escola.primariaClara;
  let ssDark = dalton ? daltonSafe(escola.secundariaEscura, dark) : escola.secundariaEscura;
  if (!dark && !dalton && luminance(ssDark) > 0.45) ssDark = mix(ssDark, '#000000', 0.5);
  const ssLight = dalton ? daltonSafe(escola.secundariaClara, dark) : escola.secundariaClara;

  return {
    dark,
    dalton,
    altoContraste: alto,
    canvas: n.canvas,
    card: n.card,
    card2: n.card2,
    text: n.text,
    muted: n.muted,
    faint: n.faint,
    border: n.border,
    borderStrong: n.borderStrong,
    borderWidth: alto ? 2 : 1,
    shadow: alto
      ? { shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 }
      : {
          shadowColor: dark ? '#000000' : '#0F1D17',
          shadowOpacity: dark ? 0.45 : 0.08,
          shadowRadius: dark ? 10 : 3,
          shadowOffset: { width: 0, height: dark ? 2 : 1 },
          elevation: 2,
        },
    spDark: pDark,
    onSpDark: onColor(pDark),
    spLight,
    onSpLight: onColor(spLight),
    ssDark,
    onSsDark: onColor(ssDark),
    ssLight,
    onSsLight: onColor(ssLight),
    heroBg,
    onHero: onColor(heroBg),
    heroBorder: alto ? (dark ? '#FFFFFF' : '#000000') : 'transparent',
    success: sem.success,
    successSoft: mixAlpha(sem.success, dark),
    danger: sem.danger,
    dangerSoft: mixAlpha(sem.danger, dark),
    warn: sem.warn,
  };
}

function mixAlpha(hex: string, dark: boolean): string {
  const alpha = dark ? 0.16 : 0.12;
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
