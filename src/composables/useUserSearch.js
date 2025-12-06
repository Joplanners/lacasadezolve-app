import { ref } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from 'vue-toastification';

export function useUserSearch() {
  const toast = useToast();
  const searchResults = ref([]);
  const loading = ref(false);
  const error = ref(null);

  /**
   * Busca usuarios por término (email o nombre) usando RPC.
   * @param {string} term - Término de búsqueda.
   */
  const searchUsers = async (term) => {
    if (!term || term.length < 2) {
      searchResults.value = [];
      return;
    }

    loading.value = true;
    error.value = null;
    
    try {
      console.log(`[useUserSearch] Buscando: "${term}"`);
      const { data, error: rpcError } = await supabase.rpc('search_users_for_admin', { 
        search_term: term 
      });

      if (rpcError) throw rpcError;
      
      searchResults.value = data || [];
      console.log(`[useUserSearch] Resultados: ${searchResults.value.length}`);
    } catch (err) {
      console.error('[useUserSearch] Error:', err);
      error.value = err.message;
      toast.error('Error al buscar usuarios.');
      searchResults.value = [];
    } finally {
      loading.value = false;
    }
  };

  const clearResults = () => {
    searchResults.value = [];
    error.value = null;
  };

  return {
    searchResults,
    loading,
    error,
    searchUsers,
    clearResults
  };
}
