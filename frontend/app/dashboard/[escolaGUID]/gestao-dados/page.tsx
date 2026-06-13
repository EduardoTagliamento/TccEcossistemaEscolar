'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { CursoAPI } from '@/lib/api/curso.api';
import { MateriaAPI } from '@/lib/api/materia.api';
import { TurmaAPI } from '@/lib/api/turma.api';
import { AlunoAPI } from '@/lib/api/aluno.api';
import { ProfessorAPI } from '@/lib/api/professor.api';

interface Modulo {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  fase: number;
  contador?: number;
}

export default function GestaoDadosPage() {
  const params = useParams();
  const escolaGUID = params.escolaGUID as string;
  const [modulos, setModulos] = useState<Modulo[]>([
    { id: 'cursos', nome: 'Cursos', descricao: 'Gerencie cursos técnicos', icone: '🎓', fase: 1 },
    { id: 'materias', nome: 'Matérias', descricao: 'Gerencie disciplinas', icone: '📚', fase: 2 },
    { id: 'turmas', nome: 'Turmas', descricao: 'Gerencie turmas/classes', icone: '🏫', fase: 3 },
    { id: 'alunos', nome: 'Alunos', descricao: 'Gerencie matrículas', icone: '👨‍🎓', fase: 4 },
    { id: 'professores', nome: 'Professores', descricao: 'Gerencie corpo docente', icone: '👩‍🏫', fase: 5 },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (escolaGUID) {
      carregarContadores();
    }
  }, [escolaGUID]);

  const carregarContadores = async () => {
    try {
      setLoading(true);
      
      // Buscar contadores em paralelo
      const [cursosRes, materiasRes, turmasRes, alunosRes, professoresRes] = await Promise.all([
        CursoAPI.listarCursos(escolaGUID).catch(() => ({ data: [] })),
        MateriaAPI.listarMaterias(escolaGUID).catch(() => ({ data: [] })),
        TurmaAPI.listarTurmas(escolaGUID).catch(() => ({ data: [] })),
        AlunoAPI.listarAlunos(escolaGUID).catch(() => ({ data: [] })),
        ProfessorAPI.listarProfessores(escolaGUID).catch(() => ({ data: [] })),
      ]);

      // Atualizar módulos com contadores
      setModulos(prev => prev.map(modulo => {
        switch (modulo.id) {
          case 'cursos':
            return { ...modulo, contador: cursosRes.data?.length || 0 };
          case 'materias':
            return { ...modulo, contador: materiasRes.data?.length || 0 };
          case 'turmas':
            return { ...modulo, contador: turmasRes.data?.length || 0 };
          case 'alunos':
            return { ...modulo, contador: alunosRes.data?.length || 0 };
          case 'professores':
            return { ...modulo, contador: professoresRes.data?.length || 0 };
          default:
            return modulo;
        }
      }));
    } catch (error) {
      console.error('Erro ao carregar contadores:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>Gestão de Dados da Escola</h1>
          <p className={styles.subtitulo}>
            Cadastre e importe dados em massa usando planilhas Excel
          </p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Carregando dados...</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {modulos.map((modulo) => (
            <Link
              key={modulo.id}
              href={`/dashboard/${escolaGUID}/gestao-dados/${modulo.id}`}
              className={styles.card}
            >
              <span className={styles.fase}>Fase {modulo.fase}</span>
              <div className={styles.icone}>{modulo.icone}</div>
              <h2 className={styles.cardTitulo}>{modulo.nome}</h2>
              <p className={styles.cardDescricao}>{modulo.descricao}</p>
              {modulo.contador !== undefined && (
                <div className={styles.contador}>
                  <span className={styles.contadorNumero}>{modulo.contador}</span>
                  <span className={styles.contadorTexto}>
                    {modulo.contador === 1 ? 'registro' : 'registros'}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
