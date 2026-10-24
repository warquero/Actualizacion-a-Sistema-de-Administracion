-- Carga inicial para ShuryStore (Taller de sublimación - Venezuela)
-- 1. Usuarios del taller (1 técnico y 3 administradores)
INSERT INTO usuarios (usuario_id, username, email_interno, rol)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'tecnico', 'tecnico@shurystore.internal', 'tecnico'),
  ('22222222-2222-2222-2222-222222222222', 'shury', 'shury@shurystore.internal', 'admin'),
  ('33333333-3333-3333-3333-333333333333', 'carlos', 'carlos@shurystore.internal', 'admin'),
  ('44444444-4444-4444-4444-444444444444', 'maria', 'maria@shurystore.internal', 'admin')
ON CONFLICT (username) DO NOTHING;

-- 2. Tasa inicial de cambio BCV oficial
INSERT INTO tipo_cambio (fecha, usd, fuente, usuario_nombre)
VALUES (CURRENT_DATE, 56.4520, 'BCV', 'tecnico')
ON CONFLICT (fecha) DO UPDATE SET usd = EXCLUDED.usd;

-- 3. Saldo inicial de caja/banco (Registrado exclusivamente por el técnico)
INSERT INTO saldo_cuenta (
    tipo, monto, concepto, referencia, usuario_nombre, fecha, usd, tasa_usd
) VALUES (
    'inicial',
    15500.00,
    'Saldo inicial de apertura de cuenta ShuryStore',
    'REF-APERTURA-001',
    'tecnico',
    CURRENT_DATE,
    274.57,
    56.4520
);

-- 4. Clientes iniciales frecuentes del taller
INSERT INTO clientes (id, nombre, telefono, notas)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Liceo Andrés Bello', '04141234567', 'Pedidos de franelas de promoción y medallas'),
  ('c2222222-2222-2222-2222-222222222222', 'Cafetería El Grano de Oro', '04249876543', 'Tazas corporativas personalizadas con logo'),
  ('c3333333-3333-3333-3333-333333333333', 'Gimnasio Titanes Fitness', '04125556677', 'Termos deportivos de aluminio y toallas')
ON CONFLICT DO NOTHING;

-- 5. Proveedores iniciales
INSERT INTO proveedores (id, nombre, contacto, direccion, tipo_material, horario, instagram, tiktok, facebook)
VALUES
  ('p1111111-1111-1111-1111-111111111111', 'Distribuidora SubliCaracas C.A.', '04143322110', 'Av. San Martín, Edif. Industrial Centro, Galpón 4, Caracas', 'Tazas blancas AAA, tintas coreanas y papel de sublimación', 'Lunes a Viernes de 8:30 AM a 4:30 PM', '@sublicaracas', 'sublicaracas_oficial', 'https://facebook.com/sublicaracas'),
  ('p2222222-2222-2222-2222-222222222222', 'Textiles El Ávila', '04241122334', 'La Candelaria, Esquina Peligro a Pele el Ojo, Local 12', 'Franelas de poliéster spun tacto algodón y gorras trucker', 'Lunes a Sábado de 9:00 AM a 5:00 PM', '@textileselavila', '', 'textileselavilave'),
  ('p3333333-3333-3333-3333-333333333333', 'Insugráficos Venezuela', '02125551234', 'Boleíta Norte, Calle Vargas, Centro Empresarial Boleíta piso 2', 'Cinta térmica, repuestos de planchas de calor y teflón', 'Lunes a Viernes de 8:00 AM a 3:30 PM', 'insugraficos_ve', '', '')
ON CONFLICT DO NOTHING;
