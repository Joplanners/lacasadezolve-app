import { ref } from 'vue';
import { useToast } from 'vue-toastification';

export function useFileUpload() {
  const toast = useToast();
  const uploading = ref(false);
  const error = ref(null);
  
  // URL del worker de Cloudflare R2 (hardcoded por ahora, idealmente en env vars)
  const WORKER_URL = 'https://r2-presigner-worker.jodiabunos.workers.dev';

  /**
   * Sube un archivo al bucket R2 a través del worker.
   * @param {File} file - El archivo a subir.
   * @param {string} [customName] - Nombre opcional para el archivo (si no se usa el original).
   * @returns {Promise<string>} - La URL pública del archivo subido.
   */
  const uploadFile = async (file, customName = null) => {
    if (!file) {
      throw new Error('No se proporcionó ningún archivo.');
    }

    uploading.value = true;
    error.value = null;
    const fileName = customName || file.name;

    try {
      console.log(`[useFileUpload] Subiendo archivo: ${fileName}`);
      
      const formData = new FormData();
      formData.append('file', file, fileName);

      const response = await fetch(WORKER_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        let errorMsg = `Error del servidor (${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson.error) errorMsg += `: ${errJson.error}`;
        } catch (e) {
          // Ignorar error de parseo JSON
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      if (!result || !result.publicUrl) {
        throw new Error('La respuesta del servidor no contiene la URL pública.');
      }

      console.log(`[useFileUpload] Subida exitosa. URL: ${result.publicUrl}`);
      return result.publicUrl;

    } catch (err) {
      console.error('[useFileUpload] Error:', err);
      error.value = err.message;
      toast.error(`Error al subir archivo: ${err.message}`);
      throw err;
    } finally {
      uploading.value = false;
    }
  };

  return {
    uploading,
    error,
    uploadFile
  };
}
