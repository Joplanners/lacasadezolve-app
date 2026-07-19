<script setup>
import { onMounted } from 'vue' // <-- Solo importamos lo que vamos a usar
import { RouterLink } from 'vue-router' // <-- RouterLink es suficiente, no necesitamos useRouter
import { useProductsStore } from '@/stores/storeProducts'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from 'vue-toastification'

// Creamos la instancia del store, que sí se usa en el template y en onMounted
const productsStore = useProductsStore()
const toast = useToast()

async function deleteProduct(id, name) {
  if (!confirm(`¿Estás súper segura de querer eliminar "${name}"? ¡Esto no se puede deshacer!`)) return
  
  try {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') {
        throw new Error('Alerta: Este producto ya tiene compras o personas con él en su carrito. Es más seguro Editarlo y quitarle el "Producto Activo".')
      }
      throw error
    }
    toast.success('Producto eliminado permanentemente.')
    productsStore.fetchAllProducts() // Actualizar lista
  } catch (err) {
    toast.error(err.message || 'Error al eliminar el producto.')
  }
}

// Usamos onMounted para pedir los productos en cuanto el componente se carga
onMounted(() => {
  productsStore.fetchAllProducts() // Llamamos a la función que trae TODOS los productos (activos e inactivos)
})
</script>

<template>
  <div class="admin-product-list">
    <div class="header-actions">
      <h3>Gestión de Productos</h3>
      <router-link :to="{ name: 'admin-product-new' }" class="btn btn-add">
        + Añadir Nuevo Producto
      </router-link>
    </div>

    <div v-if="productsStore.loading" class="feedback-container">
      <div class="spinner"></div>
      <p>Cargando productos...</p>
    </div>

    <div v-else-if="productsStore.error" class="feedback-container error">
      <p>{{ productsStore.error }}</p>
    </div>

    <div v-else-if="!productsStore.loading">
      <p v-if="productsStore.products.length === 0" class="no-items-message">
        No hay productos creados todavía.
      </p>
      <table v-else class="products-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Personalizable</th>
            <th>Activo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in productsStore.products" :key="product.id">
            <td>{{ product.name }}</td>
            <td>{{ product.category?.name || '-' }}</td>
            <td>${{ product.price?.toLocaleString('es-CL') || '0' }}</td>
            <td>
              <span v-if="product.is_downloadable" class="status-badge" style="background: #9c27b0;">Ilimitado</span>
              <span v-else>{{ product.stock !== null ? product.stock : 'Ilimitado' }}</span>
            </td>
            <td>
              <span :class="['status-badge', product.is_customizable ? 'yes' : 'no']">
                {{ product.is_customizable ? 'Sí' : 'No' }}
              </span>
            </td>
            <td>
              <span :class="['status-badge', product.is_active ? 'yes' : 'no']">
                {{ product.is_active ? 'Sí' : 'No' }}
              </span>
            </td>
            <td class="action-buttons">
              <router-link
                :to="{ name: 'admin-product-edit', params: { id: product.id } }"
                class="btn btn-edit"
              >
                Editar
              </router-link>
              <button @click="deleteProduct(product.id, product.name)" class="btn btn-delete">
                Eliminar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.admin-product-list {
  padding: 20px;
}
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.products-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}
.products-table th,
.products-table td {
  border: 1px solid var(--color-border);
  padding: 12px;
  text-align: left;
  vertical-align: middle;
}
.products-table th {
  background-color: var(--color-background-soft);
}
.btn {
  padding: 8px 15px;
  border-radius: 5px;
  text-decoration: none;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-add {
  background-color: #28a745;
  color: white;
}
.btn-add:hover {
  background-color: #218838;
}
.btn-edit {
  background-color: #ffc107;
  color: #212529;
}
.btn-edit:hover {
  background-color: #e0a800;
}
.btn-delete {
  background-color: #dc3545;
  color: white;
}
.btn-delete:hover {
  background-color: #c82333;
}
.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}
.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: bold;
  color: white;
  white-space: nowrap;
}
.status-badge.yes {
  background-color: var(--brand-turquoise);
}
.status-badge.no {
  background-color: #aaa;
}
.feedback-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
.feedback-container p {
  font-style: italic;
  color: #555;
  margin-top: 15px;
}
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid var(--brand-turquoise);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.no-items-message {
  text-align: center;
  font-style: italic;
  color: #555;
  padding: 20px;
}
</style>
