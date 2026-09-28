import localFont from 'next/font/local';

/**
 * Tipografia da marca Bauá (Poppins/Figtree/Baloo 2/JetBrains Mono),
 * self-hosted via next/font/local em vez de next/font/google.
 *
 * Motivo: next/font/google busca os arquivos de fonte do Google Fonts
 * DURANTE o build — em pelo menos duas ocasiões (27 e 28/09/2026) o build
 * na Railway falhou porque o container não conseguiu alcançar
 * fonts.gstatic.com (erro "Cannot read properties of null (reading '1')"
 * no loader do next/font/google, sintoma de resposta vazia/malformada).
 * Arquivos .woff2 baixados uma vez e versionados em public/fonts/ (script:
 * scripts/baixar-fontes.py) removem essa dependência de rede do build.
 *
 * Centralizado aqui (em vez de cada página chamar seu próprio Poppins({...}))
 * porque next/font/local resolve `path` relativo ao arquivo que chama —
 * duplicar a declaração em 11 páginas exigiria calcular um `../` diferente
 * por profundidade de pasta; um módulo único evita esse cálculo repetido.
 */

export const poppins = localFont({
  src: [
    { path: '../public/fonts/poppins-400.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/poppins-500.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/poppins-600.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/poppins-700.woff2', weight: '700', style: 'normal' },
    { path: '../public/fonts/poppins-800.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
});

export const figtree = localFont({
  src: [
    { path: '../public/fonts/figtree-400.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/figtree-500.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/figtree-600.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/figtree-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
});

export const baloo2 = localFont({
  src: [
    { path: '../public/fonts/baloo2-600.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/baloo2-700.woff2', weight: '700', style: 'normal' },
    { path: '../public/fonts/baloo2-800.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-wordmark',
  display: 'swap',
});

export const jetbrainsMono = localFont({
  src: [
    { path: '../public/fonts/jetbrains-mono-400.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/jetbrains-mono-500.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/jetbrains-mono-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-mono',
  display: 'swap',
});
