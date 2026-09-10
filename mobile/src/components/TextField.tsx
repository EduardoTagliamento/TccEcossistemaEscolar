import React from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { fontFamily } from '../theme/tokens';

interface TextFieldProps extends TextInputProps {
  label?: string;
}

export function TextField({ label, style, ...rest }: TextFieldProps) {
  const { theme } = useAppTheme();
  return (
    <View style={{ gap: 5 }}>
      {label ? <Text style={[styles.label, { color: theme.text }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.faint}
        style={[
          styles.input,
          {
            borderColor: theme.borderStrong,
            borderWidth: theme.borderWidth,
            color: theme.text,
            backgroundColor: theme.card,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fontFamily.bodyBold, fontSize: 12 },
  input: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 11,
    fontFamily: fontFamily.body,
    fontSize: 13,
  },
});
