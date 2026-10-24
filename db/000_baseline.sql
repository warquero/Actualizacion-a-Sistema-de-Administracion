-- 000_baseline.sql: Tablas base de Inventario ShuryStore
-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de usuarios del sistema
CREATE TABLE IF NOT EXISTS usuarios (
    usuario_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email_interno TEXT UNIQUE NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('tecnico', 'admin')),
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de materiales / productos del taller de sublimación
CREATE TABLE IF NOT EXISTS materiales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    unidad TEXT NOT NULL DEFAULT 'unidades', -- e.g. 'unidades', 'paquetes', 'metros'
    stock_minimo NUMERIC NOT NULL DEFAULT 5,
    descripcion TEXT,
    costo NUMERIC(14, 2) DEFAULT 0.00,
    precio_venta NUMERIC(14, 2) DEFAULT 0.00,
    creado_por TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de movimientos de inventario (Kardex inmutable)
CREATE TABLE IF NOT EXISTS movimientos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES materiales(id) ON DELETE RESTRICT,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
    cantidad NUMERIC(14, 2) NOT NULL CHECK (cantidad > 0),
    motivo TEXT NOT NULL,
    usuario_id UUID,
    usuario_nombre TEXT NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    fecha DATE NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'America/Caracas'),
    grupo_id UUID,
    editado BOOLEAN DEFAULT FALSE,
    cliente_id UUID
);

-- 4. Tabla de saldo en cuenta bancaria (Bs. y USD)
CREATE TABLE IF NOT EXISTS saldo_cuenta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo TEXT NOT NULL CHECK (tipo IN ('inicial', 'entrada', 'salida', 'ajuste')),
    monto NUMERIC(14, 2) NOT NULL, -- en Bolívares (Bs.)
    concepto TEXT NOT NULL,
    referencia TEXT,
    factura TEXT,
    usuario_nombre TEXT NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    fecha DATE NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'America/Caracas'),
    usd NUMERIC(14, 2) DEFAULT 0.00,
    tasa_usd NUMERIC(14, 4) DEFAULT 1.0000,
    grupo_id UUID,
    editado BOOLEAN DEFAULT FALSE,
    cliente_id UUID
);

-- 5. Tabla de tipo de cambio BCV oficial
CREATE TABLE IF NOT EXISTS tipo_cambio (
    fecha DATE PRIMARY KEY,
    usd NUMERIC(14, 4) NOT NULL,
    fuente TEXT NOT NULL DEFAULT 'BCV',
    usuario_nombre TEXT NOT NULL DEFAULT 'Sistema',
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla de ediciones (Rastro / Auditoría de correcciones)
CREATE TABLE IF NOT EXISTS ediciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tabla TEXT NOT NULL,
    movimiento_id UUID,
    grupo_id UUID,
    campo TEXT NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    usuario_nombre TEXT NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Vista de stock calculada exclusivamente desde el historial
CREATE OR REPLACE VIEW v_stock AS
SELECT 
    m.id AS material_id,
    m.nombre,
    m.unidad,
    m.stock_minimo,
    m.costo,
    m.precio_venta,
    COALESCE(SUM(CASE WHEN mov.tipo = 'entrada' THEN mov.cantidad ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN mov.tipo = 'salida' THEN mov.cantidad ELSE 0 END), 0) AS stock_actual
FROM materiales m
LEFT JOIN movimientos mov ON m.id = mov.material_id
GROUP BY m.id, m.nombre, m.unidad, m.stock_minimo, m.costo, m.precio_venta;
