import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useEscola } from '../context/EscolaContext';
import { useAppTheme } from '../context/ThemeContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SelecionarEscolaScreen } from '../screens/auth/SelecionarEscolaScreen';
import { MainTabs } from './MainTabs';
import { MateriaDetalheScreen } from '../screens/materias/MateriaDetalheScreen';
import { ChatScreen } from '../screens/conversas/ChatScreen';
import { NotificacoesScreen } from '../screens/notificacoes/NotificacoesScreen';
import { PerfilScreen } from '../screens/perfil/PerfilScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { escola, precisaSelecionar, isLoading: escolaLoading } = useEscola();
  const { theme } = useAppTheme();

  const navTheme = {
    ...(theme.dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.dark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.canvas,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      primary: theme.spDark,
    },
  };

  if (authLoading || (isAuthenticated && escolaLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.canvas }}>
        <ActivityIndicator size="large" color={theme.spDark} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : precisaSelecionar ? (
          <Stack.Screen name="SelecionarEscola" component={SelecionarEscolaScreen} />
        ) : !escola ? (
          <Stack.Screen name="SelecionarEscola" component={SelecionarEscolaScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="MateriaDetalhe" component={MateriaDetalheScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Notificacoes" component={NotificacoesScreen} />
            <Stack.Screen name="Perfil" component={PerfilScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
