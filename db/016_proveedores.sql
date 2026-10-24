-- 016_proveedores.sql: Tabla proveedores (100% independiente, sin cruce con Compra, stock ni saldo)
CREATE TABLE IF NOT EXISTS proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    contacto TEXT,
    direccion TEXT,
    tipo_material TEXT, -- Un solo campo de texto libre: qué vende
    horario TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura proveedores autenticados" ON proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserción proveedores autenticados" ON proveedores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Actualización proveedores autenticados" ON proveedores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Borrado proveedores autenticados" ON proveedores FOR DELETE TO authenticated USING (true);
