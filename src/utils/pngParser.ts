export const extractPersonaFromPng = async (file: File): Promise<any | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer
      const view = new DataView(buffer)
      
      if (view.getUint32(0) !== 0x89504E47) {
        resolve(null)
        return
      }

      let offset = 8
      while (offset < view.byteLength) {
        const length = view.getUint32(offset)
        const type = String.fromCharCode(
          view.getUint8(offset + 4),
          view.getUint8(offset + 5),
          view.getUint8(offset + 6),
          view.getUint8(offset + 7)
        )

        if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
          const data = new Uint8Array(buffer, offset + 8, length)
          let text = ''
          
          if (type === 'tEXt') {
            text = new TextDecoder('utf-8').decode(data)
          } else if (type === 'zTXt') {
            // zTXt: Keyword (null), Compression (1), Compressed Text
            let i = 0
            while (i < data.length && data[i] !== 0) i++
            i += 2 // skip null and compression method
            const compressedData = data.slice(i)
            // Note: browser-based decompression is async and complex here, 
            // but for simplicity, we'll try to find 'chara' at the beginning
            text = new TextDecoder('utf-8').decode(data)
          } else {
            // iTXt: Keyword (null), Compression (1), Method (1), Lang (null), TransKey (null), Text
            let i = 0
            while (i < data.length && data[i] !== 0) i++ // skip keyword
            i++ // skip null
            const compressed = data[i++]
            const method = data[i++]
            while (i < data.length && data[i] !== 0) i++ // skip lang
            i++ // skip null
            while (i < data.length && data[i] !== 0) i++ // skip trans-keyword
            i++ // skip null
            
            const textData = data.slice(i)
            if (compressed === 0) {
              text = new TextDecoder('utf-8').decode(textData)
            } else {
              // Compressed iTXt
              text = new TextDecoder('utf-8').decode(data)
            }
            
            // If it's not a chara card, we might have skipped the wrong thing
            const fullText = new TextDecoder('utf-8').decode(data)
            if (fullText.startsWith('chara')) {
              text = fullText
            }
          }
          
          if (text.startsWith('chara')) {
            try {
              // 寻找分隔符 \0
              const nullIndex = text.indexOf('\0')
              const base64Content = nullIndex !== -1 ? text.substring(nullIndex + 1) : text.substring(5)
              
              // 关键：处理 UTF-8 Base64 解码
              const binString = atob(base64Content.trim())
              const bytes = new Uint8Array(binString.length)
              for (let i = 0; i < binString.length; i++) {
                bytes[i] = binString.charCodeAt(i)
              }
              const decodedText = new TextDecoder('utf-8').decode(bytes)
              
              resolve(JSON.parse(decodedText))
              return
            } catch (err) {
              console.error("Failed to decode chara data", err)
            }
          }
        }
        offset += length + 12
      }
      resolve(null)
    }
    reader.readAsArrayBuffer(file)
  })
}
