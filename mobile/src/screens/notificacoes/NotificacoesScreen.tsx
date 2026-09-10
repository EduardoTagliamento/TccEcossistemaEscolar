import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Icon } from '../../components/icons';
import { useAppTheme } from '../../context/ThemeContext';
import { useEscola } from '../../context/EscolaContext';
import { useNotificacoesNaoLidas } from '../../hooks/useNotificacoesNaoLidas';
import { listarNotificacoes, marcarComoLida, marcarTodasComoLidas, type Notificacao } from '../../api/notificacao.api';
import { fontFamily } from '../../theme/tokens';

function tempoRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `${horas}h`;
  return `${Math.floor(horas / 24)}d`;
}

export function NotificacoesScreen() {
  const { theme } = useAppTheme();
  const { escola } = useEscola();
  const { recarregar } = useNotificacoesNaoLidas();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    if (!escola) return;
    setCarregando(true);
    try {
      setNotificacoes(await listarNotificacoes({ EscolaGUID: escola.EscolaGUID, limit: 50 }));
    } catch (error) {
      console.warn('Erro ao listar notificações:', error);
    } finally {
      setCarregando(false);
    }
  }, [escola?.EscolaGUID]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  async function marcarTodas() {
    if (!escola) return;
    await marcarTodasComoLidas(escola.EscolaGUID);
    await carregar();
    await recarregar();
  }

  async function abrir(notificacao: Notificacao) {
    if (!notificacao.NotificacaoLida) {
      await marcarComoLida(notificacao.NotificacaoGUID);
      setNotificacoes((atual) =>
        atual.map((n) => (n.NotificacaoGUID === notificacao.NotificacaoGUID ? { ...n, NotificacaoLida: true } : n))
      );
      recarregar();
    }
  }

  return (
    <>
      <Header titulo="Notificações" showBack />
      <Screen refreshing={carregando} onRefresh={carregar}>
        <Pressable onPress={marcarTodas} style={{ alignSelf: 'flex-end' }}>
          <Text style={{ color: theme.spDark, fontFamily: fontFamily.bodyBold, fontSize: 12.5 }}>Marcar todas como lidas</Text>
        </Pressable>
        {notificacoes.map((n) => (
          <Pressable
            key={n.NotificacaoGUID}
            onPress={() => abrir(n)}
            style={[
              styles.row,
              {
                backgroundColor: n.NotificacaoLida ? theme.card : theme.spLight,
                borderColor: theme.border,
                borderWidth: theme.borderWidth,
              },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: theme.spDark }]}>
              <Icon name="bell" size={16} color={theme.onSpDark} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.titleRow}>
                <Text style={[styles.titulo, { color: theme.text }]} numberOfLines={1}>
                  {n.NotificacaoTitulo}
                </Text>
                {!n.NotificacaoLida && <View style={[styles.dot, { backgroundColor: theme.spDark }]} />}
              </View>
              {n.NotificacaoConteudo && (
                <Text style={[styles.conteudo, { color: theme.muted }]} numberOfLines={2}>
                  {n.NotificacaoConteudo}
                </Text>
              )}
              <Text style={[styles.hora, { color: theme.faint }]}>{tempoRelativo(n.NotificacaoCreatedAt)}</Text>
            </View>
          </Pressable>
        ))}
        {notificacoes.length === 0 && !carregando && (
          <Text style={{ color: theme.faint, textAlign: 'center', padding: 20, fontFamily: fontFamily.body }}>
            Nenhuma notificação por aqui.
          </Text>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 11, padding: 13, borderRadius: 14 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titulo: { flex: 1, fontFamily: fontFamily.bodyBold, fontSize: 12.5 },
  dot: { width: 7, height: 7, borderRadius: 999 },
  conteudo: { fontSize: 11.5, fontFamily: fontFamily.body, lineHeight: 16, marginTop: 2 },
  hora: { fontSize: 10, marginTop: 2 },
});
