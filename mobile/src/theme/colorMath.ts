/**
 * Matemática de cor usada para derivar o tema final (claro/escuro × daltônico ×
 * alto contraste × cor da escola). Portado 1:1 da lógica equivalente no mockup
 * "Etapa Escola Mobile" (Claude Design, projeto "Bauá — Redesign Frontend
 * (TCC)") — mesmos nomes de função para manter os dois lados rastreáveis.
 */

export type RGB = [number, number, number];

/**
 * Garante o prefixo `#` — o backend às vezes devolve a cor da escola sem ele
 * (ex.: "475DFF"), e um `backgroundColor`/`color` sem "#" é um valor CSS
 * inválido no React Native: o estilo é silenciosamente ignorado e o
 * elemento fica transparente (bug real visto contra dados de produção).
 */
export function normalizarHex(hex: string): string {
  const limpo = hex.trim();
  if (!limpo) return limpo;
  return limpo.startsWith('#') ? limpo : `#${limpo}`;
}

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex(rgb: number[]): string {
  return (
    '#' +
    rgb
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Luminância relativa (WCAG), usada para decidir cor de texto/contraste. */
export function luminance(hex: string): number {
  const srgb = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t));
}

/** Cor de texto legível ("on-color") sobre um fundo `hex`. */
export function onColor(hex: string): string {
  return luminance(hex) > 0.45 ? '#0F1D17' : '#FFFFFF';
}

export function soft(hex: string, dark: boolean): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${dark ? 0.16 : 0.12})`;
}

/**
 * Ajusta uma cor na faixa verde-amarela (matiz 70–170°) para uma alternativa
 * mais segura no modo daltônico — verde e vermelho puros ficam ambíguos para
 * quem tem deuteranopia/protanopia; substitui por um tom âmbar/laranja.
 */
export function daltonSafe(hex: string, dark: boolean): string {
  const [r, g, b] = hexToRgb(hex);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  if (d < 24) return hex;
  let h = 0;
  if (mx === r) h = 60 * (((g - b) / d) % 6);
  else if (mx === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  if (h < 0) h += 360;
  return h >= 70 && h <= 170 ? (dark ? '#F0B54A' : '#D9880A') : hex;
}
