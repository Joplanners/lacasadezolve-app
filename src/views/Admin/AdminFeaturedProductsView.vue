<template>
  <div class="admin-featured-view">
    <ManagerFeaturedProducts />
  </div>
</template>

<script setup>
// Ya no necesitamos AdminLayout aquí.
import ManagerFeaturedProducts from '@/components/admin/ManagerFeaturedProducts.vue'
</script>

<style scoped>
.admin-featured-view {
  min-height: calc(100vh - 200px);
}
</style>
