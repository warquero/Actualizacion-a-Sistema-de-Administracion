/**
 * Inventario ShuryStore · Taller de Sublimación (Venezuela)
 * Lógica principal en JavaScript Vanilla
 * Versión 0.21.1 Beta
 */

// =============================================================================
// 1. UTILIDADES DE FECHA, MONEDA Y TELÉFONO (VENEZUELA UTC-4)
// =============================================================================

/**
 * Fecha actual en zona horaria America/Caracas (UTC-4)
 * Formato YYYY-MM-DD
 */
function fechaHoy() {
  const ahoraUtc = Date.now();
  const caracasTime = new Date(ahoraUtc - 4 * 60 * 60 * 1000);
  return caracasTime.toISOString().split('T')[0];
}

/**
 * Formateo de fecha corta (DD/MM o DD/MM/AAAA) sin usar new Date() directamente
 * para evitar el desfase de un día en navegadores con UTC-4.
 */
function fechaCorta(fechaStr) {
  if (!fechaStr) return '';
  const partes = String(fechaStr).split('T')[0].split('-');
  if (partes.length === 3) {
    const [y, m, d] = partes;
    return `${d}/${m}/${y}`;
  }
  return fechaStr;
}

/**
 * Formateo de número a Bolívares venezolanos (Bs.) con punto de miles y coma decimal.
 * NUNCA usar la palabra "bolivianos".
 */
function formatMontoBs(monto) {
  const num = Number(monto) || 0;
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' Bs.';
}

/**
 * Formateo de número a dólares estadounidenses (US$)
 */
function formatMontoUsd(monto) {
  const num = Number(monto) || 0;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' US$';
}

/**
 * Interpreta una cadena de monto ingresada por el usuario (ej: "1.234,56" o "1234,56") a float.
 */
function parseMontoBs(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  let limpio = String(str).replace(/[^\d.,]/g, '').trim();
  if (!limpio) return 0;

  // Si tiene coma, quitar puntos de miles y cambiar coma por punto
  if (limpio.includes(',')) {
    limpio = limpio.replace(/\./g, '').replace(',', '.');
  }
  const val = parseFloat(limpio);
  return isNaN(val) ? 0 : val;
}

/**
 * REGLA DE FORMATO DE MONTOS:
 * - El usuario escribe solo los dígitos y el campo se completa solo con coma decimal y punto de miles.
 * - Ejemplos: 123 -> 1,23; 12 -> 0,12; 12345 -> 123,45; 1234567 -> 12.345,67.
 * - El número escrito siempre se cuenta en céntimos.
 * - Si el usuario escribe la coma, se respeta tal cual: 1234,56 -> 1.234,56.
 * - El campo se reescribe al salir de él (blur).
 */
