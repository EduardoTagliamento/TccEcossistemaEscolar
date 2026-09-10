import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { Icon } from '../../components/icons';
import { useAppTheme } from '../../context/ThemeContext';
import { useEscola } from '../../context/EscolaContext';
import { listarCalendario, type AvisoCalendario } from '../../api/calendario.api';
import { listarEventos, type Evento } from '../../api/evento.api';
import { listarAnotacoesPorPeriodo, type Anotacao } from '../../api/anotacao.api';
import { nomeMes } from '../../utils/date';
import { fontFamily } from '../../theme/tokens';

const SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

type DiaEvento = { label: string; tipo: 'tarefa' | 'prova' | 'evento' | 'anotacao'; cor: string };

function formatarDataCompleta(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return `${dia} de ${nomeMes(mes - 1)} de ${ano}`;
}

function isoData(ano: number, mes: number, dia: number): string {
  return new Date(ano, mes, dia).toISOString().slice(0, 10);
}

export function CalendarioScreen() {
  const { theme } = useAppTheme();
  const { escola } = useEscola();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [eventosPorDia, setEventosPorDia] = useState<Record<string, DiaEvento[]>>({});
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    if (!escola) return;
    setCarregando(true);
    try {
      const inicio = isoData(ano, mes, 1);
      const fim = isoData(ano, mes + 1, 0);

      const [avisos, respEventos, anotacoes] = await Promise.all([
        listarCalendario({ EscolaGUID: escola.EscolaGUID, DataInicio: inicio, DataFim: fim }),
        listarEventos({ EscolaGUID: escola.EscolaGUID, dataInicio: inicio, dataFim: fim }),
        listarAnotacoesPorPeriodo(escola.EscolaGUID, inicio, fim),
      ]);

      const mapa: Record<string, DiaEvento[]> = {};
      const add = (dataIso: string, evento: DiaEvento) => {
        const chave = dataIso.slice(0, 10);
        if (!mapa[chave]) mapa[chave] = [];
        mapa[chave].push(evento);
      };

      avisos.forEach((a: AvisoCalendario) =>
        add(a.DataPrazo, { label: a.Titulo, tipo: a.TipoAviso, cor: a.TipoAviso === 'prova' ? theme.ssDark : theme.spDark })
      );
      respEventos.eventos.forEach((e: Evento) => add(e.EventoData, { label: e.EventoTitulo, tipo: 'evento', cor: theme.warn }));
      anotacoes.forEach((a: Anotacao) => add(a.AnotacaoData, { label: a.AnotacaoTitulo, tipo: 'anotacao', cor: theme.muted }));

      setEventosPorDia(mapa);
    } catch (error) {
      console.warn('Erro ao carregar calendário:', error);
    } finally {
      setCarregando(false);
    }
  }, [escola?.EscolaGUID, ano, mes, theme]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const dias = useMemo(() => {
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const celulas: { n: number | null; iso: string | null }[] = [];
    for (let i = 0; i < primeiroDiaSemana; i++) celulas.push({ n: null, iso: null });
    for (let d = 1; d <= totalDias; d++) celulas.push({ n: d, iso: isoData(ano, mes, d) });
    while (celulas.length % 7 !== 0) celulas.push({ n: null, iso: null });
    return celulas;
  }, [ano, mes]);

  function mudarMes(delta: number) {
    const novaData = new Date(ano, mes + delta, 1);
    setAno(novaData.getFullYear());
    setMes(novaData.getMonth());
  }

  const hojeIso = hoje.toISOString().slice(0, 10);
  const eventosDoDiaSelecionado = diaSelecionado ? eventosPorDia[diaSelecionado] ?? [] : [];

  return (
    <>
      <Header titulo="Calendário" showBack />
      <Screen refreshing={carregando} onRefresh={carregar}>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => mudarMes(-1)} style={[styles.navBtn, { borderColor: theme.borderStrong, borderWidth: theme.borderWidth }]}>
            <Icon name="back" size={16} color={theme.spDark} />
          </Pressable>
          <Text style={[styles.monthLabel, { color: theme.text }]}>
            {nomeMes(mes)} {ano}
          </Text>
          <Pressable onPress={() => mudarMes(1)} style={[styles.navBtn, { borderColor: theme.borderStrong, borderWidth: theme.borderWidth }]}>
            <Icon name="forward" size={16} color={theme.spDark} />
          </Pressable>
        </View>

        <View style={[styles.grid, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: theme.borderWidth }]}>
          <View style={styles.weekRow}>
            {SEMANA.map((d) => (
              <Text key={d} style={[styles.weekday, { color: theme.faint }]}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.daysGrid}>
            {dias.map((cel, i) => {
              const eventosNoDia = cel.iso ? eventosPorDia[cel.iso] ?? [] : [];
              const isHoje = cel.iso === hojeIso;
              return (
                <Pressable
                  key={i}
                  disabled={!cel.n}
                  onPress={() => cel.iso && setDiaSelecionado(cel.iso)}
                  style={styles.dayCell}
                >
                  {cel.n && (
                    <View style={[styles.dayNum, isHoje && { backgroundColor: theme.spDark }]}>
                      <Text style={{ color: isHoje ? theme.onSpDark : theme.text, fontSize: 12.5, fontFamily: fontFamily.body }}>{cel.n}</Text>
                    </View>
                  )}
                  <View style={styles.dotsRow}>
                    {eventosNoDia.slice(0, 3).map((ev, idx) => (
                      <View key={idx} style={[styles.dot, { backgroundColor: ev.cor }]} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.legend}>
          {[
            { label: 'Tarefa', cor: theme.spDark },
            { label: 'Prova', cor: theme.ssDark },
            { label: 'Evento', cor: theme.warn },
            { label: 'Anotação', cor: theme.muted },
          ].map((l) => (
            <View key={l.label} style={[styles.legendItem, { backgroundColor: theme.card2 }]}>
              <View style={[styles.dot, { backgroundColor: l.cor }]} />
              <Text style={{ color: theme.text, fontSize: 11, fontFamily: fontFamily.bodyBold }}>{l.label}</Text>
            </View>
          ))}
        </View>
      </Screen>

      <Modal visible={!!diaSelecionado} transparent animationType="fade" onRequestClose={() => setDiaSelecionado(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDiaSelecionado(null)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {diaSelecionado ? formatarDataCompleta(diaSelecionado) : ''}
              </Text>
              <Pressable onPress={() => setDiaSelecionado(null)} style={[styles.closeBtn, { borderColor: theme.border, borderWidth: theme.borderWidth }]}>
                <Text style={{ color: theme.text, fontSize: 15 }}>×</Text>
              </Pressable>
            </View>
            {eventosDoDiaSelecionado.map((ev, i) => (
              <View key={i} style={[styles.eventRow, { backgroundColor: theme.card2 }]}>
                <View style={[styles.dot, { backgroundColor: ev.cor }]} />
                <Text style={{ color: theme.text, fontFamily: fontFamily.bodySemiBold, fontSize: 12.5 }}>{ev.label}</Text>
              </View>
            ))}
            {eventosDoDiaSelecionado.length === 0 && (
              <Text style={{ color: theme.faint, textAlign: 'center', padding: 20, fontFamily: fontFamily.body }}>
                Nenhum evento neste dia.
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontFamily: fontFamily.heading, fontSize: 16 },
  grid: { borderRadius: 16, padding: 12 },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 9.5, fontFamily: fontFamily.bodyBold, textTransform: 'uppercase' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 5, gap: 3, minHeight: 40 },
  dayNum: { width: 24, height: 24, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', gap: 2, minHeight: 5 },
  dot: { width: 5, height: 5, borderRadius: 999 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,29,23,0.55)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, maxHeight: '70%', gap: 8 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontFamily: fontFamily.heading, fontSize: 16 },
  closeBtn: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
});
