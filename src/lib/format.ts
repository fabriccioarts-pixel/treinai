export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function formatWeight(kg: number): string {
  return `${kg.toLocaleString("pt-BR")} kg`;
}