function aplicarReglaFormatoMonto(inputElement) {
  inputElement.addEventListener('blur', () => {
    const rawVal = inputElement.value.trim();
    if (!rawVal) return;

    if (rawVal.includes(',')) {
      // El usuario escribió explícitamente la coma, respetar decimales
      const partes = rawVal.split(',');
      const enteros = partes[0].replace(/\D/g, '') || '0';
      const decimales = (partes[1] || '').replace(/\D/g, '').padEnd(2, '0').slice(0, 2);
      const numEntero = parseInt(enteros, 10);
      const conMiles = numEntero.toLocaleString('es-VE');
      inputElement.value = `${conMiles},${decimales}`;
    } else {
      // Solo escribió dígitos: interpretarlo siempre en céntimos
      const digitos = rawVal.replace(/\D/g, '');
      if (!digitos) {
        inputElement.value = '0,00';
        return;
      }
      const centimos = parseInt(digitos, 10);
      const valorFloat = centimos / 100;
      inputElement.value = valorFloat.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  });
}

/**
 * Normaliza y formatea teléfonos venezolanos:
 * Si comienza con 0414, 0424, 0412, 0416, 0426, se formatea a +58 4XX XXX-XXXX
 */
function normalizarTelefonoVe(tlf) {
  if (!tlf) return '';
  const digitos = tlf.replace(/\D/g, '');
  if (/^0?(414|424|412|416|426)\d{7}$/.test(digitos)) {
    const base = digitos.startsWith('0') ? digitos.slice(1) : digitos;
    return `+58 ${base.slice(0, 3)} ${base.slice(3, 6)}-${base.slice(6)}`;
  }
  return tlf;
}

/**
 * Comprueba si un teléfono es móvil venezolano para habilitar WhatsApp
 */
function esMovilVenezolano(tlf) {
  if (!tlf) return false;
  const digitos = tlf.replace(/\D/g, '');
  return /^0?(414|424|412|416|426)\d{7}$/.test(digitos) || /^58(414|424|412|416|426)\d{7}$/.test(digitos);
}

/**
 * Genera el enlace directo a WhatsApp (wa.me)
 */
function getWhatsAppLink(tlf) {
  const digitos = tlf.replace(/\D/g, '');
  let numInternacional = digitos;
  if (digitos.startsWith('0')) {
    numInternacional = '58' + digitos.slice(1);
  } else if (!digitos.startsWith('58') && digitos.length === 10) {
    numInternacional = '58' + digitos;
  }
  return `https://wa.me/${numInternacional}`;
}

/**
 * Genera el enlace a Google Maps: detecta si es enlace existente o hace búsqueda pública
 */
function getGoogleMapsLink(direccion) {
  if (!direccion) return '#';
  if (direccion.startsWith('http://') || direccion.startsWith('https://')) {
    return direccion;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}

/**
 * Limpia y arma enlaces de redes sociales (Instagram, TikTok, Facebook)
 */
function armarEnlaceRedSocial(red, valor) {
  if (!valor) return null;
  const val = valor.trim();
  if (val.startsWith('http://') || val.startsWith('https://')) return val;
  const usuario = val.replace(/^@/, '');
  switch (red) {
    case 'instagram':
      return `https://instagram.com/${usuario}`;
    case 'tiktok':
      return `https://tiktok.com/@${usuario}`;
    case 'facebook':
      return `https://facebook.com/${usuario}`;
    default:
      return null;
  }
}

// =============================================================================
// 2. ESTADO Y CAPA DE DATOS (CON REGLA DE ORO DE HISTORIAL)
// =============================================================================

const STORAGE_KEYS = {
  USUARIO_ACTUAL: 'shury_usuario_activo',
  MATERIALES: 'shury_materiales',
  MOVIMIENTOS: 'shury_movimientos',
  SALDO_CUENTA: 'shury_saldo_cuenta',
  TIPO_CAMBIO: 'shury_tipo_cambio',
  CLIENTES: 'shury_clientes',
  PROVEEDORES: 'shury_proveedores',
  EDICIONES: 'shury_ediciones',
};

// Semilla inicial realista de ShuryStore
const SEED_MATERIALES = [
  {
    id: 'm1',
    nombre: 'Tazas Blancas 11oz para Sublimar',
    unidad: 'unidades',
    stock_minimo: 24,
    costo: 65.0,
    precio_venta: 120.0,
    descripcion: 'Tazas de cerámica calidad AAA aptas para microondas',
    creado_por: 'tecnico',
    creado_en: '2026-10-01T09:00:00Z',
  },
  {
    id: 'm2',
    nombre: 'Franelas Poliéster Spun Blancas (Talla M)',
    unidad: 'unidades',
    stock_minimo: 10,
    costo: 180.0,
    precio_venta: 320.0,
    descripcion: 'Franelas 100% poliéster tacto algodón especial sublimación',
    creado_por: 'tecnico',
    creado_en: '2026-10-01T09:00:00Z',
  },
  {
    id: 'm3',
    nombre: 'Papel de Sublimación Premium A4 (Paquete 100h)',
    unidad: 'paquetes',
    stock_minimo: 3,
    costo: 450.0,
    precio_venta: 750.0,
    descripcion: 'Papel de secado rápido y alta transferencia 100g',
    creado_por: 'tecnico',
    creado_en: '2026-10-01T09:00:00Z',
  },
  {
    id: 'm4',
    nombre: 'Tinta de Sublimación CMYK (Kit 4x100ml)',
    unidad: 'sets',
    stock_minimo: 2,
    costo: 980.0,
    precio_venta: 1650.0,
    descripcion: 'Tintas de alta pigmentación para impresoras Epson',
    creado_por: 'tecnico',
    creado_en: '2026-10-01T09:00:00Z',
  },
  {
    id: 'm5',
    nombre: 'Termos de Aluminio 500ml Blanco con Mosquetón',
    unidad: 'unidades',
    stock_minimo: 12,
    costo: 210.0,
    precio_venta: 390.0,
    descripcion: 'Botella deportiva sublimable con tapón hermético',
    creado_por: 'tecnico',
    creado_en: '2026-10-01T09:00:00Z',
  },
  {
    id: 'm6',
    nombre: 'Cinta Térmica para Sublimación (Rollo 33m)',
    unidad: 'unidades',
    stock_minimo: 5,
    costo: 40.0,
    precio_venta: 85.0,
    descripcion: 'Resistente hasta 250 grados Celsius sin dejar residuos',
    creado_por: 'tecnico',
    creado_en: '2026-10-01T09:00:00Z',
  },
];

const SEED_CLIENTES = [
  {
    id: 'c1',
    nombre: 'Liceo Andrés Bello',
    telefono: '04141234567',
    notas: 'Pedidos recurrentes de franelas de promoción y medallas',
    creado_en: '2026-10-01T10:00:00Z',
  },
  {
    id: 'c2',
    nombre: 'Cafetería El Grano de Oro',
    telefono: '04249876543',
    notas: 'Tazas corporativas con logo grabado a calor',
    creado_en: '2026-10-02T11:00:00Z',
  },
  {
    id: 'c3',
    nombre: 'Gimnasio Titanes Fitness',
    telefono: '04125556677',
    notas: 'Termos de aluminio y toallas sublimadas',
    creado_en: '2026-10-05T14:00:00Z',
  },
];

const SEED_PROVEEDORES = [
  {
    id: 'p1',
    nombre: 'Distribuidora SubliCaracas C.A.',
    contacto: '04143322110',
    direccion: 'Av. San Martín, Edif. Industrial Centro, Galpón 4, Caracas',
    tipo_material: 'Tazas blancas AAA, tintas coreanas y papel de sublimación',
    horario: 'Lunes a Viernes de 8:30 AM a 4:30 PM',
    instagram: '@sublicaracas',
    tiktok: 'sublicaracas_oficial',
    facebook: 'https://facebook.com/sublicaracas',
    creado_en: '2026-10-01T08:00:00Z',
  },
  {
    id: 'p2',
    nombre: 'Textiles El Ávila',
    contacto: '04241122334',
    direccion: 'La Candelaria, Esquina Peligro a Pele el Ojo, Local 12',
    tipo_material: 'Franelas de poliéster spun tacto algodón y gorras trucker',
    horario: 'Lunes a Sábado de 9:00 AM a 5:00 PM',
    instagram: '@textileselavila',
    tiktok: '',
    facebook: 'textileselavilave',
    creado_en: '2026-10-02T09:00:00Z',
  },
  {
    id: 'p3',
    nombre: 'Insugráficos Venezuela',
    contacto: '02125551234',
    direccion: 'Boleíta Norte, Calle Vargas, Centro Empresarial Boleíta piso 2',
    tipo_material: 'Cinta térmica, repuestos de prensas de calor y teflón',
    horario: 'Lunes a Viernes de 8:00 AM a 3:30 PM',
    instagram: 'insugraficos_ve',
    tiktok: '',
    facebook: '',
    creado_en: '2026-10-03T10:00:00Z',
  },
];

// Movimientos iniciales para generar historial de stock y saldo
const SEED_TASA_BCV = [
  { fecha: '2026-10-01', usd: 54.1200, fuente: 'BCV', usuario_nombre: 'tecnico' },
  { fecha: '2026-10-15', usd: 55.3400, fuente: 'BCV', usuario_nombre: 'tecnico' },
  { fecha: '2026-10-24', usd: 56.4520, fuente: 'BCV', usuario_nombre: 'tecnico' },
];

const SEED_SALDO = [
  {
    id: 's1',
    tipo: 'inicial',
    monto: 15500.0,
    concepto: 'Saldo inicial de apertura ShuryStore',
    referencia: 'REF-APERTURA-001',
    factura: '',
    usuario_nombre: 'tecnico',
    creado_en: '2026-10-01T08:30:00Z',
    fecha: '2026-10-01',
    usd: 286.40,
    tasa_usd: 54.12,
    grupo_id: null,
    editado: false,
    cliente_id: null,
  },
  {
    id: 's2',
    tipo: 'salida',
    monto: 3900.0,
    concepto: 'Compra · Factura FAC-1029 (Distribuidora SubliCaracas)',
    referencia: 'REF-COMPRA-01',
    factura: 'FAC-1029',
    usuario_nombre: 'shury',
    creado_en: '2026-10-02T10:00:00Z',
    fecha: '2026-10-02',
    usd: 72.06,
    tasa_usd: 54.12,
    grupo_id: 'g-compra-1',
    editado: false,
    cliente_id: null,
  },
  {
    id: 's3',
    tipo: 'entrada',
    monto: 3600.0,
    concepto: 'Pedido · Cafetería El Grano de Oro (30 Tazas personalizadas)',
    referencia: 'PM-8831',
    factura: 'REC-001',
    usuario_nombre: 'shury',
    creado_en: '2026-10-05T15:00:00Z',
    fecha: '2026-10-05',
    usd: 66.52,
    tasa_usd: 54.12,
    grupo_id: 'g-pedido-1',
    editado: false,
    cliente_id: 'c2',
  },
];

const SEED_MOVIMIENTOS = [
  {
    id: 'mov1',
    material_id: 'm1',
    tipo: 'entrada',
    cantidad: 60,
    motivo: 'Compra según Factura FAC-1029',
    usuario_id: null,
    usuario_nombre: 'shury',
    creado_en: '2026-10-02T10:00:00Z',
    fecha: '2026-10-02',
    grupo_id: 'g-compra-1',
    editado: false,
    cliente_id: null,
  },
  {
    id: 'mov2',
    material_id: 'm1',
    tipo: 'salida',
    cantidad: 30,
    motivo: 'Pedido · Cafetería El Grano de Oro',
    usuario_id: null,
    usuario_nombre: 'shury',
    creado_en: '2026-10-05T15:00:00Z',
    fecha: '2026-10-05',
    grupo_id: 'g-pedido-1',
    editado: false,
    cliente_id: 'c2',
  },
  {
    id: 'mov3',
    material_id: 'm2',
    tipo: 'entrada',
    cantidad: 25,
    motivo: 'Inventario inicial de taller',
    usuario_id: null,
    usuario_nombre: 'tecnico',
    creado_en: '2026-10-01T09:00:00Z',
    fecha: '2026-10-01',
    grupo_id: null,
    editado: false,
    cliente_id: null,
  },
  {
    id: 'mov4',
    material_id: 'm3',
    tipo: 'entrada',
    cantidad: 8,
    motivo: 'Inventario inicial de papel',
    usuario_id: null,
    usuario_nombre: 'tecnico',
    creado_en: '2026-10-01T09:00:00Z',
    fecha: '2026-10-01',
    grupo_id: null,
    editado: false,
    cliente_id: null,
  },
  {
    id: 'mov5',
    material_id: 'm4',
    tipo: 'entrada',
    cantidad: 4,
    motivo: 'Inventario inicial de tintas',
    usuario_id: null,
    usuario_nombre: 'tecnico',
    creado_en: '2026-10-01T09:00:00Z',
    fecha: '2026-10-01',
    grupo_id: null,
    editado: false,
    cliente_id: null,
  },
  {
    id: 'mov6',
    material_id: 'm5',
    tipo: 'entrada',
    cantidad: 0, // Stock en cero a propósito para probar el color rojo
    motivo: 'Agotado temporalmente',
    usuario_id: null,
    usuario_nombre: 'tecnico',
    creado_en: '2026-10-01T09:00:00Z',
    fecha: '2026-10-01',
    grupo_id: null,
    editado: false,
    cliente_id: null,
  },
];

class DataStore {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.USUARIO_ACTUAL)) {
      localStorage.setItem(STORAGE_KEYS.USUARIO_ACTUAL, JSON.stringify(window.CONFIG.USUARIOS_INICIALES[0]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MATERIALES)) {
      localStorage.setItem(STORAGE_KEYS.MATERIALES, JSON.stringify(SEED_MATERIALES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MOVIMIENTOS)) {
      localStorage.setItem(STORAGE_KEYS.MOVIMIENTOS, JSON.stringify(SEED_MOVIMIENTOS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SALDO_CUENTA)) {
      localStorage.setItem(STORAGE_KEYS.SALDO_CUENTA, JSON.stringify(SEED_SALDO));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TIPO_CAMBIO)) {
      localStorage.setItem(STORAGE_KEYS.TIPO_CAMBIO, JSON.stringify(SEED_TASA_BCV));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CLIENTES)) {
      localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(SEED_CLIENTES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROVEEDORES)) {
      localStorage.setItem(STORAGE_KEYS.PROVEEDORES, JSON.stringify(SEED_PROVEEDORES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.EDICIONES)) {
      localStorage.setItem(STORAGE_KEYS.EDICIONES, JSON.stringify([]));
    }
  }

  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  getUsuarioActual() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIO_ACTUAL)) || window.CONFIG.USUARIOS_INICIALES[0];
    } catch {
      return window.CONFIG.USUARIOS_INICIALES[0];
    }
  }

  setUsuarioActual(user) {
    localStorage.setItem(STORAGE_KEYS.USUARIO_ACTUAL, JSON.stringify(user));
  }

  // Tasa BCV: busca la última cargada <= fecha elegida
  getTasaBcvVigente(fechaOperacion) {
    const tasas = this.get(STORAGE_KEYS.TIPO_CAMBIO);
    const fechaRef = fechaOperacion || fechaHoy();
    const candidatas = tasas
      .filter((t) => t.fecha <= fechaRef)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    if (candidatas.length > 0) return candidatas[0].usd;
    if (tasas.length > 0) {
      tasas.sort((a, b) => b.fecha.localeCompare(a.fecha));
      return tasas[0].usd;
    }
    return window.CONFIG.TASA_BCV_DEFAULT;
  }

  // REGLA DE ORO 1: El stock se calcula exclusivamente desde el historial de movimientos
  calcularStock(materialId) {
    const movs = this.get(STORAGE_KEYS.MOVIMIENTOS);
    let total = 0;
    for (const m of movs) {
      if (m.material_id === materialId) {
        if (m.tipo === 'entrada') total += Number(m.cantidad) || 0;
        else if (m.tipo === 'salida') total -= Number(m.cantidad) || 0;
      }
    }
    return Math.max(0, total);
  }

  // REGLA DE ORO 2: El saldo se calcula exclusivamente desde el historial de saldo_cuenta
  calcularSaldoActual() {
    const lista = this.get(STORAGE_KEYS.SALDO_CUENTA);
    // Orden cronológico de registro
    lista.sort((a, b) => new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime());

    let saldo = 0;
    for (const mov of lista) {
      const monto = Number(mov.monto) || 0;
      if (mov.tipo === 'inicial' || mov.tipo === 'entrada' || mov.tipo === 'ajuste') {
        saldo += monto;
      } else if (mov.tipo === 'salida') {
        saldo -= monto;
      }
    }
    return saldo;
  }

  // REGLA DE ORO 3: Registrar edición con rastro sin borrar el movimiento
  registrarEdicion({ tabla, movimientoId, grupoId, campo, valorAnterior, valorNuevo }) {
    const usuario = this.getUsuarioActual();
    const ediciones = this.get(STORAGE_KEYS.EDICIONES);
    const nuevaEdicion = {
      id: 'ed-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      tabla,
      movimiento_id: movimientoId || null,
      grupo_id: grupoId || null,
      campo,
      valor_anterior: String(valorAnterior),
      valor_nuevo: String(valorNuevo),
      usuario_nombre: usuario.nombre || usuario.username,
      creado_en: new Date().toISOString(),
    };
    ediciones.push(nuevaEdicion);
    this.set(STORAGE_KEYS.EDICIONES, ediciones);

    // Marcar editado = true en el registro original
    if (tabla === 'movimientos') {
      const movs = this.get(STORAGE_KEYS.MOVIMIENTOS);
      movs.forEach((m) => {
        if (m.id === movimientoId || (grupoId && m.grupo_id === grupoId)) {
          m.editado = true;
        }
      });
      this.set(STORAGE_KEYS.MOVIMIENTOS, movs);
    } else if (tabla === 'saldo_cuenta') {
      const saldos = this.get(STORAGE_KEYS.SALDO_CUENTA);
      saldos.forEach((s) => {
        if (s.id === movimientoId || (grupoId && s.grupo_id === grupoId)) {
          s.editado = true;
        }
      });
      this.set(STORAGE_KEYS.SALDO_CUENTA, saldos);
    }
  }
}

const store = new DataStore();

// =============================================================================
// 3. CONTROLADOR DE INTERFAZ Y RENDERIZADO
// =============================================================================

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(100%)';
    t.style.transition = 'all 0.25s';
    setTimeout(() => t.remove(), 250);
  }, 3200);
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.add('active');
  }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove('active');
  }
}

// Inicializar eventos de modales (cerrar con botón X o cancelar)
function initModalListeners() {
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-close');
      closeModal(targetId);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  // Formatear automáticamente campos con clase .amount-format
  document.querySelectorAll('.amount-format').forEach(aplicarReglaFormatoMonto);
}

