import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  id: string;
  children: (props: {
    setNodeRef: (node: HTMLElement | null) => void;
    attributes: any;
    listeners: any;
    style: React.CSSProperties;
    isDragging: boolean;
  }) => React.ReactNode;
}

/**
 * 通用可排序项封装组件
 */
export const SortableItem: React.FC<SortableItemProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
    touchAction: 'none',
  };

  return <>{children({ setNodeRef, attributes, listeners, style, isDragging })}</>;
};
