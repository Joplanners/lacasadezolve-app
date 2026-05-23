import { ref, watch } from 'vue'

/**
 * Reactive composable that syncs a ref with localStorage.
 * @param {string} key - localStorage key
 * @param {*} defaultValue - fallback value when nothing is stored
 * @returns {import('vue').Ref}
 */
export function useLocalStorage(key, defaultValue) {
  const stored = localStorage.getItem(key)
  let initial

  try {
    initial = stored !== null ? JSON.parse(stored) : defaultValue
  } catch {
    initial = defaultValue
  }

  const data = ref(initial)

  watch(
    data,
    (newVal) => {
      localStorage.setItem(key, JSON.stringify(newVal))
    },
    { deep: true },
  )

  return data
}
