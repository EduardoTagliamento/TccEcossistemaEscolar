const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function dataPorExtenso(data: Date = new Date()): string {
  const dia = DIAS_SEMANA[data.getDay()];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${data.getDate()} de ${MESES[data.getMonth()]}`;
}

export function formatarDiaMes(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}`;
}

export function nomeMes(indice: number): string {
  return MESES[indice] ?? '';
}

export function primeiroNome(nomeCompleto?: string): string {
  return nomeCompleto?.trim().split(/\s+/)[0] ?? '';
}
