import { ref } from 'vue';
import { useToast } from 'vue-toastification';
import imageCompression from 'browser-image-compression';

export function useFileUpload() {
  const toast = useToast();
  const uploading = ref(false);
  const error = ref(null);
  
  // URL del worker de Cloudflare R2 (hardcoded por ahora, idealmente en env vars)
  const WORKER_URL = 'https://r2-presigner-worker.jodiabunos.workers.dev';

  /**
   * Comprime y optimiza una imagen antes de subirla.
   * Convierte automáticamente a WebP y reduce tamaño/resolución.
   * @param {File} file - El archivo de imagen original.
   * @returns {Promise<File>} - El archivo comprimido y optimizado.
   */
  const compressImage = async (file) => {
    // Solo comprimir archivos de imagen
    if (!file.type.startsWith('image/')) {
      console.log('[useFileUpload] Archivo no es imagen, se sube sin comprimir.');
      return file;
    }

    // No comprimir SVGs (ya son vectoriales y livianos)
    if (file.type === 'image/svg+xml') {
      console.log('[useFileUpload] SVG detectado, se sube sin comprimir.');
      return file;
    }

    const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
    console.log(`[useFileUpload] 🖼️ Imagen original: ${file.name} (${originalSizeMB} MB)`);

    const options = {
      maxSizeMB: 0.5,               // Máximo 500 KB por imagen
      maxWidthOrHeight: 1920,        // Máximo 1920px (suficiente para cualquier pantalla)
      useWebWorker: true,            // No bloquea la interfaz mientras comprime
      fileType: 'image/webp',        // Convierte a WebP (formato moderno, menor peso)
      initialQuality: 0.85,          // Calidad del 85% (balance perfecto entre calidad y peso)
    };

    try {
      const compressedFile = await imageCompression(file, options);
      const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
      const savings = ((1 - compressedFile.size / file.size) * 100).toFixed(0);

      console.log(
        `[useFileUpload] ✅ Imagen comprimida: ${compressedSizeMB} MB ` +
        `(${savings}% más liviana)`
      );

      return compressedFile;
    } catch (compressionError) {
      console.warn('[useFileUpload] ⚠️ Error al comprimir, subiendo original:', compressionError.message);
      // Si falla la compresión, subimos el original para no bloquear al usuario
      return file;
    }
  };

  /**
   * Sube un archivo al bucket R2 a través del worker.
   * Si es una imagen, la comprime automáticamente antes de subirla.
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

    try {
      // 🖼️ Comprimir imagen automáticamente antes de subir
      const processedFile = await compressImage(file);

      // Si se convirtió a WebP, ajustar el nombre del archivo
      let fileName = customName || file.name;
      if (processedFile.type === 'image/webp' && !fileName.endsWith('.webp')) {
        // Reemplazar la extensión original por .webp
        fileName = fileName.replace(/\.[^.]+$/, '.webp');
      }

      console.log(`[useFileUpload] Subiendo archivo: ${fileName}`);
      
      const formData = new FormData();
      formData.append('file', processedFile, fileName);

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
