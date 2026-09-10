import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, Linking, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Icon } from '../../components/icons';
import { useAppTheme } from '../../context/ThemeContext';
import { useEscola } from '../../context/EscolaContext';
import { listarCategorias, type CategoriaConteudo } from '../../api/categoriaconteudo.api';
import { listarConteudos, type Conteudo, type ConteudoTipo } from '../../api/conteudo.api';
import { listarProvas, type ProvaAgendada } from '../../api/provaagendada.api';
import { listarTarefas, type TarefaListItem } from '../../api/tarefaacademica.api';
import { corStatusTarefa } from '../../utils/tarefaStatus';
import { formatarDiaMes } from '../../utils/date';
import { fontFamily } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

type FiltroTipo = 'tudo' | 'conteudo' | 'prova' | 'tarefa';
type ItemSelecionado = { tipo: 'conteudo'; dados: Conteudo } | { tipo: 'prova'; dados: ProvaAgendada } | { tipo: 'tarefa'; dados: TarefaListItem };

const CONTEUDO_LABEL: Record<ConteudoTipo, string> = {
  cronometrado: 'Vídeo/Áudio',
  texto: 'Texto',
  paginado: 'Arquivo',
};

/** Remove tags HTML de forma simples (sem lib de parser) só pra exibir um
 * preview legível do texto — o HTML completo com formatação fica pra uma
 * próxima leva, se precisar. */
function textoSemHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export function MateriaDetalheScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'MateriaDetalhe'>>();
  const { materiaGUID, materiaNome } = route.params;
  const { theme } = useAppTheme();
  const { escola } = useEscola();

  const [categorias, setCategorias] = useState<CategoriaConteudo[]>([]);
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [provas, setProvas] = useState<ProvaAgendada[]>([]);
  const [tarefas, setTarefas] = useState<TarefaListItem[]>([]);
  const [filtro, setFiltro] = useState<FiltroTipo>('tudo');
  const [carregando, setCarregando] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<ItemSelecionado | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [respCategorias, respConteudos, respProvas, respTarefas] = await Promise.all([
        listarCategorias({ MateriaGUID: materiaGUID }),
        listarConteudos({ MateriaGUID: materiaGUID }),
        listarProvas({ MateriaGUID: materiaGUID }),
        escola ? listarTarefas({ EscolaGUID: escola.EscolaGUID }) : Promise.resolve([]),
      ]);
      setCategorias(respCategorias);
      setConteudos(respConteudos);
      setProvas(respProvas);
      setTarefas(respTarefas.filter((t) => t.MateriaGUID === materiaGUID));
    } catch (error) {
      console.warn('Erro ao carregar matéria:', error);
    } finally {
      setCarregando(false);
    }
  }, [materiaGUID, escola?.EscolaGUID]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const conteudosPorCategoria = useMemo(() => {
    const mapa = new Map<string | null, Conteudo[]>();
    for (const c of conteudos) {
      const chave = c.CategoriaGUID;
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(c);
    }
    return mapa;
  }, [conteudos]);

  // Categorias reais + um grupo "Sem categoria" pros conteúdos com
  // CategoriaGUID nulo — sem isso, esses itens nunca apareciam (o loop de
  // renderização só percorria `categorias`, nunca a chave `null` do mapa).
  const gruposDeConteudo = useMemo(() => {
    const grupos = categorias.map((cat) => ({ guid: cat.CategoriaGUID, nome: cat.CategoriaNome, itens: conteudosPorCategoria.get(cat.CategoriaGUID) ?? [] }));
    const semCategoria = conteudosPorCategoria.get(null) ?? [];
    if (semCategoria.length > 0) {
      grupos.push({ guid: 'sem-categoria', nome: 'Sem categoria', itens: semCategoria });
    }
    return grupos.filter((g) => g.itens.length > 0);
  }, [categorias, conteudosPorCategoria]);

  const mostrarConteudos = filtro === 'tudo' || filtro === 'conteudo';
  const mostrarProvas = filtro === 'tudo' || filtro === 'prova';
  const mostrarTarefas = filtro === 'tudo' || filtro === 'tarefa';

  const filtros: { id: FiltroTipo; label: string }[] = [
    { id: 'tudo', label: 'Tudo' },
    { id: 'conteudo', label: 'Conteúdos' },
    { id: 'prova', label: 'Provas' },
    { id: 'tarefa', label: 'Tarefas' },
  ];

  return (
    <>
      <Header titulo={materiaNome} showBack />
      <Screen refreshing={carregando} onRefresh={carregar}>
        <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
          {filtros.map((f) => {
            const ativo = filtro === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFiltro(f.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: ativo ? theme.spDark : theme.card,
                    borderColor: ativo ? 'transparent' : theme.border,
                    borderWidth: ativo ? 0 : theme.borderWidth,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: ativo ? theme.onSpDark : theme.text }]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {mostrarConteudos &&
          gruposDeConteudo.map((grupo) => {
            return (
              <Card key={grupo.guid} style={{ padding: 0, overflow: 'hidden' }}>
                <View style={[styles.categoriaHead, { backgroundColor: theme.card2 }]}>
                  <Text style={[styles.categoriaNome, { color: theme.text }]}>{grupo.nome}</Text>
                  <Text style={[styles.categoriaCount, { color: theme.faint }]}>{grupo.itens.length} itens</Text>
                </View>
                <View style={{ padding: 12, gap: 8 }}>
                  {grupo.itens.map((item) => (
                    <Pressable
                      key={item.ConteudoGUID}
                      onPress={() => setItemSelecionado({ tipo: 'conteudo', dados: item })}
                      style={[styles.itemRow, { borderColor: theme.border, borderWidth: theme.borderWidth }]}
                    >
                      <View style={styles.itemTextWrap}>
                        <Text style={[styles.itemTitulo, { color: theme.text }]} numberOfLines={1}>
                          {item.ConteudoTitulo}
                        </Text>
                        <Text style={[styles.itemSub, { color: theme.muted }]}>{CONTEUDO_LABEL[item.ConteudoTipo]}</Text>
                      </View>
                      <Icon name="chevron-right" size={16} color={theme.faint} />
                    </Pressable>
                  ))}
                </View>
              </Card>
            );
          })}

        {mostrarProvas && provas.length > 0 && (
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Provas</Text>
            <View style={{ gap: 8 }}>
              {provas.map((prova) => (
                <Pressable
                  key={prova.ProvaAgendadaGUID}
                  onPress={() => setItemSelecionado({ tipo: 'prova', dados: prova })}
                  style={[styles.itemRow, { borderColor: theme.border, borderWidth: theme.borderWidth }]}
                >
                  <View style={styles.itemTextWrap}>
                    <Text style={[styles.itemTitulo, { color: theme.text }]} numberOfLines={1}>
                      {prova.ProvaTitulo}
                    </Text>
                    <Text style={[styles.itemSub, { color: theme.muted }]}>{formatarDiaMes(prova.ProvaData)}</Text>
                  </View>
                  <Text style={[styles.itemStatus, { color: prova.ProvaStatus === 'Realizada' ? theme.success : theme.spDark }]}>
                    {prova.ProvaStatus}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        )}

        {mostrarTarefas && tarefas.length > 0 && (
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Tarefas</Text>
            <View style={{ gap: 8 }}>
              {tarefas.map((tarefa) => {
                const cor = corStatusTarefa(tarefa.Status, theme);
                return (
                  <Pressable
                    key={tarefa.TarefaGUID}
                    onPress={() => setItemSelecionado({ tipo: 'tarefa', dados: tarefa })}
                    style={[styles.itemRow, { borderColor: theme.border, borderWidth: theme.borderWidth }]}
                  >
                    <View style={styles.itemTextWrap}>
                      <Text style={[styles.itemTitulo, { color: theme.text }]} numberOfLines={1}>
                        {tarefa.TarefaTitulo}
                      </Text>
                      <Text style={[styles.itemSub, { color: theme.muted }]}>Prazo {formatarDiaMes(tarefa.TarefaPrazoData)}</Text>
                    </View>
                    <Text style={[styles.itemStatus, { color: cor.fg }]}>{cor.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        )}

        {!carregando && conteudos.length === 0 && provas.length === 0 && tarefas.length === 0 && (
          <Text style={{ color: theme.faint, textAlign: 'center', padding: 20, fontFamily: fontFamily.body }}>
            Nenhum item publicado nesta matéria ainda.
          </Text>
        )}
      </Screen>

      <Modal visible={!!itemSelecionado} transparent animationType="fade" onRequestClose={() => setItemSelecionado(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setItemSelecionado(null)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
              <View style={styles.modalHead}>
                <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={2}>
                  {itemSelecionado?.tipo === 'conteudo'
                    ? itemSelecionado.dados.ConteudoTitulo
                    : itemSelecionado?.tipo === 'prova'
                    ? itemSelecionado.dados.ProvaTitulo
                    : itemSelecionado?.tipo === 'tarefa'
                    ? itemSelecionado.dados.TarefaTitulo
                    : ''}
                </Text>
                <Pressable onPress={() => setItemSelecionado(null)} style={[styles.closeBtn, { borderColor: theme.border, borderWidth: theme.borderWidth }]}>
                  <Text style={{ color: theme.text, fontSize: 15 }}>×</Text>
                </Pressable>
              </View>

              {itemSelecionado?.tipo === 'conteudo' && (
                <ConteudoDetalhe conteudo={itemSelecionado.dados} theme={theme} />
              )}
              {itemSelecionado?.tipo === 'prova' && <ProvaDetalhe prova={itemSelecionado.dados} theme={theme} />}
              {itemSelecionado?.tipo === 'tarefa' && <TarefaDetalhe tarefa={itemSelecionado.dados} theme={theme} />}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function ConteudoDetalhe({ conteudo, theme }: { conteudo: Conteudo; theme: ReturnType<typeof useAppTheme>['theme'] }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={[styles.modalLabel, { color: theme.faint }]}>{CONTEUDO_LABEL[conteudo.ConteudoTipo]}</Text>
      {!!conteudo.ConteudoDescricao && (
        <Text style={{ color: theme.text, fontFamily: fontFamily.body, fontSize: 13.5, lineHeight: 20 }}>{conteudo.ConteudoDescricao}</Text>
      )}
      {conteudo.Texto?.ConteudoHtml && (
        <Text style={{ color: theme.text, fontFamily: fontFamily.body, fontSize: 13.5, lineHeight: 20 }}>
          {textoSemHtml(conteudo.Texto.ConteudoHtml)}
        </Text>
      )}
      {conteudo.Cronometrado?.LinkUrl && (
        <Pressable
          onPress={() => Linking.openURL(conteudo.Cronometrado!.LinkUrl!)}
          style={[styles.linkBtn, { backgroundColor: theme.spDark }]}
        >
          <Icon name="send" size={15} color={theme.onSpDark} />
          <Text style={{ color: theme.onSpDark, fontFamily: fontFamily.bodyBold, fontSize: 13 }}>Abrir vídeo/áudio</Text>
        </Pressable>
      )}
      {conteudo.Cronometrado?.ArquivoUrl && (
        <Pressable
          onPress={() => Linking.openURL(conteudo.Cronometrado!.ArquivoUrl!)}
          style={[styles.linkBtn, { backgroundColor: theme.spDark }]}
        >
          <Icon name="send" size={15} color={theme.onSpDark} />
          <Text style={{ color: theme.onSpDark, fontFamily: fontFamily.bodyBold, fontSize: 13 }}>Abrir arquivo</Text>
        </Pressable>
      )}
      {conteudo.Paginado?.Arquivos?.map((arq, i) => (
        <Pressable
          key={arq.ConteudoPaginadoArquivoGUID}
          onPress={() => Linking.openURL(arq.ArquivoUrl)}
          style={[styles.linkBtn, { backgroundColor: theme.spDark }]}
        >
          <Icon name="send" size={15} color={theme.onSpDark} />
          <Text style={{ color: theme.onSpDark, fontFamily: fontFamily.bodyBold, fontSize: 13 }}>Abrir página {i + 1}</Text>
        </Pressable>
      ))}
      {!conteudo.ConteudoDescricao && !conteudo.Texto && !conteudo.Cronometrado && !conteudo.Paginado && (
        <Text style={{ color: theme.faint, fontFamily: fontFamily.body, fontSize: 12.5 }}>Sem descrição adicional.</Text>
      )}
    </View>
  );
}

function ProvaDetalhe({ prova, theme }: { prova: ProvaAgendada; theme: ReturnType<typeof useAppTheme>['theme'] }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Text style={[styles.modalLabel, { color: theme.spDark }]}>{prova.ProvaStatus}</Text>
        <Text style={[styles.modalLabel, { color: theme.faint }]}>{formatarDiaMes(prova.ProvaData)}</Text>
      </View>
      {!!prova.ProvaDescricao && (
        <Text style={{ color: theme.text, fontFamily: fontFamily.body, fontSize: 13.5, lineHeight: 20 }}>{prova.ProvaDescricao}</Text>
      )}
      {prova.TurmasAtribuidasDetalhe?.length > 0 && (
        <Text style={{ color: theme.muted, fontFamily: fontFamily.body, fontSize: 12 }}>
          Turmas: {prova.TurmasAtribuidasDetalhe.map((t) => t.TurmaNome).join(', ')}
        </Text>
      )}
    </View>
  );
}

function TarefaDetalhe({ tarefa, theme }: { tarefa: TarefaListItem; theme: ReturnType<typeof useAppTheme>['theme'] }) {
  const cor = corStatusTarefa(tarefa.Status, theme);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Text style={[styles.modalLabel, { color: cor.fg }]}>{cor.label}</Text>
        <Text style={[styles.modalLabel, { color: theme.faint }]}>Prazo {formatarDiaMes(tarefa.TarefaPrazoData)}</Text>
      </View>
      {!!tarefa.TarefaConteudo && (
        <Text style={{ color: theme.text, fontFamily: fontFamily.body, fontSize: 13.5, lineHeight: 20 }}>{tarefa.TarefaConteudo}</Text>
      )}
      {tarefa.AnexosDescricao?.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={[styles.modalLabel, { color: theme.faint }]}>Material de apoio</Text>
          {tarefa.AnexosDescricao.map((anexo) => (
            <Pressable
              key={anexo.AnexoGUID}
              onPress={() => Linking.openURL(anexo.AnexoCaminho)}
              style={[styles.linkBtn, { backgroundColor: theme.spDark }]}
            >
              <Icon name="attach" size={15} color={theme.onSpDark} />
              <Text style={{ color: theme.onSpDark, fontFamily: fontFamily.bodyBold, fontSize: 13 }} numberOfLines={1}>
                {anexo.AnexoNomeOriginal ?? 'Anexo'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999 },
  chipText: { fontFamily: fontFamily.bodyBold, fontSize: 12 },
  categoriaHead: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  categoriaNome: { fontFamily: fontFamily.heading, fontSize: 13 },
  categoriaCount: { fontSize: 10.5, fontFamily: fontFamily.bodyBold },
  sectionTitle: { fontFamily: fontFamily.heading, fontSize: 14, marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12 },
  itemTextWrap: { flex: 1, minWidth: 0 },
  itemTitulo: { fontFamily: fontFamily.bodySemiBold, fontSize: 12.5 },
  itemSub: { fontSize: 10.5, fontFamily: fontFamily.body, marginTop: 2 },
  itemStatus: { fontSize: 10, fontFamily: fontFamily.bodyBold },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,29,23,0.55)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '80%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  modalTitle: { flex: 1, fontFamily: fontFamily.headingExtraBold, fontSize: 18 },
  closeBtn: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  modalLabel: { fontSize: 11, fontFamily: fontFamily.bodyBold, textTransform: 'uppercase', letterSpacing: 0.4 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 11 },
});
