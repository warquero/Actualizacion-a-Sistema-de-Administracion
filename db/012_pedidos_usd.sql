-- 012_pedidos_usd.sql: Soporte y consistencia de montos en USD
-- Verifica que cada registro de saldo_cuenta guarde su tasa y contravalor en USD
ALTER TABLE saldo_cuenta ALTER COLUMN usd SET DEFAULT 0.00;
ALTER TABLE saldo_cuenta ALTER COLUMN tasa_usd SET DEFAULT 1.0000;

-- Trigger para autocalcular USD si se omite en la inserción
CREATE OR REPLACE FUNCTION trg_autocalcular_usd()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tasa_usd IS NULL OR NEW.tasa_usd <= 0 THEN
        NEW.tasa_usd := obtener_tasa_bcv(NEW.fecha);
    END IF;
    
    IF NEW.usd IS NULL OR NEW.usd = 0 THEN
        IF NEW.tasa_usd > 0 THEN
            NEW.usd := ROUND((NEW.monto / NEW.tasa_usd)::numeric, 2);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_saldo_autocalcular_usd ON saldo_cuenta;
CREATE TRIGGER trg_saldo_autocalcular_usd
BEFORE INSERT OR UPDATE ON saldo_cuenta
FOR EACH ROW EXECUTE FUNCTION trg_autocalcular_usd();
