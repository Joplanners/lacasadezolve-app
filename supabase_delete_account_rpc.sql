-- ============================================================================
-- FUNCIÓN RPC PARA AUTO-ELIMINACIÓN DE CUENTA (LEY N° 21.719 CHILE)
-- Permite que el usuario autenticado elimine su propio perfil y su cuenta
-- de auth.users al usar el switch "Eliminar mi cuenta definitivamente"
-- en la sección "Mi Perfil" (src/views/ProfileView.vue).
--
-- Instrucciones:
-- 1. Abre tu panel de Supabase -> SQL Editor -> New Query
-- 2. Pega este código y haz clic en "Run"
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_uid uuid;
BEGIN
  -- Obtener el ID del usuario que tiene la sesión iniciada actualmente
  current_uid := auth.uid();

  IF current_uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para eliminar tu cuenta.';
  END IF;

  -- 1. Desvincular pedidos históricos para conservar solo el respaldo tributario anónimo
  UPDATE public.orders
  SET user_id = NULL
  WHERE user_id = current_uid;

  -- 2. Eliminar carrito y registros de perfil
  DELETE FROM public.cart_items WHERE user_id = current_uid;
  DELETE FROM public.profiles WHERE id = current_uid;

  -- 3. Eliminar definitivamente la cuenta de autenticación en auth.users
  DELETE FROM auth.users WHERE id = current_uid;
END;
$$;

-- Otorgar permiso únicamente a usuarios autenticados (cada uno solo puede borrar su propio auth.uid())
REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;


-- ============================================================================
-- 2. LIMPIEZA AUTOMÁTICA MENSUAL DE CUENTAS INACTIVAS (> 12 MESES)
-- Se ejecuta 100% dentro de PostgreSQL en Supabase (NO consume créditos ni
-- minutos de Netlify). Protege siempre las cuentas con rol 'admin'.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_inactive_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  -- Seleccionar usuarios cuya última sesión (o creación) fue hace más de 1 año,
  -- que NO hayan comprado en los últimos 12 meses y que NO sean administradores.
  WITH inactive_users AS (
    SELECT u.id
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE COALESCE(u.last_sign_in_at, u.created_at) < (NOW() - INTERVAL '12 months')
      AND COALESCE(p.role, 'user') <> 'admin'
      AND NOT EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.user_id = u.id
          AND o.created_at >= (NOW() - INTERVAL '12 months')
      )
  ),
  unlinked_orders AS (
    UPDATE public.orders
    SET user_id = NULL
    WHERE user_id IN (SELECT id FROM inactive_users)
  ),
  deleted_carts AS (
    DELETE FROM public.cart_items
    WHERE user_id IN (SELECT id FROM inactive_users)
  ),
  deleted_profiles AS (
    DELETE FROM public.profiles
    WHERE id IN (SELECT id FROM inactive_users)
  ),
  deleted_auth AS (
    DELETE FROM auth.users
    WHERE id IN (SELECT id FROM inactive_users)
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted_auth;

  RETURN deleted_count;
END;
$$;

-- Habilitar pg_cron (incluido gratis dentro de Supabase) y programar 1 vez al mes (día 1 a las 04:00 AM UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup-inactive-accounts-12m',
  '0 4 1 * *',
  $$SELECT public.cleanup_inactive_accounts();$$
);

