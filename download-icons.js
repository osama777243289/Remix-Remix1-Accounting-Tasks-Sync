import fs from 'fs';
import path from 'path';

async function download() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const icon512 = path.join(publicDir, 'icon-512.png');
  const icon192 = path.join(publicDir, 'icon-192.png');

  if (fs.existsSync(icon512) && fs.existsSync(icon192)) {
    console.log('Icons already exist in /public.');
    return;
  }

  const url = 'https://cdn-icons-png.flaticon.com/512/2997/2997300.png';
  try {
    console.log('Downloading icon...');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    
    if (!fs.existsSync(icon512)) fs.writeFileSync(icon512, buffer);
    if (!fs.existsSync(icon192)) fs.writeFileSync(icon192, buffer);
    console.log('Icons downloaded successfully to /public!');
  } catch (err) {
    console.error('Error downloading icon:', err.message);
  }
}

download();
