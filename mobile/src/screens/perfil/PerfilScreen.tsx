import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useEscola } from '../../context/EscolaContext';
import { fontFamily } from '../../theme/tokens';

function iniciais(nome?: string): string {
  if (!nome) return '?';
  return (
    nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

export function PerfilScreen() {
  const { theme } = useAppTheme();
  const { usuario, logout } = useAuth();
  const { funcao } = useEscola();
  const { setTema, setDaltonico, setAltoContraste } = useAppTheme();

  const temaAtual = usuario?.UsuarioTema ?? 'system';
  const daltonicoAtivo = usuario?.UsuarioModoDaltonico ?? false;
  const altoContrasteAtivo = usuario?.UsuarioAltoContraste ?? false;

  function confirmarSaida() {
    Alert.alert('Sair da conta', 'Deseja mesmo sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout() },
    ]);
  }

  const opcoesTema: { id: 'light' | 'dark' | 'system'; label: string }[] = [
    { id: 'system', label: 'Automático (sistema)' },
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Escuro' },
  ];

  return (
    <>
      <Header titulo="Perfil" showBack />
      <Screen>
        <Card style={styles.userCard}>
          <View style={[styles.avatar, { backgroundColor: theme.spDark }]}>
            <Text style={[styles.avatarText, { color: theme.onSpDark }]}>{iniciais(usuario?.UsuarioNome)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.nome, { color: theme.text }]} numberOfLines={1}>
              {usuario?.UsuarioNome}
            </Text>
            <Text style={[styles.funcao, { color: theme.muted }]}>{funcao ?? ''}</Text>
          </View>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Acessibilidade e tema</Text>
          <Text style={[styles.sectionDesc, { color: theme.muted }]}>
            Tema, daltônico e alto contraste são independentes e combinam entre si.
          </Text>

          <Text style={[styles.groupLabel, { color: theme.faint }]}>TEMA</Text>
          <View style={{ gap: 6 }}>
            {opcoesTema.map((opcao) => {
              const ativo = temaAtual === opcao.id;
              return (
                <Pressable
                  key={opcao.id}
                  onPress={() => setTema(opcao.id)}
                  style={[
                    styles.optionRow,
                    { backgroundColor: ativo ? theme.spLight : theme.card2, borderColor: ativo ? theme.spDark : 'transparent' },
                  ]}
                >
                  <Text style={{ color: ativo ? theme.spDark : theme.text, fontFamily: fontFamily.bodySemiBold, fontSize: 12.5 }}>
                    {opcao.label}
                  </Text>
                  {ativo && <Text style={{ color: theme.spDark }}>✓</Text>}
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.groupLabel, { color: theme.faint, marginTop: 14 }]}>OUTRAS PREFERÊNCIAS</Text>
          <Pressable
            onPress={() => setDaltonico(!daltonicoAtivo)}
            style={[
              styles.optionRow,
              { backgroundColor: daltonicoAtivo ? theme.spLight : theme.card2, borderColor: daltonicoAtivo ? theme.spDark : 'transparent' },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontFamily: fontFamily.bodySemiBold, fontSize: 12.5 }}>Modo daltônico</Text>
              <Text style={{ color: theme.muted, fontSize: 10.5, marginTop: 2 }}>Ajusta cores de status para melhor distinção.</Text>
            </View>
            {daltonicoAtivo && <Text style={{ color: theme.spDark }}>✓</Text>}
          </Pressable>
          <Pressable
            onPress={() => setAltoContraste(!altoContrasteAtivo)}
            style={[
              styles.optionRow,
              { backgroundColor: altoContrasteAtivo ? theme.spLight : theme.card2, borderColor: altoContrasteAtivo ? theme.spDark : 'transparent' },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontFamily: fontFamily.bodySemiBold, fontSize: 12.5 }}>Alto contraste</Text>
              <Text style={{ color: theme.muted, fontSize: 10.5, marginTop: 2 }}>Aumenta contraste de bordas e texto.</Text>
            </View>
            {altoContrasteAtivo && <Text style={{ color: theme.spDark }}>✓</Text>}
          </Pressable>
        </Card>

        <Button label="Sair da conta" variant="danger" onPress={confirmarSaida} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fontFamily.headingExtraBold, fontSize: 20 },
  nome: { fontFamily: fontFamily.heading, fontSize: 15 },
  funcao: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontFamily: fontFamily.heading, fontSize: 14, marginBottom: 4 },
  sectionDesc: { fontSize: 11.5, lineHeight: 16, marginBottom: 14 },
  groupLabel: { fontSize: 10.5, fontFamily: fontFamily.bodyBold, letterSpacing: 0.5, marginBottom: 6 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5 },
});
