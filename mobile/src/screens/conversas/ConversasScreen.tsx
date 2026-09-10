import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { useAppTheme } from '../../context/ThemeContext';
import { useEscola } from '../../context/EscolaContext';
import { listarConversas, type ConversaListItem } from '../../api/conversa.api';
import { fontFamily } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return partes.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

function tituloConversa(item: ConversaListItem): string {
  if (item.ConversaTipo === 'Individual') return item.ParceiroNome ?? 'Conversa';
  return item.ConversaGrupoNome ?? 'Grupo';
}

function previewMensagem(item: ConversaListItem): string {
  const ultima = item.UltimaMensagem;
  if (!ultima) return 'Sem mensagens ainda';
  if (ultima.MensagemTipo === 'Imagem') return '📷 Imagem';
  if (ultima.MensagemTipo === 'Arquivo') return '📎 Arquivo';
  return ultima.MensagemConteudo;
}

function horaResumida(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}

export function ConversasScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useAppTheme();
  const { escola } = useEscola();
  const [conversas, setConversas] = useState<ConversaListItem[]>([]);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    if (!escola) return;
    setCarregando(true);
    try {
      setConversas(await listarConversas(escola.EscolaGUID));
    } catch (error) {
      console.warn('Erro ao listar conversas:', error);
    } finally {
      setCarregando(false);
    }
  }, [escola?.EscolaGUID]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  return (
    <>
      <Header titulo="Conversas" showBack />
      {/* scroll=false + gap simples aqui — NÃO usar flex:1 neste wrapper: dentro
          do content de Screen (que se ajusta ao próprio conteúdo, sem altura
          fixa), um filho com flex:1 cria referência circular no Yoga e a
          lista inteira colapsa para altura zero (bug real, achado nesta
          tela — confirmado isolando até um <Text> plano). */}
      <Screen scroll={false}>
        <View style={{ gap: 4 }}>
          {conversas.map((item) => {
            const titulo = tituloConversa(item);
            return (
              <Pressable
                key={item.ConversaGUID}
                style={styles.row}
                onPress={() => navigation.navigate('Chat', { conversaGUID: item.ConversaGUID, titulo })}
              >
                <View style={[styles.avatar, { backgroundColor: theme.spLight }]}>
                  <Text style={[styles.avatarText, { color: theme.spDark }]}>{iniciais(titulo)}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={[styles.nome, { color: theme.text }]} numberOfLines={1}>
                    {titulo}
                  </Text>
                  <Text style={[styles.preview, { color: theme.muted }]} numberOfLines={1}>
                    {previewMensagem(item)}
                  </Text>
                </View>
                <View style={styles.meta}>
                  {item.UltimaMensagem && (
                    <Text style={[styles.hora, { color: theme.faint }]}>{horaResumida(item.UltimaMensagem.MensagemCreatedAt)}</Text>
                  )}
                  {item.NaoLidas > 0 && (
                    <View style={[styles.badge, { backgroundColor: theme.spDark }]}>
                      <Text style={[styles.badgeText, { color: theme.onSpDark }]}>{item.NaoLidas}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
          {conversas.length === 0 && !carregando && (
            <Text style={{ color: theme.faint, textAlign: 'center', padding: 20, fontFamily: fontFamily.body }}>
              Nenhuma conversa ainda.
            </Text>
          )}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16 },
  avatar: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fontFamily.bodyBold, fontSize: 14 },
  info: { flex: 1, minWidth: 0 },
  nome: { fontFamily: fontFamily.bodyBold, fontSize: 13.5 },
  preview: { fontFamily: fontFamily.body, fontSize: 12, marginTop: 2 },
  meta: { alignItems: 'flex-end', gap: 4 },
  hora: { fontSize: 10.5 },
  badge: { minWidth: 18, height: 18, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 10, fontFamily: fontFamily.bodyBold },
});
