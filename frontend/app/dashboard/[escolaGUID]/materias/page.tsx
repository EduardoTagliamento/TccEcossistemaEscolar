'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Icon } from '@/components/Icon';
import MateriaTurmaCard from '@/components/materias/MateriaTurmaCard';
import * as MateriasModuloAPI from '@/lib/api/materiasmodulo.api';
import styles from './page.module.css';

interface EscolaComFuncoes {
  escola: { EscolaGUID: string };
  funcoes: Array<{ FuncaoId: number; Status: 'Ativo' | 'Inativo' | 'Finalizado' }>;
}

export default function MateriasPage() {
  const params = useParams();
  const router = useRouter();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const { usuario, token } = useAuth();

  const [carregando, setCarregando] = useState(true);
  const [ehProfessor, setEhProfessor] = useState(false);
  const [ehAluno, setEhAluno] = useState(false);
  const [materiasAluno, setMateriasAluno] = useState<MateriasModuloAPI.MateriaDoAluno[]>([]);
  const [materiasProfessor, setMateriasProfessor] = useState<MateriasModuloAPI.MateriaComCapa[]>([]);
  const [filtro, setFiltro] = useState('');

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
      const response = await fetch(`/api/usuario/${usuario.UsuarioCPF}/escolas`, {
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

      if (aluno) {
        const materias = await MateriasModuloAPI.listarMateriasDoAluno(usuario.UsuarioCPF, escolaGUID);
        setMateriasAluno(materias);
      } else if (professor) {
        const materias = await MateriasModuloAPI.listarMateriasComCapaProfessor(escolaGUID);
        if (materias.length === 1) {
          router.replace(`/dashboard/${escolaGUID}/materias/${materias[0].MateriaGUID}/turmas`);
          return;
        }
        setMateriasProfessor(materias);
      }
    } catch (erro) {
      console.error('Erro ao carregar matérias:', erro);
    } finally {
      setCarregando(false);
    }
  };

  const termoBusca = filtro.trim().toLowerCase();
  const materiasAlunoFiltradas = materiasAluno.filter(
    (m) => m.MateriaNome.toLowerCase().includes(termoBusca) || m.ProfessorNome.toLowerCase().includes(termoBusca)
  );
  const materiasProfessorFiltradas = materiasProfessor.filter((m) => m.MateriaNome.toLowerCase().includes(termoBusca));

  if (carregando) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Carregando matérias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>
            <Icon name="book-open" size={26} /> Matérias
          </h1>
          <p className={styles.subtitulo}>
            {ehAluno ? 'Suas matérias e o que o professor postou nelas' : 'Escolha a matéria pra ver as turmas'}
          </p>
        </div>
      </div>

      <div className={styles.filtro}>
        <input
          className={styles.inputFiltro}
          placeholder="Buscar por matéria ou professor..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {ehAluno && (
        <div className={styles.grid}>
          {materiasAlunoFiltradas.map((materia) => (
            <MateriaTurmaCard
              key={materia.MateriaGUID}
              href={`/dashboard/${escolaGUID}/materias/${materia.MateriaGUID}/turmas/${materia.TurmaGUID}`}
              titulo={materia.MateriaNome}
              subtitulo={materia.ProfessorNome}
              imagemUrl={materia.ImagemUrl}
              corFundo={materia.CorFundo}
            />
          ))}
          {materiasAlunoFiltradas.length === 0 && (
            <p className={styles.mensagemVazia}>Nenhuma matéria encontrada.</p>
          )}
        </div>
      )}

      {ehProfessor && !ehAluno && (
        <div className={styles.grid}>
          {materiasProfessorFiltradas.map((materia) => (
            <MateriaTurmaCard
              key={materia.MateriaGUID}
              href={`/dashboard/${escolaGUID}/materias/${materia.MateriaGUID}/turmas`}
              titulo={materia.MateriaNome}
              imagemUrl={materia.ImagemUrl}
              corFundo={materia.CorFundo}
            />
          ))}
          {materiasProfessorFiltradas.length === 0 && (
            <p className={styles.mensagemVazia}>Você ainda não está alocado em nenhuma matéria.</p>
          )}
        </div>
      )}
    </div>
  );
}
