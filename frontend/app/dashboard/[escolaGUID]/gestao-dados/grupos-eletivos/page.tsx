'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './page.module.css';

import BaseFormularioCadastro, { CampoFormulario } from '@/components/gestao-dados/BaseFormularioCadastro';
import BaseTabelaDados, { Coluna } from '@/components/gestao-dados/BaseTabelaDados';
import { Icon } from '@/components/Icon';

import * as GrupoEletivoAPI from '@/lib/api/grupoeletivo.api';
import { useBuscaUsuarioPorNome } from '@/lib/usuario/useBuscaUsuarioPorNome';
import { UsuarioBusca } from '@/lib/api/usuario.api';

export default function GruposEletivosPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';

  const [grupos, setGrupos] = useState<GrupoEletivoAPI.GrupoEletivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [grupoEditando, setGrupoEditando] = useState<GrupoEletivoAPI.GrupoEletivo | null>(null);

  const [valoresFormulario, setValoresFormulario] = useState<Record<string, any>>({ GrupoEletivoNome: '' });
  const [salvandoFormulario, setSalvandoFormulario] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  // Modal de membros
  const [grupoMembrosAberto, setGrupoMembrosAberto] = useState<GrupoEletivoAPI.GrupoEletivo | null>(null);
  const [membros, setMembros] = useState<GrupoEletivoAPI.MembroGrupoEletivo[]>([]);
  const [carregandoMembros, setCarregandoMembros] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const { candidatos, buscando, limpar } = useBuscaUsuarioPorNome(termoBusca);
  const [adicionandoMembro, setAdicionandoMembro] = useState(false);

  useEffect(() => {
    carregarGrupos();
  }, [escolaGUID]);

  const carregarGrupos = async () => {
    try {
      setCarregando(true);
      const resultado = await GrupoEletivoAPI.listarGruposEletivos({ EscolaGUID: escolaGUID });
      setGrupos(resultado.grupos);
    } catch (erro: any) {
      console.error('Erro ao carregar grupos eletivos:', erro);
      alert('Erro ao carregar grupos eletivos: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  const camposFormulario: CampoFormulario[] = [
    {
      id: 'GrupoEletivoNome',
      label: 'Nome do Grupo Eletivo',
      tipo: 'text',
      obrigatorio: true,
      placeholder: 'Ex: Eletivas 3ºH/3ºF',
    },
  ];

  const colunas: Coluna<GrupoEletivoAPI.GrupoEletivo>[] = [
    { id: 'GrupoEletivoNome', label: 'Nome', width: '45%' },
    {
      id: 'TotalMembros',
      label: 'Membros',
      width: '20%',
      render: (valor: any) => `${valor} aluno${valor === 1 ? '' : 's'}`,
    },
    {
      id: 'GrupoEletivoStatus',
      label: 'Status',
      width: '15%',
      render: (valor: any) => (
        <span className={valor === 'Ativo' ? styles.statusAtivo : styles.statusInativo}>{valor}</span>
      ),
    },
    {
      id: 'CreatedAt',
      label: 'Criado em',
      width: '20%',
      render: (valor: any) => new Date(valor).toLocaleDateString('pt-BR'),
    },
  ];

  const handleSubmitFormulario = async () => {
    try {
      setSalvandoFormulario(true);
      setErroFormulario('');

      if (grupoEditando) {
        await GrupoEletivoAPI.atualizarGrupoEletivo(grupoEditando.GrupoEletivoGUID, {
          GrupoEletivoNome: valoresFormulario.GrupoEletivoNome,
        });
        alert('Grupo eletivo atualizado com sucesso!');
      } else {
        await GrupoEletivoAPI.criarGrupoEletivo({
          EscolaGUID: escolaGUID,
          GrupoEletivoNome: valoresFormulario.GrupoEletivoNome,
        });
        alert('Grupo eletivo criado com sucesso!');
      }

      setModalAberto(false);
      setGrupoEditando(null);
      setValoresFormulario({ GrupoEletivoNome: '' });
      carregarGrupos();
    } catch (erro: any) {
      console.error('Erro ao salvar grupo eletivo:', erro);
      setErroFormulario(erro.message || 'Erro ao salvar grupo eletivo');
    } finally {
      setSalvandoFormulario(false);
    }
  };

  const handleEditar = (grupo: GrupoEletivoAPI.GrupoEletivo) => {
    setGrupoEditando(grupo);
    setValoresFormulario({ GrupoEletivoNome: grupo.GrupoEletivoNome });
    setModalAberto(true);
  };

  const handleInativar = async (grupo: GrupoEletivoAPI.GrupoEletivo) => {
    if (!confirm(`Tem certeza que deseja inativar o grupo "${grupo.GrupoEletivoNome}"?`)) return;
    try {
      await GrupoEletivoAPI.atualizarGrupoEletivo(grupo.GrupoEletivoGUID, { GrupoEletivoStatus: 'Inativo' });
      carregarGrupos();
    } catch (erro: any) {
      alert('Erro ao inativar grupo eletivo: ' + erro.message);
    }
  };

  const handleReativar = async (grupo: GrupoEletivoAPI.GrupoEletivo) => {
    try {
      await GrupoEletivoAPI.atualizarGrupoEletivo(grupo.GrupoEletivoGUID, { GrupoEletivoStatus: 'Ativo' });
      carregarGrupos();
    } catch (erro: any) {
      alert('Erro ao reativar grupo eletivo: ' + erro.message);
    }
  };

  const abrirMembros = async (grupo: GrupoEletivoAPI.GrupoEletivo) => {
    setGrupoMembrosAberto(grupo);
    setTermoBusca('');
    limpar();
    setCarregandoMembros(true);
    try {
      const lista = await GrupoEletivoAPI.listarMembrosGrupoEletivo(grupo.GrupoEletivoGUID);
      setMembros(lista);
    } catch (erro: any) {
      alert('Erro ao carregar membros: ' + erro.message);
    } finally {
      setCarregandoMembros(false);
    }
  };

  const fecharMembros = () => {
    setGrupoMembrosAberto(null);
    setMembros([]);
    carregarGrupos(); // refletir TotalMembros atualizado na lista
  };

  const handleAdicionarMembro = async (usuario: UsuarioBusca) => {
    if (!grupoMembrosAberto) return;
    if (membros.some((m) => m.UsuarioGUID === usuario.UsuarioGUID)) {
      alert('Este aluno já é membro do grupo.');
      return;
    }
    try {
      setAdicionandoMembro(true);
      const membro = await GrupoEletivoAPI.adicionarMembroGrupoEletivo(
        grupoMembrosAberto.GrupoEletivoGUID,
        usuario.UsuarioGUID
      );
      setMembros((prev) => [...prev, membro]);
      setTermoBusca('');
      limpar();
    } catch (erro: any) {
      alert('Erro ao adicionar membro: ' + erro.message);
    } finally {
      setAdicionandoMembro(false);
    }
  };

  const handleRemoverMembro = async (membro: GrupoEletivoAPI.MembroGrupoEletivo) => {
    if (!grupoMembrosAberto) return;
    if (!confirm(`Remover "${membro.UsuarioNome}" do grupo?`)) return;
    try {
      await GrupoEletivoAPI.removerMembroGrupoEletivo(grupoMembrosAberto.GrupoEletivoGUID, membro.UsuarioGUID);
      setMembros((prev) => prev.filter((m) => m.UsuarioGUID !== membro.UsuarioGUID));
    } catch (erro: any) {
      alert('Erro ao remover membro: ' + erro.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}><Icon name="repeat" size={22} /> Grupos Eletivos</h1>
          <p className={styles.subtitulo}>
            Turmas mistas/eletivas — agrupam alunos de turmas diferentes pra matérias compartilhadas (ex.: eletivas do 3ºH/3ºF)
          </p>
        </div>
        <div className={styles.acoes}>
          <button onClick={() => setModalAberto(true)} className={styles.botaoNovo}>
            + Novo Grupo Eletivo
          </button>
        </div>
      </div>

      <BaseTabelaDados
        titulo="Grupos Eletivos Cadastrados"
        colunas={colunas}
        dados={grupos}
        carregando={carregando}
        filtrarPor={(grupo, termo) => grupo.GrupoEletivoNome.toLowerCase().includes(termo)}
        buscaPlaceholder="Buscar por nome do grupo..."
        acoes={(grupo) => (
          <>
            <button onClick={() => abrirMembros(grupo)} className={styles.botaoMembros} title="Gerenciar membros">
              <Icon name="users" size={16} />
            </button>
            <button onClick={() => handleEditar(grupo)} className={styles.botaoEditar} title="Editar">
              <Icon name="edit" size={16} />
            </button>
            {grupo.GrupoEletivoStatus === 'Ativo' ? (
              <button onClick={() => handleInativar(grupo)} className={styles.botaoExcluir} title="Inativar">
                <Icon name="trash" size={16} />
              </button>
            ) : (
              <button onClick={() => handleReativar(grupo)} className={styles.botaoReativar} title="Reativar">
                <Icon name="check" size={16} />
              </button>
            )}
          </>
        )}
        mensagemVazia="Nenhum grupo eletivo cadastrado. Clique em 'Novo Grupo Eletivo' pra criar um (ex.: eletivas compartilhadas entre turmas)."
      />

      {/* Modal: Criar/Editar Grupo */}
      {modalAberto && (
        <div className={styles.overlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <BaseFormularioCadastro
              titulo={grupoEditando ? 'Editar Grupo Eletivo' : 'Novo Grupo Eletivo'}
              campos={camposFormulario}
              valores={valoresFormulario}
              onChange={(campo, valor) => setValoresFormulario({ ...valoresFormulario, [campo]: valor })}
              onSubmit={handleSubmitFormulario}
              onCancel={() => {
                setModalAberto(false);
                setGrupoEditando(null);
                setValoresFormulario({ GrupoEletivoNome: '' });
              }}
              loading={salvandoFormulario}
              erro={erroFormulario}
              botaoTexto={grupoEditando ? 'Salvar Alterações' : 'Criar Grupo'}
            />
          </div>
        </div>
      )}

      {/* Modal: Gerenciar Membros */}
      {grupoMembrosAberto && (
        <div className={styles.overlay} onClick={fecharMembros}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalConteudo}>
              <h2 className={styles.modalTitulo}>
                <Icon name="users" size={20} /> Membros — {grupoMembrosAberto.GrupoEletivoNome}
              </h2>

              <div className={styles.buscaMembroBox}>
                <label className={styles.buscaLabel}>Adicionar aluno (busca por nome)</label>
                <input
                  type="text"
                  className={styles.buscaInput}
                  placeholder="Digite o nome do aluno..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  disabled={adicionandoMembro}
                />
                {termoBusca.trim().length >= 3 && (
                  <div className={styles.candidatosLista}>
                    {buscando ? (
                      <p className={styles.candidatosStatus}>Buscando...</p>
                    ) : candidatos.length === 0 ? (
                      <p className={styles.candidatosStatus}>Nenhum aluno encontrado com esse nome.</p>
                    ) : (
                      candidatos.map((usuario) => (
                        <button
                          key={usuario.UsuarioGUID}
                          type="button"
                          className={styles.candidatoItem}
                          onClick={() => handleAdicionarMembro(usuario)}
                          disabled={adicionandoMembro}
                        >
                          <span>{usuario.UsuarioNome}</span>
                          <Icon name="plus" size={14} />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className={styles.membrosLista}>
                {carregandoMembros ? (
                  <p className={styles.candidatosStatus}>Carregando membros...</p>
                ) : membros.length === 0 ? (
                  <p className={styles.candidatosStatus}>Nenhum membro ainda. Busque um aluno acima pra adicionar.</p>
                ) : (
                  membros.map((membro) => (
                    <div key={membro.UsuarioGUID} className={styles.membroItem}>
                      <span>{membro.UsuarioNome}</span>
                      <button
                        type="button"
                        className={styles.botaoRemoverMembro}
                        title="Remover"
                        onClick={() => handleRemoverMembro(membro)}
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button onClick={fecharMembros} className={styles.botaoFechar}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
