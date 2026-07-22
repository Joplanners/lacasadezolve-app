import { ref, computed, watch } from 'vue'
import { calcPrintPrice } from '@/utils/printPricing'

/**
 * Composable que encapsula toda la lógica reactiva de un producto de impresión.
 * Se usa en ProductDetailView, CartView y CheckoutView.
 * 
 * @param {import('vue').Ref|Object} productRef - Ref o objeto reactivo del producto
 * @returns {Object} Estado reactivo y métodos para manejar la selección de impresión
 * 
 * @example
 * // En ProductDetailView.vue:
 * const { sortedPackages, selectedQuantity, priceResult, selectPackage, setCustomQuantity } = usePrintProduct(product)
 * 
 * // En CartView.vue:
 * const { priceResult } = usePrintProduct(product)
 */
export function usePrintProduct(productRef) {
  // Estado reactivo
  const selectedQuantity = ref(null)
  const selectedPackageIndex = ref(null)
  const isCustomQuantity = ref(false)
  const selectedPrintDesign = ref('')

  // --- Computados ---

  /**
   * Verifica si el producto es de tipo impresión
   */
  const isPrintProduct = computed(() => {
    const p = productRef?.value ?? productRef
    return p?.is_print_product === true
  })

  /**
   * Paquetes ordenados por cantidad ascendente,
   * con precio unitario calculado automáticamente
   */
  const sortedPackages = computed(() => {
    const p = productRef?.value ?? productRef
    if (!p?.print_quantity_packages || !Array.isArray(p.print_quantity_packages)) {
      return []
    }

    return [...p.print_quantity_packages]
      .sort((a, b) => a.quantity - b.quantity)
      .map((pkg, index) => ({
        ...pkg,
        unitPrice: pkg.quantity > 0 ? Math.round(pkg.total_price / pkg.quantity) : 0,
        index
      }))
  })

  /**
   * Resultado del cálculo de precio para la cantidad seleccionada.
   * Se actualiza automáticamente cuando cambia selectedQuantity.
   */
  const priceResult = computed(() => {
    if (!isPrintProduct.value || !selectedQuantity.value || selectedQuantity.value <= 0) {
      return { unitPrice: 0, total: 0, basedOnPackage: null }
    }

    const p = productRef?.value ?? productRef
    return calcPrintPrice(p.print_quantity_packages, selectedQuantity.value)
  })

  /**
   * Mensaje descriptivo del rango de precio aplicado
   */
  const priceRangeMessage = computed(() => {
    if (!priceResult.value.basedOnPackage) return ''
    
    const qty = selectedQuantity.value
    const basedOn = priceResult.value.basedOnPackage
    
    if (qty === basedOn) {
      return `Paquete de ${basedOn} unidades`
    }
    
    return `Basado en paquete de ${basedOn} unidades`
  })

  /**
   * Información de todos los rangos disponibles para mostrar al cliente
   */
  const priceRangesInfo = computed(() => {
    return sortedPackages.value.map(pkg => ({
      quantity: pkg.quantity,
      totalPrice: pkg.total_price,
      unitPrice: pkg.unitPrice,
      isActive: priceResult.value.basedOnPackage === pkg.quantity
    }))
  })

  /**
   * Precio mínimo ("Desde $X") para mostrar en la tienda
   */
  const minPrice = computed(() => {
    if (sortedPackages.value.length === 0) return 0
    return sortedPackages.value[0].total_price
  })

  // --- Métodos ---

  /**
   * Selecciona un paquete predefinido
   * @param {number} index - Índice del paquete en sortedPackages
   */
  function selectPackage(index) {
    const pkg = sortedPackages.value[index]
    if (!pkg) return

    selectedPackageIndex.value = index
    selectedQuantity.value = pkg.quantity
    isCustomQuantity.value = false
  }

  /**
   * Establece una cantidad personalizada (libre)
   * @param {number} qty - Cantidad escrita por el cliente
   */
  function setCustomQuantity(qty) {
    const num = Number(qty)
    if (isNaN(num) || num < 1) {
      selectedQuantity.value = null
      return
    }

    selectedQuantity.value = num
    isCustomQuantity.value = true

    // Deseleccionar paquete si la cantidad no coincide exactamente
    const exactMatch = sortedPackages.value.findIndex(pkg => pkg.quantity === num)
    selectedPackageIndex.value = exactMatch !== -1 ? exactMatch : null
    
    if (exactMatch !== -1) {
      isCustomQuantity.value = false
    }
  }

  /**
   * Genera la metadata para agregar al carrito
   * @returns {Object} Metadata con toda la info de impresión
   */
  function getCartMetadata() {
    if (!isPrintProduct.value || !selectedQuantity.value) {
      return {}
    }

    return {
      is_print_order: true,
      print_quantity: selectedQuantity.value,
      print_unit_price: priceResult.value.unitPrice,
      print_total: priceResult.value.total,
      based_on_package: priceResult.value.basedOnPackage,
      print_design: selectedPrintDesign.value
    }
  }

  /**
   * Recalcula el precio para una cantidad dada (útil para el carrito)
   * @param {number} qty - Nueva cantidad
   * @returns {Object} Resultado del cálculo { unitPrice, total, basedOnPackage }
   */
  function recalculateForQuantity(qty) {
    const p = productRef?.value ?? productRef
    if (!p?.print_quantity_packages) {
      return { unitPrice: 0, total: 0, basedOnPackage: null }
    }
    return calcPrintPrice(p.print_quantity_packages, qty)
  }

  /**
   * Resetea el estado del selector
   */
  function reset() {
    selectedQuantity.value = null
    selectedPackageIndex.value = null
    isCustomQuantity.value = false
    selectedPrintDesign.value = ''
  }

  return {
    // Estado reactivo
    selectedQuantity,
    selectedPackageIndex,
    isCustomQuantity,
    selectedPrintDesign,

    // Computados
    isPrintProduct,
    sortedPackages,
    priceResult,
    priceRangeMessage,
    priceRangesInfo,
    minPrice,

    // Métodos
    selectPackage,
    setCustomQuantity,
    getCartMetadata,
    recalculateForQuantity,
    reset
  }
}
