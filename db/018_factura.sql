-- 018_factura.sql: Número de factura y soporte para compras multi-línea con comisión bancaria
ALTER TABLE saldo_cuenta ADD COLUMN IF NOT EXISTS factura TEXT;

-- Vista para compras agrupadas multi-línea
CREATE OR REPLACE VIEW v_compras AS
SELECT 
    s.grupo_id,
    s.fecha,
    s.creado_en,
    s.monto AS total_factura_bs,
    s.usd AS total_factura_usd,
    s.factura,
    s.referencia,
    s.concepto,
    s.usuario_nombre,
    s.editado,
    COUNT(m.id) AS lineas_compra,
    COALESCE(SUM(m.cantidad), 0) AS total_unidades_compradas
FROM saldo_cuenta s
LEFT JOIN movimientos m ON s.grupo_id = m.grupo_id AND m.tipo = 'entrada'
WHERE s.tipo = 'salida' AND s.concepto LIKE 'Compra ·%'
GROUP BY s.grupo_id, s.fecha, s.creado_en, s.monto, s.usd, s.factura, s.referencia, s.concepto, s.usuario_nombre, s.editado;
