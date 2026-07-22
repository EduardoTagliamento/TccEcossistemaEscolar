'use client';

/**
 * Tela de Cadastro de Eventos — visível só a Coordenação/Secretaria/Direção
 * (gate real é o backend, que retorna 403 para os demais papéis; aqui só não
 * linkamos na navbar para os outros — ver `_components/DashboardNavbar.tsx`).
 *
 * Padrão de formulário/estado extraído de
 * `frontend/app/dashboard/[escolaGUID]/cadastro/TarefaForm.tsx`: um objeto
 * de form controlado, `editingGUID` alternando entre modo criação/edição,
 * lista de registros existentes abaixo do form com ações inline, feedback
 * via `alert()` (convenção do resto do app).
 */

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { converterParaBrasil, converterDoBrasil } from '@/lib/timezone-utils';
import {
  Evento,
  EventoAnexo,
  criarEvento,
  atualizarEvento,
  cancelarEvento,
  listarEventos,
  listarAnexosEvento,
  vincularAnexoEvento,
} from '@/lib/api/evento.api';
import { uploadAnexo, ANEXO_TAMANHO_MAXIMO_BYTES, ANEXO_MIME_TYPES_PERMITIDOS } from '@/lib/api/anexo.api';
import styles from './page.module.css';

/**
 * Data padrão do formulário: amanhã às 19h — precisa ser sempre futura
 * (`EventoData` é validado como futura tanto na criação quanto na edição
 * quando alterada, ver `docs/routes/evento-api.md`).
 */
