import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null);
  const _isPasswordRecoveryMode = ref(false);
  const isPasswordRecoveryMode = readonly(_isPasswordRecoveryMode);
  const userRole = ref(null);
  let resolveAuthReady;
  const authReadyPromise = new Promise(resolve => { resolveAuthReady = resolve; });
  let authHasInitialized = false;
  const user = computed(() => session.value?.user || null);
  const isLoggedIn = computed(() => !!session.value);

  console.log("AuthStore: Store inicializado.");

  async function fetchUserRole(userId) {
    if (!userId) { userRole.value = null; return; }
    console.log(`%c AuthStore - fetchUserRole: Buscando rol para user ID: ${userId}`, 'color: purple; font-weight: bold;');
    userRole.value = null;
    try {
      const { data, error, status } = await supabase.from('profiles').select('role').eq('id', userId).single();
      console.log("AuthStore - fetchUserRole: Resultado:", { data, error, status });
      if (error && status !== 406) { throw error; }
      userRole.value = data?.role || 'user';
    } catch (catchError) {
      console.error("AuthStore - fetchUserRole: Error:", catchError);
      userRole.value = 'user';
    }
    console.log(`%c AuthStore - fetchUserRole: Rol final asignado: ${userRole.value}`, 'color: green;');
  }

  async function setSession(newSession, calledDuringRecovery = false) {
    const oldUserId = session.value?.user?.id;
    session.value = newSession;
    let roleCheckPromise = Promise.resolve();
    if (!newSession) { userRole.value = null; }
    if (newSession?.user) {
      console.log(`AuthStore: Sesión actualizada (Usuario: ${newSession.user.id})`);
      if(!calledDuringRecovery && (newSession.user.id !== oldUserId || userRole.value === null)) {
           roleCheckPromise = fetchUserRole(newSession.user.id);
      } else if (calledDuringRecovery) { userRole.value = null; }
    } else if (session.value === null) { console.log('AuthStore: Sesión eliminada.'); userRole.value = null; }
    await roleCheckPromise;
  }

  function clearSession() {
    setSession(null); _isPasswordRecoveryMode.value = false;
    console.log('AuthStore: clearSession() llamado.');
    if (!authHasInitialized && resolveAuthReady) { console.log("AuthStore: Resolviendo promesa en clearSession (antes de init)."); resolveAuthReady(); authHasInitialized = true; }
  }

  async function checkSessionOnLoad() {
    console.log('AuthStore: Iniciando checkSessionOnLoad...');
    try {
        const { data, error } = await supabase.auth.getSession();
        console.log("AuthStore (checkSession): getSession completado.");
        if (error) throw error;
        await setSession(data.session);
        if (data.session) console.log('AuthStore (checkSession): Sesión encontrada.');
        else console.log('AuthStore (checkSession): No se encontró sesión.');
    } catch (error) {
        console.error("AuthStore: Error en checkSessionOnLoad catch:", error); clearSession();
    } finally {
        if (!authHasInitialized && resolveAuthReady) {
            console.log("AuthStore: checkSessionOnLoad finalizado. Resolviendo authReadyPromise.");
            resolveAuthReady(); authHasInitialized = true;
        } else if (authHasInitialized) { console.log("AuthStore: checkSessionOnLoad finalizado (ya inicializado)."); }
    }
  }

  async function signOut() { console.log('AuthStore: Intentando cerrar sesión...'); await supabase.auth.signOut(); }

  supabase.auth.onAuthStateChange(async (event, newSession) => {
    console.log(`AuthStore - onAuthStateChange Event: ${event}`, "Session:", newSession ? "Object" : "null");

    if (event === 'PASSWORD_RECOVERY') {
      clearSession(); _isPasswordRecoveryMode.value = true; router.push({ name: 'update-password' });
      setTimeout(() => { if (_isPasswordRecoveryMode.value) _isPasswordRecoveryMode.value = false; }, 10 * 60 * 1000); return;
    }
    if (event === 'SIGNED_OUT') { clearSession(); return; }
    if (_isPasswordRecoveryMode.value) {
        console.log(`AuthStore: Evento ${event} ignorado (Recov).`);
        if (event === 'SIGNED_IN' && newSession?.user) { _isPasswordRecoveryMode.value = false; }
        return;
    }

    console.log(`AuthStore: Evento ${event}. Llamando y esperando a setSession...`);
    await setSession(newSession);
    console.log(`AuthStore: Procesamiento para evento ${event} completado.`);

    if (!authHasInitialized && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && resolveAuthReady) {
        console.log(`AuthStore: Evento ${event}. Resolviendo authReadyPromise.`); resolveAuthReady(); authHasInitialized = true;
    }

    if (event === 'SIGNED_IN' && router.currentRoute.value.name === 'login') {
      await new Promise(resolve => setTimeout(resolve, 0));
      console.log(`%cAuthStore: Post-login check. User role: ${userRole.value}. Current route: ${router.currentRoute.value.name}`, 'color: blue; font-weight: bold;');
      if (userRole.value === 'admin') {
        console.log("AuthStore: Redirecting admin to admin-dashboard.");
        router.push({ name: 'admin-dashboard' });
      } else {
        console.log("AuthStore: Redirecting user to profile.");
        router.push({ name: 'profile' });
      }
    }
  });

  async function waitForAuthReady() {
      console.log("AuthStore: waitForAuthReady() llamado, devolviendo authReadyPromise.");
      return authReadyPromise;
  }

  function exitPasswordRecoveryMode() { _isPasswordRecoveryMode.value = false; }

  checkSessionOnLoad();

  return {
    session, user, isLoggedIn,
    userRole: readonly(userRole),
    isPasswordRecoveryMode,
    waitForAuthReady,
    exitPasswordRecoveryMode, checkSessionOnLoad, signOut
  }
})