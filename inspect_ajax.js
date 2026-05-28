const fs = require('fs');

const html = fs.readFileSync('C:/Users/lauta/.gemini/antigravity/brain/2c0830c6-62e7-4402-8100-cbaba208e902/scratch/malucta_page.html', 'utf-8');

console.log('--- Buscando scripts y ajax ---');

// Buscar scripts que contengan products_feed-btn o llamadas AJAX
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptCount = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  const content = match[1];
  if (content.includes('products_feed-btn') || content.includes('feed-btn') || content.includes('page') || content.includes('ajax') || content.includes('post') || content.includes('get')) {
    scriptCount++;
    console.log(`Script ${scriptCount} con coincidencias (largo: ${content.length}):`);
    // Imprimir líneas del script que contengan palabras claves
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('products_feed-btn') || line.includes('feed-btn') || line.includes('click') || line.includes('fetch') || line.includes('$.') || line.includes('url') || line.includes('page')) {
        console.log(`  Línea ${idx + 1}: ${line.trim()}`);
      }
    });
  }
}

// Buscar src de scripts externos
console.log('--- Scripts externos ---');
const scriptSrcRegex = /<script\b[^>]*src="([^"]+)"/gi;
while ((match = scriptSrcRegex.exec(html)) !== null) {
  console.log('  Src:', match[1]);
}
