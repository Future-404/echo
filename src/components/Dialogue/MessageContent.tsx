import React, { useState, useMemo, useRef } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { parseStreamingNovelText } from '../../utils/novelParser'
import { StatusBar } from '../StatusBars'
import { useAppStore } from '../../store/useAppStore'
import { applyCharacterRegexScripts } from '../../utils/tagParser'
import { IframeBlock } from './IframeBlock'

// Markdown 渲染
const MD_RE = /^#{1,6} |^\s*[-*+] |\*\*|__|^\s*\d+\. |^---$/m
function renderMd(text: string): string | null {
  if (!MD_RE.test(text)) return null
  return marked.parse(text, { async: false }) as string
}
const SKIP_TAGS = new Set(['html', 'head', 'body', 'script', 'meta', 'link', 'title'])
// 检测是否为混合内容（HTML 标签与普通文本交织）
const HTML_TAG_RE = /<[a-z][a-z0-9-]*[\s>/]/i
function isMixedHtml(text: string): boolean {
  if (!HTML_TAG_RE.test(text)) return false;
  // 去掉所有成对标签后，若还有非空文本，说明是混合内容
  const stripped = text.replace(/<[^>]+>/g, '').trim();
  return stripped.length > 0;
}

function extractHtmlBlocks(text: string): { remaining: string; blocks: string[] } {
  // 混合内容（HTML + 文本交织）整体作为一个 HTML 块送进 iframe
  if (isMixedHtml(text)) {
    return { remaining: '', blocks: [text] };
  }
  const blocks: string[] = [];
  const remaining = text.replace(/<([a-z][a-z0-9-]*)[\s>][\s\S]*?<\/\1>/gi, (match, tag) => {
    if (SKIP_TAGS.has(tag.toLowerCase())) return match;
    const doc = new DOMParser().parseFromString(match, 'text/html');
    if (doc.body.firstElementChild) { blocks.push(match); return ''; }
    return match;
  });
  return { remaining, blocks };
}

// 包裹标签检测（必须在 extractHtmlBlocks 之前运行）
const WRAPPER_TAGS = new Set(['snow', 'message', 'response']);
function unwrapIfWrapper(text: string): string | null {
  const m = text.match(/^<(\w+)(?:\s[^>]*)?>[\s\S]*<\/\1>$/);
  if (!m) return null;
  const tag = m[1].toLowerCase();
  if (!WRAPPER_TAGS.has(tag)) return null;
  return text.replace(new RegExp(`^<${tag}(?:\\s[^>]*)?>|</${tag}>$`, 'gi'), '').trim();
}

interface MessageContentProps {
  content: string;
  isAi: boolean;
  segmentIndex?: number;
  isGreeting?: boolean;
  isLatest?: boolean;
  renderDepth?: number;
  images?: string[];
}

const ThinkingBlock: React.FC<{ content: string }> = ({ content }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <details className="mb-2 text-xs opacity-60 cursor-pointer" open={expanded} onClick={(e) => { e.preventDefault(); setExpanded(v => !v); }}>
      <summary className="font-mono text-gray-500 dark:text-gray-400 select-none">💭 思考中...</summary>
      <div className="mt-1 pl-4 border-l-2 border-gray-300 dark:border-gray-600 whitespace-pre-wrap font-mono text-gray-600 dark:text-gray-400">
        {content}
      </div>
    </details>
  );
};

const HtmlRenderer: React.FC<{ 
  html: string; 
  i: number; 
  shouldRender: boolean; 
  charData?: Record<string, any> 
}> = ({ html, i, shouldRender, charData }) => {
  if (!shouldRender) {
    return <div key={i} className="w-full rounded bg-black/5 dark:bg-white/5 text-center text-xs text-gray-400 py-2 italic">[ 界面已折叠 ]</div>;
  }
  return <IframeBlock key={i} html={html} charData={charData} />;
};

