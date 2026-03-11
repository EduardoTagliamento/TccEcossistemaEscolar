'use client';

import { useState, ChangeEvent } from 'react';
import styles from './ColorPicker.module.css';

interface ColorPickerProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export default function ColorPicker({ label, color, onChange, disabled = false }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(color);

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
    <div className={styles.container}>
      <label className={styles.label}>{label}</label>
      <div className={styles.pickerWrapper}>
        <input
          type="color"
          value={color}
          onChange={handleColorChange}
          className={styles.colorInput}
          disabled={disabled}
        />
        <div 
          className={styles.colorPreview}
          style={{ backgroundColor: color }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={handleHexInput}
          placeholder="#000000"
          className={styles.hexInput}
          maxLength={7}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
