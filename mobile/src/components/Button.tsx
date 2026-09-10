import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { fontFamily } from '../theme/tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  const { theme } = useAppTheme();

  const palette =
    variant === 'primary'
      ? { bg: theme.spDark, fg: theme.onSpDark, border: 'transparent' }
      : variant === 'danger'
      ? { bg: theme.card, fg: theme.danger, border: theme.danger }
      : { bg: theme.card, fg: theme.spDark, border: theme.borderStrong };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: variant === 'primary' ? 0 : theme.borderWidth,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fontFamily.bodyBold, fontSize: 14 },
});
