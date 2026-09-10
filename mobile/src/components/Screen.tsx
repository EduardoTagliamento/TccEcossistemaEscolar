import React from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
}

/** Casca padrão de tela: fundo `canvas` do tema + padding consistente com o mockup. */
export function Screen({ children, scroll = true, refreshing, onRefresh, contentStyle }: ScreenProps) {
  const { theme } = useAppTheme();

  if (!scroll) {
    return (
      <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: theme.canvas }]}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: theme.canvas }]}>
      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 13, paddingBottom: 32, gap: 13 },
});
