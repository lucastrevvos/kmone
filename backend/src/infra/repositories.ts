import { sql } from "./db.js";

export async function getConfig() {
  const rows =
    await sql`SELECT preco_litro, consumo_km_por_litro FROM config WHERE id = 1`;

  return rows[0] ?? { preco_litro: null, consumo_km_litro: null };
}

export async function setPrecoLitro(v: number) {
  await sql`UPDATE config SET preco_litro = ${v} WHERE id = 1`;
  return v;
}

export async function setConsumo(v: number) {
  await sql`UPDATE config SET consumo_km_por_litro = ${v} WHERE id = 1`;
  return v;
}

type CorridaInput = { valorRecebido: number; kmRodado: number };

export async function addCorrida(input: CorridaInput) {
  const cfg = await getConfig();

  if (!cfg?.preco_litro || !cfg?.consumo_km_por_litro) {
    const e: any = new Error("CONFIG_REQUIRED");
    e.details = [
      "Configure precoLitro e consumoKmPorLitro antes de criar corridas",
    ];
    throw e;
  }

  const litrosUsados = input.kmRodado / Number(cfg.consumo_km_por_litro);
  const custo = +(litrosUsados * Number(cfg.preco_litro)).toFixed(2);
  const rsPorKm = +(input.valorRecebido / input.kmRodado).toFixed(2);
  const lucro = +(input.valorRecebido - custo).toFixed(2);

  const rows = await sql`
    INSERT INTO corridas (id, valor_recebido, km_rodado, rs_por_km, lucro_liquido)
    VALUES (gen_random_uuid(), ${input.valorRecebido}, ${input.kmRodado}, ${rsPorKm}, ${lucro})
    RETURNING *`;

  return rows[0];
}

export async function listCorridas() {
  return await sql`SELECT * FROM corridas ORDER BY created_at DESC`;
}

export async function listCorridasPorDia(dateISO: string) {
  const rows = await sql`
        SELECT * FROM  corridas
        WHERE to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') = ${dateISO}
        ORDER BY created_at DESC`;

  const totals = rows.reduce(
    (a: any, c: any) => {
      a.corridas++;
      a.km += Number(c.km_rodado);
      a.valor += Number(c.valor_recebido);
      a.lucro += Number(c.lucro_liquido);

      return a;
    },
    {
      corridas: 0,
      km: 0,
      valor: 0,
      lucro: 0,
    }
  );

  const rsPorKm = totals.km > 0 ? +(totals.valor / totals.km).toFixed(2) : 0;

  return {
    date: dateISO,
    totals: {
      corridas: totals.corridas,
      km: +totals.km.toFixed(2),
      valorRecebido: +totals.valor.toFixed(2),
      lucroLiquido: +totals.lucro.toFixed(2),
      rsPorKm,
    },
    items: rows,
  };
}
