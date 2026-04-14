import { 
  PointerSensor, 
  TouchSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core'

/**
 * 通用的 DnD 传感器配置
 * 适配桌面端（鼠标）和移动端（长按触发拖拽）
 */
export const useDndSensors = () => {
  return useSensors(
    // 鼠标点击移动 8px 后触发，防止误触点击
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    // 触摸屏长按 250ms 后触发，允许正常的滚动行为
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 15,
      },
    })
  )
}
