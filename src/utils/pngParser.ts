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
            let i = 0
            while (i < data.length && data[i] !== 0) i++
            i += 2
            text = new TextDecoder('utf-8').decode(data)
          } else {
            let i = 0
            while (i < data.length && data[i] !== 0) i++
            i++
            const compressed = data[i++]
            const method = data[i++]
            while (i < data.length && data[i] !== 0) i++
            i++
            while (i < data.length && data[i] !== 0) i++
            i++
            
            const textData = data.slice(i)
            if (compressed === 0) {
              text = new TextDecoder('utf-8').decode(textData)
            } else {
              text = new TextDecoder('utf-8').decode(data)
            }
            
            const fullText = new TextDecoder('utf-8').decode(data)
            if (fullText.startsWith('chara')) {
              text = fullText
            }
          }
          
          // 嘗試解析 chara 格式（base64 編碼）
          if (text.startsWith('chara') || text.startsWith('ccv3')) {
            try {
              const nullIndex = text.indexOf('\0')
              let base64Content = ''
              
              if (text.startsWith('chara')) {
                base64Content = nullIndex !== -1 ? text.substring(nullIndex + 1) : text.substring(5)
              } else if (text.startsWith('ccv3')) {
                // V3 格式：ccv3 後直接是 base64
                base64Content = nullIndex !== -1 ? text.substring(nullIndex + 1) : text.substring(4)
              }
              
              const binString = atob(base64Content.trim())
              const bytes = new Uint8Array(binString.length)
              for (let i = 0; i < binString.length; i++) {
                bytes[i] = binString.charCodeAt(i)
              }
              const decodedText = new TextDecoder('utf-8').decode(bytes)
              const parsed = JSON.parse(decodedText)
              
              // V2/V3 規範檢測與標準化
              if (parsed.spec === 'chara_card_v2' || parsed.spec === 'chara_card_v3') {
                resolve({ ...parsed, _version: parsed.spec })
              } else {
                resolve({ ...parsed, _version: 'v1' })
              }
              return
            } catch (err) {
              console.error("Failed to decode character card data", err)
            }
          }
          
          // 嘗試直接解析 JSON（非標準格式）
          if (text.includes('{') && text.includes('"name"')) {
            try {
              // 提取 JSON 部分（跳過可能的鍵名）
              const jsonStart = text.indexOf('{')
              const jsonText = text.substring(jsonStart)
              const parsed = JSON.parse(jsonText)
              resolve({ ...parsed, _version: 'unknown' })
              return
            } catch (err) {
              console.error("Failed to parse direct JSON", err)
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
