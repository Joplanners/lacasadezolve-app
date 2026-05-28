import handler from './netlify/functions/check-sales.mjs';

async function test() {
  console.log("Testing check-sales function...");
  const req = {};
  const context = {};
  
  // Mapeamos ZOLVE_GEMINI_API_KEY a GEMINI_API_KEY si es necesario localmente
  if (!process.env.GEMINI_API_KEY && process.env.ZOLVE_GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = process.env.ZOLVE_GEMINI_API_KEY;
  }

  try {
    const response = await handler(req, context);
    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("Crash:", err);
  }
}

test();
