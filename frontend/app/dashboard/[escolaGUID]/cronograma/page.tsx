'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Icon } from '@/components/Icon';
import Loader from '@/components/Loader';
import * as HorarioTurmaAPI from '@/lib/api/horarioturma.api';
import { DIAS_SEMANA, DIA_SEMANA_LABEL } from '@/lib/api/escolaconfiguracao.api';
import styles from './page.module.css';

interface EscolaComFuncoes {
  escola: { EscolaGUID: string };
  funcoes: Array<{ FuncaoId: number; Status: 'Ativo' | 'Inativo' | 'Finalizado' }>;
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
      const response = await fetch(`/api/usuario/${usuario.UsuarioGUID}/escolas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const escolas: EscolaComFuncoes[] = data?.data?.escolas || [];
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

  const aulasPorDia = DIAS_SEMANA.map((dia) => ({
    dia,
    aulas: aulas
      .filter((a) => a.DiaSemana === dia)
      .sort((a, b) => a.HoraInicio.localeCompare(b.HoraInicio)),
  })).filter((grupo) => grupo.aulas.length > 0);

  if (carregando) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Loader />
          <p>Carregando cronograma...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>
            <span className={styles.tituloIcone}><Icon name="clock" size={20} /></span> Cronograma
          </h1>
          <p className={styles.subtitulo}>
            {modo === 'aluno' ? 'Suas aulas da semana' : 'As aulas que você leciona na semana'}
          </p>
        </div>
        {ehAluno && ehProfessor && (
          <div className={styles.acoes}>
            <button
              className={styles.botaoIcone}
              onClick={() => void alternarModo()}
              title={modo === 'aluno' ? 'Ver como professor' : 'Ver como aluno'}
            >
              <Icon name="repeat" size={18} />
            </button>
          </div>
        )}
      </div>

      {aulasPorDia.length === 0 && (
        <p className={styles.mensagemVazia}>
          {modo === 'aluno'
            ? 'Sua turma ainda não tem um cronograma montado.'
            : 'Você ainda não tem aulas no cronograma de nenhuma turma.'}
        </p>
      )}

      {aulasPorDia.length > 0 && (
        <div className={styles.listaDias}>
          {aulasPorDia.map((grupo) => (
            <section key={grupo.dia} className={styles.grupoDia}>
              <h2 className={styles.labelDia}>{DIA_SEMANA_LABEL[grupo.dia]}</h2>
              <div className={styles.listaAulas}>
                {grupo.aulas.map((aula) => (
                  <button
                    key={aula.HorarioTurmaGUID}
                    type="button"
                    className={styles.cardAula}
                    onClick={() => handleClicarAula(aula)}
                  >
                    <span className={styles.cardAulaHorario}>
                      {aula.HoraInicio} - {aula.HoraFim}
                    </span>
                    <span className={styles.cardAulaInfo}>
                      <span className={styles.cardAulaMateria}>{aula.MateriaNome}</span>
                      <span className={styles.cardAulaDetalhe}>
                        {modo === 'aluno' ? aula.UsuarioNome : `${aula.TurmaSerie} ${aula.TurmaNome}`}
                      </span>
                    </span>
                    <Icon name="chevron-right" size={18} />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
