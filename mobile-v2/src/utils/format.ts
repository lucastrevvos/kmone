// Retorna YYYY-MM-DD no horário LOCAL (sem UTC slice)
export function todayLocalISO(): string {
  const d = new Date(); // horário local do device
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n
  );
