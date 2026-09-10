import React from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { EscolaProvider } from './src/context/EscolaContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { SocketProvider } from './src/context/SocketContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppFonts } from './src/theme/useAppFonts';
import { brand } from './src/theme/tokens';

export default function App() {
  const [fontsLoaded] = useAppFonts();

  if (!fontsLoaded) {
    // Sem wordmark aqui — a fonte dele é uma das que ainda está carregando,
    // então mostraria com a fonte do sistema por um instante. Só o pássaro
    // (versão branca da logo real, pra contrastar com o fundo verde escuro).
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: brand.green900 }}>
        <Image source={require('./assets/baua-passaro-branco.png')} style={{ width: 68, height: 68 }} resizeMode="contain" />
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <EscolaProvider>
          <ThemeProvider>
            <SocketProvider>
              <RootNavigator />
              <StatusBar style="auto" />
            </SocketProvider>
          </ThemeProvider>
        </EscolaProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
