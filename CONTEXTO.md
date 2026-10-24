# Memoria del Proyecto: Inventario ShuryStore

## 1. Identidad y Contexto
**ShuryStore** es un taller de sublimación ubicado en Caracas, Venezuela.
La aplicación es una PWA (Progressive Web App) concebida para operar en teléfonos móviles y tabletas del taller, orientada a mantener un control pulcro, auditable y en tiempo real de:
1. **Inventario de materiales e insumos de sublimación** (tazas, franelas de poliéster, tintas, papeles, cintas térmicas, etc.).
2. **Saldo de cuenta bancaria y caja** (en Bolívares venezolanos `Bs.` y contravalor en `US$`).
3. **Histórico y cartera de clientes**.
4. **Directorio telefónico y comercial de proveedores** (totalmente desacoplado de las compras de inventario).

## 2. Reglas de Negocio (Regla de Oro)
* **Cálculo Exclusivo desde el Historial**:
  - El stock actual de un material **NUNCA** se edita a mano. Es siempre la suma de entradas menos la suma de salidas (`SUM(entradas) - SUM(salidas)`).
  - El saldo en cuenta **NUNCA** se edita a mano. Se computa a partir de los registros de `saldo_cuenta` (`inicial + entradas + ajustes_positivos - egresos`).
* **Los movimientos NO se borran**:
  - Si un usuario cometió una equivocación al tipiar, el movimiento se corrige registrando una anotación en la tabla `ediciones` (quién corrigió, en qué fecha y hora, campo modificado, valor previo y valor nuevo).
  - El registro se marca visualmente con la etiqueta `(Editado)`.
* **Seguridad de Roles (Técnico vs. Admin)**:
  - Solo el rol `tecnico` tiene privilegios para registrar o ajustar el **Saldo Inicial** de apertura de cuenta y para fijar o corregir la **Tasa BCV**.
  - Los roles `admin` operan compras, pedidos, entradas, salidas, clientes, egresos operativos e ingresos diarios.
* **Compra de Productos (Factura multi-línea)**:
  - Una compra puede incluir 1 o múltiples ítems (creando nuevos productos en el catálogo o sumando existencia a los ya registrados).
  - El saldo bancario se debita una única vez por el monto total de la factura.
  - La comisión bancaria (si aplica) se genera como un movimiento secundario e independiente (`Comisión bancaria · <desc>`).
* **Regla de Formato de Montos (Céntimos automáticos)**:
  - Al ingresar montos monetarios, el usuario escribe únicamente los números y la interfaz completa automáticamente la coma decimal y los puntos de miles.
  - Ejemplos: `123` → `1,23`; `12` → `0,12`; `12345` → `123,45`; `1234567` → `12.345,67`.
  - Si el usuario tipea explícitamente una coma, se respeta (`1234,56` → `1.234,56`).
  - La tasa oficial del BCV no sigue esta regla porque maneja 4 decimales.
* **Manejo de Fechas y Zona Horaria**:
  - Zona horaria de Venezuela: `America/Caracas` (UTC-4).
  - Toda fecha de operación se genera mediante `fechaHoy()` (`Date.now() - 4h`).
  - Formato de visualización con `fechaCorta()` para evitar desfaces de fecha por conversión horaria en el navegador.

## 3. Arquitectura de Datos
Tablas:
- `materiales`: Catálogo de insumos y productos con stock mínimo y precios de referencia.
- `movimientos`: Kardex de existencias (entradas y salidas).
- `saldo_cuenta`: Movimientos monetarios en bolívares y contravalor en dólares.
- `tipo_cambio`: Tasa diaria del Banco Central de Venezuela.
- `usuarios`: Cuentas con roles (`tecnico` y `admin`).
- `clientes`: Directorio de clientes con histórico consolidado.
- `proveedores`: Directorio independiente con enlaces directos a WhatsApp, Maps y Redes Sociales.
- `ediciones`: Pista de auditoría inmutable de todas las correcciones.
