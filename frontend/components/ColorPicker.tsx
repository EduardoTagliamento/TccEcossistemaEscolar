'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import styles from './ColorPicker.module.css';

interface ColorPickerProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

/**
 * Seletor de cor compacto (amostra + input hex), fiel ao padrão de
 * swatches de ui_kits/auth/AuthFlow.jsx -> CriarEscola() (Bauá Design
 * System). Usado apenas em /criar-escola.
 */
export default function ColorPicker({ label, color, onChange, disabled = false }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(color);

  useEffect(() => {
    setHexInput(color);
  }, [color]);

  const handleColorChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setHexInput(newColor);
    onChange(newColor);
  };

  const handleHexInput = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase();

    // Adiciona # se não tiver
    if (!value.startsWith('#')) {
      value = '#' + value;
    }

    // Remove caracteres inválidos
    value = value.replace(/[^#0-9A-F]/g, '');

    // Limita a 7 caracteres (#RRGGBB)
    if (value.length > 7) {
      value = value.substring(0, 7);
    }

    setHexInput(value);

    // Só atualiza a cor se o hex estiver completo
    if (value.length === 7 && /^#[0-9A-F]{6}$/.test(value)) {
      onChange(value);
    }
  };

  return (
    <div className={styles.swatchField}>
      <label className={styles.swatch} style={{ background: color }}>
        <input
          type="color"
          value={color}
          onChange={handleColorChange}
          className={styles.colorInput}
          disabled={disabled}
          aria-label={label}
        />
      </label>
      <span className={styles.swatchLabel}>{label}</span>
      <input
        type="text"
        value={hexInput}
        onChange={handleHexInput}
        placeholder="#000000"
        className={styles.hexInput}
        maxLength={7}
        disabled={disabled}
        aria-label={`${label} — código hexadecimal`}
      />
    </div>
  );
}
