import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Cartão padrão (fundo `card`, borda, cantos arredondados, sombra do tema). */
export function Card({ children, style }: CardProps) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth: theme.borderWidth,
          borderRadius: 16,
          padding: 16,
          ...theme.shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
