-- Copia y pega esto en el SQL Editor de Supabase
-- Esto crea una "agendita" simple donde anotamos cuántas veces ha hablado cada IP hoy.

CREATE TABLE IF NOT EXISTS public.chat_rate_limits (
    ip_address TEXT PRIMARY KEY,          -- La "cédula" de la conexión del usuario
    request_count INTEGER DEFAULT 0,      -- Cuántas veces ha hablado hoy
    last_reset_date DATE DEFAULT CURRENT_DATE, -- Cuándo fue la última vez que reseteamos su cuenta
    blocked_until TIMESTAMP WITH TIME ZONE -- (Opcional) Por si queremos banearlo un rato
);

-- Como usamos la llave maestra (Service Role) en el servidor, 
-- ¡NO necesitas configurar políticas RLS complicadas! 
-- El bot tendrá acceso VIP directo.
