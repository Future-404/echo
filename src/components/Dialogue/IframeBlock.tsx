import React, { useState, useEffect, useRef, memo, useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { iframeBus } from '../../utils/iframeBus'
import { replaceMacros } from '../../logic/promptEngine'

const SANDBOX_POLYFILL = '<script>' +
`try{
  var _s={};
  if(!window.localStorage){
    Object.defineProperty(window,'localStorage',{get:()=>({getItem:k=>_s[k]??null,setItem:(k,v)=>{_s[k]=v},removeItem:k=>{delete _s[k]},clear:()=>{_s={}}})});
  }
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
  var _attrs = window.__echo__.attrs || {};
  window.__echo__.get=function(k){return req('ECHO_GET',{key:k});};
  window.__echo__.set=function(attrs){return req('ECHO_SET',{attrs:attrs});};
  
  // 基础变量操作兼容
  window.getVariable=function(k){return _attrs[k] !== undefined ? _attrs[k] : req('ECHO_GET',{key:k});};
  window.setVariable=function(k,v){
    _attrs[k]=v;
    var attrs={};attrs[k]=v;
    return req('ECHO_SET',{attrs:attrs});
  };
  
  // ST 核心对象模拟
  window.toastr={
    info:function(msg){parent.postMessage({type:'ECHO_TOAST',id:_id,level:'info',msg:msg},'*');},
    success:function(msg){parent.postMessage({type:'ECHO_TOAST',id:_id,level:'success',msg:msg},'*');},
    warning:function(msg){parent.postMessage({type:'ECHO_TOAST',id:_id,level:'warning',msg:msg},'*');},
    error:function(msg){parent.postMessage({type:'ECHO_TOAST',id:_id,level:'error',msg:msg},'*');}
  };

  window.SillyTavern={
    getContext: function() {
      return {
        character: _attrs.name || 'AI',
        name: _attrs.name || 'AI',
        name2: _attrs.name || 'AI',
        user: 'User',
        chat: [], // 暂时留空，后续可通过父组件注入
        characters: [],
        world_info: [],
        getVariable: window.getVariable,
        setVariable: window.setVariable,
        writeExtensionField: function(ext, k, v) { 
           var fullK = 'ext_' + ext + '_' + k;
           return window.setVariable(fullK, v);
        }
      };
    }
  };

  // 快捷命令触发
  window.triggerSlash=function(cmd){
    parent.postMessage({type:'ECHO_SEND',id:_id,text:cmd},'*');
  };
  
  // 第三方库浅模拟 (防止脚本报错)
  window.YAML = window.YAML || { parse: function(s){try{return JSON.parse(s)}catch(e){return{}}}, stringify: JSON.stringify };
  window.showdown = window.showdown || { Converter: function(){ return { makeHtml: function(t){return t} } } };
})();` +
'<\/script>'

function buildHtml(html: string, id: string, charData?: Record<string, any>, userName: string = 'User', persona?: any): string {
  // 1. 运行宏替换
  const processedHtml = replaceMacros(html, userName, charData?.name || 'AI', {
    userDescription: persona?.description,
    userBackground: persona?.background,
    userSurname: persona?.surname,
    userNickname: persona?.nickname,
  });

  const dataScript = `<script>window.__echoId__=${JSON.stringify(id)};window.__echo__=${JSON.stringify({ attrs: charData ?? {} })};<\/script>`
  const syncScript = '<script>' +
    'var _lastH=0;' +
    'function syncH(){' +
    '  var h = Math.max(' +
    '    document.body.scrollHeight, document.documentElement.scrollHeight,' +
    '    document.body.offsetHeight, document.documentElement.offsetHeight,' +
    '    document.body.clientHeight, document.documentElement.clientHeight' +
    '  );' +
    '  h = Math.min(h, window.innerHeight * 5 || 8000);' +
    '  if(Math.abs(h - _lastH) < 2) return;' +
    '  _lastH = h;' +
    '  if(h > 0) parent.postMessage({type:\'ECHO_H\',id:window.__echoId__,h:h},\'*\');' +
    '}' +
    'window.addEventListener(\'load\', syncH);' +
    'new ResizeObserver(function(){clearTimeout(window._sht);window._sht=setTimeout(syncH,50);}).observe(document.body);' +
    'setTimeout(syncH, 100);' +
    'setTimeout(syncH, 500);' +
    '<\/script>'
  
  // 完整 HTML 文档直接注入脚本，不再套壳
  if (/^\s*<!DOCTYPE\s+html/i.test(processedHtml)) {
    // 替换 vh 单位防止高度循环
    const fixed = processedHtml.replace(/(\d+(?:\.\d+)?)vh\b/g, (_, v) => {
      const n = parseFloat(v)
      return n === 100 ? '100dvh' : `calc(100dvh * ${n / 100})`
    })
    // 注入覆盖样式：让高度自然撑开
    const overrideStyle = '<style>html,body{min-height:0!important;height:auto!important;max-height:none!important;overflow:visible!important}</style>'
    // 防套娃拦截脚本
    const antiNestScript = '<script>' +
      'window.addEventListener(\'click\', function(e) {' +
      '  var target = e.target.closest(\'a\');' +
      '  if (target && target.href && target.href.startsWith(window.location.origin)) {' +
      '    e.preventDefault();' +
      '  }' +
      '}, true);' +
      'window.onbeforeunload = function() { return "拦截到页面跳转尝试"; };' +
      '<\/script>'

    return fixed
      .replace(/<head>/i, `<head><base target="_blank">${overrideStyle}${SANDBOX_POLYFILL}${dataScript}${ECHO_API}`)
      .replace(/<\/body>/i, `${antiNestScript}${syncScript}</body>`)
  }

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_blank">
<style>
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:6px;background:transparent;overflow:hidden}
img{max-width:100%;height:auto}table{width:100%}
</style>
${SANDBOX_POLYFILL}
${dataScript}
${ECHO_API}
</head><body>${processedHtml}<script>
// 简单拦截 form 提交
document.addEventListener('submit', function(e) { e.preventDefault(); }, true);
</script>${syncScript}</body></html>`
}

interface IframeBlockProps {
  html: string
  charData?: Record<string, any>
  isFullScreen?: boolean
}

let _id = 0

export const IframeBlock = memo<IframeBlockProps>(({ html, charData, isFullScreen = false }) => {
  const id = useRef(`ib${_id++}`).current
  const [height, setHeight] = useState(120)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const config = useAppStore(s => s.config)
  const selectedCharacter = useAppStore(s => s.selectedCharacter)
  const updateAttributes = useAppStore(s => s.updateAttributes)
  
  const activePersona = useMemo(() => 
    config.personas?.find(p => p.id === config.activePersonaId) || config.personas?.[0]
  , [config.personas, config.activePersonaId])
  const userName = activePersona?.name || config.userName || 'User'

  const selectedCharacterRef = useRef(selectedCharacter)
  const updateAttributesRef = useRef(updateAttributes)
  useEffect(() => { selectedCharacterRef.current = selectedCharacter }, [selectedCharacter])
  useEffect(() => { updateAttributesRef.current = updateAttributes }, [updateAttributes])

  const srcDoc = useMemo(() => buildHtml(html, id, charData, userName, activePersona), [html, id, charData, userName, activePersona])

  useEffect(() => {
    const reply = (reqId: string, value?: any) =>
      iframeRef.current?.contentWindow?.postMessage({ reqId, value }, '*')

    const handler = (e: MessageEvent) => {
      const d = e.data
      if (!d || d.id !== id) return
      const char = selectedCharacterRef.current

      switch (d.type) {
        case 'ECHO_H':
          if (d.h > 0 && !isFullScreen) {
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
  }, [id, isFullScreen])

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      // 安全加固：移除 allow-same-origin，使 iframe 处于完全隔离状态
      // 脚本依然可以通过 postMessage 与父窗口通信，但无法直接访问父窗口的 DOM 或存储
      sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads"
      className={`w-full border-0 block ${isFullScreen ? 'h-full' : 'transition-[height] duration-200'}`}
      style={isFullScreen ? { height: '100%' } : { height }}
      scrolling={isFullScreen ? 'yes' : 'no'}
    />
  )
})
