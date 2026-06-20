import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const input = path.resolve('public', 'burger-loca.png');
const output = path.resolve('public', 'burger-loca.webp');

async function run() {
  console.log('Comenzando optimizacion...');
  await sharp(input)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 85, effort: 6 })
    .toFile(output);
    
  console.log('Generando blur data...');
  const buffer = await sharp(input)
    .resize(20)
    .blur(5)
    .jpeg({ quality: 20 })
    .toBuffer();
    
  console.log('BLUR_DATA_URL=' + 'data:image/jpeg;base64,' + buffer.toString('base64'));
}

run().catch(console.error);
