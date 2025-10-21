/**
 * Valida un RUT chileno (formato y dígito verificador).
 * Acepta RUTs con o sin puntos y con o sin guión.
 *
 * @param {string} rut El RUT a validar. Ej: "12345678-9", "12.345.678-9", "123456789".
 * @returns {boolean} True si el RUT es válido, False en caso contrario.
 */
export function isValidRut(rut) {
  if (typeof rut !== 'string') {
    return false
  }

  // Limpiar RUT: quitar puntos y guión, convertir K a mayúscula
  const cleanRut = rut.replace(/[.-]/g, '').toUpperCase()

  // Verificar formato básico (largo mínimo 2: cuerpo + dv)
  if (cleanRut.length < 2) {
    return false
  }

  // Separar cuerpo y dígito verificador
  const body = cleanRut.slice(0, -1)
  const dv = cleanRut.slice(-1)

  // Verificar que el cuerpo sean solo números
  if (!/^\d+$/.test(body)) {
    return false
  }

  // Verificar que el DV sea número o K
  if (!/^[0-9K]$/.test(dv)) {
    return false
  }

  // Calcular Dígito Verificador Esperado (Algoritmo Módulo 11)
  let sum = 0
  let multiplier = 2

  // Recorrer el cuerpo de derecha a izquierda
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body.charAt(i), 10) * multiplier
    multiplier = multiplier < 7 ? multiplier + 1 : 2
  }

  const expectedDv = 11 - (sum % 11)
  let expectedDvChar

  if (expectedDv === 11) {
    expectedDvChar = '0'
  } else if (expectedDv === 10) {
    expectedDvChar = 'K'
  } else {
    expectedDvChar = expectedDv.toString()
  }

  // Comparar DV calculado con el ingresado
  return dv === expectedDvChar
}

// Opcional: Podríamos añadir más funciones de validación aquí en el futuro
// export function isValidEmail(email) { ... }
