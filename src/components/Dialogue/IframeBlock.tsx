import React, { useState, useEffect, useRef, memo, useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { iframeBus } from '../../utils/iframeBus'

const SANDBOX_POLYFILL = '<script>' +
`try{var _s={};Object.defineProperty(window,'localStorage',{get:()=>({getItem:k=>_s[k]??null,setItem:(k,v)=>{_s[k]=v},removeItem:k=>{delete _s[k]},clear:()=>{_s={}}})});}catch(e){}
try{
  var _fakeIDB={open:function(){var r={result:{objectStoreNames:{contains:()=>false},createObjectStore:()=>({createIndex:()=>{}}),transaction:()=>({objectStore:()=>({put:()=>({})})})},onupgradeneeded:null,onsuccess:null,onerror:null};setTimeout(()=>{if(r.onupgradeneeded)r.onupgradeneeded({target:r});if(r.onsuccess)r.onsuccess({target:r});});return r;},deleteDatabase:function(){return{onsuccess:null};}};
  Object.defineProperty(window,'indexedDB',{get:()=>_fakeIDB});
}catch(e){}
try{
  var _OrigAudio=window.Audio;
  window.Audio=function(src){var a=new _OrigAudio(src);var _play=a.play.bind(a);a.play=function(){return _play().catch(()=>{});};return a;};
}catch(e){}` +
'<\/script>'

// ST 兼容层 + echo 双向 API
const ECHO_API = '<script>' +
`(function(){
  var _id=window.__echoId__;
  var _pending={};var _rid=0;
  window.addEventListener('message',function(e){
    var d=e.data;
    if(!d||!d.reqId||!_pending[d.reqId])return;
    var cb=_pending[d.reqId];delete _pending[d.reqId];cb(d.value);
  });
  function req(type,extra){
    return new Promise(function(resolve){
      var rid='r'+(++_rid);
      _pending[rid]=resolve;
      parent.postMessage(Object.assign({type:type,id:_id,reqId:rid},extra),'*');
    });
  }
  window.__echo__=window.__echo__||{};
  window.__echo__.get=function(k){return req('ECHO_GET',{key:k});};
  window.__echo__.set=function(attrs){return req('ECHO_SET',{attrs:attrs});};
  window.getVariable=function(k){return req('ECHO_GET',{key:k});};
  window.setVariable=function(k,v){var attrs={};attrs[k]=v;return req('ECHO_SET',{attrs:attrs});};
  window.triggerSlash=function(cmd){
    var m=cmd.match(/\\/send\\s+([\\s\\S]+?)(?:\\s*\\|\\s*\\/trigger)?$/);
    if(!m)return;
    var t=m[1].trim();
    if((t.startsWith('"')&&t.endsWith('"'))||(t.startsWith("'")&&t.endsWith("'")))t=t.slice(1,-1);
    parent.postMessage({type:'ECHO_SEND',id:_id,text:t},'*');
  };
  window.getCurrentMessageId=function(){return -1;};
  window.setChatMessage=function(){return Promise.resolve();};
  window.toastr={
    info:function(msg){parent.postMessage({type:'ECHO_TOAST',id:_id,level:'info',msg:msg},'*');},
    success:function(msg){parent.postMessage({type:'ECHO_TOAST',id:_id,level:'success',msg:msg},'*');},
    warning:function(msg){parent.postMessage({type:'ECHO_TOAST',id:_id,level:'warning',msg:msg},'*');},
    error:function(msg){parent.postMessage({type:'ECHO_TOAST',id:_id,level:'error',msg:msg},'*');}
  };
  window.SillyTavern={getContext:function(){return{name2:(window.__echo__.attrs&&window.__echo__.attrs.name)||'',chat:[],characters:[],getVariable:window.getVariable,setVariable:window.setVariable};}}; 
})();` +
'<\/script>'

function buildHtml(html: string, id: string, charData?: Record<string, any>): string {
  const dataScript = `<script>window.__echoId__=${JSON.stringify(id)};window.__echo__=${JSON.stringify({ attrs: charData ?? {} })};<\/script>`
  const syncScript = '<script>' +
    'var _lastH=0;' +
    'function syncH(){' +
    '  var h=Math.min(document.body.scrollHeight,window.innerHeight*3||6000);' +
    '  if(h===_lastH)return;_lastH=h;' +
    '  if(h>0)parent.postMessage({type:\'ECHO_H\',id:window.__echoId__,h:h},\'*\');' +
    '}' +
    'new ResizeObserver(function(){clearTimeout(window._sht);window._sht=setTimeout(syncH,50);}).observe(document.body);' +
    'syncH();' +
    '<\/script>'
  
  // 完整 HTML 文档直接注入脚本，不再套壳
  if (/^\s*<!DOCTYPE\s+html/i.test(html)) {
    // 替换 vh 单位防止高度循环
    const fixed = html.replace(/(\d+(?:\.\d+)?)vh\b/g, (_, v) => {
      const n = parseFloat(v)
      return n === 100 ? '100dvh' : `calc(100dvh * ${n / 100})`
    })
    // 注入覆盖样式：禁止 min-height 撑开 body，让内容自然高度
    const overrideStyle = '<style>html,body{min-height:0!important;height:auto!important;overflow:hidden!important}</style>'
    return fixed
      .replace(/<head>/i, `<head>${overrideStyle}${SANDBOX_POLYFILL}${dataScript}${ECHO_API}`)
      .replace(/<\/body>/i, `${syncScript}</body>`)
  }

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:6px;background:transparent;overflow:hidden}
img{max-width:100%;height:auto}table{width:100%}
</style>
${SANDBOX_POLYFILL}
${dataScript}
${ECHO_API}
</head><body>${html}${syncScript}</body></html>`
}

interface IframeBlockProps {
  html: string
  charData?: Record<string, any>
}

let _id = 0

export const IframeBlock = memo<IframeBlockProps>(({ html, charData }) => {
  const id = useRef(`ib${_id++}`).current
  const [height, setHeight] = useState(120)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const selectedCharacter = useAppStore(s => s.selectedCharacter)
  const updateAttributes = useAppStore(s => s.updateAttributes)
  const selectedCharacterRef = useRef(selectedCharacter)
  const updateAttributesRef = useRef(updateAttributes)
  useEffect(() => { selectedCharacterRef.current = selectedCharacter }, [selectedCharacter])
  useEffect(() => { updateAttributesRef.current = updateAttributes }, [updateAttributes])

  const srcDoc = useMemo(() => buildHtml(html, id, charData), [html, id, charData])

  useEffect(() => {
    const reply = (reqId: string, value?: any) =>
      iframeRef.current?.contentWindow?.postMessage({ reqId, value }, '*')

    const handler = (e: MessageEvent) => {
      const d = e.data
      if (!d || d.id !== id) return
      const char = selectedCharacterRef.current

      switch (d.type) {
        case 'ECHO_H':
          if (d.h > 0) {
            setHeight(d.h + 12)
          }
          break
        case 'ECHO_GET':
          reply(d.reqId, char.attributes?.[d.key] ?? null)
          break
        case 'ECHO_SET':
          if (d.attrs && typeof d.attrs === 'object') { 
            // 基础类型校验，防止恶意对象注入
            const safeAttrs = Object.fromEntries(
              Object.entries(d.attrs).map(([k, v]) => [
                String(k),
                typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : String(v)
              ])
            );
            updateAttributesRef.current(char.id, safeAttrs); 
            reply(d.reqId);
          }
          break
        case 'ECHO_SEND':
          if (d.text) iframeBus.emit(d.text)
          break
        case 'ECHO_TOAST':
          useAppStore.getState().addFragment(d.msg)
          break
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [id])

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      className="w-full border-0 block transition-[height] duration-200"
      style={{ height }}
      scrolling="no"
    />
  )
})
