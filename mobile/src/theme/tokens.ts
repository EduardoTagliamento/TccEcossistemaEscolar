/**
 * Tokens de marca portados de
 * `_ds/bau-design-system-689c269f-be3b-4445-98c6-69b779c38839/tokens/colors.css`
 * e `tokens/fonts.css` (projeto "Bauá — Redesign Frontend (TCC)" no Claude
 * Design). São os valores fixos da marca — o tema final (light/dark ×
 * daltônico × alto contraste × cor da escola) é montado em `theme.ts` a
 * partir destes tokens.
 */

export const brand = {
  green50: '#E7F9F0',
  green100: '#C5F0DC',
  green200: '#97E6C2',
  green300: '#5FD8A2',
  green400: '#2ECC8B',
  green500: '#17C077', // primário
  green600: '#12A063',
  green700: '#0E7D4E',
  green800: '#0B6440',
  green900: '#0A4E33',

  blue50: '#EAF0FE',
  blue100: '#CBDAFB',
  blue400: '#5B7DF0',
  blue500: '#2F5BEA', // accent
  blue600: '#244AC9',
  blue700: '#1C3AA0',

  gold50: '#FFF7E0',
  gold100: '#FFEBB0',
  gold400: '#FFD24D',
  gold500: '#FFC02E', // accent
  gold600: '#E0A200',
};

/** Neutros claros/escuros, com e sem alto contraste. */
export function neutrals(dark: boolean, alto: boolean) {
  let n = dark
    ? {
        canvas: '#0D1411',
        card: '#15201B',
        card2: '#1C2823',
        text: '#E7EFEA',
        muted: '#9DB0A6',
        faint: '#6C7E74',
        border: '#26332C',
        borderStrong: '#3A4A41',
      }
    : {
        canvas: '#F5F9F6',
        card: '#FFFFFF',
        card2: '#F0F5F2',
        text: '#0F1D17',
        muted: '#647268',
        faint: '#8A968E',
        border: '#E2EAE5',
        borderStrong: '#B7C1BA',
      };
  if (alto) {
    n = dark
      ? {
          canvas: '#000000',
          card: '#0B0B0B',
          card2: '#1C1C1C',
          text: '#FFFFFF',
          muted: '#F0F0F0',
          faint: '#D2D2D2',
          border: '#FFFFFF',
          borderStrong: '#FFFFFF',
        }
      : {
          canvas: '#FFFFFF',
          card: '#FFFFFF',
          card2: '#E6E6E6',
          text: '#000000',
          muted: '#141414',
          faint: '#2A2A2A',
          border: '#000000',
          borderStrong: '#000000',
        };
  }
  return n;
}

/** Cores semânticas (sucesso/perigo/aviso), com variantes daltônico-seguras. */
export function semantic(dark: boolean, dalton: boolean, alto: boolean) {
  if (dalton) {
    return {
      success: alto ? (dark ? '#7FB3FF' : '#0033CC') : dark ? '#4BA3E0' : '#0072B2',
      danger: alto ? (dark ? '#FF9E5C' : '#B24000') : dark ? '#F0842A' : '#D55E00',
      warn: alto ? (dark ? '#FFD24D' : '#7A5200') : dark ? '#F0B54A' : '#E69F00',
    };
  }
  return {
    success: alto ? (dark ? '#59E39C' : '#006E2E') : dark ? '#3DD598' : '#0E7D4E',
    danger: alto ? (dark ? '#FF8A8D' : '#A80007') : dark ? '#FF6B6F' : '#E5484D',
    warn: alto ? (dark ? '#FFC24D' : '#8A4B00') : dark ? '#F5B84D' : '#F5A524',
  };
}

/** Fontes Google carregadas via @expo-google-fonts/* — nomes usados no app. */
export const fontFamily = {
  heading: 'Poppins_700Bold',
  headingExtraBold: 'Poppins_800ExtraBold',
  headingMedium: 'Poppins_600SemiBold',
  logo: 'Baloo2_700Bold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemiBold: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
};
