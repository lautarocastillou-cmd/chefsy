async function run() {
  try {
    const res = await fetch('https://d2op8dwcequzql.cloudfront.net/assets/1.35.0/templates/light/js/modules/products.js');
    const content = await res.text();
    console.log('Script content length:', content.length);
    
    // Print lines containing feed-btn or feed
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('products_feed-btn') || line.includes('feed-btn') || line.includes('ajax') || line.includes('page') || line.includes('url') || line.includes('post') || line.includes('get')) {
        console.log(`Línea ${idx + 1}: ${line.trim()}`);
      }
    });
  } catch (err) {
    console.error(err);
  }
}
run();