function obterDataPadrao(): string {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(19, 0, 0, 0);
  const ano = amanha.getFullYear();
  const mes = String(amanha.getMonth() + 1).padStart(2, '0');
  const dia = String(amanha.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T19:00`;
}

export default function CadastroEventoPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingGUID, setEditingGUID] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    EventoTitulo: '',
    EventoDescricao: '',
    EventoData: obterDataPadrao(),
  });

  const [arquivoAnexo, setArquivoAnexo] = useState<File | null>(null);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [anexosDoEvento, setAnexosDoEvento] = useState<EventoAnexo[]>([]);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }
    if (usuario && escolaGUID) {
      void carregarEventos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, authLoading, escolaGUID]);

  const carregarEventos = async () => {
    setLoading(true);
    setErro(null);
    try {
      const resultado = await listarEventos({ EscolaGUID: escolaGUID });
      setEventos(resultado.eventos);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = () => {
    setEditingGUID(null);
    setForm({
      EventoTitulo: '',
      EventoDescricao: '',
      EventoData: obterDataPadrao(),
    });
    setArquivoAnexo(null);
    setAnexosDoEvento([]);
  };

  const editarEvento = async (evento: Evento) => {
    setEditingGUID(evento.EventoGUID);
    setForm({
      EventoTitulo: evento.EventoTitulo,
      EventoDescricao: evento.EventoDescricao || '',
      EventoData: converterDoBrasil(evento.EventoData),
    });
    setArquivoAnexo(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const anexos = await listarAnexosEvento(evento.EventoGUID);
      setAnexosDoEvento(anexos);
    } catch {
      setAnexosDoEvento([]);
    }
  };

  const anexarArquivoAoEvento = async (eventoGUID: string) => {
    if (!arquivoAnexo) return;

    if (arquivoAnexo.size > ANEXO_TAMANHO_MAXIMO_BYTES) {
      alert('Arquivo maior que o limite permitido (50MB). O evento foi salvo, mas o anexo não foi enviado.');
      return;
    }
    if (!ANEXO_MIME_TYPES_PERMITIDOS.includes(arquivoAnexo.type)) {
      alert('Tipo de arquivo não permitido. O evento foi salvo, mas o anexo não foi enviado.');
      return;
    }

    setEnviandoAnexo(true);
    try {
      const anexo = await uploadAnexo(arquivoAnexo, escolaGUID);
      await vincularAnexoEvento(eventoGUID, anexo.AnexoGUID);
    } catch (err: any) {
      alert(err?.message || 'Evento salvo, mas houve falha ao anexar o arquivo.');
    } finally {
      setEnviandoAnexo(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErro(null);

    try {
      if (editingGUID) {
        await atualizarEvento(editingGUID, {
          EventoTitulo: form.EventoTitulo,
          EventoDescricao: form.EventoDescricao || null,
          EventoData: converterParaBrasil(form.EventoData),
        });

        if (arquivoAnexo) {
          await anexarArquivoAoEvento(editingGUID);
        }

        alert('Evento atualizado com sucesso!');
      } else {
        const eventoCriado = await criarEvento({
          EscolaGUID: escolaGUID,
          EventoTitulo: form.EventoTitulo,
          EventoDescricao: form.EventoDescricao || undefined,
          EventoData: converterParaBrasil(form.EventoData),
        });

        if (arquivoAnexo) {
          await anexarArquivoAoEvento(eventoCriado.EventoGUID);
        }

        alert('Evento criado com sucesso!');
      }

      limparFormulario();
      await carregarEventos();
    } catch (err: any) {
      setErro(err?.message || 'Falha ao salvar evento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelarEvento = async (eventoGUID: string) => {
    if (!confirm('Deseja realmente cancelar este evento?')) return;
    try {
      await cancelarEvento(eventoGUID);
      await carregarEventos();
    } catch (err: any) {
      alert(err?.message || 'Erro ao cancelar evento');
    }
  };

  const obterClasseBadgeStatus = (status: Evento['EventoStatus']) => {
    switch (status) {
      case 'Realizado':
        return styles.badgeRealizado;
      case 'Cancelado':
        return styles.badgeCancelado;
      default:
        return styles.badgeAgendado;
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.titulo}>Cadastro de Eventos</h1>
          <p className={styles.subtitulo}>
            Crie e gerencie eventos amplos da escola — reuniões, festas, palestras, feiras etc.
          </p>
        </div>
      </header>

      {erro && <p className={styles.erro}>{erro}</p>}

      <section className={styles.secao}>
        <h2 className={styles.secaoTitulo}>
          {editingGUID ? 'Editar Evento' : 'Novo Evento'}
        </h2>

        <form onSubmit={onSubmit}>
          <div className={styles.campoContainer}>
            <label className={styles.label} htmlFor="eventoTitulo">Título *</label>
            <input
              id="eventoTitulo"
              className={styles.inputFull}
              value={form.EventoTitulo}
              onChange={(e) => setForm((prev) => ({ ...prev, EventoTitulo: e.target.value }))}
              minLength={3}
              maxLength={128}
              required
            />
          </div>

          <div className={styles.campoContainer}>
            <label className={styles.label} htmlFor="eventoDescricao">Descrição</label>
            <textarea
              id="eventoDescricao"
              className={styles.textarea}
              value={form.EventoDescricao}
              onChange={(e) => setForm((prev) => ({ ...prev, EventoDescricao: e.target.value }))}
              maxLength={1024}
            />
          </div>

          <div className={styles.campoContainer}>
            <label className={styles.label} htmlFor="eventoData">Data e hora *</label>
            <input
              id="eventoData"
              type="datetime-local"
              className={styles.inputFull}
              value={form.EventoData}
              onChange={(e) => setForm((prev) => ({ ...prev, EventoData: e.target.value }))}
              required
            />
            <p className={styles.hint}>A data precisa estar no futuro.</p>
          </div>

          <div className={styles.campoContainer}>
            <label className={styles.label} htmlFor="eventoAnexo">Anexo (opcional)</label>
            <input
              id="eventoAnexo"
              type="file"
              className={styles.inputFile}
              onChange={(e) => setArquivoAnexo(e.target.files?.[0] || null)}
            />
            <p className={styles.hint}>
              PDF, imagens, Word, Excel, TXT ou ZIP — até 50MB.
            </p>

            {anexosDoEvento.length > 0 && (
              <ul className={styles.listaAnexos}>
                {anexosDoEvento.map((anexo) => (
                  <li key={anexo.AnexoGUID}>{anexo.AnexoNomeOriginal || anexo.AnexoGUID}</li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.rodape}>
            <button type="submit" className={styles.botaoSalvar} disabled={submitting || enviandoAnexo}>
              {submitting || enviandoAnexo
                ? 'Salvando...'
                : editingGUID
                  ? 'Atualizar Evento'
                  : 'Criar Evento'}
            </button>
            {editingGUID && (
              <button type="button" className={styles.botaoSecundario} onClick={limparFormulario}>
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </section>

      <section className={styles.secao}>
        <h2 className={styles.secaoTitulo}>Eventos cadastrados</h2>

        {loading ? (
          <p className={styles.info}>Carregando...</p>
        ) : eventos.length === 0 ? (
          <p className={styles.info}>Nenhum evento cadastrado ainda.</p>
        ) : (
          <ul className={styles.lista}>
            {eventos.map((evento) => (
              <li key={evento.EventoGUID} className={styles.card}>
                <div className={styles.cardInfo}>
                  <div className={styles.cardTituloLinha}>
                    <strong className={styles.cardTitulo}>{evento.EventoTitulo}</strong>
                    <span className={`${styles.badge} ${obterClasseBadgeStatus(evento.EventoStatus)}`}>
                      {evento.EventoStatus}
                    </span>
                  </div>
                  {evento.EventoDescricao && (
                    <p className={styles.cardDescricao}>{evento.EventoDescricao}</p>
                  )}
                  <p className={styles.cardData}>
                    {new Date(evento.EventoData).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className={styles.cardActions}>
                  <button type="button" className={styles.botaoAcao} onClick={() => editarEvento(evento)}>
                    Editar
                  </button>
                  {evento.EventoStatus === 'Agendado' && (
                    <button
                      type="button"
                      className={styles.botaoAcaoPerigo}
                      onClick={() => handleCancelarEvento(evento.EventoGUID)}
                    >
                      Cancelar evento
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
