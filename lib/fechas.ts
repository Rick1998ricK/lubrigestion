const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Fecha y hora de Perú en 24 horas, igual en servidor y navegador
export function fechaHoraLima(iso: string) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: 'numeric',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const p: Record<string, string> = {}
  for (const x of f.formatToParts(new Date(iso))) p[x.type] = x.value
  return `${p.day} ${MESES[Number(p.month) - 1]} ${p.year}, ${p.hour}:${p.minute}`
}