/**
 * Composable y utilidades para la gestión de productos con venta por mayor / packs de cantidad.
 */

/**
 * Ordena los paquetes de menor a mayor cantidad y calcula el precio unitario
 * @param {Array<{ quantity: number, total_price: number }>} paquetes
 * @returns {Array} Paquetes ordenados con unitPrice y ahorro calculado
 */
export function procesarPacks(paquetes = []) {
  if (!Array.isArray(paquetes) || paquetes.length === 0) return []

  const ordenados = [...paquetes]
    .filter((p) => p && Number(p.quantity) > 0 && Number(p.total_price) > 0)
    .map((p) => ({
      quantity: Number(p.quantity),
      total_price: Number(p.total_price),
      unitPrice: Math.round(Number(p.total_price) / Number(p.quantity)),
    }))
    .sort((a, b) => a.quantity - b.quantity)

  if (ordenados.length === 0) return []

  // El precio unitario base suele ser el del pack con menor cantidad (ej. 1 unidad)
  const precioUnitarioBase = ordenados[0].unitPrice

  return ordenados.map((pkg) => {
    let porcentajeAhorro = 0
    if (precioUnitarioBase > 0 && pkg.unitPrice < precioUnitarioBase) {
      porcentajeAhorro = Math.round(((precioUnitarioBase - pkg.unitPrice) / precioUnitarioBase) * 100)
    }
    return {
      ...pkg,
      porcentajeAhorro,
    }
  })
}

/**
 * Formatea un número como moneda chilena (CLP)
 * @param {number} valor
 * @returns {string} Ej: "$15.000"
 */
export function formatearCLP(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return '$0'
  return `$${Number(valor).toLocaleString('es-CL')}`
}

/**
 * Valida la lista de paquetes antes de guardar en el admin
 * @param {Array} paquetes
 * @returns {{ esValido: boolean, error: string|null }}
 */
export function validarPacks(paquetes) {
  if (!Array.isArray(paquetes) || paquetes.length === 0) {
    return { esValido: false, error: 'Debes añadir al menos un pack de cantidad.' }
  }

  const cantidadesVistas = new Set()

  for (let i = 0; i < paquetes.length; i++) {
    const p = paquetes[i]
    const num = i + 1

    if (!p.quantity || Number(p.quantity) <= 0) {
      return { esValido: false, error: `Fila ${num}: La cantidad debe ser un número mayor a 0.` }
    }
    if (!p.total_price || Number(p.total_price) <= 0) {
      return { esValido: false, error: `Fila ${num}: El precio total debe ser mayor a 0.` }
    }
    if (cantidadesVistas.has(Number(p.quantity))) {
      return { esValido: false, error: `Ya existe un pack configurado con ${p.quantity} unidades.` }
    }
    cantidadesVistas.add(Number(p.quantity))
  }

  return { esValido: true, error: null }
}
