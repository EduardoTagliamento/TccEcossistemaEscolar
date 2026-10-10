'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Icon } from '@/components/Icon';
import Loader from '@/components/Loader';
import * as HorarioTurmaAPI from '@/lib/api/horarioturma.api';
import * as EscolaConfiguracaoAPI from '@/lib/api/escolaconfiguracao.api';
import { DiaSemana, DIA_SEMANA_LABEL, SlotAula, SlotsPorDia } from '@/lib/api/escolaconfiguracao.api';
import styles from './page.module.css';

type Turno = 'Manha' | 'Tarde';

interface EscolaComFuncoes {
  escola: { EscolaGUID: string };
  funcoes: Array<{ FuncaoId: number; Status: 'Ativo' | 'Inativo' | 'Finalizado' }>;
}

// getDay() do JS é 0=Domingo..6=Sábado — mapeia pro enum DiaSemana usado no backend/grade.
const DIA_SEMANA_POR_INDICE_JS: DiaSemana[] = [
  'Domingo',
  'Segunda',
  'Terca',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sabado',
];

/** Cor estável por matéria (hash simples do GUID) — alterna entre as duas cores "escuras" da
 * paleta da escola (Primária/Secundária), que são as pensadas pra uso como texto/borda, ao
 * contrário das variantes "claras" (podem ser branco, péssimo contraste pra isso). Só pra dar
 * uma variedade visual entre matérias diferentes na mesma grade. */
function corDaMateria(materiaGUID: string): string {
  let hash = 0;
  for (let i = 0; i < materiaGUID.length; i++) hash = (hash * 31 + materiaGUID.charCodeAt(i)) | 0;
  return Math.abs(hash) % 2 === 0 ? 'var(--color-primary, var(--green-500))' : 'var(--color-tertiary, var(--blue-500))';
}

