async function run() {
  try {
    const res = await fetch('https://d2op8dwcequzql.cloudfront.net/assets/1.35.0/templates/light/js/modules/products.js');
    const content = await res.text();
    const lines = content.split('\n');
    console.log('--- get_principal_products ---');
    for (let i = 59; i < 110; i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
