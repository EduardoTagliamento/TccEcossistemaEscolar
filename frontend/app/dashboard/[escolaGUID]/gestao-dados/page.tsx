'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import * as CursoAPI from '@/lib/api/curso.api';
import * as MateriaAPI from '@/lib/api/materia.api';
import * as TurmaAPI from '@/lib/api/turma.api';
import * as AlunoAPI from '@/lib/api/aluno.api';
import * as ProfessorAPI from '@/lib/api/professor.api';
import { Icon, IconName } from '@/components/Icon';

interface Modulo {
  id: string;
  nome: string;
  descricao: string;
  icone: IconName;
  contador?: number;
}

export default function GestaoDadosPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const [modulos, setModulos] = useState<Modulo[]>([
    { id: 'cursos', nome: 'Cursos', descricao: 'Gerencie cursos técnicos', icone: 'layers' },
    { id: 'materias', nome: 'Matérias', descricao: 'Gerencie disciplinas', icone: 'book-open' },
    { id: 'turmas', nome: 'Turmas', descricao: 'Gerencie turmas/classes', icone: 'grid' },
    { id: 'alunos', nome: 'Alunos', descricao: 'Gerencie matrículas', icone: 'users' },
    { id: 'professores', nome: 'Professores', descricao: 'Gerencie corpo docente', icone: 'award' },
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
        CursoAPI.listarCursos({ EscolaGUID: escolaGUID }).catch(() => ({ cursos: [], total: 0 })),
        MateriaAPI.listarMaterias({ EscolaGUID: escolaGUID }).catch(() => ({ materias: [], total: 0 })),
        TurmaAPI.listarTurmas({ EscolaGUID: escolaGUID }).catch(() => ({ turmas: [], total: 0 })),
        AlunoAPI.listarAlunos({ EscolaGUID: escolaGUID }).catch(() => ({ alunos: [], total: 0 })),
        ProfessorAPI.listarProfessores({ EscolaGUID: escolaGUID }).catch(() => ({ professores: [], total: 0 })),
      ]);

      // Atualizar módulos com contadores
      setModulos(prev => prev.map(modulo => {
        switch (modulo.id) {
          case 'cursos':
            return { ...modulo, contador: cursosRes.cursos?.length || 0 };
          case 'materias':
            return { ...modulo, contador: materiasRes.materias?.length || 0 };
          case 'turmas':
            return { ...modulo, contador: turmasRes.turmas?.length || 0 };
          case 'alunos':
            return { ...modulo, contador: alunosRes.alunos?.length || 0 };
          case 'professores':
            return { ...modulo, contador: professoresRes.professores?.length || 0 };
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
              <div className={styles.icone}><Icon name={modulo.icone} size={28} /></div>
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