const MessageContent: React.FC<MessageContentProps> = React.memo(({ content, isAi, segmentIndex, isLatest = false, renderDepth = 3, images }) => {
  const config = useAppStore(s => s.config);
  const selectedCharacter = useAppStore(s => s.selectedCharacter);

  // charData 是注入 iframe 的初始快照，用 ref 固定，不随 attributes 变化（实时读写走 postMessage）
  const charDataRef = useRef(isAi ? { name: selectedCharacter.name, attributes: selectedCharacter.attributes ?? {} } : undefined)
  const charData = charDataRef.current

  const { thinkingContent, parts, htmlBlocks, codeBlocks } = useMemo(() => {
    const rendered = isAi ? applyCharacterRegexScripts(content, selectedCharacter, 2) : content;
    const trimmed = rendered.trim();

    // 1. 提取 <thinking>
    const thinkingMatch = trimmed.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    const thinkingContent = thinkingMatch ? thinkingMatch[1].trim() : null;
    let body = thinkingContent ? trimmed.replace(/<thinking>[\s\S]*?<\/thinking>/i, '').trim() : trimmed;

    // 2. 提取 ```html 代码块 + ST 正则替换后的 "html\n<!DOCTYPE..." 格式
    const codeBlocks: string[] = [];
    body = body.replace(/```html\s*([\s\S]*?)```/gi, (_, inner) => { codeBlocks.push(inner.trim()); return ''; }).trim();
    // ST regex 把 ```html...``` 替换成 "html\n<!DOCTYPE html>...</html>" 格式（独占整段）
    body = body.replace(/\bhtml\s*(<!DOCTYPE\s+html[\s\S]*?<\/html>)/gi, (_, doc) => { codeBlocks.push(doc.trim()); return ''; }).trim();

    // 3. 包裹标签检测（在 HTML 提取之前）
    const unwrapped = unwrapIfWrapper(body);
    if (unwrapped !== null) body = unwrapped;

    // 4. 用 DOMParser 提取顶层 HTML 块
    const { remaining, blocks: htmlBlocks } = extractHtmlBlocks(body);

    // 5. 清理残留孤立标签和空代码块
    const cleaned = remaining
      .replace(/```\w*\s*```/g, '')
      .replace(/---\s+---/g, '')
      .replace(/<\/?[A-Za-z][A-Za-z0-9-]*(\s[^>]*)?>/g, '')
      .trim();

    // 6. 整段含 Markdown 语法时，直接渲染为 HTML block，跳过 novel 解析
    const mdHtml = renderMd(cleaned)
    if (mdHtml) {
      return { thinkingContent, parts: [], htmlBlocks: [...htmlBlocks, mdHtml], codeBlocks }
    }

    const parts = parseStreamingNovelText(cleaned, {
      dialogueQuotes: config.dialogueQuotes,
      actionMarkers: config.actionMarkers,
      thoughtMarkers: config.thoughtMarkers,
    });

    return { thinkingContent, parts, htmlBlocks, codeBlocks };
  }, [content, isAi, selectedCharacter.id, selectedCharacter.extensions?.tagTemplates, config.dialogueQuotes, config.actionMarkers, config.thoughtMarkers]);

  const renderParts = (segmentIndex !== undefined && segmentIndex < parts.length)
    ? [parts[segmentIndex]]
    : parts;

  const shouldRenderIframe = renderDepth === 0 || isLatest

  const htmlBlocksEl = htmlBlocks.length > 0 && (
    <div className="mt-2 space-y-2">
      {htmlBlocks.map((html, i) => {
        // 使用 DOMPurify 进行严格清理，并检测是否包含会被清理掉的潜在交互/恶意元素
        const cleanHtml = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
        // 如果原始内容包含较多复杂标签（如 button, input, style）被净化掉，说明它可能是一个需要 Iframe 渲染的组件，而非纯文本 Markdown
        const isSimpleMdHtml = /^<(h[1-6]|p|ul|ol|li|hr|strong|em|b|i|br|span|div)[\s>]/i.test(html.trim()) && cleanHtml.length > (html.length * 0.5);

        return isSimpleMdHtml
          ? <div key={i} className="md-body w-full text-left leading-relaxed" dangerouslySetInnerHTML={{ __html: cleanHtml }} />
          : <HtmlRenderer key={i} html={html} i={i} shouldRender={shouldRenderIframe} charData={charData} />
      })}
    </div>
  );
  const codeBlocksEl = codeBlocks.length > 0 && (
    <div className="mt-2 space-y-2">
      {codeBlocks.map((html, i) => (
        <HtmlRenderer key={i} html={html} i={i} shouldRender={shouldRenderIframe} charData={charData} />
      ))}
    </div>
  );

  return (
    <>
      {images && images.length > 0 && (
        <div className={`flex gap-2 flex-wrap mb-3 ${isAi ? 'justify-start' : 'justify-end'}`}>
          {images.map((img, i) => (
            <img key={i} src={img} alt="attachment" className="max-w-[200px] max-h-[200px] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 object-contain" />
          ))}
        </div>
      )}
      {thinkingContent && <ThinkingBlock content={thinkingContent} />}
      <div className={`font-serif leading-relaxed ${isAi ? 'text-gray-700 dark:text-gray-300 items-start' : 'text-gray-500 dark:text-gray-500 tracking-wide items-end'} flex flex-col gap-2`} style={{ fontSize: 'var(--app-font-size, 1.125rem)' }}>
        {renderParts.map((part) => {
          switch (part.type) {
            case 'narration':
              return <span key={part.id} className="opacity-90 whitespace-pre-wrap block w-full text-center py-2 font-sans" style={{ fontSize: '0.8em', color: 'var(--dialogue-text-narration)' }}>{part.content}</span>;
            case 'dialogue':
              return <span key={part.id} className={`font-bold whitespace-pre-wrap drop-shadow-sm ${isAi ? 'text-left' : 'text-right'}`} style={{ color: 'var(--dialogue-text-dialogue)' }}>"{part.content}"</span>;
            case 'thought':
              return <span key={part.id} className={`opacity-80 italic block mb-1 whitespace-pre-wrap font-serif ${isAi ? 'text-left' : 'text-right'}`} style={{ fontSize: '0.85em', color: 'var(--dialogue-text-thought)' }}>({part.content})</span>;
            case 'action':
              return <span key={part.id} className="italic whitespace-pre-wrap block w-full text-center py-2 font-serif" style={{ fontSize: '0.85em', color: 'var(--dialogue-text-action)' }}>{part.content}</span>;
            case 'card':
              return <StatusBar key={part.id} type={part.content} content={part.content} metadata={part.metadata} />;
            default:
              return <span key={part.id} className={isAi ? 'text-left' : 'text-right'}>{part.content}</span>;
          }
        })}
      </div>
      {htmlBlocksEl}
      {codeBlocksEl}
    </>
  );
});

export default MessageContent;
