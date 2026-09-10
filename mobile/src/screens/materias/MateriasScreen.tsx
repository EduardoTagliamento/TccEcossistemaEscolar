import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ImageBackground, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { ErroConexao } from '../../components/ErroConexao';
import { ehErroDeRede } from '../../utils/erroRede';
import { useAppTheme } from '../../context/ThemeContext';
import { useEscola } from '../../context/EscolaContext';
import { useAuth } from '../../context/AuthContext';
import { listarMaterias } from '../../api/materia.api';
import { listarMateriasDoAluno, listarMateriasComCapaProfessor } from '../../api/materiasmodulo.api';
import { fontFamily } from '../../theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

/** Shape unificado — as 3 fontes reais (aluno/professor/genérica) devolvem
 * campos ligeiramente diferentes, mas todas têm isso. */
interface MateriaCard {
  MateriaGUID: string;
  MateriaNome: string;
  ImagemUrl: string | null;
  CorFundo: string | null;
}

export function MateriasScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useAppTheme();
  const { escola, funcao } = useEscola();
  const { usuario } = useAuth();
  const [materias, setMaterias] = useState<MateriaCard[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [semConexao, setSemConexao] = useState(false);

  const carregar = useCallback(async () => {
    if (!escola || !usuario) return;
    setCarregando(true);
    setSemConexao(false);
    try {
      // A capa (ImagemUrl/CorFundo) só existe nos endpoints "com capa" —
      // dedicados por papel (aluno vê a capa que o professor customizou por
      // turma; professor vê a capa que ele mesmo definiu). O CRUD genérico
      // de materia.api.ts não tem esses campos.
      if (funcao === 'Professor') {
        const resp = await listarMateriasComCapaProfessor(escola.EscolaGUID);
        setMaterias(resp.map((m) => ({ MateriaGUID: m.MateriaGUID, MateriaNome: m.MateriaNome, ImagemUrl: m.ImagemUrl, CorFundo: m.CorFundo })));
      } else if (funcao === 'Aluno') {
        const resp = await listarMateriasDoAluno(usuario.UsuarioGUID, escola.EscolaGUID);
        setMaterias(resp.map((m) => ({ MateriaGUID: m.MateriaGUID, MateriaNome: m.MateriaNome, ImagemUrl: m.ImagemUrl, CorFundo: m.CorFundo })));
      } else {
        // Direção/Coordenação/Secretaria: visão administrativa, sem capa por turma.
        const resp = await listarMaterias({ EscolaGUID: escola.EscolaGUID, MateriaStatus: 'Ativa' });
        setMaterias(resp.map((m) => ({ MateriaGUID: m.MateriaGUID, MateriaNome: m.MateriaNome, ImagemUrl: null, CorFundo: null })));
      }
    } catch (error) {
      console.warn('Erro ao listar matérias:', error);
      if (ehErroDeRede(error)) setSemConexao(true);
    } finally {
      setCarregando(false);
    }
  }, [escola?.EscolaGUID, usuario?.UsuarioGUID, funcao]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo ? materias.filter((m) => m.MateriaNome.toLowerCase().includes(termo)) : materias;
  }, [materias, busca]);

  return (
    <>
      <Header titulo="Matérias" showBack />
      <Screen refreshing={carregando} onRefresh={carregar}>
        {semConexao && <ErroConexao onTentarNovamente={carregar} />}
        <TextField placeholder="Buscar matéria..." value={busca} onChangeText={setBusca} />
        <View style={styles.grid}>
          {filtradas.map((materia, i) => {
            const corFundo = materia.CorFundo || (i % 2 === 0 ? theme.spDark : theme.ssDark);
            const corTexto = materia.ImagemUrl ? '#FFFFFF' : i % 2 === 0 ? theme.onSpDark : theme.onSsDark;
            return (
              <Pressable
                key={materia.MateriaGUID}
                style={[styles.card, { borderColor: theme.border, borderWidth: theme.borderWidth, backgroundColor: theme.card }]}
                onPress={() => navigation.navigate('MateriaDetalhe', { materiaGUID: materia.MateriaGUID, materiaNome: materia.MateriaNome })}
              >
                <ImageBackground
                  source={materia.ImagemUrl ? { uri: materia.ImagemUrl } : undefined}
                  style={[styles.cardHead, { backgroundColor: corFundo }]}
                  imageStyle={styles.cardImage}
                >
                  {/* véu escuro leve sobre a imagem — garante legibilidade do
                      nome independente da foto que o professor escolheu */}
                  {materia.ImagemUrl && <View style={styles.cardVeil} />}
                  <Text style={[styles.cardHeadText, { color: corTexto }]} numberOfLines={3}>
                    {materia.MateriaNome}
                  </Text>
                </ImageBackground>
              </Pressable>
            );
          })}
        </View>
        {filtradas.length === 0 && !carregando && (
          <Text style={{ color: theme.faint, textAlign: 'center', fontFamily: fontFamily.body, padding: 20 }}>
            Nenhuma matéria encontrada.
          </Text>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', borderRadius: 14, overflow: 'hidden' },
  cardHead: { minHeight: 78, padding: 12, alignItems: 'center', justifyContent: 'center' },
  cardImage: { resizeMode: 'cover' },
  cardVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,29,23,0.38)' },
  cardHeadText: { fontFamily: fontFamily.heading, fontSize: 12.5, textAlign: 'center', lineHeight: 16 },
});
