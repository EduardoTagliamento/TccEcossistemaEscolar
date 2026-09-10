import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontFamily } from '../theme/tokens';

interface PillProps {
  label: string;
  bg: string;
  fg: string;
}

export function Pill({ label, bg, fg }: PillProps) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontFamily: fontFamily.bodyBold },
});
