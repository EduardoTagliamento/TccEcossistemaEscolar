'use client';

import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import styles from './AnexoUploadField.module.css';

interface AnexoUploadFieldProps {
  id: string;
  arquivo: File | null;
  onChange: (arquivo: File | null) => void;
  accept?: string;
  hint?: string;
  disabled?: boolean;
  /** Texto do estado vazio — default cobre o caso mais comum (anexo único opcional). */
  textoArea?: string;
}

/**
 * Campo de upload de anexo — clicável ou arrastável, com o arquivo
 * selecionado mostrado como um chip removível em vez do `<input type="file">`
 * cru do navegador. Mesmo padrão visual (caixa tracejada, hover verde) já
 * usado pro upload de ícone da escola em `configuracoes`/`criar-escola`,
 * generalizado aqui pra qualquer tipo de arquivo.
 */
export default function AnexoUploadField({
  id,
  arquivo,
  onChange,
  accept,
  hint,
  disabled = false,
  textoArea = 'Clique ou arraste um arquivo aqui',
}: AnexoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastandoSobre, setArrastandoSobre] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.files?.[0] || null);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setArrastandoSobre(false);
    if (disabled) return;
    const arquivoSolto = e.dataTransfer.files?.[0];
    if (arquivoSolto) onChange(arquivoSolto);
  };

  const removerArquivo = () => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      {arquivo ? (
        <div className={styles.arquivoSelecionado}>
          <Icon name="paperclip" size={16} />
          <span className={styles.arquivoNome} title={arquivo.name}>{arquivo.name}</span>
          <button
            type="button"
            className={styles.botaoRemover}
            onClick={removerArquivo}
            disabled={disabled}
            aria-label="Remover arquivo selecionado"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={`${styles.area} ${arrastandoSobre ? styles.areaArrastandoSobre : ''} ${disabled ? styles.areaDesabilitada : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setArrastandoSobre(true);
          }}
          onDragLeave={() => setArrastandoSobre(false)}
          onDrop={handleDrop}
        >
          <Icon name="upload" size={20} />
          <span className={styles.texto}>{textoArea}</span>
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={accept}
            onChange={handleChange}
            disabled={disabled}
            className={styles.inputOculto}
          />
        </label>
      )}
      {hint && <p className={styles.dica}>{hint}</p>}
    </div>
  );
}
