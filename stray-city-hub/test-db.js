import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDatabase() {
  console.log("Conectando a Supabase:", SUPABASE_URL);
  
  // 1. Verificar Contador de Velas
  console.log("\n--- Revisando skz_candle_counter ---");
  const { data: candleData, error: candleError } = await supabase.from('skz_candle_counter').select('*');
  if (candleError) console.error("Error en velas:", candleError.message);
  else console.log("Velas:", candleData);

  // 2. Verificar Eventos de Venta
  console.log("\n--- Revisando skz_sale_events ---");
  const { data: salesData, error: salesError } = await supabase.from('skz_sale_events').select('*');
  if (salesError) console.error("Error en eventos:", salesError.message);
  else console.log("Eventos:", salesData);

  // 3. Verificar Mensajes
  console.log("\n--- Revisando skz_manifestation_messages ---");
  const { data: messagesData, error: messagesError } = await supabase.from('skz_manifestation_messages').select('*');
  if (messagesError) console.error("Error en mensajes:", messagesError.message);
  else console.log("Mensajes:", messagesData);
}

checkDatabase();
