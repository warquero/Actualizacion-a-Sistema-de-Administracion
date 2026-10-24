-- 017_proveedores_redes.sql: Columnas de redes sociales en proveedores
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS facebook TEXT;
