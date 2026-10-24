-- 014_referencia.sql: Campo de referencia bancaria e índices
CREATE INDEX IF NOT EXISTS idx_saldo_referencia ON saldo_cuenta(referencia);
CREATE INDEX IF NOT EXISTS idx_saldo_grupo ON saldo_cuenta(grupo_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_grupo ON movimientos(grupo_id);
