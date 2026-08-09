'use client';

/**
 * Botão flutuante "?" — módulo temporário pro teste com um grupo pequeno de
 * usuários (ver backend/database/migrations/2026-08-09-sugestao.sql).
 * Montado uma única vez em layout.tsx, ao lado do MinimizedChatBubble.
 * Qualquer usuário autenticado pode escrever uma sugestão; a lista fica
 * visível só pra admin de plataforma em /admin-plataforma.
 */

import { useState } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import * as SugestaoAPI from '@/lib/api/sugestao.api';
import * as AnexoAPI from '@/lib/api/anexo.api';
import { Icon } from '@/components/Icon';
import styles from './SugestaoFlutuante.module.css';

export default function SugestaoFlutuante() {
  const { usuario } = useAuth();
  const pathname = usePathname();
  const params = useParams();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  if (!usuario) return null;

  const fecharPainel = () => {
    setAberto(false);
    setTexto('');
    setArquivo(null);
    setEnviado(false);
    setErro('');
  };

  // Mesma validação de tamanho/tipo já usada em todo o resto do sistema
  // (ver cadastro-evento/page.tsx, pendencias/[pendenciaGUID]/page.tsx) —
  // o backend confirma de novo (anexo-upload.middleware.ts), isso aqui é só
  // feedback imediato.
  const handleSelecionarArquivo = (novoArquivo: File | null) => {
    if (!novoArquivo) {
      setArquivo(null);
      return;
    }
    if (novoArquivo.size > AnexoAPI.ANEXO_TAMANHO_MAXIMO_BYTES) {
      setErro('Arquivo maior que o limite permitido (50MB).');
      return;
    }
    if (!AnexoAPI.ANEXO_MIME_TYPES_PERMITIDOS.includes(novoArquivo.type)) {
      setErro('Tipo de arquivo não permitido.');
      return;
    }
    setErro('');
    setArquivo(novoArquivo);
  };

  const handleEnviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    setErro('');
    try {
      let anexoGUIDs: string[] | undefined;
      if (arquivo) {
        const anexo = await AnexoAPI.uploadAnexo(arquivo, escolaGUID || '');
        anexoGUIDs = [anexo.AnexoGUID];
      }
      await SugestaoAPI.criarSugestao(texto, escolaGUID || undefined, pathname || undefined, anexoGUIDs);
      setEnviado(true);
      setTexto('');
      setArquivo(null);
      setTimeout(fecharPainel, 1800);
    } catch (err: any) {
      setErro(err?.message || 'Erro ao enviar sugestão');
    } finally {
      setEnviando(false);
    }
  };

  if (!aberto) {
    return (
      <button
        type="button"
        className={styles.botao}
        onClick={() => setAberto(true)}
        aria-label="Enviar sugestão"
        title="Tem uma sugestão? Conta pra gente"
      >
        ?
      </button>
    );
  }

  return (
    <div className={styles.painel} role="dialog" aria-label="Enviar sugestão">
      <div className={styles.painelHeader}>
        <span>Sugestão</span>
        <button type="button" onClick={fecharPainel} aria-label="Fechar">
          ×
        </button>
      </div>

      <div className={styles.painelCorpo}>
        {enviado ? (
          <p className={styles.mensagemSucesso}>Obrigado! Sua sugestão foi enviada. 🙌</p>
        ) : (
          <>
            <p className={styles.painelTexto}>
              Estamos testando a plataforma com um grupo pequeno — conta pra gente o que achou, o que travou ou o
              que faria diferente.
            </p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escreva sua sugestão..."
              maxLength={2000}
              rows={5}
              autoFocus
            />
            <label className={styles.inputArquivo}>
              <Icon name="paperclip" size={14} />
              {arquivo ? arquivo.name : 'Anexar arquivo (opcional)'}
              <input
                type="file"
                accept={AnexoAPI.ANEXO_MIME_TYPES_PERMITIDOS.join(',')}
                onChange={(e) => handleSelecionarArquivo(e.target.files?.[0] || null)}
                hidden
              />
            </label>
            {erro && <p className={styles.erro}>{erro}</p>}
            <button
              type="button"
              className={styles.botaoEnviar}
              onClick={() => void handleEnviar()}
              disabled={!texto.trim() || enviando}
            >
              {enviando ? 'Enviando...' : 'Enviar sugestão'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
