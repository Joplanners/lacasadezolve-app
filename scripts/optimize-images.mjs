/**
 * Script para optimizar todas las imágenes PNG/JPG de public/ a WebP.
 * Los originales se conservan y se generan versiones .webp junto a ellos.
 * Uso: node scripts/optimize-images.mjs
 */
import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg'];
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;

// Imágenes que NO se deben redimensionar (logos, iconos pequeños)
const SKIP_RESIZE = ['LogoZolve.png', 'Zolve_Logo.png', 'Zolve_Logo_192.png', 'Zolve_Logo_512.png', 'LogoZolve.ico', 'TransbankWebpay.png'];

async function getImageFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await getImageFiles(fullPath));
    } else if (IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

async function optimizeImage(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);
  const webpPath = filePath.replace(ext, '.webp');
  
  try {
    const originalStats = await stat(filePath);
    const originalKB = (originalStats.size / 1024).toFixed(1);

    let pipeline = sharp(filePath);
    const metadata = await pipeline.metadata();
    
    // Redimensionar solo si es más ancha que MAX_WIDTH y no está en la lista de excluidos
    if (!SKIP_RESIZE.includes(fileName) && metadata.width > MAX_WIDTH) {
      pipeline = pipeline.resize(MAX_WIDTH, null, { withoutEnlargement: true });
    }

    await pipeline.webp({ quality: WEBP_QUALITY }).toFile(webpPath);

    const webpStats = await stat(webpPath);
    const webpKB = (webpStats.size / 1024).toFixed(1);
    const savings = ((1 - webpStats.size / originalStats.size) * 100).toFixed(0);

    console.log(`✅ ${fileName} (${originalKB} KB) → ${path.basename(webpPath)} (${webpKB} KB) — ${savings}% más liviana`);
  } catch (err) {
    console.error(`❌ Error con ${fileName}:`, err.message);
  }
}

async function main() {
  console.log('🖼️  Optimizando imágenes del proyecto...\n');
  const files = await getImageFiles(PUBLIC_DIR);
  console.log(`Encontradas ${files.length} imágenes para optimizar.\n`);
  
  for (const file of files) {
    await optimizeImage(file);
  }
  
  console.log('\n🎉 ¡Optimización completa!');
  console.log('Los archivos .webp fueron creados junto a los originales.');
  console.log('Ahora debes actualizar las referencias en el código de .png a .webp');
}

main();
