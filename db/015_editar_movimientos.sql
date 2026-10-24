-- 015_editar_movimientos.sql: Mecanismo de edición con rastro (sin borrado)
-- Los movimientos se corrigen registrando en la tabla 'ediciones':
-- quién, cuándo, tabla, movimiento_id, grupo_id, campo, valor_anterior, valor_nuevo.
-- Marca editado = true.

CREATE OR REPLACE FUNCTION registrar_edicion(
    p_tabla TEXT,
    p_movimiento_id UUID,
    p_grupo_id UUID,
    p_campo TEXT,
    p_valor_anterior TEXT,
    p_valor_nuevo TEXT,
    p_usuario_nombre TEXT
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO ediciones (
        tabla, movimiento_id, grupo_id, campo, valor_anterior, valor_nuevo, usuario_nombre, creado_en
    ) VALUES (
        p_tabla, p_movimiento_id, p_grupo_id, p_campo, p_valor_anterior, p_valor_nuevo, p_usuario_nombre, NOW()
    ) RETURNING id INTO v_id;

    IF p_tabla = 'movimientos' AND p_movimiento_id IS NOT NULL THEN
        UPDATE movimientos SET editado = TRUE WHERE id = p_movimiento_id;
    ELSIF p_tabla = 'saldo_cuenta' AND p_movimiento_id IS NOT NULL THEN
        UPDATE saldo_cuenta SET editado = TRUE WHERE id = p_movimiento_id;
    END IF;

    IF p_grupo_id IS NOT NULL THEN
        UPDATE movimientos SET editado = TRUE WHERE grupo_id = p_grupo_id;
        UPDATE saldo_cuenta SET editado = TRUE WHERE grupo_id = p_grupo_id;
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
