async function run() {
  try {
    const res = await fetch('https://d2op8dwcequzql.cloudfront.net/assets/1.35.0/templates/light/js/modules/products.js');
    const content = await res.text();
    const lines = content.split('\n');
    console.log('--- get_principal_products_params ---');
    for (let i = 24; i < 40; i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
  } catch (err) {
    console.error(err);
  }
}
run();
