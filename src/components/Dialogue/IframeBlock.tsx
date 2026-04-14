import React, { useState, useEffect, useRef, memo, useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { iframeBus } from '../../utils/iframeBus'
import { replaceMacros } from '../../logic/promptEngine'

const SANDBOX_POLYFILL = '<script>' +
`try{
  var _s=window.__echoAppStorage__||{};
  if(!window.localStorage){
    Object.defineProperty(window,'localStorage',{get:()=>({
      getItem:k=>_s[k]??null,
      setItem:(k,v)=>{_s[k]=v;window.__echo__.setPrivate({[k]:String(v)}).catch(()=>{});},
      removeItem:k=>{delete _s[k];window.__echo__.setPrivate({[k]:null}).catch(()=>{});},
      clear:()=>{_s={};parent.postMessage({type:'ECHO_SET_PRIVATE',id:window.__echoId__,clear:true},'*');}
    })});
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
    if(!d)return;
    // 事件监听（由主程序推送）
    if(d.type==='ECHO_EVENT'){
      window.__echo__._fireEvent(d.event, d.data);
      return;
    }
    // 错误广播（无需 reqId 校验）
    if(d.type==='ECHO_ERROR'&&d.id===_id){window.__echo__._fireError(d.msg);return;}
    if(!d.reqId||!_pending[d.reqId])return;
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
  var _errorCb = null;
  var _eventCbs = {};
  window.__echo__.get=function(k){return req('ECHO_GET',{key:k});};
  window.__echo__.set=function(attrs){return req('ECHO_SET',{attrs:attrs});};
  window.__echo__.getPrivate=function(k){return req('ECHO_GET_PRIVATE',{key:k});};
  window.__echo__.setPrivate=function(attrs){return req('ECHO_SET_PRIVATE',{attrs:attrs});};
  window.__echo__.abort=function(){parent.postMessage({type:'ECHO_ABORT',id:_id},'*');};
  // 扩展应用独立 AI 请求（不进主对话，走 extensionProvider）
  window.__echo__.chat=function(messages){return req('ECHO_CHAT',{messages:messages});};
  // 只注入上下文，不触发 AI 请求（用于事件摘要等）
  window.__echo__.injectContext=function(text){parent.postMessage({type:'ECHO_SEND',id:_id,text:text,injectOnly:true},'*');};
  // 开发者可选监听错误
  window.__echo__.onError=function(cb){ _errorCb = cb; };
  window.__echo__._fireError=function(msg){
    if(_errorCb){ _errorCb(msg); }
    else { window.toastr.error(msg); }
  };
  // 事件系统
  window.__echo__.on=function(type,cb){
    if(!_eventCbs[type]) _eventCbs[type]=[];
    _eventCbs[type].push(cb);
  };
  window.__echo__._fireEvent=function(type,data){
    if(_eventCbs[type]) _eventCbs[type].forEach(function(cb){cb(data);});
  };
  
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
  // 隐藏消息触发（不在对话框显示，但 AI 能看到并响应）
  window.triggerHidden=function(cmd){
    parent.postMessage({type:'ECHO_SEND',id:_id,text:cmd,hidden:true},'*');
  };
  
  // 第三方库浅模拟 (防止脚本报错)
  window.YAML = window.YAML || { parse: function(s){try{return JSON.parse(s)}catch(e){return{}}}, stringify: JSON.stringify };
  window.showdown = window.showdown || { Converter: function(){ return { makeHtml: function(t){return t} } } };
})();` +
'<\/script>'

function buildHtml(html: string, id: string, charData?: Record<string, any>, userName: string = 'User', persona?: any, iframeCss: string = '', appStorage: Record<string, any> = {}): string {
  // 1. 运行宏替换
  const processedHtml = replaceMacros(html, userName, charData?.name || 'AI', {
    userDescription: persona?.description,
    userBackground: persona?.background,
    userSurname: persona?.surname,
    userNickname: persona?.nickname,
  });

  const dataScript = `<script>window.__echoId__=${JSON.stringify(id)};window.__echoAppStorage__=${JSON.stringify(appStorage)};window.__echo__=${JSON.stringify({ attrs: charData ?? {}, userName, charName: charData?.name || 'AI' })};var userName=${JSON.stringify(userName)};var charName=${JSON.stringify(charData?.name || 'AI')};<\/script>`
  const syncScript = '<script>' +
    'var _lastH=0;' +
    'function syncH(){' +
    // 取 body 所有直接子元素中最大的 offsetTop + offsetHeight，排除 min-height 干扰
    '  var h=0,ch=document.body.children;' +
    '  for(var i=0;i<ch.length;i++){var el=ch[i];h=Math.max(h,el.offsetTop+el.offsetHeight);}' +
    '  if(h===0) h=document.body.scrollHeight;' +
    '  if(window.innerHeight===0){if(_lastH!==0){_lastH=0;parent.postMessage({type:\'ECHO_H\',id:window.__echoId__,h:0},\'*\');}return;}' +
    '  if(Math.abs(h-_lastH)<2)return;' +
    '  _lastH=h;' +
    '  if(h>0)parent.postMessage({type:\'ECHO_H\',id:window.__echoId__,h:h},\'*\');' +
    '}' +
    'window.addEventListener(\'load\',syncH);' +
    // 观察 body 直接子元素（折叠容器），class/style 变化时重新测量
    'function observeChildren(){' +
    '  var ro=new ResizeObserver(function(){clearTimeout(window._sht);window._sht=setTimeout(syncH,50);});' +
    '  ro.observe(document.body);' +
    '  var ch=document.body.children;' +
    '  for(var i=0;i<ch.length;i++) ro.observe(ch[i]);' +
    '  new MutationObserver(function(){clearTimeout(window._mot);window._mot=setTimeout(syncH,80);})' +
    '  .observe(document.body,{subtree:true,attributes:true,attributeFilter:[\'class\',\'style\']});' +
    '}' +
    'if(document.readyState===\'loading\'){document.addEventListener(\'DOMContentLoaded\',observeChildren);}else{observeChildren();}' +
    'setTimeout(syncH,100);setTimeout(syncH,500);' +
    '<\/script>'
  
  // 完整 HTML 文档直接注入脚本，不再套壳
  if (/^\s*<!DOCTYPE\s+html/i.test(processedHtml)) {
    // 替换 vh 单位防止高度循环
    const fixed = processedHtml.replace(/(\d+(?:\.\d+)?)vh\b/g, (_, v) => {
      const n = parseFloat(v)
      return n === 100 ? '100dvh' : `calc(100dvh * ${n / 100})`
    })
    // 注入覆盖样式：让高度自然撑开，防止 fixed 定位导致无限扩展
    const overrideStyle = '<style>' +
      'html,body{min-height:0!important;height:auto!important;max-height:none!important;overflow:visible!important}' +
      '</style>' +
      // position:fixed 在 iframe 里相对 iframe 视口会导致高度循环，运行时替换为 absolute
      '<script>(function(){function fixFixed(){' +
      'var els=document.querySelectorAll("*");' +
      'for(var i=0;i<els.length;i++){' +
      'var s=window.getComputedStyle(els[i]);' +
      'if(s.position==="fixed"){els[i].style.setProperty("position","absolute","important");}' +
      '}}' +
      'if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",fixFixed);}else{fixFixed();}' +
      'new MutationObserver(fixFixed).observe(document.body||document.documentElement,{childList:true,subtree:true});' +
      '})()\x3c/script>'
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
      .replace(/<head>/i, `<head><base target="_blank">${overrideStyle}${iframeCss ? `<style>${iframeCss}</style>` : ''}${SANDBOX_POLYFILL}${dataScript}${ECHO_API}`)
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
${iframeCss}
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
  appId?: string
  charData?: Record<string, any>
  isFullScreen?: boolean
}

let _id = 0

export const IframeBlock = memo<IframeBlockProps>(({ html, appId, charData, isFullScreen = false }) => {
  const id = useRef(`ib${_id++}`).current
  const [height, setHeight] = useState(120)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const config = useAppStore(s => s.config)
  const selectedCharacter = useAppStore(s => s.selectedCharacter)
  const updateAttributes = useAppStore(s => s.updateAttributes)
  const updateAppStorage = useAppStore(s => s.updateAppStorage)
  
  const activePersona = useMemo(() => 
    config.personas?.find(p => p.id === config.activePersonaId) || config.personas?.[0]
  , [config.personas, config.activePersonaId])
  const userName = activePersona?.name || config.userName || 'User'

  const appStorage = useMemo(() => (appId && config.appStorage) ? (config.appStorage[appId] || {}) : {}, [appId, config.appStorage]);

  const iframeCss = useMemo(() => {
    const match = (config.customCss || '').match(/\/\*\s*@iframe-start\s*\*\/([\s\S]*?)\/\*\s*@iframe-end\s*\*\//);
    return match ? match[1].trim() : '';
  }, [config.customCss])

  const selectedCharacterRef = useRef(selectedCharacter)
  const updateAttributesRef = useRef(updateAttributes)
  const updateAppStorageRef = useRef(updateAppStorage)
  useEffect(() => { selectedCharacterRef.current = selectedCharacter }, [selectedCharacter])
  useEffect(() => { updateAttributesRef.current = updateAttributes }, [updateAttributes])
  useEffect(() => { updateAppStorageRef.current = updateAppStorage }, [updateAppStorage])

  const srcDoc = useMemo(() => buildHtml(html, id, charData, userName, activePersona, iframeCss, appStorage), [html, id, charData, userName, activePersona, iframeCss, appStorage])

  const updateHistoryRef = useRef<number[]>([])
  const MAX_UPDATES = 10
  const TIME_WINDOW = 5000

  useEffect(() => {
    const reply = (reqId: string, value?: any) =>
      iframeRef.current?.contentWindow?.postMessage({ reqId, value }, '*')

    const handler = (e: MessageEvent) => {
      const d = e.data
      if (!d || d.id !== id) return
      const char = selectedCharacterRef.current

      switch (d.type) {
        case 'ECHO_H':
          if (!isFullScreen) {
            setHeight(d.h > 0 ? d.h + 12 : 0)
          }
          break
        case 'ECHO_GET':
          // 优先读取带前缀的 Key，如果不存在则回退到原始 Key (兼容旧版本)
          const prefixedKey = appId ? `ext:${appId}:${d.key}` : d.key;
          const val = char.attributes?.[prefixedKey] ?? char.attributes?.[d.key] ?? null;
          reply(d.reqId, val)
          break
        case 'ECHO_SET':
          if (d.attrs && typeof d.attrs === 'object') { 
            // 1. 频率限制检查
            const now = Date.now();
            // 移除窗口外的记录
            while (updateHistoryRef.current.length > 0 && updateHistoryRef.current[0] < now - TIME_WINDOW) {
              updateHistoryRef.current.shift();
            }

            if (updateHistoryRef.current.length >= MAX_UPDATES) {
              console.warn(`[IframeBlock] App "${id}" 写入频率过高，已拦截。`);
              // 通知应用执行失败
              iframeRef.current?.contentWindow?.postMessage({ 
                type: 'ECHO_ERROR', 
                id, 
                msg: '写入频率过高 (Rate Limit Exceeded)' 
              }, '*');
              reply(d.reqId, { success: false, error: 'Rate limit exceeded' });
              return;
            }

            // 2. 单次写入大小限制 (128KB)
            const payloadStr = JSON.stringify(d.attrs);
            if (payloadStr.length > 128 * 1024) {
              console.warn(`[IframeBlock] App "${id}" 单次写入数据过大 (>128KB)`);
              reply(d.reqId, { success: false, error: 'Payload too large (>128KB)' });
              return;
            }

            // 3. 角色总属性上限检查 (5MB)
            const currentAttrs = char.attributes || {};
            const totalSize = JSON.stringify(currentAttrs).length + payloadStr.length;
            if (totalSize > 5 * 1024 * 1024) {
              console.warn(`[IframeBlock] App "${id}" 写入后将超过角色属性总上限 (5MB)`);
              reply(d.reqId, { success: false, error: 'Total attributes limit exceeded (5MB)' });
              return;
            }

            updateHistoryRef.current.push(now);

            // 4. 强制命名空间：为 Key 加上 appId 前缀
            const safeAttrs = Object.fromEntries(
              Object.entries(d.attrs).map(([k, v]) => {
                const finalKey = appId ? `ext:${appId}:${k}` : String(k);
                return [
                  finalKey,
                  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : String(v)
                ];
              })
            );
            updateAttributesRef.current(char.id, safeAttrs); 
            reply(d.reqId, { success: true });
          }
          break
        case 'ECHO_GET_PRIVATE':
          if (appId) {
            const privateVal = useAppStore.getState().config.appStorage?.[appId]?.[d.key] ?? null;
            reply(d.reqId, privateVal);
          }
          break
        case 'ECHO_SET_PRIVATE':
          if (appId) {
            if (d.clear) {
              useAppStore.setState(s => ({
                config: {
                  ...s.config,
                  appStorage: { ...s.config.appStorage, [appId]: {} }
                }
              }));
              reply(d.reqId, { success: true });
            } else if (d.attrs) {
              updateAppStorageRef.current(appId, d.attrs);
              reply(d.reqId, { success: true });
            }
          }
          break
        case 'ECHO_SEND':
          if (d.text) iframeBus.emit(d.text, d.hidden === true, d.injectOnly === true)
          break
        case 'ECHO_CHAT': {
          // 扩展应用独立 AI 请求，走 extensionProvider（不进主对话）
          const state = useAppStore.getState()
          const mc = state.config.modelConfig
          const providers: any[] = state.config.providers || []
          const extProvider = (mc?.extensionProviderId ? providers.find((p: any) => p.id === mc.extensionProviderId) : null)
            || providers.find((p: any) => p.id === mc?.chatProviderId)
            || providers[0]
          if (!extProvider?.apiKey || !extProvider?.endpoint) {
            reply(d.reqId, { error: '未配置扩展模型，请在设置 → 模型分配中设置「扩展」模型' })
            break
          }
          fetch(`${extProvider.endpoint}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${extProvider.apiKey}` },
            body: JSON.stringify({ model: extProvider.model, messages: d.messages, temperature: 0.8, stream: false })
          })
            .then(r => r.json())
            .then(r => reply(d.reqId, { content: r.choices?.[0]?.message?.content || '' }))
            .catch(e => reply(d.reqId, { error: e.message }))
          break
        }
        case 'ECHO_TOAST':
          useAppStore.getState().addFragment(d.msg)
          break
        case 'ECHO_ABORT':
          // 这里的状态需要和 useChat 共享的全局 controller 交互
          useAppStore.getState().abortController?.abort()
          break
      }
    }
    window.addEventListener('message', handler)

    // 订阅系统事件并转发给 iframe（仅应用级 iframe，非 status bar 等内嵌块）
    const unsubMsg = appId ? iframeBus.subscribeEvent('ON_MESSAGE', (data) => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'ECHO_EVENT', event: 'ON_MESSAGE', data }, '*')
    }) : () => {}
    const unsubChar = appId ? iframeBus.subscribeEvent('ON_CHARACTER_SWITCH', (data) => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'ECHO_EVENT', event: 'ON_CHARACTER_SWITCH', data }, '*')
    }) : () => {}
    const unsubAttrs = appId ? iframeBus.subscribeEvent('ON_ATTRS_UPDATED', (data) => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'ECHO_EVENT', event: 'ON_ATTRS_UPDATED', data }, '*')
    }) : () => {}

    // 订阅全局错误广播，转发给 iframe
    const unsubError = iframeBus.subscribeError((msg: string) => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'ECHO_ERROR', id, msg }, '*')
    })
    return () => {
      window.removeEventListener('message', handler)
      unsubMsg()
      unsubChar()
      unsubAttrs()
      unsubError()
    }
  }, [id, isFullScreen])

  return (
    <div ref={wrapRef} className={`w-full ${isFullScreen ? 'h-full' : ''}`}>
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads"
        className={`w-full border-0 block ${isFullScreen ? 'h-full' : 'transition-[height] duration-200'}`}
        style={isFullScreen ? { height: '100%' } : { height }}
        scrolling={isFullScreen ? 'yes' : 'no'}
      />
    </div>
  )
})
