CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS config (
    id SERIAL PRIMARY KEY,
    preco_litro NUMERIC(10, 2),
    consumo_km_por_litro NUMERIC(10, 2)
);

INSERT INTO config (id, preco_litro, consumo_km_por_litro)
VALUES (1, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS corridas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valor_recebido NUMERIC(10, 2) NOT NULL,
    km_rodado NUMERIC(10, 2) NOT NULL,
    rs_por_km NUMERIC(10, 2) NOT NULL,
    lucro_liquido NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
