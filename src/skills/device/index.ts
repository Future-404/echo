import type { SkillModule } from '../core/types';
import { deviceSchema } from './schema';
import { executeDeviceStatus } from './executor';

export const deviceSkill: SkillModule = {
  name: 'get_device_status',
  displayName: '设备感知',
  description: deviceSchema.description,
  schema: deviceSchema,
  execute: executeDeviceStatus,
};