// Actualizar barra superior (BCV y Usuario)
function renderHeader() {
  const user = store.getUsuarioActual();
  const bcv = store.getTasaBcvVigente();

  const headerBcvVal = document.getElementById('headerBcvVal');
  if (headerBcvVal) {
    headerBcvVal.textContent = bcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + ' Bs.';
  }

  const userBadgeName = document.getElementById('userBadgeName');
  const userBadgeRole = document.getElementById('userBadgeRole');
  const userBadgeRoleIcon = document.getElementById('userBadgeRoleIcon');

  if (userBadgeName && userBadgeRole) {
    userBadgeName.textContent = user.nombre || user.username;
    userBadgeRole.textContent = `(${user.rol === 'tecnico' ? 'Técnico' : 'Admin'})`;
    userBadgeRole.className = user.rol === 'tecnico' ? 'user-role-tecnico' : 'user-role-admin';
    if (userBadgeRoleIcon) {
      userBadgeRoleIcon.textContent = user.rol === 'tecnico' ? '⚙️' : '👤';
    }
  }

  // Botón Saldo Inicial: visible/habilitado solo para técnico
  const btnSaldoInicial = document.getElementById('btnOpenSaldoInicial');
  if (btnSaldoInicial) {
    if (user.rol === 'tecnico') {
      btnSaldoInicial.style.display = 'inline-flex';
      btnSaldoInicial.removeAttribute('disabled');
      btnSaldoInicial.title = 'Solo el técnico puede registrar o ajustar el saldo inicial';
    } else {
      btnSaldoInicial.style.display = 'none';
      btnSaldoInicial.setAttribute('disabled', 'true');
    }
  }
}

// =============================================================================
// 4. PESTAÑA 1: INVENTARIO DE MATERIALES DE SUBLIMACIÓN
// =============================================================================

function renderInventario() {
  const grid = document.getElementById('productGrid');
  const countLabel = document.getElementById('materialCountLabel');
  const search = (document.getElementById('searchMaterial')?.value || '').toLowerCase();
  const filterStock = document.getElementById('filterStockStatus')?.value || 'todos';

  if (!grid) return;
  grid.innerHTML = '';

  const materiales = store.get(STORAGE_KEYS.MATERIALES);
  let visibles = 0;

  materiales.forEach((mat) => {
    const stock = store.calcularStock(mat.id);

    // Filtros
    if (search && !mat.nombre.toLowerCase().includes(search) && !(mat.descripcion || '').toLowerCase().includes(search)) {
      return;
    }
    if (filterStock === 'cero' && stock !== 0) return;
    if (filterStock === 'bajo' && (stock === 0 || stock >= (mat.stock_minimo || 5))) return;

    visibles++;

    // Tarjeta de producto
    const card = document.createElement('div');
    card.className = 'product-card';

    // Regla de negocio: color rojo SOLO en 0
    const stockBadgeClass = stock === 0 ? 'stock-pill stock-zero' : 'stock-pill stock-ok';
    const stockText = stock === 0 ? 'Agotado (0)' : `${stock} ${mat.unidad || 'unid'}`;

    card.innerHTML = `
      <div>
        <div class="product-header">
          <div class="product-name">${mat.nombre}</div>
          <span class="${stockBadgeClass}">${stockText}</span>
        </div>
        <div class="product-desc">${mat.descripcion || 'Insumo de sublimación'}</div>
        <div class="product-prices">
          <span>Costo ref: ${formatMontoBs(mat.costo)}</span>
          <span>·</span>
          <span>Venta sugerida: ${formatMontoBs(mat.precio_venta)}</span>
        </div>
      </div>
      <div class="product-footer">
        <span style="font-size: 0.72rem; color: var(--text-dim);">Min. alerta: ${mat.stock_minimo || 5}</span>
        <button class="btn btn-secondary btn-sm btn-quick-buy" data-mat-id="${mat.id}">
          <span>🛒 Comprar más</span>
        </button>
      </div>
    `;

    // Botón rápido de comprar más
    card.querySelector('.btn-quick-buy').addEventListener('click', () => {
      openCompraModalConProducto(mat);
    });

    grid.appendChild(card);
  });

  if (countLabel) {
    countLabel.textContent = `${visibles} de ${materiales.length} productos`;
  }

  if (visibles === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md);">
        No se encontraron productos con el filtro aplicado.
      </div>
    `;
  }
}

// =============================================================================
// 5. PESTAÑA 2: BANCO (HISTORIAL CON ANTES / DESPUÉS)
// =============================================================================

function renderBanco() {
  const list = document.getElementById('bancoList');
  const totalBsEl = document.getElementById('totalSaldoBs');
  const totalUsdEl = document.getElementById('totalSaldoUsd');
  const filtroBsEl = document.getElementById('filtroSaldoBs');
  const filtroUsdEl = document.getElementById('filtroSaldoUsd');

  if (!list) return;
  list.innerHTML = '';

  const todos = store.get(STORAGE_KEYS.SALDO_CUENTA);

  // Orden cronológico de registro estricto para calcular el saldo continuo antes/después
  todos.sort((a, b) => new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime());

  let acumulador = 0;
  const movimientosConSaldo = todos.map((m) => {
    const antes = acumulador;
    const monto = Number(m.monto) || 0;
    if (m.tipo === 'inicial' || m.tipo === 'entrada' || m.tipo === 'ajuste') {
      acumulador += monto;
    } else if (m.tipo === 'salida') {
      acumulador -= monto;
    }
    const despues = acumulador;
    return { ...m, saldoAntes: antes, saldoDespues: despues };
  });

  // Saldo general
  const saldoFinalGeneral = acumulador;
  const tasaVigente = store.getTasaBcvVigente();
  if (totalBsEl) totalBsEl.textContent = formatMontoBs(saldoFinalGeneral);
  if (totalUsdEl) totalUsdEl.textContent = `≈ ${formatMontoUsd(tasaVigente > 0 ? saldoFinalGeneral / tasaVigente : 0)}`;

  // Aplicar filtros de usuario (por fecha de operación, texto y tipo)
  const query = (document.getElementById('searchBanco')?.value || '').toLowerCase();
  const filtroTipo = document.getElementById('filterBancoTipo')?.value || 'todos';
  const desde = document.getElementById('filterBancoFechaDesde')?.value || '';
  const hasta = document.getElementById('filterBancoFechaHasta')?.value || '';

  const filtrados = movimientosConSaldo.filter((m) => {
    if (query) {
      const match =
        (m.concepto || '').toLowerCase().includes(query) ||
        (m.referencia || '').toLowerCase().includes(query) ||
        (m.factura || '').toLowerCase().includes(query) ||
        (m.usuario_nombre || '').toLowerCase().includes(query);
      if (!match) return false;
    }
    if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false;
    if (desde && m.fecha < desde) return false;
    if (hasta && m.fecha > hasta) return false;
    return true;
  });

  // Totales del filtro
  let sumaFiltro = 0;
  filtrados.forEach((m) => {
    const monto = Number(m.monto) || 0;
    if (m.tipo === 'salida') sumaFiltro -= monto;
    else sumaFiltro += monto;
  });

  if (filtroBsEl) filtroBsEl.textContent = formatMontoBs(sumaFiltro);
  if (filtroUsdEl) filtroUsdEl.textContent = `≈ ${formatMontoUsd(tasaVigente > 0 ? sumaFiltro / tasaVigente : 0)}`;

  // Para mostrar en la vista, mostramos del más reciente al más antiguo
  const paraMostrar = [...filtrados].reverse();

  if (paraMostrar.length === 0) {
    list.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md);">
        No hay movimientos bancarios registrados para los filtros seleccionados.
      </div>
    `;
    return;
  }

  paraMostrar.forEach((mov) => {
    const card = document.createElement('div');
    card.className = 'movement-card';

    let tipoClase = 'type-entrada';
    let tipoTexto = 'Ingreso';
    let signo = '+';
    let montoColor = 'var(--success)';

    if (mov.tipo === 'inicial') {
      tipoClase = 'type-inicial';
      tipoTexto = 'Saldo Inicial';
      signo = '';
      montoColor = '#818cf8';
    } else if (mov.tipo === 'salida') {
      tipoClase = 'type-salida';
      tipoTexto = 'Egreso';
      signo = '-';
      montoColor = '#f87171';
    } else if (mov.tipo === 'ajuste') {
      tipoClase = 'type-ajuste';
      tipoTexto = 'Ajuste';
      signo = '±';
      montoColor = '#fbbf24';
    }

    const editBadge = mov.editado
      ? `<span class="edited-badge" style="cursor: pointer;" title="Movimiento corregido. Toca para ver rastro." data-rastro-id="${mov.id}" data-grupo-id="${mov.grupo_id || ''}">✎ (Editado)</span>`
      : '';

    card.innerHTML = `
      <div class="movement-header">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="movement-badge-type ${tipoClase}">${tipoTexto}</span>
          ${editBadge}
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.05rem; font-weight: 800; color: ${montoColor};">
            ${signo}${formatMontoBs(mov.monto)}
          </div>
          <div style="font-size: 0.72rem; color: #a78bfa;">
            ≈ ${formatMontoUsd(mov.usd || (mov.tasa_usd ? mov.monto / mov.tasa_usd : 0))}
          </div>
        </div>
      </div>

      <div class="movement-concept">${mov.concepto}</div>

      <div class="movement-meta">
        <span>📅 Operación: <strong>${fechaCorta(mov.fecha)}</strong></span>
        ${mov.referencia ? `<span>Ref: <strong>${mov.referencia}</strong></span>` : ''}
        ${mov.factura ? `<span>Factura: <strong>${mov.factura}</strong></span>` : ''}
        <span>Por: <em>${mov.usuario_nombre}</em></span>
      </div>

      <div class="movement-before-after">
        <span>Saldo anterior: <strong>${formatMontoBs(mov.saldoAntes)}</strong></span>
        <span>→</span>
        <span>Saldo resultante: <strong>${formatMontoBs(mov.saldoDespues)}</strong></span>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
        <button class="btn btn-secondary btn-sm btn-edit-mov" data-mov-id="${mov.id}">
          <span>✎ Corregir</span>
        </button>
      </div>
    `;

    // Evento de ver rastro si fue editado
    const rastroEl = card.querySelector('[data-rastro-id]');
    if (rastroEl) {
      rastroEl.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirModalRastro(mov.id, mov.grupo_id);
      });
    }

    // Botón de corrección de movimiento
    card.querySelector('.btn-edit-mov').addEventListener('click', () => {
      abrirModalEdicion(mov, 'saldo_cuenta');
    });

    list.appendChild(card);
  });
}

// =============================================================================
// 6. PESTAÑA 3: CARTERA DE CLIENTES
// =============================================================================

