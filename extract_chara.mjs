import fs from 'fs';
import path from 'path';

function extractCharaFromPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.readUInt32BE(0) !== 0x89504E47) {
    console.error(`${filePath} is not a valid PNG.`);
    return null;
  }

  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);

    if (type === 'tEXt') {
      const data = buffer.toString('utf-8', offset + 8, offset + 8 + length);
      if (data.startsWith('chara')) {
        try {
          // 格式通常是 "chara\0<base64_json>"
          const nullIndex = data.indexOf('\0');
          const base64Content = data.substring(nullIndex + 1);
          const jsonText = Buffer.from(base64Content, 'base64').toString('utf-8');
          return JSON.parse(jsonText);
        } catch (err) {
          console.error(`Failed to decode chara data in ${filePath}`, err.message);
        }
      }
    }
    // Type (4) + Length (4) + CRC (4) = 12
    offset += length + 12;
  }
  return null;
}

const charDir = './char';
const files = fs.readdirSync(charDir).filter(f => f.endsWith('.png'));

files.forEach(file => {
  console.log(`--- Character: ${file} ---`);
  const data = extractCharaFromPng(path.join(charDir, file));
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log("No 'chara' metadata found (check if it uses iTXt instead).");
  }
  console.log('\n');
});
