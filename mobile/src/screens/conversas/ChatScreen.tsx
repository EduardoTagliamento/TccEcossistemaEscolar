import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { Icon } from '../../components/icons';
import { useAppTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import {
  buscarConversa,
  deletarMensagem,
  EMOJIS_REACAO_PERMITIDOS,
  type Mensagem,
  type ReacaoAtualizada,
} from '../../api/conversa.api';
import { fontFamily } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

export function ChatScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const { conversaGUID, titulo } = route.params;
  const { theme } = useAppTheme();
  const { socket } = useSocket();
  const { usuario } = useAuth();

  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [draft, setDraft] = useState('');
  const [digitando, setDigitando] = useState<string | null>(null);
  const [pickerPara, setPickerPara] = useState<string | null>(null);
  const listRef = useRef<FlatList<Mensagem>>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const detalhe = await buscarConversa(conversaGUID);
        setMensagens(detalhe.Mensagens);
      } catch (error) {
        console.warn('Erro ao carregar conversa:', error);
      }
    })();
  }, [conversaGUID]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join_conversa', { ConversaGUID: conversaGUID });
    socket.emit('mark_as_read', { ConversaGUID: conversaGUID });

    const onNovaMensagem = (msg: Mensagem) => {
      if (msg.ConversaGUID !== conversaGUID) return;
      setMensagens((atual) => [...atual, msg]);
    };
    const onMensagemEditada = (msg: Mensagem) => {
      if (msg.ConversaGUID !== conversaGUID) return;
      setMensagens((atual) => atual.map((m) => (m.MensagemGUID === msg.MensagemGUID ? msg : m)));
    };
    const onMensagemDeletada = ({ MensagemGUID }: { ConversaGUID: string; MensagemGUID: string }) => {
      setMensagens((atual) =>
        atual.map((m) => (m.MensagemGUID === MensagemGUID ? { ...m, MensagemDeletedAt: new Date().toISOString() } : m))
      );
    };
    const onReacaoAtualizada = (dados: ReacaoAtualizada) => {
      if (dados.ConversaGUID !== conversaGUID) return;
      setMensagens((atual) => atual.map((m) => (m.MensagemGUID === dados.MensagemGUID ? { ...m, Reacoes: dados.Reacoes } : m)));
    };
    const onDigitando = ({ ConversaGUID: cg, UsuarioNome, isTyping }: { ConversaGUID: string; UsuarioNome: string; isTyping: boolean }) => {
      if (cg !== conversaGUID) return;
      setDigitando(isTyping ? UsuarioNome : null);
    };

    socket.on('nova_mensagem', onNovaMensagem);
    socket.on('mensagem_editada', onMensagemEditada);
    socket.on('mensagem_deletada', onMensagemDeletada);
    socket.on('reacao_atualizada', onReacaoAtualizada);
    socket.on('usuario_digitando', onDigitando);

    return () => {
      socket.off('nova_mensagem', onNovaMensagem);
      socket.off('mensagem_editada', onMensagemEditada);
      socket.off('mensagem_deletada', onMensagemDeletada);
      socket.off('reacao_atualizada', onReacaoAtualizada);
      socket.off('usuario_digitando', onDigitando);
    };
  }, [socket, conversaGUID]);

  const enviar = useCallback(() => {
    const texto = draft.trim();
    if (!texto || !socket) return;
    socket.emit('send_mensagem', { ConversaGUID: conversaGUID, MensagemConteudo: texto, MensagemTipo: 'Texto' });
    setDraft('');
    socket.emit('typing', { ConversaGUID: conversaGUID, isTyping: false });
  }, [draft, socket, conversaGUID]);

  function aoDigitar(texto: string) {
    setDraft(texto);
    if (!socket) return;
    socket.emit('typing', { ConversaGUID: conversaGUID, isTyping: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit('typing', { ConversaGUID: conversaGUID, isTyping: false }), 1500);
  }

  async function reagir(mensagemGUID: string, emoji: string) {
    socket?.emit('reagir_mensagem', { ConversaGUID: conversaGUID, MensagemGUID: mensagemGUID, ReacaoEmoji: emoji });
    setPickerPara(null);
  }

  async function apagar(mensagemGUID: string) {
    try {
      await deletarMensagem(conversaGUID, mensagemGUID);
    } catch (error) {
      console.warn('Erro ao apagar mensagem:', error);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header titulo={titulo} subtitulo={digitando ? `${digitando} digitando...` : undefined} showBack showLogo={false} />
      <FlatList
        ref={listRef}
        data={mensagens}
        keyExtractor={(m) => m.MensagemGUID}
        style={{ backgroundColor: theme.card2 }}
        contentContainerStyle={{ padding: 13, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const minha = item.MensagemRemetenteGUID === usuario?.UsuarioGUID;
          const apagada = !!item.MensagemDeletedAt;
          return (
            <View style={{ alignItems: minha ? 'flex-end' : 'flex-start' }}>
              <Pressable
                onLongPress={() => !apagada && setPickerPara(pickerPara === item.MensagemGUID ? null : item.MensagemGUID)}
                style={[
                  styles.bubble,
                  {
                    backgroundColor: minha ? theme.spDark : theme.card,
                    borderTopRightRadius: minha ? 4 : 14,
                    borderTopLeftRadius: minha ? 14 : 4,
                  },
                ]}
              >
                <Text style={{ color: minha ? theme.onSpDark : theme.text, fontSize: 13, fontFamily: fontFamily.body, fontStyle: apagada ? 'italic' : 'normal' }}>
                  {apagada ? 'Mensagem apagada' : item.MensagemConteudo}
                </Text>
                <Text style={{ color: minha ? theme.onSpDark : theme.faint, fontSize: 9.5, opacity: 0.75, marginTop: 3, alignSelf: 'flex-end' }}>
                  {new Date(item.MensagemCreatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {item.MensagemEditadaAt ? ' · editada' : ''}
                </Text>
              </Pressable>

              {!!item.Reacoes?.length && (
                <View style={styles.reactionsRow}>
                  {item.Reacoes.map((r) => (
                    <View key={r.Emoji} style={[styles.reactionChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={{ fontSize: 11 }}>
                        {r.Emoji} {r.Quantidade}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {pickerPara === item.MensagemGUID && (
                <View style={[styles.picker, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  {EMOJIS_REACAO_PERMITIDOS.map((emoji) => (
                    <Pressable key={emoji} onPress={() => reagir(item.MensagemGUID, emoji)} style={{ padding: 4 }}>
                      <Text style={{ fontSize: 18 }}>{emoji}</Text>
                    </Pressable>
                  ))}
                  {minha && (
                    <Pressable onPress={() => apagar(item.MensagemGUID)} style={{ padding: 4 }}>
                      <Text style={{ fontSize: 12, color: theme.danger, fontFamily: fontFamily.bodyBold }}>Apagar</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />
      <View style={[styles.composer, { backgroundColor: theme.card, borderTopColor: theme.border, borderTopWidth: theme.borderWidth }]}>
        <TextInput
          value={draft}
          onChangeText={aoDigitar}
          placeholder="Mensagem..."
          placeholderTextColor={theme.faint}
          style={[styles.input, { borderColor: theme.borderStrong, borderWidth: theme.borderWidth, color: theme.text }]}
          multiline
        />
        <Pressable onPress={enviar} style={[styles.sendBtn, { backgroundColor: theme.spDark }]}>
          <Icon name="send" size={17} color={theme.onSpDark} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '82%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  reactionsRow: { flexDirection: 'row', gap: 4, marginTop: 3 },
  reactionChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  picker: { flexDirection: 'row', gap: 6, borderRadius: 12, borderWidth: 1, padding: 6, marginTop: 4, alignItems: 'center' },
  composer: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', padding: 11 },
  input: { flex: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, fontFamily: fontFamily.body, fontSize: 13, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