function renderClientes() {
  const grid = document.getElementById('clientesGrid');
  const query = (document.getElementById('searchClientes')?.value || '').toLowerCase();
  if (!grid) return;
  grid.innerHTML = '';

  const clientes = store.get(STORAGE_KEYS.CLIENTES);
  const saldos = store.get(STORAGE_KEYS.SALDO_CUENTA);
  const movs = store.get(STORAGE_KEYS.MOVIMIENTOS);

  let visibles = 0;

  clientes.forEach((cli) => {
    if (query) {
      const match =
        (cli.nombre || '').toLowerCase().includes(query) ||
        (cli.telefono || '').toLowerCase().includes(query) ||
        (cli.notas || '').toLowerCase().includes(query);
      if (!match) return;
    }
    visibles++;

    // Calcular estadísticas del cliente desde el historial
    const pedidosCliente = saldos.filter((s) => s.cliente_id === cli.id && s.tipo === 'entrada');
    const totalPagadoBs = pedidosCliente.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
    const totalPagadoUsd = pedidosCliente.reduce((sum, p) => sum + (Number(p.usd) || 0), 0);

    const salidasCliente = movs.filter((m) => m.cliente_id === cli.id && m.tipo === 'salida');
    const unidadesTotales = salidasCliente.reduce((sum, m) => sum + (Number(m.cantidad) || 0), 0);

    const card = document.createElement('div');
    card.className = 'client-card';

    card.innerHTML = `
      <div class="client-header">
        <div class="client-name">${cli.nombre}</div>
        <button class="btn btn-secondary btn-sm btn-edit-cli" data-cli-id="${cli.id}">✎ Editar</button>
      </div>

      <div class="provider-info-line">
        <span>📞</span>
        <a href="tel:${cli.telefono}">${normalizarTelefonoVe(cli.telefono)}</a>
      </div>

      ${cli.notas ? `<div style="font-size: 0.76rem; color: var(--text-muted); background: var(--bg-dark); padding: 6px 8px; border-radius: var(--radius-sm);">${cli.notas}</div>` : ''}

      <div class="client-stats">
        <div class="client-stat-box">
          <div class="c-stat-label">Pedidos</div>
          <div class="c-stat-val">${pedidosCliente.length}</div>
        </div>
        <div class="client-stat-box">
          <div class="c-stat-label">Unidades</div>
          <div class="c-stat-val">${unidadesTotales}</div>
        </div>
        <div class="client-stat-box">
          <div class="c-stat-label">Total Pagado</div>
          <div class="c-stat-val" style="color: #6ee7b7;">${formatMontoBs(totalPagadoBs)}</div>
        </div>
      </div>

      <button class="btn btn-primary btn-sm btn-new-order-cli" data-cli-id="${cli.id}">
        <span>📦 Nuevo Pedido para este Cliente</span>
      </button>
    `;

    card.querySelector('.btn-edit-cli').addEventListener('click', () => {
      abrirModalCliente(cli);
    });

    card.querySelector('.btn-new-order-cli').addEventListener('click', () => {
      abrirModalPedidoConCliente(cli.id);
    });

    grid.appendChild(card);
  });

  if (visibles === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md);">
        No se encontraron clientes registrados con ese criterio.
      </div>
    `;
  }
}

// =============================================================================
// 7. PESTAÑA 4: PROVEEDORES (TARJETAS DESPLEGABLES 100% INDEPENDIENTES)
// =============================================================================

function renderProveedores() {
  const container = document.getElementById('proveedoresList');
  const query = (document.getElementById('searchProveedores')?.value || '').toLowerCase();
  if (!container) return;
  container.innerHTML = '';

  const proveedores = store.get(STORAGE_KEYS.PROVEEDORES);
  let visibles = 0;

  proveedores.forEach((p) => {
    if (query) {
      const match =
        (p.nombre || '').toLowerCase().includes(query) ||
        (p.tipo_material || '').toLowerCase().includes(query) ||
        (p.direccion || '').toLowerCase().includes(query) ||
        (p.contacto || '').toLowerCase().includes(query);
      if (!match) return;
    }
    visibles++;

    const card = document.createElement('div');
    card.className = 'provider-card';

    const tlfNormalizado = normalizarTelefonoVe(p.contacto);
    const esMovil = esMovilVenezolano(p.contacto);
    const waLink = esMovil ? getWhatsAppLink(p.contacto) : null;
    const mapsLink = getGoogleMapsLink(p.direccion);

    const igLink = armarEnlaceRedSocial('instagram', p.instagram);
    const ttLink = armarEnlaceRedSocial('tiktok', p.tiktok);
    const fbLink = armarEnlaceRedSocial('facebook', p.facebook);

    card.innerHTML = `
      <div class="provider-summary">
        <div class="provider-topline">
          <div class="provider-name">${p.nombre}</div>
          <span class="provider-arrow">▾</span>
        </div>

        <!-- Teléfono, dirección y horario uno debajo del otro, cada uno con su icono pegado, sin puntos -->
        ${
          p.contacto
            ? `<div class="provider-info-line">
                 <span>📞</span>
                 <a href="tel:${p.contacto}" class="stop-prop">${tlfNormalizado}</a>
               </div>`
            : ''
        }

        ${
          p.direccion
            ? `<div class="provider-info-line">
                 <span>📍</span>
                 <span>${p.direccion}</span>
               </div>`
            : ''
        }

        ${
          p.horario
            ? `<div class="provider-info-line">
                 <span>🕒</span>
                 <span>${p.horario}</span>
               </div>`
            : ''
        }
      </div>

      <!-- Área Desplegable al Tocar -->
      <div class="provider-details">
        <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-dim); margin-top: 6px;">¿Qué vende?</div>
        <div class="provider-material-tag">${p.tipo_material || 'No especificado'}</div>

        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0;">
          ${
            waLink
              ? `<a href="${waLink}" target="_blank" rel="noopener" class="btn btn-success btn-sm stop-prop">
                   <span>💬 WhatsApp</span>
                 </a>`
              : ''
          }
          <a href="${mapsLink}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm stop-prop">
            <span>🗺️ Google Maps</span>
          </a>
          <button class="btn btn-secondary btn-sm stop-prop btn-copy-dir" data-dir="${p.direccion || ''}">
            <span>📋 Copiar Dirección</span>
          </button>
        </div>

        <!-- Redes Sociales Apiladas -->
        ${
          igLink || ttLink || fbLink
            ? `<div class="provider-social-links">
                 ${igLink ? `<a href="${igLink}" target="_blank" rel="noopener" class="social-link-btn stop-prop">📸 Instagram: ${p.instagram}</a>` : ''}
                 ${ttLink ? `<a href="${ttLink}" target="_blank" rel="noopener" class="social-link-btn stop-prop">🎵 TikTok: ${p.tiktok}</a>` : ''}
                 ${fbLink ? `<a href="${fbLink}" target="_blank" rel="noopener" class="social-link-btn stop-prop">📘 Facebook: ${p.facebook}</a>` : ''}
               </div>`
            : ''
        }

        <div class="provider-actions">
          <button class="btn btn-secondary btn-sm stop-prop btn-edit-prov" data-id="${p.id}">
            <span>✎ Editar</span>
          </button>
          <button class="btn btn-danger btn-sm stop-prop btn-del-prov" data-id="${p.id}" data-nombre="${p.nombre}">
            <span>🗑 Borrar</span>
          </button>
        </div>
      </div>
    `;

    // Tarjeta desplegable al tocar la summary
    const summaryEl = card.querySelector('.provider-summary');
    summaryEl.addEventListener('click', (e) => {
      // Si tocó un enlace o botón dentro de la summary, no desplegar
      if (e.target.closest('.stop-prop')) return;
      card.classList.toggle('open');
    });

    // Detener propagación en todos los botones y enlaces internos
    card.querySelectorAll('.stop-prop').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });

    // Copiar dirección al portapapeles
    const btnCopy = card.querySelector('.btn-copy-dir');
    if (btnCopy) {
      btnCopy.addEventListener('click', async () => {
        const text = btnCopy.getAttribute('data-dir');
        if (text) {
          try {
            await navigator.clipboard.writeText(text);
            showToast('Dirección copiada al portapapeles', 'success');
          } catch {
            showToast('No se pudo copiar automáticamente', 'warning');
          }
        }
      });
    }

    // Editar proveedor
    card.querySelector('.btn-edit-prov').addEventListener('click', () => {
      abrirModalProveedor(p);
    });

    // Borrar proveedor con confirmación previa
    card.querySelector('.btn-del-prov').addEventListener('click', () => {
      if (confirm(`¿Estás seguro de que deseas eliminar al proveedor "${p.nombre}"? Esta acción no se puede deshacer.`)) {
        eliminarProveedor(p.id);
      }
    });

    container.appendChild(card);
  });

  if (visibles === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md);">
        No se encontraron proveedores registrados con ese criterio.
      </div>
    `;
  }
}

function eliminarProveedor(id) {
  const lista = store.get(STORAGE_KEYS.PROVEEDORES);
  const filtrada = lista.filter((p) => p.id !== id);
  store.set(STORAGE_KEYS.PROVEEDORES, filtrada);
  showToast('Proveedor eliminado correctamente', 'success');
  renderProveedores();
}

// =============================================================================
// 8. FORMULARIO MULTI-LÍNEA: COMPRA DE PRODUCTO (FACTURA)
// =============================================================================

let lineasCompra = [];

function openCompraModalConProducto(producto) {
  lineasCompra = [
    {
      material_id: producto.id,
      cantidad: 10,
      esNuevo: false,
      nombreNuevo: '',
    },
  ];
  setupModalCompra();
  openModal('modalCompra');
}

function setupModalCompra() {
  const container = document.getElementById('compraLinesContainer');
  const fechaInput = document.getElementById('compraFecha');
  const facturaInput = document.getElementById('compraFactura');
  const refInput = document.getElementById('compraReferencia');
  const totalBsInput = document.getElementById('compraTotalBs');
  const comisionInput = document.getElementById('compraComisionBs');
  const calcCostoEl = document.getElementById('compraCostoCalc');

  if (fechaInput) fechaInput.value = fechaHoy();
  if (facturaInput) facturaInput.value = '';
  if (refInput) refInput.value = '';
  if (totalBsInput) totalBsInput.value = '';
  if (comisionInput) comisionInput.value = '';

  if (lineasCompra.length === 0) {
    const mats = store.get(STORAGE_KEYS.MATERIALES);
    lineasCompra = [
      {
        material_id: mats[0]?.id || '',
        cantidad: 1,
        esNuevo: false,
        nombreNuevo: '',
      },
    ];
  }

  renderLineasCompra();

  // Recalcular costo unitario automático
  function actualizarCalculoCosto() {
    const totalBs = parseMontoBs(totalBsInput.value);
    if (lineasCompra.length === 1 && lineasCompra[0].cantidad > 0 && totalBs > 0) {
      const unitario = totalBs / lineasCompra[0].cantidad;
      calcCostoEl.textContent = `Costo unitario automático: ${formatMontoBs(unitario)} por unidad`;
      calcCostoEl.style.color = '#34d399';
    } else if (lineasCompra.length > 1) {
      calcCostoEl.textContent = 'Costo unitario automático: No aplica (factura con varios productos)';
      calcCostoEl.style.color = 'var(--text-dim)';
    } else {
      calcCostoEl.textContent = 'Ingresa el total de la factura para calcular';
      calcCostoEl.style.color = 'var(--text-dim)';
    }
  }

  totalBsInput.addEventListener('input', actualizarCalculoCosto);
  totalBsInput.addEventListener('blur', actualizarCalculoCosto);
}

