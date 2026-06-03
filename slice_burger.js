const fs = require('fs');
const { Jimp } = require('jimp');

async function sliceBurger() {
  const imagePath = 'C:\\Users\\lauta\\.gemini\\antigravity\\brain\\2c0830c6-62e7-4402-8100-cbaba208e902\\media__1780254095344.png';
  const outDir = 'public/images/burger';
  
  if (!fs.existsSync(outDir)){
      fs.mkdirSync(outDir, { recursive: true });
  }

  const image = await Jimp.read(imagePath);
  const width = image.bitmap.width;
  const height = image.bitmap.height;

  // Find non-empty rows
  const rowIsEmpty = [];
  for (let y = 0; y < height; y++) {
    let empty = true;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = image.bitmap.data[idx + 0];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      const a = image.bitmap.data[idx + 3];
      
      let isBg = false;
      if (a < 10) isBg = true;
      if (r > 245 && g > 245 && b > 245) isBg = true;
      
      if (!isBg) {
        empty = false;
        break;
      }
    }
    rowIsEmpty.push(empty);
  }

  // Find slices (start and end Y)
  const slices = [];
  let inSlice = false;
  let startY = 0;
  for (let y = 0; y < height; y++) {
    if (!inSlice && !rowIsEmpty[y]) {
      inSlice = true;
      startY = y;
    } else if (inSlice && rowIsEmpty[y]) {
      inSlice = false;
      slices.push({ startY, endY: y - 1 });
    }
  }
  if (inSlice) {
    slices.push({ startY, endY: height - 1 });
  }

  console.log(`Found ${slices.length} slices.`);

  const names = [
    'pan_superior.png',
    'bacon.png',
    'queso.png',
    'carne.png',
    'tomate.png',
    'lechuga.png',
    'pan_base.png'
  ];

  if (slices.length !== 7) {
    console.log("WARNING: Expected exactly 7 slices, but found " + slices.length);
  }

  for (let i = 0; i < Math.min(slices.length, 7); i++) {
    const slice = slices[i];
    
    // Find exact X bounds
    let minX = width;
    let maxX = 0;
    for (let y = slice.startY; y <= slice.endY; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = image.bitmap.data[idx + 0];
        const g = image.bitmap.data[idx + 1];
        const b = image.bitmap.data[idx + 2];
        const a = image.bitmap.data[idx + 3];
        
        let isBg = false;
        if (a < 10) isBg = true;
        if (r > 245 && g > 245 && b > 245) isBg = true;

        if (!isBg) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }

    const w = maxX - minX + 1;
    const h = slice.endY - slice.startY + 1;
    
    const crop = image.clone().crop(minX, slice.startY, w, h);
    
    // Make white pixels transparent (flood fill from corners would be better, but we do simple threshold)
    crop.scan(0, 0, crop.bitmap.width, crop.bitmap.height, function(x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      const alpha = this.bitmap.data[idx + 3];

      if (red > 245 && green > 245 && blue > 245) {
        this.bitmap.data[idx + 3] = 0; // set alpha to 0
      }
    });

    const outPath = outDir + '/' + names[i];
    await crop.writeAsync(outPath);
    console.log(`Saved ${outPath}`);
  }
}

sliceBurger().catch(console.error);
