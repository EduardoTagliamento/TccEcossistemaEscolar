import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, ImageBackground, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { ErroConexao } from '../../components/ErroConexao';
import { ehErroDeRede } from '../../utils/erroRede';
import { useAppTheme } from '../../context/ThemeContext';
import { useEscola } from '../../context/EscolaContext';
import { useAuth } from '../../context/AuthContext';
import { listarMaterias } from '../../api/materia.api';
import { listarMateriasDoAluno, listarMateriasComCapaProfessor } from '../../api/materiasmodulo.api';
import { listarTarefas, type TarefaListItem } from '../../api/tarefaacademica.api';
import { listarAvisos, type Aviso } from '../../api/aviso.api';
import { corStatusTarefa } from '../../utils/tarefaStatus';
import { dataPorExtenso, formatarDiaMes, primeiroNome, saudacao } from '../../utils/date';
import { fontFamily } from '../../theme/tokens';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

type Nav = BottomTabNavigationProp<MainTabParamList> & NativeStackNavigationProp<RootStackParamList>;

/** Shape unificado — aluno/professor/genérico devolvem campos diferentes,
 * mas todos têm isso (ver MateriasScreen, mesmo padrão). */
interface MateriaCard {
  MateriaGUID: string;
  MateriaNome: string;
  ImagemUrl: string | null;
  CorFundo: string | null;
}

