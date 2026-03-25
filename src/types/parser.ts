export interface TextSegment {
  id: string; // 用于 React key 渲染
  type: 'narration' | 'dialogue' | 'thought' | 'action' | 'card';
  speaker?: string; // 说话人名字（如果有）
  content: string;
  metadata?: any; // 用于 card 类型
}