function renderLineasCompra() {
  const container = document.getElementById('compraLinesContainer');
  if (!container) return;
  container.innerHTML = '';

  const materiales = store.get(STORAGE_KEYS.MATERIALES);

  lineasCompra.forEach((linea, index) => {
    const row = document.createElement('div');
    row.style.cssText = 'background: var(--bg-dark); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 6px;';

    const options = materiales
      .map((m) => `<option value="${m.id}" ${m.id === linea.material_id ? 'selected' : ''}>${m.nombre} (${m.unidad})</option>`)
      .join('');

    row.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.75rem; font-weight: 700; color: #a78bfa;">Línea #${index + 1}</span>
        ${lineasCompra.length > 1 ? `<button type="button" class="line-remove-btn" data-index="${index}">&times; Quitar</button>` : ''}
      </div>
      <div style="display: flex; gap: 8px;">
        <div style="flex: 2;">
          <select class="form-select select-compra-mat" data-index="${index}">
            ${options}
            <option value="__NUEVO__" ${linea.esNuevo ? 'selected' : ''}>＋ [Crear Producto Nuevo]</option>
          </select>
        </div>
        <div style="flex: 1;">
          <input type="number" step="any" min="0.01" class="form-input input-compra-cant" data-index="${index}" placeholder="Cantidad" value="${linea.cantidad}" />
        </div>
      </div>
      ${
        linea.esNuevo
          ? `<input type="text" class="form-input input-compra-nombre-nuevo" data-index="${index}" placeholder="Nombre del nuevo producto..." value="${linea.nombreNuevo || ''}" />`
          : ''
      }
    `;

    // Eventos
    const selectMat = row.querySelector('.select-compra-mat');
    selectMat.addEventListener('change', (e) => {
      if (e.target.value === '__NUEVO__') {
        linea.esNuevo = true;
      } else {
        linea.esNuevo = false;
        linea.material_id = e.target.value;
      }
      renderLineasCompra();
    });

    const inputCant = row.querySelector('.input-compra-cant');
    inputCant.addEventListener('input', (e) => {
      linea.cantidad = parseFloat(e.target.value) || 0;
      const calcCostoEl = document.getElementById('compraCostoCalc');
      const totalBsInput = document.getElementById('compraTotalBs');
      if (lineasCompra.length === 1 && linea.cantidad > 0) {
        const totalBs = parseMontoBs(totalBsInput.value);
        if (totalBs > 0) {
          calcCostoEl.textContent = `Costo unitario automático: ${formatMontoBs(totalBs / linea.cantidad)} por unidad`;
        }
      }
    });

    const inputNombreNuevo = row.querySelector('.input-compra-nombre-nuevo');
    if (inputNombreNuevo) {
      inputNombreNuevo.addEventListener('input', (e) => {
        linea.nombreNuevo = e.target.value;
      });
    }

    const removeBtn = row.querySelector('.line-remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        lineasCompra.splice(index, 1);
        renderLineasCompra();
      });
    }

    container.appendChild(row);
  });
}

// =============================================================================
// 9. FORMULARIO MULTI-LÍNEA: PEDIDO / VENTA A CLIENTE
// =============================================================================

let lineasPedido = [];

function abrirModalPedidoConCliente(clienteId) {
  setupModalPedido(clienteId);
  openModal('modalPedido');
}

function setupModalPedido(clienteSeleccionadoId = null) {
  const clienteSelect = document.getElementById('pedidoClienteSelect');
  const fechaInput = document.getElementById('pedidoFecha');
  const totalBsInput = document.getElementById('pedidoTotalBs');
  const equivUsd = document.getElementById('pedidoUsdEquiv');
  const facturaInput = document.getElementById('pedidoFactura');
  const refInput = document.getElementById('pedidoReferencia');

  if (fechaInput) fechaInput.value = fechaHoy();
  if (totalBsInput) totalBsInput.value = '';
  if (facturaInput) facturaInput.value = '';
  if (refInput) refInput.value = '';
  if (equivUsd) equivUsd.textContent = 'Equivalente: 0,00 US$';

  // Cargar clientes en select
  const clientes = store.get(STORAGE_KEYS.CLIENTES);
  if (clienteSelect) {
    clienteSelect.innerHTML = '<option value="">-- Seleccionar Cliente --</option>';
    clientes.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.nombre} (${c.telefono || 'Sin tlf'})`;
      if (clienteSeleccionadoId && c.id === clienteSeleccionadoId) {
        opt.selected = true;
      }
      clienteSelect.appendChild(opt);
    });
  }

  // Línea inicial
  const mats = store.get(STORAGE_KEYS.MATERIALES);
  lineasPedido = [
    {
      material_id: mats[0]?.id || '',
      cantidad: 1,
      precio_unitario: mats[0]?.precio_venta || 0,
    },
  ];

  renderLineasPedido();

  // Actualizar equivalente en USD
  totalBsInput.addEventListener('input', () => {
    const totalBs = parseMontoBs(totalBsInput.value);
    const tasa = store.getTasaBcvVigente(fechaInput.value);
    const usd = tasa > 0 ? totalBs / tasa : 0;
    equivUsd.textContent = `Equivalente: ${formatMontoUsd(usd)} (Tasa BCV: ${tasa.toFixed(2)} Bs.)`;
  });
}

