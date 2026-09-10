/**
 * Tela de seleção de escola — replica `frontend/app/selecionar-escola/
 * page.tsx` + `AuthGreenShell` (fundo verde cheio, cartão branco central
 * com a lista de escolas). Só aparece quando o usuário tem vínculo ativo
 * em mais de uma escola.
 */
import React from 'react';
import { View, Text, Pressable, Image, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEscola } from '../../context/EscolaContext';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/icons';
import { fontFamily } from '../../theme/tokens';
import type { EscolaComFuncoes } from '../../api/escola.api';

const COLORS = {
  ink900: '#0F1D17',
  slate500: '#647268',
  slate400: '#8A968E',
  line200: '#E2EAE5',
  green500: '#17C077',
  green700: '#0E7D4E',
  danger500: '#E5484D',
};

function corTexto(hex: string): string {
  const limpo = hex.replace('#', '');
  const r = parseInt(limpo.slice(0, 2), 16);
  const g = parseInt(limpo.slice(2, 4), 16);
  const b = parseInt(limpo.slice(4, 6), 16);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? COLORS.ink900 : '#FFFFFF';
}

export function SelecionarEscolaScreen() {
  const { opcoes, selecionarEscola } = useEscola();
  const { usuario, logout } = useAuth();

  function confirmarSaida() {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <SafeAreaView style={styles.shell}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scroll}>
        <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <Image source={require('../../../assets/baua-passaro.png')} style={styles.brandImage} resizeMode="contain" />
            <Text style={styles.wordmark}>bauá</Text>
          </View>
          <View style={styles.userChip}>
            {!!usuario?.UsuarioNome && <Text style={styles.userName}>{usuario.UsuarioNome}</Text>}
            <Pressable onPress={confirmarSaida} style={styles.logoutLink}>
              <Icon name="log-out" size={14} color={COLORS.slate500} />
              <Text style={styles.logoutText}>Sair</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.title}>Suas escolas</Text>
        <Text style={styles.subtitle}>Escolha uma escola para continuar.</Text>

        <View style={{ gap: 12 }}>
          {opcoes.map((item: EscolaComFuncoes) => {
            const cor1 = item.escola.EscolaCor1 || COLORS.green500;
            const inicial = (item.escola.EscolaNome || '?').charAt(0).toUpperCase();
            const papel = item.funcoes[0]?.FuncaoNome;

            return (
              <Pressable
                key={item.escola.EscolaGUID}
                style={styles.escolaCard}
                onPress={() => selecionarEscola(item.escola.EscolaGUID)}
              >
                {item.escola.EscolaIcone ? (
                  <Image source={{ uri: `data:image/png;base64,${item.escola.EscolaIcone}` }} style={styles.escolaLogoImg} />
                ) : (
                  <View style={[styles.escolaAvatar, { backgroundColor: cor1 }]}>
                    <Text style={[styles.escolaAvatarText, { color: corTexto(cor1) }]}>{inicial}</Text>
                  </View>
                )}
                <View style={styles.escolaInfo}>
                  <Text style={styles.escolaName} numberOfLines={1}>
                    {item.escola.EscolaNome}
                  </Text>
                  {!!papel && <Text style={styles.escolaRole}>{papel}</Text>}
                </View>
                <Icon name="chevron-right" size={18} color={COLORS.slate400} />
              </Pressable>
            );
          })}
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: COLORS.green700,
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#0F1D17',
    shadowOpacity: 0.3,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
    elevation: 6,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandImage: { width: 22, height: 22 },
  wordmark: { fontFamily: fontFamily.logo, fontSize: 15, color: '#0F1D17' },
  userChip: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userName: { fontSize: 12, color: COLORS.slate500, fontFamily: fontFamily.bodySemiBold },
  logoutLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logoutText: { fontSize: 12, color: COLORS.slate500, fontFamily: fontFamily.body },
  title: { fontFamily: fontFamily.headingExtraBold, fontSize: 21, color: COLORS.ink900, marginTop: 8, marginBottom: 4 },
  subtitle: { fontFamily: fontFamily.body, fontSize: 14, color: COLORS.slate500, marginBottom: 18 },
  escolaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.line200,
    borderRadius: 14,
    padding: 15,
  },
  escolaAvatar: { width: 44, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  escolaAvatarText: { fontFamily: fontFamily.headingExtraBold, fontSize: 17 },
  escolaLogoImg: { width: 44, height: 44, borderRadius: 11 },
  escolaInfo: { flex: 1, minWidth: 0, gap: 2 },
  escolaName: { fontFamily: fontFamily.bodyBold, fontSize: 14.5, color: COLORS.ink900 },
  escolaRole: { fontFamily: fontFamily.body, fontSize: 12.5, color: COLORS.slate500 },
});