export default function CronogramaPage() {
  const params = useParams();
  const router = useRouter();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const { usuario, token } = useAuth();

  const [carregando, setCarregando] = useState(true);
  const [ehProfessor, setEhProfessor] = useState(false);
  const [ehAluno, setEhAluno] = useState(false);
  const [modo, setModo] = useState<'aluno' | 'professor'>('aluno');
  const [aulas, setAulas] = useState<HorarioTurmaAPI.HorarioPessoal[]>([]);
  const [config, setConfig] = useState<EscolaConfiguracaoAPI.EscolaConfiguracao | null>(null);
  const [slotsPorDia, setSlotsPorDia] = useState<SlotsPorDia[]>([]);
  const [mostrarManha, setMostrarManha] = useState(true);
  const [mostrarTarde, setMostrarTarde] = useState(true);

  useEffect(() => {
    if (escolaGUID && usuario) {
      void carregar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaGUID, usuario]);

  const carregar = async () => {
    if (!usuario) return;
    try {
      setCarregando(true);

      const [escolasResp, configResp] = await Promise.all([
        fetch(`/api/usuario/${usuario.UsuarioGUID}/escolas`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()),
        EscolaConfiguracaoAPI.obterConfiguracao(escolaGUID),
      ]);

      setConfig(configResp);
      if (configResp.Configurada) {
        const slotsResp = await EscolaConfiguracaoAPI.obterSlots(escolaGUID);
        setSlotsPorDia(slotsResp);
      }

      const escolas: EscolaComFuncoes[] = escolasResp?.data?.escolas || [];
      const escolaSelecionada = escolas.find((item) => item.escola.EscolaGUID === escolaGUID);
      const funcoesAtivas = (escolaSelecionada?.funcoes || [])
        .filter((funcao) => funcao.Status === 'Ativo')
        .map((funcao) => funcao.FuncaoId);

      const professor = funcoesAtivas.includes(3);
      const aluno = funcoesAtivas.includes(5);
      setEhProfessor(professor);
      setEhAluno(aluno);

      const modoInicial = aluno ? 'aluno' : 'professor';
      setModo(modoInicial);
      await carregarAulas(modoInicial);
    } catch (erro) {
      console.error('Erro ao carregar cronograma:', erro);
    } finally {
      setCarregando(false);
    }
  };

  const carregarAulas = async (modoAlvo: 'aluno' | 'professor') => {
    try {
      const lista =
        modoAlvo === 'aluno'
          ? await HorarioTurmaAPI.obterCronogramaDoAluno(escolaGUID)
          : await HorarioTurmaAPI.obterCronogramaDoProfessor(escolaGUID);
      setAulas(lista);
    } catch (erro) {
      console.error('Erro ao carregar aulas do cronograma:', erro);
      setAulas([]);
    }
  };

  const alternarModo = async () => {
    const novoModo = modo === 'aluno' ? 'professor' : 'aluno';
    setModo(novoModo);
    setCarregando(true);
    await carregarAulas(novoModo);
    setCarregando(false);
  };

  const handleClicarAula = (aula: HorarioTurmaAPI.HorarioPessoal) => {
    router.push(`/dashboard/${escolaGUID}/materias/${aula.MateriaGUID}/turmas/${aula.TurmaGUID}`);
  };

  // Mesma lógica de frontend/app/dashboard/[escolaGUID]/gestao-dados/turmas/[turmaGUID]/cronograma —
  // une os slots de todos os dias num conjunto único de linhas (horários), por turno.
  const linhasPorTurno = useMemo(() => {
    const construir = (turno: Turno): SlotAula[] => {
      const mapa = new Map<string, SlotAula>();
      slotsPorDia.forEach((dia) => {
        dia[turno].forEach((slot) => {
          mapa.set(`${slot.HoraInicio}-${slot.HoraFim}`, slot);
        });
      });
      return Array.from(mapa.values()).sort((a, b) => a.HoraInicio.localeCompare(b.HoraInicio));
    };

    return {
      Manha: construir('Manha'),
      Tarde: construir('Tarde'),
    };
  }, [slotsPorDia]);

  const diaTemSlot = (dia: DiaSemana, turno: Turno, slot: SlotAula): boolean => {
    const doDia = slotsPorDia.find((d) => d.DiaSemana === dia);
    return !!doDia?.[turno].some((s) => s.HoraInicio === slot.HoraInicio && s.HoraFim === slot.HoraFim);
  };

  const aulaNoSlot = (dia: DiaSemana, horaInicio: string): HorarioTurmaAPI.HorarioPessoal | undefined => {
    return aulas.find((a) => a.DiaSemana === dia && a.HoraInicio === horaInicio);
  };

  const diaDeHoje = DIA_SEMANA_POR_INDICE_JS[new Date().getDay()];

  const renderTurno = (turno: Turno, titulo: string) => {
    const linhas = linhasPorTurno[turno];
    if (linhas.length === 0 || !config) return null;

    return (
      <div className={styles.turnoSecao}>
        <h2 className={styles.turnoTitulo}>{titulo}</h2>
        <div
          className={styles.grade}
          style={{ gridTemplateColumns: `110px repeat(${config.DiasSemana.length}, 1fr)` }}
        >
          <div className={styles.gradeHeaderCanto} />
          {config.DiasSemana.map((dia) => (
            <div
              key={dia}
              className={`${styles.gradeHeaderDia} ${dia === diaDeHoje ? styles.gradeHeaderDiaHoje : ''}`}
            >
              {DIA_SEMANA_LABEL[dia].replace('-feira', '')}
            </div>
          ))}

          {linhas.map((slot) => (
            <Fragment key={slot.HoraInicio}>
              <div className={styles.gradeHorario}>
                {slot.HoraInicio}–{slot.HoraFim}
              </div>
              {config.DiasSemana.map((dia) => {
                const disponivel = diaTemSlot(dia, turno, slot);
                const colunaHoje = dia === diaDeHoje;
                if (!disponivel) {
                  return (
                    <div
                      key={`${dia}-${slot.HoraInicio}`}
                      className={`${styles.celula} ${styles.celulaIndisponivel}`}
                    />
                  );
                }

                const aula = aulaNoSlot(dia, slot.HoraInicio);

                return (
                  <div
                    key={`${dia}-${slot.HoraInicio}`}
                    className={`${styles.celula} ${!aula ? styles.celulaVazia : ''} ${colunaHoje ? styles.celulaHoje : ''}`}
                  >
                    {aula && (
                      <button
                        type="button"
                        className={styles.chip}
                        style={{ '--chip-cor': corDaMateria(aula.MateriaGUID) } as React.CSSProperties}
                        onClick={() => handleClicarAula(aula)}
                      >
                        <span className={styles.chipMateria}>{aula.MateriaNome}</span>
                        <span className={styles.chipDetalhe}>
                          {modo === 'aluno' ? aula.UsuarioNome : `${aula.TurmaSerie} ${aula.TurmaNome}`}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    );
  };

  if (carregando) {
    return (
      <div className={styles.loadingContainer}>
        <Loader />
        <p>Carregando cronograma...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>
            <Icon name="clock" size={22} /> Cronograma
          </h1>
          <p className={styles.subtitulo}>
            {modo === 'aluno' ? 'Suas aulas da semana' : 'As aulas que você leciona na semana'}
          </p>
        </div>
        {ehAluno && ehProfessor && (
          <button type="button" className={styles.botaoAlternar} onClick={() => void alternarModo()}>
            <Icon name="repeat" size={16} /> {modo === 'aluno' ? 'Ver como professor' : 'Ver como aluno'}
          </button>
        )}
      </div>

      {config && !config.Configurada && (
        <p className={styles.aviso}>Esta escola ainda não tem um horário letivo configurado.</p>
      )}

      {config?.Configurada && linhasPorTurno.Manha.length === 0 && linhasPorTurno.Tarde.length === 0 && (
        <p className={styles.aviso}>Nenhuma turma sua tem cronograma montado ainda.</p>
      )}

      {config?.Configurada && (
        <>
          {(linhasPorTurno.Manha.length > 0 || linhasPorTurno.Tarde.length > 0) && (
            <div className={styles.toggleTurnos}>
              {linhasPorTurno.Manha.length > 0 && (
                <label className={styles.toggleItem}>
                  <input type="checkbox" checked={mostrarManha} onChange={(e) => setMostrarManha(e.target.checked)} />
                  Mostrar manhã
                </label>
              )}
              {linhasPorTurno.Tarde.length > 0 && (
                <label className={styles.toggleItem}>
                  <input type="checkbox" checked={mostrarTarde} onChange={(e) => setMostrarTarde(e.target.checked)} />
                  Mostrar tarde
                </label>
              )}
            </div>
          )}

          {mostrarManha && renderTurno('Manha', 'Manhã')}
          {mostrarTarde && renderTurno('Tarde', 'Tarde')}
        </>
      )}
    </div>
  );
}
