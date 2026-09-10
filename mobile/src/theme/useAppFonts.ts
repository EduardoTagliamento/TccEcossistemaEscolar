/**
 * Carrega as fontes do design system (`tokens.fontFamily`) via
 * @expo-google-fonts/*. Chamado uma vez no boot (`App.tsx`) — a árvore só é
 * montada depois que `fontsLoaded` vira true.
 */
import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { Baloo2_700Bold } from '@expo-google-fonts/baloo-2';

export function useAppFonts() {
  return useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Baloo2_700Bold,
  });
}