export function InicioScreen() {
  const navigation = useNavigation<Nav>();
  const { theme } = useAppTheme();
  const { escola, funcao } = useEscola();
  const { usuario } = useAuth();

  const [materias, setMaterias] = useState<MateriaCard[]>([]);
  const [tarefas, setTarefas] = useState<TarefaListItem[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [semConexao, setSemConexao] = useState(false);

  const carregar = useCallback(async () => {
    if (!escola || !usuario) return;
    setCarregando(true);
    setSemConexao(false);
    // Cada chamada é isolada — `/api/aviso` (GET) é restrito a Direção/
    // Coordenação/Secretaria (é a visão de quem AUTORA avisos, não um feed
    // de avisos recebidos), então falha com 403 pra Aluno/Professor. Isso
    // não pode derrubar matérias/tarefas junto (Promise.all faria isso).
    const materiasPromise: Promise<MateriaCard[]> =
      funcao === 'Professor'
        ? listarMateriasComCapaProfessor(escola.EscolaGUID).then((r) =>
            r.map((m) => ({ MateriaGUID: m.MateriaGUID, MateriaNome: m.MateriaNome, ImagemUrl: m.ImagemUrl, CorFundo: m.CorFundo }))
          )
        : funcao === 'Aluno'
        ? listarMateriasDoAluno(usuario.UsuarioGUID, escola.EscolaGUID).then((r) =>
            r.map((m) => ({ MateriaGUID: m.MateriaGUID, MateriaNome: m.MateriaNome, ImagemUrl: m.ImagemUrl, CorFundo: m.CorFundo }))
          )
        : listarMaterias({ EscolaGUID: escola.EscolaGUID, MateriaStatus: 'Ativa' }).then((r) =>
            r.map((m) => ({ MateriaGUID: m.MateriaGUID, MateriaNome: m.MateriaNome, ImagemUrl: null, CorFundo: null }))
          );

    const [respMaterias, respTarefas, respAvisos] = await Promise.allSettled([
      materiasPromise,
      listarTarefas({ EscolaGUID: escola.EscolaGUID }),
      listarAvisos(escola.EscolaGUID),
    ]);

    // Matérias e tarefas são as duas chamadas que TODO papel deveria
    // conseguir acessar — se as duas falharem por rede (não por permissão,
    // como avisos), é sinal forte de "sem internet", não de erro pontual.
    if (ehErroDeRede(respMaterias.status === 'rejected' ? respMaterias.reason : null) && ehErroDeRede(respTarefas.status === 'rejected' ? respTarefas.reason : null)) {
      setSemConexao(true);
    }

    if (respMaterias.status === 'fulfilled') {
      setMaterias(respMaterias.value);
    } else {
      console.warn('Erro ao carregar matérias:', respMaterias.reason);
    }

    if (respTarefas.status === 'fulfilled') {
      // "A vencer" é só o que ainda vai vencer — exclui Concluída/Rascunho
      // E também Atrasada (aqui é outra seção, não essa) e qualquer prazo
      // que já passou, mesmo que o Status não tenha vindo como 'Atrasada'.
      const agora = Date.now();
      setTarefas(
        respTarefas.value
          .filter((t) => t.Status !== 'Concluida' && t.Status !== 'Atrasada' && new Date(t.TarefaPrazoData).getTime() >= agora)
          .sort((a, b) => new Date(a.TarefaPrazoData).getTime() - new Date(b.TarefaPrazoData).getTime())
      );
    } else {
      console.warn('Erro ao carregar tarefas:', respTarefas.reason);
    }

    if (respAvisos.status === 'fulfilled') {
      setAvisos(respAvisos.value.slice(0, 4));
    } else {
      // Esperado para Aluno/Professor — não é um erro real, só não tem acesso.
      setAvisos([]);
    }

    setCarregando(false);
  }, [escola?.EscolaGUID, usuario?.UsuarioGUID, funcao]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const tarefasAVencer = tarefas.length;
  const tarefasExibidas = tarefas.slice(0, 3);
  const tarefasAVencerTexto = `${tarefasAVencer} ${tarefasAVencer === 1 ? 'tarefa' : 'tarefas'}`;

  return (
    <>
      <Header titulo={escola?.EscolaNome ?? 'Ecossistema Escolar'} />
      <Screen refreshing={carregando} onRefresh={carregar}>
        {semConexao && <ErroConexao onTentarNovamente={carregar} />}
        <View style={[styles.hero, { backgroundColor: theme.heroBg, borderColor: theme.heroBorder, borderWidth: theme.borderWidth }]}>
          <Text style={[styles.heroDate, { color: theme.onHero }]}>{dataPorExtenso().toUpperCase()}</Text>
          <Text style={[styles.heroTitle, { color: theme.onHero }]}>
            {saudacao()}, {primeiroNome(usuario?.UsuarioNome)} 👋
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.onHero }]}>Resumo do que precisa da sua atenção hoje.</Text>
          <View style={styles.heroTags}>
            <View style={[styles.heroTag, { backgroundColor: theme.spDark }]}>
              <Text style={[styles.heroTagText, { color: theme.onSpDark }]}>{tarefasAVencerTexto}</Text>
            </View>
            <View style={[styles.heroTag, { backgroundColor: theme.ssLight }]}>
              <Text style={[styles.heroTagText, { color: theme.onSsLight }]}>{avisos.length} avisos</Text>
            </View>
          </View>
        </View>

        <View>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Minhas Matérias</Text>
            <Pressable onPress={() => navigation.navigate('Materias')}>
              <Text style={[styles.link, { color: theme.spDark }]}>Ver todas</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {materias.map((materia, i) => {
              const corFundo = materia.CorFundo || (i % 2 === 0 ? theme.spDark : theme.ssDark);
              const corTexto = materia.ImagemUrl ? '#FFFFFF' : i % 2 === 0 ? theme.onSpDark : theme.onSsDark;
              return (
                <Pressable
                  key={materia.MateriaGUID}
                  style={[styles.materiaCard, { borderColor: theme.border, borderWidth: theme.borderWidth, backgroundColor: theme.card }]}
                  onPress={() => navigation.navigate('MateriaDetalhe', { materiaGUID: materia.MateriaGUID, materiaNome: materia.MateriaNome })}
                >
                  <ImageBackground
                    source={materia.ImagemUrl ? { uri: materia.ImagemUrl } : undefined}
                    style={[styles.materiaHead, { backgroundColor: corFundo }]}
                    imageStyle={styles.materiaImage}
                  >
                    {materia.ImagemUrl && <View style={styles.materiaVeil} />}
                    <Text style={[styles.materiaHeadText, { color: corTexto }]} numberOfLines={2}>
                      {materia.MateriaNome}
                    </Text>
                  </ImageBackground>
                </Pressable>
              );
            })}
            {materias.length === 0 && !carregando && (
              <Text style={{ color: theme.faint, fontFamily: fontFamily.body, fontSize: 12 }}>Nenhuma matéria ainda.</Text>
            )}
          </ScrollView>
        </View>

        <Card>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Tarefas a vencer</Text>
          <View style={{ gap: 9 }}>
            {tarefasExibidas.map((tarefa) => {
              const cor = corStatusTarefa(tarefa.Status, theme);
              return (
                <View key={tarefa.TarefaGUID} style={[styles.tarefaRow, { backgroundColor: theme.card2, borderLeftColor: cor.rail }]}>
                  <Text style={[styles.tarefaTitulo, { color: theme.text }]} numberOfLines={1}>
                    {tarefa.TarefaTitulo}
                  </Text>
                  <Text style={[styles.tarefaSub, { color: theme.muted }]}>{tarefa.MateriaNome ?? ''}</Text>
                  <Text style={[styles.tarefaPrazo, { color: cor.rail }]}>Prazo {formatarDiaMes(tarefa.TarefaPrazoData)}</Text>
                </View>
              );
            })}
            {tarefas.length === 0 && !carregando && (
              <Text style={{ color: theme.faint, fontFamily: fontFamily.body, fontSize: 12 }}>Nenhuma tarefa pendente 🎉</Text>
            )}
          </View>
        </Card>

        <Card>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Avisos gerais</Text>
          <View style={{ gap: 10 }}>
            {avisos.map((aviso) => (
              <View key={aviso.AvisoGUID} style={styles.avisoRow}>
                <Text style={[styles.avisoTexto, { color: theme.text }]} numberOfLines={1}>
                  {aviso.AvisoTitulo}
                </Text>
                <Text style={[styles.avisoData, { color: theme.faint }]}>{formatarDiaMes(aviso.AvisoCreatedAt)}</Text>
              </View>
            ))}
            {avisos.length === 0 && !carregando && (
              <Text style={{ color: theme.faint, fontFamily: fontFamily.body, fontSize: 12 }}>Nenhum aviso recente.</Text>
            )}
          </View>
        </Card>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 20, padding: 18 },
  heroDate: { fontSize: 10, fontFamily: fontFamily.bodyBold, letterSpacing: 1, opacity: 0.75 },
  heroTitle: { fontSize: 20, fontFamily: fontFamily.headingExtraBold, marginTop: 6, marginBottom: 4 },
  heroSubtitle: { fontSize: 12.5, fontFamily: fontFamily.body, opacity: 0.82 },
  heroTags: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  heroTag: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 12 },
  heroTagText: { fontFamily: fontFamily.bodySemiBold, fontSize: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontFamily: fontFamily.heading, fontSize: 15 },
  link: { fontFamily: fontFamily.bodyBold, fontSize: 12.5 },
  materiaCard: { width: 130, borderRadius: 14, overflow: 'hidden' },
  materiaHead: { minHeight: 62, padding: 12, justifyContent: 'flex-end' },
  materiaImage: { resizeMode: 'cover' },
  materiaVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,29,23,0.38)' },
  materiaHeadText: { fontFamily: fontFamily.heading, fontSize: 12.5, lineHeight: 16 },
  cardTitle: { fontFamily: fontFamily.heading, fontSize: 14, marginBottom: 12 },
  tarefaRow: { padding: 10, borderRadius: 12, borderLeftWidth: 3, gap: 2 },
  tarefaTitulo: { fontFamily: fontFamily.bodySemiBold, fontSize: 12.5 },
  tarefaSub: { fontSize: 11, fontFamily: fontFamily.body },
  tarefaPrazo: { fontSize: 10.5, fontFamily: fontFamily.bodyBold },
  avisoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  avisoTexto: { flex: 1, fontSize: 12.5, fontFamily: fontFamily.body },
  avisoData: { fontSize: 11 },
});
