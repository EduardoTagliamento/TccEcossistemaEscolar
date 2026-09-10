/**
 * Header compartilhado por toda tela — replica o padrão do mockup "Etapa
 * Escola Mobile": voltar (opcional) / logo+título / sino de notificação com
 * badge / avatar → Perfil.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from './icons';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useEscola } from '../context/EscolaContext';
import { useNotificacoesNaoLidas } from '../hooks/useNotificacoesNaoLidas';
import { fontFamily } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

function iniciais(nome?: string): string {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  const primeiras = partes.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '');
  return primeiras.join('') || '?';
}

interface HeaderProps {
  titulo: string;
  subtitulo?: string;
  showBack?: boolean;
  showLogo?: boolean;
}

export function Header({ titulo, subtitulo, showBack = false, showLogo = true }: HeaderProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useAppTheme();
  const { usuario } = useAuth();
  const { escola } = useEscola();
  const { total } = useNotificacoesNaoLidas();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          borderBottomColor: theme.border,
          borderBottomWidth: theme.borderWidth,
          backgroundColor: theme.card,
          // A tela em si (Screen/SafeAreaView) só protege a área de baixo
          // (edges=['bottom']) — o header é quem fica colado no topo, então
          // precisa somar o próprio inset da status bar do aparelho aqui,
          // senão o título/avatar ficam por baixo do relógio/bateria do
          // sistema (bug real visto contra o notch do celular de teste).
          paddingTop: insets.top + 9,
        },
      ]}
    >
      {showBack && (
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { borderColor: theme.border, borderWidth: theme.borderWidth, backgroundColor: theme.card }]}
        >
          <Icon name="back" size={17} color={theme.spDark} />
        </Pressable>
      )}
      {showLogo && !showBack && (
        <View style={[styles.logo, { backgroundColor: theme.spDark }]}>
          <Text style={[styles.logoText, { color: theme.onSpDark }]}>{(escola?.EscolaNome ?? 'B')[0]}</Text>
        </View>
      )}
      <View style={styles.titleWrap}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text numberOfLines={1} style={[styles.subtitle, { color: theme.faint }]}>
            {subtitulo}
          </Text>
        ) : null}
      </View>
      <Pressable onPress={() => navigation.navigate('Notificacoes')} style={styles.iconBtn}>
        <Icon name="bell" size={18} color={theme.muted} />
        {total > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.danger, borderColor: theme.card }]}>
            <Text style={styles.badgeText}>{total > 9 ? '9+' : total}</Text>
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={() => navigation.navigate('Perfil')}
        style={[styles.avatar, { backgroundColor: theme.ssDark }]}
      >
        <Text style={[styles.avatarText, { color: theme.onSsDark }]}>{iniciais(usuario?.UsuarioNome)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontFamily: fontFamily.heading, fontSize: 16 },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { fontFamily: fontFamily.heading, fontSize: 14 },
  subtitle: { fontSize: 10, marginTop: 1 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 15,
    height: 15,
    borderRadius: 999,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeText: { color: '#fff', fontSize: 8, fontFamily: fontFamily.headingMedium },
  avatar: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fontFamily.bodyBold, fontSize: 12 },
});
