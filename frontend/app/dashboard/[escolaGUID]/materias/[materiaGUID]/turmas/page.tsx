'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import MateriaTurmaCard from '@/components/materias/MateriaTurmaCard';
import * as MateriasModuloAPI from '@/lib/api/materiasmodulo.api';
import styles from './page.module.css';

export default function TurmasDaMateriaPage() {
  const params = useParams();
  const router = useRouter();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const materiaGUID = (params?.materiaGUID as string) || '';

  const [turmas, setTurmas] = useState<MateriasModuloAPI.TurmaComCapa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [popoverAberto, setPopoverAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);

  const [cor, setCor] = useState('#17C077');
  const [mensagem, setMensagem] = useState('');
  const [imagem, setImagem] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (materiaGUID) void carregarTurmas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaGUID]);

  const carregarTurmas = async () => {
    try {
      setCarregando(true);
      const lista = await MateriasModuloAPI.listarTurmasComCapaProfessor(materiaGUID);
      setTurmas(lista);
    } catch (erro) {
      console.error('Erro ao carregar turmas:', erro);
    } finally {
      setCarregando(false);
    }
  };

  const abrirCadastro = (tipo: 'conteudo' | 'tarefa' | 'prova') => {
    setPopoverAberto(false);
    router.push(`/dashboard/${escolaGUID}/cadastro?tipo=${tipo}&MateriaGUID=${materiaGUID}`);
  };

  const salvarCustomizacao = async () => {
    try {
      setSalvando(true);
      await MateriasModuloAPI.salvarCustomizacaoMateria(materiaGUID, {
        imagem: imagem || undefined,
        cor,
        mensagem,
      });
      alert('Customização salva com sucesso!');
      setModalEditarAberto(false);
    } catch (erro: any) {
      alert(erro?.message || 'Erro ao salvar customização');
    } finally {
      setSalvando(false);
    }
  };

  const turmasFiltradas = turmas.filter(
    (t) => t.TurmaNome.toLowerCase().includes(filtro.toLowerCase()) || t.TurmaSerie.toLowerCase().includes(filtro.toLowerCase())
  );

  if (carregando) {
    return (
      <div className={styles.container}>
        <p>Carregando turmas...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.titulo}>
          <Icon name="grid" size={26} /> Turmas
        </h1>
        <div className={styles.acoes}>
          <button className={styles.botaoIcone} onClick={() => setModalEditarAberto(true)} title="Editar matéria">
            <Icon name="edit" size={18} />
          </button>
          <div className={styles.acoesWrapper}>
            <button className={styles.botaoIcone} onClick={() => setPopoverAberto((v) => !v)} title="Novo conteúdo/tarefa/prova">
              <Icon name="plus" size={18} />
            </button>
            {popoverAberto && (
              <div className={styles.popoverNovoItem}>
                <button onClick={() => abrirCadastro('conteudo')}><Icon name="camera" size={16} /> Conteúdo</button>
                <button onClick={() => abrirCadastro('tarefa')}><Icon name="edit" size={16} /> Tarefa</button>
                <button onClick={() => abrirCadastro('prova')}><Icon name="award" size={16} /> Prova</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.filtro}>
        <input className={styles.inputFiltro} placeholder="Buscar por turma..." value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </div>

      <div className={styles.grid}>
        {turmasFiltradas.map((turma) => (
          <MateriaTurmaCard
            key={turma.TurmaGUID}
            href={`/dashboard/${escolaGUID}/materias/${materiaGUID}/turmas/${turma.TurmaGUID}`}
            titulo={`${turma.TurmaSerie} ${turma.TurmaNome}`}
            imagemUrl={turma.ImagemUrl}
            corFundo={turma.CorFundo}
          />
        ))}
        {turmasFiltradas.length === 0 && <p className={styles.mensagemVazia}>Nenhuma turma encontrada.</p>}
      </div>

      {modalEditarAberto && (
        <div className={styles.overlay} onClick={() => setModalEditarAberto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitulo}>Editar Matéria</h2>

            <div className={styles.campo}>
              <label>Capa (imagem)</label>
              <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={(e) => setImagem(e.target.files?.[0] || null)} />
            </div>

            <div className={styles.campo}>
              <label>Cor</label>
              <input type="color" className={styles.corInput} value={cor} onChange={(e) => setCor(e.target.value)} />
            </div>

            <div className={styles.campo}>
              <label>Mensagem de boas-vindas pros alunos</label>
              <textarea rows={3} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Ex: Bem-vindos à matéria!" />
            </div>

            <div className={styles.botoes}>
              <button className={styles.botaoSalvar} onClick={salvarCustomizacao} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
              <button className={styles.botaoCancelar} onClick={() => setModalEditarAberto(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
