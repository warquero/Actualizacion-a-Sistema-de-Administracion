# Guía Operativa - Inventario ShuryStore PWA

Aplicación Web Progresiva (PWA) para el taller de sublimación **ShuryStore** (Venezuela).

## Características Principales
* 📱 **Mobile-First & PWA**: Instalable en celulares Android / iOS, cacheo offline completo con Service Worker (`sw.js`).
* 🎨 **Diseño Moderno**: Tema morado (`#7c3aed`), fondo oscuro (`#160f20`), contraste optimizado para iluminación de taller.
* 📦 **Inventario Sublimación**: Compras multi-línea con buscador, pedidos a clientes, entradas y salidas de stock.
* 🏦 **Banco y Caja**: Moneda local en Bolívares (`Bs.`) y contravalor en dólares (`US$`). Historial detallado con cálculo de saldo antes/después por movimiento.
* 👥 **Clientes y Proveedores**: Historial de pedidos por cliente; proveedores con WhatsApp directo (`wa.me`), Google Maps y redes sociales.
* 🛡️ **Regla de Oro**: Ningún movimiento se borra. Registro de auditoría en la tabla `ediciones`. El stock y el saldo se calculan en vivo desde el historial.

## Usuarios de Prueba (Testing / Beta)
* **Técnico**: `tecnico` (Permisos para registrar/corregir saldo inicial y actualizar tasa BCV).
* **Admins**: `shury`, `carlos`, `maria` (Operación diaria de taller).

## Configuración de Supabase
1. Ingresa en tu proyecto de [Supabase](https://supabase.com).
2. Ejecuta las migraciones contenidas en la carpeta `/db` en el SQL Editor (desde `000_baseline.sql` hasta `018_factura.sql`).
3. (Opcional) Carga los datos de prueba ejecutando `carga-inicial/carga_inicial.sql`.
4. Copia tu URL y anon key en `config.js`.

## Despliegue en Netlify / GitHub
* Repositorio listo para desplegar en Netlify, Vercel o Cloud Run.
* Comando de build: `npm run build` o servir los archivos estáticos directamente.
