'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Icon, IconName } from '@/components/Icon';
import ItemProgressoBar from '@/components/materias/ItemProgressoBar';
import VisualizadorItemModal from '@/components/materias/VisualizadorItemModal';
import * as MateriasModuloAPI from '@/lib/api/materiasmodulo.api';
import * as CategoriaConteudoAPI from '@/lib/api/categoriaconteudo.api';
import * as TurmaAPI from '@/lib/api/turma.api';
import type { ItemCategoria } from '@/lib/api/materiasmodulo.api';
import styles from './page.module.css';

interface EscolaComFuncoes {
  escola: { EscolaGUID: string };
  funcoes: Array<{ FuncaoId: number; Status: 'Ativo' | 'Inativo' | 'Finalizado' }>;
}

const ICONE_POR_TIPO: Record<ItemCategoria['Tipo'], IconName> = {
  prova: 'award',
  tarefa_digital: 'upload',
  tarefa_presencial: 'edit',
  conteudo_video: 'camera',
  conteudo_texto: 'file-text',
  conteudo_imagem: 'layers',
};

export default function CategoriaPage() {
  const params = useParams();
  const router = useRouter();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const materiaGUID = (params?.materiaGUID as string) || '';
  const turmaGUID = (params?.turmaGUID as string) || '';
  const { usuario, token } = useAuth();

  const [ehProfessor, setEhProfessor] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [nomeTitulo, setNomeTitulo] = useState('');
  const [imagemFundo, setImagemFundo] = useState<string | null>(null);
  const [corFundo, setCorFundo] = useState('#17C077');
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [mensagemVisivel, setMensagemVisivel] = useState(true);
  const [categorias, setCategorias] = useState<MateriasModuloAPI.CategoriaCompleta[]>([]);
  const [itemSelecionado, setItemSelecionado] = useState<ItemCategoria | null>(null);
  const [categoriaArrastando, setCategoriaArrastando] = useState<string | null>(null);

  useEffect(() => {
    if (escolaGUID && usuario) void inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaGUID, usuario, materiaGUID, turmaGUID]);

  useEffect(() => {
    if (mensagem) {
      const timer = setTimeout(() => setMensagemVisivel(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [mensagem]);

  const inicializar = async () => {
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
      setEhProfessor(professor);

      if (professor) {
        const turma = await TurmaAPI.buscarTurma(turmaGUID);
        setNomeTitulo(`${turma.TurmaSerie} ${turma.TurmaNome}`);
        setImagemFundo(turma.TurmaImagemUrl || null);
        setCorFundo(turma.TurmaCorFundo || '#17C077');
      } else {
        const materias = await MateriasModuloAPI.listarMateriasDoAluno(usuario.UsuarioCPF, escolaGUID);
        const materiaAtual = materias.find((m) => m.MateriaGUID === materiaGUID);
        setNomeTitulo(materiaAtual?.MateriaNome || 'Matéria');
        setImagemFundo(materiaAtual?.ImagemUrl || null);
        setCorFundo(materiaAtual?.CorFundo || '#17C077');
        setMensagem(materiaAtual?.MensagemBoasVindas || null);
      }

      await carregarCategorias();
    } catch (erro) {
      console.error('Erro ao inicializar tela de categoria:', erro);
    } finally {
      setCarregando(false);
    }
  };

  const carregarCategorias = async () => {
    try {
      const lista = await MateriasModuloAPI.buscarCategoriasCompletas(materiaGUID, turmaGUID);
      setCategorias(lista);
    } catch (erro) {
      console.error('Erro ao carregar categorias:', erro);
    }
  };

  const abrirNovoItem = (categoriaGUID: string) => {
    router.push(
      `/dashboard/${escolaGUID}/cadastro?MateriaGUID=${materiaGUID}&TurmaGUID=${turmaGUID}&CategoriaGUID=${categoriaGUID}`
    );
  };

  const handleDragStart = (categoriaGUID: string) => setCategoriaArrastando(categoriaGUID);

  const handleDrop = async (categoriaDestinoGUID: string) => {
    if (!categoriaArrastando || categoriaArrastando === categoriaDestinoGUID) {
      setCategoriaArrastando(null);
      return;
    }

    const ordemAtual = categorias.map((c) => c.CategoriaGUID);
    const origemIdx = ordemAtual.indexOf(categoriaArrastando);
    const destinoIdx = ordemAtual.indexOf(categoriaDestinoGUID);
    ordemAtual.splice(origemIdx, 1);
    ordemAtual.splice(destinoIdx, 0, categoriaArrastando);

    setCategoriaArrastando(null);
    setCategorias((prev) => {
      const mapa = new Map(prev.map((c) => [c.CategoriaGUID, c]));
      return ordemAtual.map((guid) => mapa.get(guid)!);
    });

    try {
      await CategoriaConteudoAPI.reordenarCategorias(materiaGUID, turmaGUID, ordemAtual);
    } catch (erro) {
      console.error('Erro ao reordenar categorias:', erro);
      await carregarCategorias();
    }
  };

  if (carregando) {
    return <div className={styles.container}><p style={{ padding: '2rem' }}>Carregando...</p></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        {imagemFundo ? (
          <div className={styles.heroFundo} style={{ backgroundImage: `url(${imagemFundo})` }} />
        ) : (
          <div className={styles.heroFundoCor} style={{ backgroundColor: corFundo }} />
        )}
        <div className={styles.heroConteudo}>
          {mensagem && mensagemVisivel && <div className={styles.heroMensagem}>{mensagem}</div>}
          <h1 className={styles.heroTitulo}>{nomeTitulo}</h1>
        </div>
      </div>

      <div className={styles.corpo}>
        {categorias.length === 0 && (
          <p className={styles.mensagemSemCategoria}>
            {ehProfessor ? 'Nenhuma categoria criada ainda.' : 'Nenhum conteúdo publicado ainda.'}
          </p>
        )}

        {categorias.map((categoria) => (
          <div
            key={categoria.CategoriaGUID}
            className={styles.categoria}
            draggable={ehProfessor}
            onDragStart={() => handleDragStart(categoria.CategoriaGUID)}
            onDragOver={(e) => ehProfessor && e.preventDefault()}
            onDrop={() => ehProfessor && handleDrop(categoria.CategoriaGUID)}
          >
            <div className={styles.categoriaHeader}>
              <span className={styles.categoriaNome}>{categoria.CategoriaNome}</span>
              {ehProfessor && (
                <div className={styles.categoriaAcoes}>
                  <button className={styles.botaoAddItem} onClick={() => abrirNovoItem(categoria.CategoriaGUID)} title="Novo item">
                    <Icon name="plus" size={16} />
                  </button>
                </div>
              )}
            </div>

            {categoria.Itens.length === 0 ? (
              <p className={styles.mensagemVazia}>Nenhum item nesta categoria ainda.</p>
            ) : (
              categoria.Itens.map((item) => (
                <div key={item.ItemGUID} className={styles.itemLinha} onClick={() => setItemSelecionado(item)}>
                  <div className={styles.itemEsquerda}>
                    <Icon name={ICONE_POR_TIPO[item.Tipo]} size={16} />
                    <span className={styles.itemTitulo}>{item.Titulo}</span>
                  </div>
                  <ItemProgressoBar estado={item.Estado} percentual={item.Percentual} />
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {itemSelecionado && (
        <VisualizadorItemModal
          item={itemSelecionado}
          ehProfessor={ehProfessor}
          onFechar={() => setItemSelecionado(null)}
          onProgressoAtualizado={() => void carregarCategorias()}
        />
      )}
    </div>
  );
}
