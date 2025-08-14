const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function fetchConfig() {
  const res = await fetch(`${API_URL}/config`);

  if (!res.ok) throw new Error("Erro ao buscar config");

  return res.json();
}

export async function fetchCorridas() {
  const res = await fetch(`${API_URL}/corridas`);

  if (!res.ok) throw new Error("Erro ao buscar corridas.");

  return res.json();
}
