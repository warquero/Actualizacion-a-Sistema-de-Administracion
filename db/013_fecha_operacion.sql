-- 013_fecha_operacion.sql: Distinción estricta de fecha de operación vs creado_en
-- La fecha de operación es un tipo DATE (zona horaria America/Caracas UTC-4)
-- El orden de cálculo de saldo sigue creado_en (cronología de registro)
-- Los filtros de interfaz usan fecha (operación)

CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX IF NOT EXISTS idx_saldo_fecha ON saldo_cuenta(fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_creado_en ON movimientos(creado_en);
CREATE INDEX IF NOT EXISTS idx_saldo_creado_en ON saldo_cuenta(creado_en);