function renderLineasPedido() {
  const container = document.getElementById('pedidoLinesContainer');
  const totalBsInput = document.getElementById('pedidoTotalBs');
  if (!container) return;
  container.innerHTML = '';

  const materiales = store.get(STORAGE_KEYS.MATERIALES);

  lineasPedido.forEach((linea, index) => {
    const row = document.createElement('div');
    row.style.cssText = 'background: var(--bg-dark); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 6px;';

    const options = materiales
      .map((m) => {
        const stockActual = store.calcularStock(m.id);
        return `<option value="${m.id}" ${m.id === linea.material_id ? 'selected' : ''}>${m.nombre} (Stock: ${stockActual})</option>`;
      })
      .join('');

    row.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.75rem; font-weight: 700; color: #a78bfa;">Ítem #${index + 1}</span>
        ${lineasPedido.length > 1 ? `<button type="button" class="line-remove-btn" data-index="${index}">&times; Quitar</button>` : ''}
      </div>
      <div style="display: flex; gap: 8px;">
        <div style="flex: 2;">
          <select class="form-select select-ped-mat" data-index="${index}">
            ${options}
          </select>
        </div>
        <div style="flex: 1;">
          <input type="number" step="any" min="1" class="form-input input-ped-cant" data-index="${index}" placeholder="Cant." value="${linea.cantidad}" />
        </div>
      </div>
    `;

    const selectMat = row.querySelector('.select-ped-mat');
    selectMat.addEventListener('change', (e) => {
      linea.material_id = e.target.value;
      const matObj = materiales.find((m) => m.id === linea.material_id);
      linea.precio_unitario = matObj ? matObj.precio_venta || 0 : 0;
      recalcularTotalSugeridoPedido();
    });

    const inputCant = row.querySelector('.input-ped-cant');
    inputCant.addEventListener('input', (e) => {
      linea.cantidad = parseFloat(e.target.value) || 0;
      recalcularTotalSugeridoPedido();
    });

    const removeBtn = row.querySelector('.line-remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        lineasPedido.splice(index, 1);
        renderLineasPedido();
        recalcularTotalSugeridoPedido();
      });
    }

    container.appendChild(row);
  });
}

function recalcularTotalSugeridoPedido() {
  const totalBsInput = document.getElementById('pedidoTotalBs');
  const equivUsd = document.getElementById('pedidoUsdEquiv');
  const fechaInput = document.getElementById('pedidoFecha');
  const materiales = store.get(STORAGE_KEYS.MATERIALES);

  let totalSugerido = 0;
  lineasPedido.forEach((l) => {
    const mat = materiales.find((m) => m.id === l.material_id);
    const precio = mat ? mat.precio_venta || 0 : 0;
    totalSugerido += (l.cantidad || 0) * precio;
  });

  if (!totalBsInput.value || totalBsInput.value === '0,00') {
    totalBsInput.value = totalSugerido.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const tasa = store.getTasaBcvVigente(fechaInput.value);
    const usd = tasa > 0 ? totalSugerido / tasa : 0;
    equivUsd.textContent = `Equivalente: ${formatMontoUsd(usd)} (Tasa BCV: ${tasa.toFixed(2)} Bs.)`;
  }
}

// =============================================================================
// 10. EDICIÓN DE MOVIMIENTOS CON RASTRO (REGLA DE ORO)
// =============================================================================

function abrirModalEdicion(mov, tabla) {
  const modal = document.getElementById('modalEditarMov');
  const editId = document.getElementById('editMovId');
  const editGrupo = document.getElementById('editGrupoId');
  const editTabla = document.getElementById('editTabla');
  const conceptoInput = document.getElementById('editConcepto');
  const montoInput = document.getElementById('editMontoBs');
  const refInput = document.getElementById('editReferencia');
  const facturaInput = document.getElementById('editFactura');
  const fechaInput = document.getElementById('editFecha');
  const motivoCorrec = document.getElementById('editMotivoCorreccion');

  editId.value = mov.id;
  editGrupo.value = mov.grupo_id || '';
  editTabla.value = tabla;
  conceptoInput.value = mov.concepto || mov.motivo || '';
  montoInput.value = mov.monto ? mov.monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
  refInput.value = mov.referencia || '';
  facturaInput.value = mov.factura || '';
  fechaInput.value = mov.fecha || fechaHoy();
  motivoCorrec.value = '';

  openModal('modalEditarMov');
}

function abrirModalRastro(movId, grupoId) {
  const modal = document.getElementById('modalEdicionesRastro');
  const list = document.getElementById('edicionesRastroList');
  if (!list) return;
  list.innerHTML = '';

  const ediciones = store.get(STORAGE_KEYS.EDICIONES);
  const filtradas = ediciones.filter((e) => e.movimiento_id === movId || (grupoId && e.grupo_id === grupoId));

  if (filtradas.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No hay registros de edición anteriores para este movimiento.</div>`;
  } else {
    filtradas.forEach((ed) => {
      const item = document.createElement('div');
      item.style.cssText = 'background: var(--bg-dark); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.8rem;';
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; color: var(--text-dim); font-size: 0.7rem;">
          <span>Por: <strong>${ed.usuario_nombre}</strong></span>
          <span>${fechaCorta(ed.creado_en)} ${new Date(ed.creado_en).toLocaleTimeString()}</span>
        </div>
        <div style="margin-top: 4px; color: #fbbf24;">Campo corregido: <strong>${ed.campo}</strong></div>
        <div style="color: #f87171; text-decoration: line-through;">Anterior: ${ed.valor_anterior}</div>
        <div style="color: #34d399;">Nuevo: ${ed.valor_nuevo}</div>
      `;
      list.appendChild(item);
    });
  }

  openModal('modalEdicionesRastro');
}

// =============================================================================
// 11. MODALES DE PROVEEDOR Y CLIENTE
// =============================================================================

function abrirModalProveedor(proveedor = null) {
  const modal = document.getElementById('modalProveedor');
  const title = document.getElementById('modalProveedorTitle');
  const idInput = document.getElementById('provId');
  const nomInput = document.getElementById('provNombre');
  const contInput = document.getElementById('provContacto');
  const dirInput = document.getElementById('provDireccion');
  const tipoInput = document.getElementById('provTipoMaterial');
  const horInput = document.getElementById('provHorario');
  const igInput = document.getElementById('provInstagram');
  const ttInput = document.getElementById('provTiktok');
  const fbInput = document.getElementById('provFacebook');

  if (proveedor) {
    title.textContent = '✎ Editar Proveedor';
    idInput.value = proveedor.id;
    nomInput.value = proveedor.nombre || '';
    contInput.value = proveedor.contacto || '';
    dirInput.value = proveedor.direccion || '';
    tipoInput.value = proveedor.tipo_material || '';
    horInput.value = proveedor.horario || '';
    igInput.value = proveedor.instagram || '';
    ttInput.value = proveedor.tiktok || '';
    fbInput.value = proveedor.facebook || '';
  } else {
    title.textContent = '🚚 Nuevo Proveedor';
    idInput.value = '';
    nomInput.value = '';
    contInput.value = '';
    dirInput.value = '';
    tipoInput.value = '';
    horInput.value = '';
    igInput.value = '';
    ttInput.value = '';
    fbInput.value = '';
  }

  openModal('modalProveedor');
}

function abrirModalCliente(cliente = null) {
  const title = document.getElementById('modalClienteTitle');
  const idInput = document.getElementById('clienteId');
  const nomInput = document.getElementById('clienteNombre');
  const telInput = document.getElementById('clienteTelefono');
  const notasInput = document.getElementById('clienteNotas');

  if (cliente) {
    title.textContent = '✎ Editar Cliente';
    idInput.value = cliente.id;
    nomInput.value = cliente.nombre || '';
    telInput.value = cliente.telefono || '';
    notasInput.value = cliente.notas || '';
  } else {
    title.textContent = '👤 Registrar Cliente';
    idInput.value = '';
    nomInput.value = '';
    telInput.value = '';
    notasInput.value = '';
  }

  openModal('modalCliente');
}

// =============================================================================
// 12. GESTIÓN DE TASA BCV Y USUARIOS
// =============================================================================

function abrirModalBcv() {
  const user = store.getUsuarioActual();
  const fechaInput = document.getElementById('bcvFecha');
  const valorInput = document.getElementById('bcvValor');
  const fuenteInput = document.getElementById('bcvFuente');
  const msgEl = document.getElementById('bcvPermisoMsg');
  const btnGuardar = document.getElementById('btnGuardarBcv');

  fechaInput.value = fechaHoy();
  const tasaActual = store.getTasaBcvVigente();
  valorInput.value = tasaActual.toFixed(4);
  fuenteInput.value = 'BCV Oficial';

  if (user.rol === 'tecnico') {
    msgEl.textContent = 'Tienes permisos de rol Técnico para fijar y actualizar la tasa oficial.';
    msgEl.style.color = '#34d399';
    btnGuardar.style.display = 'inline-flex';
  } else {
    msgEl.textContent = 'Modo de solo lectura: únicamente el rol Técnico puede modificar la tasa oficial del BCV.';
    msgEl.style.color = '#f59e0b';
    btnGuardar.style.display = 'none';
  }

  openModal('modalBcv');
}

function abrirModalUserSwitch() {
  const container = document.getElementById('userSelectionList');
  if (!container) return;
  container.innerHTML = '';

  const actual = store.getUsuarioActual();

  window.CONFIG.USUARIOS_INICIALES.forEach((u) => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.style.cssText = 'justify-content: space-between; width: 100%; text-align: left; padding: 10px 14px;';
    const esActivo = actual.username === u.username;

    btn.innerHTML = `
      <div>
        <div style="font-weight: 700; color: #ffffff;">${u.nombre} (@${u.username})</div>
        <div style="font-size: 0.72rem; color: ${u.rol === 'tecnico' ? '#f59e0b' : '#38bdf8'};">Rol: ${u.rol.toUpperCase()}</div>
      </div>
      <div>${esActivo ? '✅ Activo' : 'Seleccionar'}</div>
    `;

    btn.addEventListener('click', () => {
      store.setUsuarioActual(u);
      closeModal('modalUserSwitch');
      renderHeader();
      renderInventario();
      renderBanco();
      showToast(`Cambiado a usuario: ${u.nombre} (${u.rol})`, 'success');
    });

    container.appendChild(btn);
  });

  openModal('modalUserSwitch');
}

// =============================================================================
// 13. REGISTRO DE EVENTOS Y OPERACIONES
// =============================================================================

function setupActionHandlers() {
  // Pestañas
  document.querySelectorAll('.nav-tab-btn').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab-btn').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add('active');

      if (targetId === 'pane-inventario') renderInventario();
      else if (targetId === 'pane-banco') renderBanco();
      else if (targetId === 'pane-clientes') renderClientes();
      else if (targetId === 'pane-proveedores') renderProveedores();
    });
  });

  // Header clicks
  document.getElementById('bcvPill')?.addEventListener('click', abrirModalBcv);
  document.getElementById('userBadgeBtn')?.addEventListener('click', abrirModalUserSwitch);

  // Filtros de inventario
  document.getElementById('searchMaterial')?.addEventListener('input', renderInventario);
  document.getElementById('filterStockStatus')?.addEventListener('change', renderInventario);

  // Filtros de banco
  document.getElementById('searchBanco')?.addEventListener('input', renderBanco);
  document.getElementById('filterBancoTipo')?.addEventListener('change', renderBanco);
  document.getElementById('filterBancoFechaDesde')?.addEventListener('change', renderBanco);
  document.getElementById('filterBancoFechaHasta')?.addEventListener('change', renderBanco);
  document.getElementById('btnResetBancoFilters')?.addEventListener('click', () => {
    document.getElementById('searchBanco').value = '';
    document.getElementById('filterBancoTipo').value = 'todos';
    document.getElementById('filterBancoFechaDesde').value = '';
    document.getElementById('filterBancoFechaHasta').value = '';
    renderBanco();
  });

  // Filtros de clientes y proveedores
  document.getElementById('searchClientes')?.addEventListener('input', renderClientes);
  document.getElementById('searchProveedores')?.addEventListener('input', renderProveedores);

  // Botones de abrir modales de creación
  document.getElementById('btnOpenNuevoMaterial')?.addEventListener('click', () => openModal('modalNuevoMaterial'));
  document.getElementById('btnOpenNuevoCliente')?.addEventListener('click', () => abrirModalCliente(null));
  document.getElementById('btnOpenNuevoProveedor')?.addEventListener('click', () => abrirModalProveedor(null));

  // Botón Compra Producto
  document.getElementById('btnOpenCompra')?.addEventListener('click', () => {
    lineasCompra = [];
    setupModalCompra();
    openModal('modalCompra');
  });

  document.getElementById('btnAddCompraLine')?.addEventListener('click', () => {
    const mats = store.get(STORAGE_KEYS.MATERIALES);
    lineasCompra.push({
      material_id: mats[0]?.id || '',
      cantidad: 1,
      esNuevo: false,
      nombreNuevo: '',
    });
    renderLineasCompra();
  });

  // Guardar Compra
  document.getElementById('btnGuardarCompra')?.addEventListener('click', () => {
    const fecha = document.getElementById('compraFecha').value || fechaHoy();
    const factura = document.getElementById('compraFactura').value.trim();
    const referencia = document.getElementById('compraReferencia').value.trim();
    const totalBs = parseMontoBs(document.getElementById('compraTotalBs').value);
    const comisionBs = parseMontoBs(document.getElementById('compraComisionBs').value);
    const usuario = store.getUsuarioActual();

    if (totalBs <= 0) {
      showToast('Por favor ingresa el monto total de la factura', 'warning');
      return;
    }
    if (lineasCompra.length === 0) {
      showToast('Debes agregar al menos una línea de compra', 'warning');
      return;
    }

    const grupoId = 'g-compra-' + Date.now();
    const materiales = store.get(STORAGE_KEYS.MATERIALES);
    const movimientos = store.get(STORAGE_KEYS.MOVIMIENTOS);
    const saldos = store.get(STORAGE_KEYS.SALDO_CUENTA);
    const tasa = store.getTasaBcvVigente(fecha);

    // Procesar cada línea de compra y registrar movimiento de ENTRADA de stock
    lineasCompra.forEach((l) => {
      let targetMatId = l.material_id;
      let matNombre = '';

      if (l.esNuevo) {
        targetMatId = 'm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
        matNombre = l.nombreNuevo || 'Nuevo producto sublimación';
        materiales.push({
          id: targetMatId,
          nombre: matNombre,
          unidad: 'unidades',
          stock_minimo: 5,
          costo: lineasCompra.length === 1 ? totalBs / l.cantidad : 0,
          precio_venta: 0,
          descripcion: 'Creado desde factura de compra ' + factura,
          creado_por: usuario.username,
          creado_en: new Date().toISOString(),
        });
      } else {
        const existente = materiales.find((m) => m.id === targetMatId);
        matNombre = existente ? existente.nombre : 'Producto';
        if (lineasCompra.length === 1 && l.cantidad > 0) {
          existente.costo = totalBs / l.cantidad;
        }
      }

      // Registro de entrada en movimientos
      movimientos.push({
        id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        material_id: targetMatId,
        tipo: 'entrada',
        cantidad: Number(l.cantidad) || 0,
        motivo: `Compra según Factura ${factura || 'S/N'} (${matNombre})`,
        usuario_id: null,
        usuario_nombre: usuario.nombre || usuario.username,
        creado_en: new Date().toISOString(),
        fecha,
        grupo_id: grupoId,
        editado: false,
        cliente_id: null,
      });
    });

    // Descontar saldo UNA SOLA VEZ por el total de la factura
    saldos.push({
      id: 'sal-' + Date.now() + '-fac',
      tipo: 'salida',
      monto: totalBs,
      concepto: `Compra · Factura ${factura || 'S/N'} (${lineasCompra.length} producto${lineasCompra.length > 1 ? 's' : ''})`,
      referencia,
      factura,
      usuario_nombre: usuario.nombre || usuario.username,
      creado_en: new Date().toISOString(),
      fecha,
      usd: tasa > 0 ? parseFloat((totalBs / tasa).toFixed(2)) : 0,
      tasa_usd: tasa,
      grupo_id: grupoId,
      editado: false,
      cliente_id: null,
    });

    // Comisión bancaria: movimiento separado si es mayor a 0
    if (comisionBs > 0) {
      saldos.push({
        id: 'sal-' + Date.now() + '-com',
        tipo: 'salida',
        monto: comisionBs,
        concepto: `Comisión bancaria · Factura ${factura || 'S/N'}`,
        referencia,
        factura,
        usuario_nombre: usuario.nombre || usuario.username,
        creado_en: new Date(Date.now() + 10).toISOString(),
        fecha,
        usd: tasa > 0 ? parseFloat((comisionBs / tasa).toFixed(2)) : 0,
        tasa_usd: tasa,
        grupo_id: grupoId,
        editado: false,
        cliente_id: null,
      });
    }

    store.set(STORAGE_KEYS.MATERIALES, materiales);
    store.set(STORAGE_KEYS.MOVIMIENTOS, movimientos);
    store.set(STORAGE_KEYS.SALDO_CUENTA, saldos);

    closeModal('modalCompra');
    showToast('Compra registrada exitosamente', 'success');
    renderInventario();
    renderBanco();
  });

  // Botón Pedido
  document.getElementById('btnOpenPedido')?.addEventListener('click', () => {
    setupModalPedido();
    openModal('modalPedido');
  });

  document.getElementById('btnAddPedidoLine')?.addEventListener('click', () => {
    const mats = store.get(STORAGE_KEYS.MATERIALES);
    lineasPedido.push({
      material_id: mats[0]?.id || '',
      cantidad: 1,
      precio_unitario: mats[0]?.precio_venta || 0,
    });
    renderLineasPedido();
    recalcularTotalSugeridoPedido();
  });

  // Guardar Pedido
  document.getElementById('btnGuardarPedido')?.addEventListener('click', () => {
    const clienteId = document.getElementById('pedidoClienteSelect').value;
    const fecha = document.getElementById('pedidoFecha').value || fechaHoy();
    const totalBs = parseMontoBs(document.getElementById('pedidoTotalBs').value);
    const factura = document.getElementById('pedidoFactura').value.trim();
    const referencia = document.getElementById('pedidoReferencia').value.trim();
    const usuario = store.getUsuarioActual();

    if (!clienteId) {
      showToast('Selecciona un cliente para el pedido', 'warning');
      return;
    }
    if (totalBs <= 0) {
      showToast('Ingresa el monto total cobrado por el pedido', 'warning');
      return;
    }
    if (lineasPedido.length === 0) {
      showToast('Debes agregar al menos un ítem al pedido', 'warning');
      return;
    }

    const grupoId = 'g-ped-' + Date.now();
    const clientes = store.get(STORAGE_KEYS.CLIENTES);
    const materiales = store.get(STORAGE_KEYS.MATERIALES);
    const movimientos = store.get(STORAGE_KEYS.MOVIMIENTOS);
    const saldos = store.get(STORAGE_KEYS.SALDO_CUENTA);
    const cliObj = clientes.find((c) => c.id === clienteId);
    const tasa = store.getTasaBcvVigente(fecha);

    // Salida de stock por cada ítem
    lineasPedido.forEach((l) => {
      const mat = materiales.find((m) => m.id === l.material_id);
      movimientos.push({
        id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        material_id: l.material_id,
        tipo: 'salida',
        cantidad: Number(l.cantidad) || 0,
        motivo: `Pedido · ${cliObj ? cliObj.nombre : 'Cliente'} (${mat ? mat.nombre : 'Producto'})`,
        usuario_id: null,
        usuario_nombre: usuario.nombre || usuario.username,
        creado_en: new Date().toISOString(),
        fecha,
        grupo_id: grupoId,
        editado: false,
        cliente_id: clienteId,
      });
    });

    // Entrada a cuenta bancaria
    saldos.push({
      id: 'sal-' + Date.now() + '-ped',
      tipo: 'entrada',
      monto: totalBs,
      concepto: `Pedido · ${cliObj ? cliObj.nombre : 'Cliente'} (${lineasPedido.length} ítem${lineasPedido.length > 1 ? 's' : ''})`,
      referencia,
      factura,
      usuario_nombre: usuario.nombre || usuario.username,
      creado_en: new Date().toISOString(),
      fecha,
      usd: tasa > 0 ? parseFloat((totalBs / tasa).toFixed(2)) : 0,
      tasa_usd: tasa,
      grupo_id: grupoId,
      editado: false,
      cliente_id: clienteId,
    });

    store.set(STORAGE_KEYS.MOVIMIENTOS, movimientos);
    store.set(STORAGE_KEYS.SALDO_CUENTA, saldos);

    closeModal('modalPedido');
    showToast('Pedido registrado con éxito', 'success');
    renderInventario();
    renderBanco();
    renderClientes();
  });

  // Movimientos rápidos de stock (+ Entrada / - Salida)
  document.getElementById('btnOpenEntrada')?.addEventListener('click', () => abrirModalStockMov('entrada'));
  document.getElementById('btnOpenSalida')?.addEventListener('click', () => abrirModalStockMov('salida'));

  function abrirModalStockMov(tipo) {
    const title = document.getElementById('modalStockMovTitle');
    const select = document.getElementById('stockMovMaterialSelect');
    const cantInput = document.getElementById('stockMovCantidad');
    const motivoInput = document.getElementById('stockMovMotivo');
    const fechaInput = document.getElementById('stockMovFecha');
    const tipoInput = document.getElementById('stockMovTipo');

    tipoInput.value = tipo;
    title.textContent = tipo === 'entrada' ? '＋ Entrada de Stock' : '− Salida de Stock';
    cantInput.value = '';
    motivoInput.value = '';
    fechaInput.value = fechaHoy();

    const materiales = store.get(STORAGE_KEYS.MATERIALES);
    select.innerHTML = '';
    materiales.forEach((m) => {
      const stock = store.calcularStock(m.id);
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.nombre} (Stock actual: ${stock} ${m.unidad})`;
      select.appendChild(opt);
    });

    openModal('modalStockMov');
  }

  document.getElementById('btnGuardarStockMov')?.addEventListener('click', () => {
    const tipo = document.getElementById('stockMovTipo').value;
    const materialId = document.getElementById('stockMovMaterialSelect').value;
    const cantidad = parseFloat(document.getElementById('stockMovCantidad').value);
    const motivo = document.getElementById('stockMovMotivo').value.trim();
    const fecha = document.getElementById('stockMovFecha').value || fechaHoy();
    const usuario = store.getUsuarioActual();

    if (!cantidad || cantidad <= 0) {
      showToast('Por favor ingresa una cantidad válida mayor a 0', 'warning');
      return;
    }
    if (!motivo) {
      showToast('Ingresa el motivo del movimiento', 'warning');
      return;
    }

    const movimientos = store.get(STORAGE_KEYS.MOVIMIENTOS);
    movimientos.push({
      id: 'mov-' + Date.now(),
      material_id: materialId,
      tipo,
      cantidad,
      motivo,
      usuario_id: null,
      usuario_nombre: usuario.nombre || usuario.username,
      creado_en: new Date().toISOString(),
      fecha,
      grupo_id: null,
      editado: false,
      cliente_id: null,
    });

    store.set(STORAGE_KEYS.MOVIMIENTOS, movimientos);
    closeModal('modalStockMov');
    showToast(`Movimiento de ${tipo} guardado correctamente`, 'success');
    renderInventario();
  });

  // Movimientos de Banco: Saldo inicial, Ingreso, Egreso, Ajuste
  document.getElementById('btnOpenSaldoInicial')?.addEventListener('click', () => abrirModalBancoMov('inicial'));
  document.getElementById('btnOpenIngreso')?.addEventListener('click', () => abrirModalBancoMov('entrada'));
  document.getElementById('btnOpenEgreso')?.addEventListener('click', () => abrirModalBancoMov('salida'));
  document.getElementById('btnOpenAjuste')?.addEventListener('click', () => abrirModalBancoMov('ajuste'));

  function abrirModalBancoMov(tipo) {
    const user = store.getUsuarioActual();
    if (tipo === 'inicial' && user.rol !== 'tecnico') {
      showToast('Solo el rol Técnico puede registrar o ajustar el Saldo Inicial', 'error');
      return;
    }

    const title = document.getElementById('modalBancoMovTitle');
    const tipoInput = document.getElementById('bancoMovTipo');
    const montoInput = document.getElementById('bancoMovMontoBs');
    const conceptoInput = document.getElementById('bancoMovConcepto');
    const refInput = document.getElementById('bancoMovReferencia');
    const facInput = document.getElementById('bancoMovFactura');
    const fechaInput = document.getElementById('bancoMovFecha');

    tipoInput.value = tipo;
    montoInput.value = '';
    conceptoInput.value = '';
    refInput.value = '';
    facInput.value = '';
    fechaInput.value = fechaHoy();

    const titulos = {
      inicial: '＋ Saldo Inicial (Solo Técnico)',
      entrada: '＋ Ingreso Bancario',
      salida: '− Egreso Bancario',
      ajuste: '± Ajuste de Cuenta',
    };
    title.textContent = titulos[tipo] || '＋ Movimiento Bancario';

    openModal('modalBancoMov');
  }

  document.getElementById('btnGuardarBancoMov')?.addEventListener('click', () => {
    const tipo = document.getElementById('bancoMovTipo').value;
    const monto = parseMontoBs(document.getElementById('bancoMovMontoBs').value);
    const concepto = document.getElementById('bancoMovConcepto').value.trim();
    const referencia = document.getElementById('bancoMovReferencia').value.trim();
    const factura = document.getElementById('bancoMovFactura').value.trim();
    const fecha = document.getElementById('bancoMovFecha').value || fechaHoy();
    const usuario = store.getUsuarioActual();

    if (tipo === 'inicial' && usuario.rol !== 'tecnico') {
      showToast('Solo el técnico tiene privilegios para registrar saldo inicial', 'error');
      return;
    }
    if (monto <= 0) {
      showToast('Ingresa un monto válido mayor a 0', 'warning');
      return;
    }
    if (!concepto) {
      showToast('Ingresa el concepto del movimiento', 'warning');
      return;
    }

    const saldos = store.get(STORAGE_KEYS.SALDO_CUENTA);
    const tasa = store.getTasaBcvVigente(fecha);

    saldos.push({
      id: 'sal-' + Date.now(),
      tipo,
      monto,
      concepto,
      referencia,
      factura,
      usuario_nombre: usuario.nombre || usuario.username,
      creado_en: new Date().toISOString(),
      fecha,
      usd: tasa > 0 ? parseFloat((monto / tasa).toFixed(2)) : 0,
      tasa_usd: tasa,
      grupo_id: null,
      editado: false,
      cliente_id: null,
    });

    store.set(STORAGE_KEYS.SALDO_CUENTA, saldos);
    closeModal('modalBancoMov');
    showToast('Movimiento registrado en la cuenta', 'success');
    renderBanco();
  });

  // Guardar Edición con Rastro
  document.getElementById('btnConfirmarEdicion')?.addEventListener('click', () => {
    const movId = document.getElementById('editMovId').value;
    const grupoId = document.getElementById('editGrupoId').value || null;
    const tabla = document.getElementById('editTabla').value;
    const nuevoConcepto = document.getElementById('editConcepto').value.trim();
    const nuevoMonto = parseMontoBs(document.getElementById('editMontoBs').value);
    const nuevaRef = document.getElementById('editReferencia').value.trim();
    const nuevaFac = document.getElementById('editFactura').value.trim();
    const nuevaFecha = document.getElementById('editFecha').value;
    const motivoCorreccion = document.getElementById('editMotivoCorreccion').value.trim();

    if (!motivoCorreccion) {
      showToast('Por favor escribe el motivo de la corrección para auditoría', 'warning');
      return;
    }

    const usuario = store.getUsuarioActual();

    if (tabla === 'saldo_cuenta') {
      const saldos = store.get(STORAGE_KEYS.SALDO_CUENTA);
      const reg = saldos.find((s) => s.id === movId);
      if (!reg) return;

      if (reg.tipo === 'inicial' && usuario.rol !== 'tecnico') {
        showToast('Solo el técnico puede corregir el saldo inicial', 'error');
        return;
      }

      // Auditar cada campo que cambió
      if (reg.concepto !== nuevoConcepto) {
        store.registrarEdicion({ tabla, movimientoId: movId, grupoId, campo: 'concepto', valorAnterior: reg.concepto, valorNuevo: nuevoConcepto });
        reg.concepto = nuevoConcepto;
      }
      if (reg.monto !== nuevoMonto) {
        store.registrarEdicion({ tabla, movimientoId: movId, grupoId, campo: 'monto', valorAnterior: reg.monto, valorNuevo: nuevoMonto });
        reg.monto = nuevoMonto;
        if (reg.tasa_usd && reg.tasa_usd > 0) {
          reg.usd = parseFloat((nuevoMonto / reg.tasa_usd).toFixed(2));
        }
      }
      if (reg.referencia !== nuevaRef) {
        store.registrarEdicion({ tabla, movimientoId: movId, grupoId, campo: 'referencia', valorAnterior: reg.referencia, valorNuevo: nuevaRef });
        reg.referencia = nuevaRef;
      }
      if (reg.factura !== nuevaFac) {
        store.registrarEdicion({ tabla, movimientoId: movId, grupoId, campo: 'factura', valorAnterior: reg.factura, valorNuevo: nuevaFac });
        reg.factura = nuevaFac;
      }
      if (reg.fecha !== nuevaFecha) {
        store.registrarEdicion({ tabla, movimientoId: movId, grupoId, campo: 'fecha', valorAnterior: reg.fecha, valorNuevo: nuevaFecha });
        reg.fecha = nuevaFecha;
      }

      reg.editado = true;
      store.set(STORAGE_KEYS.SALDO_CUENTA, saldos);
    }

    closeModal('modalEditarMov');
    showToast('Corrección guardada y asentada en el rastro de auditoría', 'success');
    renderBanco();
  });

  // Guardar Proveedor
  document.getElementById('btnGuardarProveedor')?.addEventListener('click', () => {
    const id = document.getElementById('provId').value;
    const nombre = document.getElementById('provNombre').value.trim();
    const contacto = document.getElementById('provContacto').value.trim();
    const direccion = document.getElementById('provDireccion').value.trim();
    const tipo = document.getElementById('provTipoMaterial').value.trim();
    const horario = document.getElementById('provHorario').value.trim();
    const ig = document.getElementById('provInstagram').value.trim();
    const tt = document.getElementById('provTiktok').value.trim();
    const fb = document.getElementById('provFacebook').value.trim();

    if (!nombre) {
      showToast('Ingresa el nombre del proveedor', 'warning');
      return;
    }
    if (!tipo) {
      showToast('Indica qué vende el proveedor (tipo de material)', 'warning');
      return;
    }

    const proveedores = store.get(STORAGE_KEYS.PROVEEDORES);
    if (id) {
      // Editar
      const idx = proveedores.findIndex((p) => p.id === id);
      if (idx !== -1) {
        proveedores[idx] = {
          ...proveedores[idx],
          nombre,
          contacto,
          direccion,
          tipo_material: tipo,
          horario,
          instagram: ig,
          tiktok: tt,
          facebook: fb,
        };
      }
    } else {
      // Nuevo
      proveedores.unshift({
        id: 'p-' + Date.now(),
        nombre,
        contacto,
        direccion,
        tipo_material: tipo,
        horario,
        instagram: ig,
        tiktok: tt,
        facebook: fb,
        creado_en: new Date().toISOString(),
      });
    }

    store.set(STORAGE_KEYS.PROVEEDORES, proveedores);
    closeModal('modalProveedor');
    showToast('Proveedor guardado con éxito', 'success');
    renderProveedores();
  });

  // Guardar Cliente
  document.getElementById('btnGuardarCliente')?.addEventListener('click', () => {
    const id = document.getElementById('clienteId').value;
    const nombre = document.getElementById('clienteNombre').value.trim();
    const telefono = document.getElementById('clienteTelefono').value.trim();
    const notas = document.getElementById('clienteNotas').value.trim();

    if (!nombre) {
      showToast('Ingresa el nombre del cliente o empresa', 'warning');
      return;
    }

    const clientes = store.get(STORAGE_KEYS.CLIENTES);
    if (id) {
      const idx = clientes.findIndex((c) => c.id === id);
      if (idx !== -1) {
        clientes[idx] = { ...clientes[idx], nombre, telefono, notas };
      }
    } else {
      clientes.unshift({
        id: 'c-' + Date.now(),
        nombre,
        telefono,
        notas,
        creado_en: new Date().toISOString(),
      });
    }

    store.set(STORAGE_KEYS.CLIENTES, clientes);
    closeModal('modalCliente');
    showToast('Cliente guardado', 'success');
    renderClientes();
  });

  // Guardar Nuevo Material / Producto
  document.getElementById('btnGuardarNuevoMaterial')?.addEventListener('click', () => {
    const nombre = document.getElementById('matNombre').value.trim();
    const unidad = document.getElementById('matUnidad').value;
    const stockMin = parseFloat(document.getElementById('matStockMin').value) || 5;
    const costo = parseMontoBs(document.getElementById('matCostoBs').value);
    const precioVenta = parseMontoBs(document.getElementById('matPrecioVentaBs').value);
    const descripcion = document.getElementById('matDescripcion').value.trim();
    const usuario = store.getUsuarioActual();

    if (!nombre) {
      showToast('Ingresa el nombre del nuevo producto', 'warning');
      return;
    }

    const materiales = store.get(STORAGE_KEYS.MATERIALES);
    materiales.push({
      id: 'm-' + Date.now(),
      nombre,
      unidad,
      stock_minimo: stockMin,
      costo,
      precio_venta: precioVenta,
      descripcion,
      creado_por: usuario.username,
      creado_en: new Date().toISOString(),
    });

    store.set(STORAGE_KEYS.MATERIALES, materiales);
    closeModal('modalNuevoMaterial');
    showToast('Producto agregado al catálogo', 'success');
    renderInventario();
  });

  // Guardar Tasa BCV (solo técnico)
  document.getElementById('btnGuardarBcv')?.addEventListener('click', () => {
    const user = store.getUsuarioActual();
    if (user.rol !== 'tecnico') {
      showToast('Solo el rol Técnico puede modificar la tasa BCV', 'error');
      return;
    }

    const fecha = document.getElementById('bcvFecha').value || fechaHoy();
    const valor = parseFloat(document.getElementById('bcvValor').value);
    const fuente = document.getElementById('bcvFuente').value.trim() || 'BCV';

    if (!valor || valor <= 0) {
      showToast('Ingresa un valor válido para la tasa', 'warning');
      return;
    }

    const tasas = store.get(STORAGE_KEYS.TIPO_CAMBIO);
    const idx = tasas.findIndex((t) => t.fecha === fecha);
    if (idx !== -1) {
      tasas[idx].usd = valor;
      tasas[idx].fuente = fuente;
      tasas[idx].usuario_nombre = user.username;
    } else {
      tasas.push({
        fecha,
        usd: valor,
        fuente,
        usuario_nombre: user.username,
        creado_en: new Date().toISOString(),
      });
    }

    store.set(STORAGE_KEYS.TIPO_CAMBIO, tasas);
    closeModal('modalBcv');
    showToast(`Tasa BCV fijada en ${valor.toFixed(4)} Bs.`, 'success');
    renderHeader();
    renderBanco();
  });
}

// =============================================================================
// 14. INTEGRACIÓN PWA: SERVICE WORKER E INSTALACIÓN
// =============================================================================

let deferredPrompt = null;

function setupPWA() {
  const btnInstall = document.getElementById('btnInstallPwa');

  // Detección de standalone mode (ya instalada en pantalla de inicio)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (isStandalone && btnInstall) {
    btnInstall.style.display = 'none';
  }

  // Detección de iOS Safari
  const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstall && !isStandalone) {
      btnInstall.style.display = 'inline-flex';
    }
  });

  if (btnInstall) {
    if (isIOS && !isStandalone) {
      btnInstall.style.display = 'inline-flex';
      btnInstall.innerHTML = '<span>⬇ Instalar en iOS</span>';
    }

    btnInstall.addEventListener('click', async () => {
      if (isIOS) {
        openModal('modalIosGuide');
        return;
      }
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          btnInstall.style.display = 'none';
          showToast('¡ShuryStore instalada en tu dispositivo!', 'success');
        }
        deferredPrompt = null;
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    if (btnInstall) btnInstall.style.display = 'none';
    showToast('Aplicación instalada exitosamente', 'success');
  });

  // Registro de Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado con éxito:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Fallo al registrar Service Worker:', err);
        });
    });
  }

  // Indicador de modo Offline
  const bannerOffline = document.getElementById('offlineBanner');
  function updateOnlineStatus() {
    if (bannerOffline) {
      bannerOffline.style.display = navigator.onLine ? 'none' : 'flex';
    }
  }

  window.addEventListener('online', () => {
    updateOnlineStatus();
    showToast('Conexión reestablecida', 'success');
  });
  window.addEventListener('offline', () => {
    updateOnlineStatus();
    showToast('Modo sin conexión activado', 'warning');
  });
  updateOnlineStatus();
}

// =============================================================================
// 15. ARRANQUE DE LA APLICACIÓN
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initModalListeners();
  setupActionHandlers();
  setupPWA();

  renderHeader();
  renderInventario();
  renderBanco();
  renderClientes();
  renderProveedores();
});
