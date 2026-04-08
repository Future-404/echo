/**
 * 纯前端 PNG 元数据注入工具 (SillyTavern 兼容)
 * 用于将角色 JSON 数据嵌入 PNG 图片的 tEXt 块
 */

/**
 * 将字符串编码为 Uint8Array
 */
const encodeString = (str: string) => new TextEncoder().encode(str);

/**
 * 计算 CRC32 校验码
 */
const makeCRCTable = () => {
  let c;
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  return crcTable;
};

const crcTable = makeCRCTable();

const crc32 = (buf: Uint8Array) => {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

/**
 * 创建一个 tEXt 数据块
 * @param keyword 关键字 (如 "chara")
 * @param text 内容 (Base64 字符串)
 */
const createTextChunk = (keyword: string, text: string): Uint8Array => {
  const keywordBuf = encodeString(keyword);
  const textBuf = encodeString(text);
  
  // tEXt 块结构: [Length(4)] [Type("tEXt")(4)] [Data(Keyword + \0 + Text)] [CRC(4)]
  const data = new Uint8Array(keywordBuf.length + 1 + textBuf.length);
  data.set(keywordBuf);
  data[keywordBuf.length] = 0; // null separator
  data.set(textBuf, keywordBuf.length + 1);

  const type = encodeString('tEXt');
  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  const view = new DataView(chunk.buffer);

  view.setUint32(0, data.length);
  chunk.set(type, 4);
  chunk.set(data, 8);
  
  const crcData = new Uint8Array(4 + data.length);
  crcData.set(type);
  crcData.set(data, 4);
  view.setUint32(8 + data.length, crc32(crcData));

  return chunk;
};

/**
 * 将数据嵌入 PNG 图片
 * @param base64Image 原始 PNG 图片 (Base64)
 * @param jsonData 要嵌入的 JSON 数据
 */
export const writeSillyTavernData = async (base64Image: string, jsonData: object): Promise<string> => {
  // 1. 转换 Base64 为二进制
  const res = await fetch(base64Image);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 2. 检查 PNG 签名 (8 字节)
  const signature = bytes.slice(0, 8);
  if (signature[0] !== 0x89 || signature[1] !== 0x50) {
    throw new Error('Not a valid PNG image');
  }

  // 3. 构建 tEXt 块 (SillyTavern 规范: 关键字 chara, 内容为 Base64 编码的 JSON)
  const jsonStr = JSON.stringify(jsonData);
  const charaBase64 = btoa(unescape(encodeURIComponent(jsonStr)));
  const textChunk = createTextChunk('chara', charaBase64);

  // 4. 将新块插入到 IHDR 块之后 (IHDR 块通常在签名之后)
  // IHDR 块固定长度为 13 字节 + 4(len) + 4(type) + 4(crc) = 25 字节
  const head = bytes.slice(0, 33); // 8(sig) + 25(IHDR)
  const tail = bytes.slice(33);
  
  const result = new Uint8Array(head.length + textChunk.length + tail.length);
  result.set(head);
  result.set(textChunk, head.length);
  result.set(tail, head.length + textChunk.length);

  // 5. 转回 Base64
  const blob = new Blob([result], { type: 'image/png' });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};
