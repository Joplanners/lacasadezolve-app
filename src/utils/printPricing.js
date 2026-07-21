/**
 * Módulo de cálculo de precios para productos de impresión.
 * 
 * Los productos de impresión tienen "paquetes de cantidad" con precios totales fijos.
 * El precio unitario se calcula automáticamente: total_price / quantity.
 * 
 * Para cantidades que no coinciden con un paquete exacto, se usa el precio unitario
 * del paquete más cercano hacia abajo (≤ cantidad solicitada).
 */

/**
 * Calcula el precio unitario y total para una cantidad dada,
 * basándose en los paquetes de cantidad definidos para el producto.
 * 
 * @param {Array<{quantity: number, total_price: number}>} packages - Paquetes definidos por el admin
 * @param {number} quantity - Cantidad solicitada por el cliente
 * @returns {{unitPrice: number, total: number, basedOnPackage: number|null}} Resultado del cálculo
 * 
 * @example
 * const packages = [
 *   { quantity: 25, total_price: 2000 },
 *   { quantity: 50, total_price: 3500 },
 *   { quantity: 100, total_price: 10000 }
 * ]
 * 
 * calcPrintPrice(packages, 25)  // → { unitPrice: 80, total: 2000, basedOnPackage: 25 }
 * calcPrintPrice(packages, 60)  // → { unitPrice: 70, total: 4200, basedOnPackage: 50 }
 * calcPrintPrice(packages, 10)  // → { unitPrice: 80, total: 800, basedOnPackage: 25 }
 * calcPrintPrice(packages, 150) // → { unitPrice: 100, total: 15000, basedOnPackage: 100 }
 */
export function calcPrintPrice(packages, quantity) {
  if (!packages || packages.length === 0 || !quantity || quantity <= 0) {
    return { unitPrice: 0, total: 0, basedOnPackage: null }
  }

  // Ordenar paquetes por cantidad ascendente
  const sorted = [...packages].sort((a, b) => a.quantity - b.quantity)

  // Calcular precio unitario para cada paquete
  const packagesWithUnitPrice = sorted.map(pkg => ({
    ...pkg,
    unitPrice: Math.round(pkg.total_price / pkg.quantity)
  }))

  // Buscar el paquete más cercano hacia abajo (≤ cantidad solicitada)
  let matchedPackage = null

  for (let i = packagesWithUnitPrice.length - 1; i >= 0; i--) {
    if (packagesWithUnitPrice[i].quantity <= quantity) {
      matchedPackage = packagesWithUnitPrice[i]
      break
    }
  }

  // Si la cantidad es menor al primer paquete, usar el primero
  if (!matchedPackage) {
    matchedPackage = packagesWithUnitPrice[0]
  }

  const unitPrice = matchedPackage.unitPrice
  const total = unitPrice * quantity

  return {
    unitPrice,
    total,
    basedOnPackage: matchedPackage.quantity
  }
}

/**
 * Valida que los paquetes de cantidad estén correctamente configurados.
 * 
 * @param {Array<{quantity: number, total_price: number}>} packages - Paquetes a validar
 * @returns {{valid: boolean, errors: string[]}} Resultado de la validación
 */
export function validatePrintPackages(packages) {
  const errors = []

  if (!packages || packages.length === 0) {
    errors.push('Debe definir al menos un paquete de cantidad')
    return { valid: false, errors }
  }

  const quantities = new Set()

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i]
    const idx = i + 1

    if (!pkg.quantity || pkg.quantity <= 0) {
      errors.push(`Paquete ${idx}: La cantidad debe ser mayor a 0`)
    }

    if (!pkg.total_price || pkg.total_price <= 0) {
      errors.push(`Paquete ${idx}: El precio total debe ser mayor a 0`)
    }

    if (pkg.quantity && quantities.has(pkg.quantity)) {
      errors.push(`Paquete ${idx}: Ya existe un paquete con ${pkg.quantity} unidades`)
    }

    if (pkg.quantity) {
      quantities.add(pkg.quantity)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Formatea un precio en CLP (pesos chilenos).
 * Ejemplo: 2000 → "$2.000"
 * 
 * @param {number} price - Precio a formatear
 * @returns {string} Precio formateado
 */
export function formatCLP(price) {
  if (price == null || isNaN(price)) return '$0'
  return '$' + Math.round(price).toLocaleString('es-CL')
}
