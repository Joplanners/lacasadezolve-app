import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Hacemos la config una función para acceder a 'mode'
  const isProduction = mode === 'production'

  return {
    ssr: {
      noExternal: ['vue-toastification']
    },
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.startsWith('a-'),
          },
        },
      }),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // Opciones para vite-plugin-ssg
    ssgOptions: {
      script: 'async',
      formatting: 'minify',
      mock: true
    },
    // AÑADIR ESTA SECCIÓN 'build'
    build: {
      minify: 'terser', // Asegurarse de que se use terser para tener estas opciones
      terserOptions: {
        compress: {
          drop_console: isProduction, // Elimina console.* en producción
          drop_debugger: isProduction, // Elimina debugger en producción
          passes: 2, // Puede mejorar la compresión, opcional
        },
        format: {
          comments: isProduction ? false : 'some', // Elimina todos los comentarios en producción
          // 'some' preserva comentarios importantes como /*! ... */ o con @license, @preserve
          // true o /^\**!|@preserve|@license|@cc_on/i si quieres ser más específico
        },
        // Opcional: para mantener los nombres de las clases si los necesitas para algo específico
        // mangle: {
        //   keep_fnames: false, // true para mantener nombres de funciones (generalmente false para producción)
        //   keep_classnames: false, // true para mantener nombres de clases (generalmente false para producción)
        // },
      },
      rollupOptions: {
        // Opciones de Rollup, si necesitas algo específico para el bundler
        output: {
          // Podrías configurar aquí cómo se parten los chunks, etc.
        },
      },
    },
  }
})
