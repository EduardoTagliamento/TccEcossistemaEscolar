'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Icon } from '@/components/Icon';
import MateriaTurmaCard from '@/components/materias/MateriaTurmaCard';
import NovoItemModal, { NovoItemAba } from '@/components/materias/NovoItemModal';
import GerenciarCategoriasModal from '@/components/materias/GerenciarCategoriasModal';
import * as MateriasModuloAPI from '@/lib/api/materiasmodulo.api';
import Loader from '@/components/Loader';
import styles from './page.module.css';

export default function TurmasDaMateriaPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const materiaGUID = (params?.materiaGUID as string) || '';

  const [turmas, setTurmas] = useState<MateriasModuloAPI.TurmaComCapa[]>([]);
  const [pendencias, setPendencias] = useState<Record<string, boolean>>({});
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [popoverAberto, setPopoverAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalNovoItemAba, setModalNovoItemAba] = useState<NovoItemAba | null>(null);
  const [modalCategoriasAberto, setModalCategoriasAberto] = useState(false);

  const [cor, setCor] = useState('#17C077');
  // true = ainda não há cor "escolhida pelo usuário" pra essa imagem — deixa
  // o backend extrair a cor dominante da capa (sharp) no upload; vira false
  // assim que o professor mexe manualmente no seletor de cor.
  const [corAutomatica, setCorAutomatica] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [imagem, setImagem] = useState<File | null>(null);
  const [imagemPreviewUrl, setImagemPreviewUrl] = useState<string | null>(null);
  const [imagemAtualUrl, setImagemAtualUrl] = useState<string | null>(null);
  const [carregandoCustomizacao, setCarregandoCustomizacao] = useState(false);
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
      void carregarPendencias(lista);
    } catch (erro) {
      console.error('Erro ao carregar turmas:', erro);
    } finally {
      setCarregando(false);
    }
  };

  const carregarPendencias = async (lista: MateriasModuloAPI.TurmaComCapa[]) => {
    try {
      const resultados = await Promise.all(
        lista.map((t) => MateriasModuloAPI.temPendencia(materiaGUID, t.TurmaGUID, true).catch(() => false))
      );
      setPendencias((prev) => {
        const mapa = { ...prev };
        lista.forEach((t, i) => { mapa[t.TurmaGUID] = resultados[i]; });
        return mapa;
      });
    } catch (erro) {
      console.error('Erro ao verificar pendências:', erro);
    }
  };

  const abrirCadastro = (aba: NovoItemAba) => {
    setPopoverAberto(false);
    setModalNovoItemAba(aba);
  };

  const abrirModalEditar = async () => {
    setModalEditarAberto(true);
    setCarregandoCustomizacao(true);
    try {
      const atual = await MateriasModuloAPI.buscarCustomizacaoMateria(materiaGUID);
      setCor(atual.CorFundo || '#17C077');
      setMensagem(atual.MensagemBoasVindas || '');
      setImagemAtualUrl(atual.ImagemUrl);
    } catch (erro) {
      console.error('Erro ao carregar customização atual:', erro);
    } finally {
      setCarregandoCustomizacao(false);
    }
    setImagem(null);
    setImagemPreviewUrl(null);
    setCorAutomatica(false);
  };

  const fecharModalEditar = () => {
    if (imagemPreviewUrl) URL.revokeObjectURL(imagemPreviewUrl);
    setImagemPreviewUrl(null);
    setModalEditarAberto(false);
  };

  const escolherImagem = (file: File | null) => {
    if (imagemPreviewUrl) URL.revokeObjectURL(imagemPreviewUrl);
    setImagem(file);
    setImagemPreviewUrl(file ? URL.createObjectURL(file) : null);
    // Nova imagem: até o professor mexer na cor manualmente, deixa o
    // backend extrair a cor dominante dela automaticamente ao salvar.
    if (file) setCorAutomatica(true);
  };

  const salvarCustomizacao = async () => {
    try {
      setSalvando(true);
      const resultado = await MateriasModuloAPI.salvarCustomizacaoMateria(materiaGUID, {
        imagem: imagem || undefined,
        cor: corAutomatica ? undefined : cor,
        mensagem,
      });
      setCor(resultado.CorFundo || '#17C077');
      setCorAutomatica(false);
      setImagemAtualUrl(resultado.ImagemUrl);
      if (imagemPreviewUrl) URL.revokeObjectURL(imagemPreviewUrl);
      setImagem(null);
      setImagemPreviewUrl(null);
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '3rem 0' }}>
          <Loader />
          <p>Carregando turmas...</p>
        </div>
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
          <button className={styles.botaoIcone} onClick={() => void abrirModalEditar()} title="Editar matéria">
            <Icon name="edit" size={18} />
          </button>
          <button className={styles.botaoIcone} onClick={() => setModalCategoriasAberto(true)} title="Gerenciar categorias">
            <Icon name="folder" size={18} />
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
            temPendencia={pendencias[turma.TurmaGUID]}
          />
        ))}
        {turmasFiltradas.length === 0 && <p className={styles.mensagemVazia}>Nenhuma turma encontrada.</p>}
      </div>

      {modalEditarAberto && (
        <div className={styles.overlay} onClick={fecharModalEditar}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitulo}>Editar Matéria</h2>

            {carregandoCustomizacao ? (
              <p className={styles.hint}>Carregando...</p>
            ) : (
              <>
                <div className={styles.campo}>
                  <label>Capa (imagem)</label>
                  {(imagemPreviewUrl || imagemAtualUrl) && (
                    <img
                      src={imagemPreviewUrl || imagemAtualUrl || undefined}
                      alt="Prévia da capa"
                      className={styles.previewImagem}
                    />
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(e) => escolherImagem(e.target.files?.[0] || null)}
                  />
                  {imagem && (
                    <p className={styles.hint}>
                      {corAutomatica
                        ? 'A cor abaixo vai ser definida automaticamente a partir dessa imagem ao salvar — mas você ainda pode escolher outra.'
                        : 'Cor definida manualmente — não será sobrescrita pela imagem.'}
                    </p>
                  )}
                </div>

                <div className={styles.campo}>
                  <label>Cor</label>
                  <input
                    type="color"
                    className={styles.corInput}
                    value={cor}
                    onChange={(e) => {
                      setCor(e.target.value);
                      setCorAutomatica(false);
                    }}
                  />
                </div>

                <div className={styles.campo}>
                  <label>Mensagem de boas-vindas pros alunos</label>
                  <textarea rows={3} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Ex: Bem-vindos à matéria!" />
                </div>

                <div className={styles.botoes}>
                  <button className={styles.botaoSalvar} onClick={salvarCustomizacao} disabled={salvando}>
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button className={styles.botaoCancelar} onClick={fecharModalEditar}>
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {modalNovoItemAba && (
        <NovoItemModal
          aba={modalNovoItemAba}
          materiaGUID={materiaGUID}
          onFechar={() => setModalNovoItemAba(null)}
          onCriado={() => setModalNovoItemAba(null)}
        />
      )}

      {modalCategoriasAberto && (
        <GerenciarCategoriasModal materiaGUID={materiaGUID} onFechar={() => setModalCategoriasAberto(false)} />
      )}
    </div>
  );
}
