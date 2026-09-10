import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { ErroConexao } from '../../components/ErroConexao';
import { ehErroDeRede } from '../../utils/erroRede';
import { useAppTheme } from '../../context/ThemeContext';
import { useEscola } from '../../context/EscolaContext';
import { listarTarefas, type TarefaListItem } from '../../api/tarefaacademica.api';
import { corStatusTarefa } from '../../utils/tarefaStatus';
import { formatarDiaMes } from '../../utils/date';
import { Icon } from '../../components/icons';
import { fontFamily } from '../../theme/tokens';

export function TarefasScreen() {
  const { theme } = useAppTheme();
  const { escola } = useEscola();
  const [tarefas, setTarefas] = useState<TarefaListItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [semConexao, setSemConexao] = useState(false);

  const carregar = useCallback(async () => {
    if (!escola) return;
    setCarregando(true);
    setSemConexao(false);
    try {
      const lista = await listarTarefas({ EscolaGUID: escola.EscolaGUID });
      setTarefas(lista.sort((a, b) => new Date(a.TarefaPrazoData).getTime() - new Date(b.TarefaPrazoData).getTime()));
    } catch (error) {
      console.warn('Erro ao listar tarefas:', error);
      if (ehErroDeRede(error)) setSemConexao(true);
    } finally {
      setCarregando(false);
    }
  }, [escola?.EscolaGUID]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const stats = useMemo(() => {
    const total = tarefas.length;
    const concluidas = tarefas.filter((t) => t.Status === 'Concluida').length;
    const atrasadas = tarefas.filter((t) => t.Status === 'Atrasada').length;
    // "A vencer" é o complemento — cobre 'Pendente' e qualquer status
    // ausente/desconhecido, em vez de exigir o literal exato (a API pode
    // não mandar o campo em todo cenário; a badge já cai no mesmo padrão
    // em corStatusTarefa()).
    const aVencer = total - concluidas - atrasadas;
    return [
      { icon: 'book' as const, value: total, label: 'Total', bg: theme.spLight, fg: theme.spDark },
      { icon: 'calendar' as const, value: aVencer, label: 'A vencer', bg: theme.ssLight, fg: theme.ssDark },
      { icon: 'list' as const, value: concluidas, label: 'Concluídas', bg: theme.successSoft, fg: theme.success },
      { icon: 'alert' as const, value: atrasadas, label: 'Atrasadas', bg: theme.dangerSoft, fg: theme.danger },
    ];
  }, [tarefas, theme]);

  return (
    <>
      <Header titulo="Tarefas" showBack />
      <Screen refreshing={carregando} onRefresh={carregar}>
        {semConexao && <ErroConexao onTentarNovamente={carregar} />}
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.statCard, { borderColor: theme.border, borderWidth: theme.borderWidth, backgroundColor: theme.card }]}>
              <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                <Icon name={s.icon} size={17} color={s.fg} />
              </View>
              <View>
                <Text style={[styles.statValue, { color: theme.text }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: theme.muted }]}>{s.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {tarefas.map((tarefa) => {
          const cor = corStatusTarefa(tarefa.Status, theme);
          return (
            <View
              key={tarefa.TarefaGUID}
              style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: theme.borderWidth, borderLeftColor: cor.rail }]}
            >
              <View style={styles.itemHead}>
                <Text style={[styles.itemTitulo, { color: theme.text }]} numberOfLines={1}>
                  {tarefa.TarefaTitulo}
                </Text>
                <View style={[styles.badge, { backgroundColor: cor.bg }]}>
                  <Text style={[styles.badgeText, { color: cor.fg }]}>{cor.label}</Text>
                </View>
              </View>
              <Text style={[styles.itemSub, { color: theme.muted }]}>
                {tarefa.MateriaNome ?? ''} {tarefa.TurmaNome ? `· Turma ${tarefa.TurmaNome}` : ''}
              </Text>
              <Text style={[styles.itemPrazo, { color: theme.faint }]}>Prazo {formatarDiaMes(tarefa.TarefaPrazoData)}</Text>
            </View>
          );
        })}
        {tarefas.length === 0 && !carregando && (
          <Text style={{ color: theme.faint, textAlign: 'center', padding: 20, fontFamily: fontFamily.body }}>
            Nenhuma tarefa por aqui.
          </Text>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  statCard: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  statIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: fontFamily.headingExtraBold, fontSize: 16 },
  statLabel: { fontSize: 10.5, fontFamily: fontFamily.body },
  item: { borderRadius: 14, borderLeftWidth: 3, padding: 13, gap: 4 },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  itemTitulo: { flex: 1, fontFamily: fontFamily.heading, fontSize: 13.5 },
  itemSub: { fontSize: 11.5, fontFamily: fontFamily.body },
  itemPrazo: { fontSize: 11, fontFamily: fontFamily.body },
  badge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999 },
  badgeText: { fontSize: 10, fontFamily: fontFamily.bodyBold },
});
