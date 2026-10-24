/**
 * Configuración de Supabase y constantes para Inventario ShuryStore
 * Taller de sublimación - Venezuela (UTC-4)
 */

window.CONFIG = {
  // Credenciales de Supabase
  // Remplaza con las URL y anon key de tu proyecto en https://supabase.com
  SUPABASE_URL: "https://xyzexampleproject.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_testing",

  // Zona horaria de Venezuela
  TIMEZONE: "America/Caracas",
  UTC_OFFSET_HOURS: -4,

  // Versión de la PWA
  APP_VERSION: "0.21.1 Beta",
  TALLER_NOMBRE: "ShuryStore",
  TALLER_RUBRO: "Taller de Sublimación",

  // Monedas
  MONEDA_LOCAL: "Bs.", // Bolívares venezolanos (NUNCA bolivianos)
  MONEDA_EXT: "US$",

  // Tasa BCV por defecto si aún no se ha cargado una de la base de datos
  TASA_BCV_DEFAULT: 56.4520,

  // Usuarios iniciales del sistema (3 admins y 1 técnico)
  USUARIOS_INICIALES: [
    { username: "tecnico", rol: "tecnico", nombre: "Técnico ShuryStore", email: "tecnico@shurystore.internal" },
    { username: "shury", rol: "admin", nombre: "Shury (Admin)", email: "shury@shurystore.internal" },
    { username: "admin2", rol: "admin", nombre: "Carlos (Admin)", email: "carlos@shurystore.internal" },
    { username: "admin3", rol: "admin", nombre: "María (Admin)", email: "maria@shurystore.internal" }
  ]
};
