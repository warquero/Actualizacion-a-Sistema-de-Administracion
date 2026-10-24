-- 007_hardening.sql: Seguridad RLS y Regla de Oro (No borrar movimientos, solo técnico edita saldo inicial)

-- Habilitar RLS en todas las tablas
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE saldo_cuenta ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_cambio ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ediciones ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura para autenticados
CREATE POLICY "Lectura materiales para autenticados" ON materiales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura movimientos para autenticados" ON movimientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura saldo_cuenta para autenticados" ON saldo_cuenta FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura tipo_cambio para autenticados" ON tipo_cambio FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura usuarios para autenticados" ON usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura ediciones para autenticados" ON ediciones FOR SELECT TO authenticated USING (true);

-- Políticas de inserción y actualización
CREATE POLICY "Inserción materiales autenticados" ON materiales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Actualización materiales autenticados" ON materiales FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Inserción movimientos autenticados" ON movimientos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Actualización movimientos autenticados" ON movimientos FOR UPDATE TO authenticated USING (true);

-- Saldo en cuenta: Solo 'tecnico' puede insertar o editar movimientos de tipo 'inicial'
CREATE OR REPLACE FUNCTION auth_es_tecnico() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM usuarios 
        WHERE usuario_id = auth.uid() 
          AND rol = 'tecnico'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Inserción saldo_cuenta regla tecnico" ON saldo_cuenta FOR INSERT TO authenticated WITH CHECK (
    tipo != 'inicial' OR auth_es_tecnico()
);

CREATE POLICY "Actualización saldo_cuenta regla tecnico" ON saldo_cuenta FOR UPDATE TO authenticated USING (
    tipo != 'inicial' OR auth_es_tecnico()
);

-- Regla de Oro: Prohibir DELETE en movimientos y saldo_cuenta
CREATE OR REPLACE FUNCTION prohibir_borrado_movimientos()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Regla de negocio violada: Los movimientos no se borran. Deben corregirse con una edición registrada.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_delete_movimientos
BEFORE DELETE ON movimientos
FOR EACH ROW EXECUTE FUNCTION prohibir_borrado_movimientos();

CREATE TRIGGER trg_no_delete_saldo_cuenta
BEFORE DELETE ON saldo_cuenta
FOR EACH ROW EXECUTE FUNCTION prohibir_borrado_movimientos();
