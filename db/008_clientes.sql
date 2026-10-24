-- 008_clientes.sql: Creación de la tabla clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    telefono TEXT,
    notas TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura clientes autenticados" ON clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura clientes autenticados" ON clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Actualización clientes autenticados" ON clientes FOR UPDATE TO authenticated USING (true);
