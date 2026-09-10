import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from './icons';
import { useAppTheme } from '../context/ThemeContext';
import { fontFamily } from '../theme/tokens';

interface ErroConexaoProps {
  onTentarNovamente: () => void;
}

/** Banner mostrado quando uma tela não consegue nem alcançar o servidor
 * (sem internet, ou o servidor está fora do ar) — diferente de um erro de
 * permissão/negócio, que já vem com mensagem própria do backend. */
export function ErroConexao({ onTentarNovamente }: ErroConexaoProps) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}>
      <Icon name="alert" size={22} color={theme.danger} />
      <Text style={[styles.titulo, { color: theme.danger }]}>Sem conexão com a internet</Text>
      <Text style={[styles.texto, { color: theme.text }]}>
        Não foi possível carregar os dados. Verifique sua conexão e tente de novo.
      </Text>
      <Pressable onPress={onTentarNovamente} style={[styles.botao, { backgroundColor: theme.danger }]}>
        <Text style={styles.botaoTexto}>Tentar novamente</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1.5, padding: 18, alignItems: 'center', gap: 8 },
  titulo: { fontFamily: fontFamily.headingExtraBold, fontSize: 15 },
  texto: { fontFamily: fontFamily.body, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  botao: { marginTop: 4, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999 },
  botaoTexto: { color: '#fff', fontFamily: fontFamily.bodyBold, fontSize: 13 },
});
