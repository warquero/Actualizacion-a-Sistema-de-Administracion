-- 011_tipo_cambio.sql: Políticas y funciones de tasa BCV oficial
-- Solo rol 'tecnico' puede modificar el tipo de cambio
CREATE POLICY "Inserción tipo_cambio solo tecnico" ON tipo_cambio FOR INSERT TO authenticated WITH CHECK (
    auth_es_tecnico()
);

CREATE POLICY "Actualización tipo_cambio solo tecnico" ON tipo_cambio FOR UPDATE TO authenticated USING (
    auth_es_tecnico()
);

-- Función para obtener la tasa BCV vigente a una fecha (la última cargada <= fecha elegida)
CREATE OR REPLACE FUNCTION obtener_tasa_bcv(p_fecha DATE)
RETURNS NUMERIC AS $$
DECLARE
    v_tasa NUMERIC(14, 4);
BEGIN
    SELECT usd INTO v_tasa
    FROM tipo_cambio
    WHERE fecha <= p_fecha
    ORDER BY fecha DESC
    LIMIT 1;

    IF v_tasa IS NULL THEN
        -- Tasa de respaldo si no hay histórica
        SELECT usd INTO v_tasa FROM tipo_cambio ORDER BY fecha ASC LIMIT 1;
    END IF;

    RETURN COALESCE(v_tasa, 1.0000);
END;
$$ LANGUAGE plpgsql STABLE;
