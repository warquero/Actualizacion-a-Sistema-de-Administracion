-- 010_pedidos_cliente.sql: Vinculación de pedidos con clientes y vistas analíticas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_movimientos_cliente'
    ) THEN
        ALTER TABLE movimientos 
        ADD CONSTRAINT fk_movimientos_cliente 
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_saldo_cliente'
    ) THEN
        ALTER TABLE saldo_cuenta 
        ADD CONSTRAINT fk_saldo_cliente 
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_movimientos_cliente ON movimientos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_saldo_cliente ON saldo_cuenta(cliente_id);

-- Vista analítica de clientes con total de pedidos, unidades y montos pagados
CREATE OR REPLACE VIEW v_clientes AS
SELECT 
    c.id,
    c.nombre,
    c.telefono,
    c.notas,
    c.creado_en,
    COUNT(DISTINCT s.id) AS total_pedidos,
    COALESCE(SUM(m.cantidad), 0) AS total_unidades,
    COALESCE(SUM(s.monto), 0) AS total_pagado_bs,
    COALESCE(SUM(s.usd), 0) AS total_pagado_usd
FROM clientes c
LEFT JOIN saldo_cuenta s ON c.id = s.cliente_id AND s.tipo = 'entrada'
LEFT JOIN movimientos m ON c.id = m.cliente_id AND m.tipo = 'salida'
GROUP BY c.id, c.nombre, c.telefono, c.notas, c.creado_en;

-- Vista de pedidos agrupados
CREATE OR REPLACE VIEW v_pedidos AS
SELECT 
    s.grupo_id,
    s.fecha,
    s.creado_en,
    s.cliente_id,
    c.nombre AS cliente_nombre,
    s.monto AS total_bs,
    s.usd AS total_usd,
    s.tasa_usd,
    s.referencia,
    s.factura,
    s.concepto,
    s.usuario_nombre,
    s.editado,
    COUNT(m.id) AS total_items,
    COALESCE(SUM(m.cantidad), 0) AS unidades_totales
FROM saldo_cuenta s
LEFT JOIN clientes c ON s.cliente_id = c.id
LEFT JOIN movimientos m ON s.grupo_id = m.grupo_id AND m.tipo = 'salida'
WHERE s.tipo = 'entrada' AND s.concepto LIKE 'Pedido ·%'
GROUP BY s.grupo_id, s.fecha, s.creado_en, s.cliente_id, c.nombre, s.monto, s.usd, s.tasa_usd, s.referencia, s.factura, s.concepto, s.usuario_nombre, s.editado;
