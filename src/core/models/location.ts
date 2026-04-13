/**
 * 地点模型
 */

import { z } from 'zod';

/**
 * 地点Schema
 */
export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['城市', '村镇', '建筑', '自然地标', '其他']),
  region: z.string(),
  description: z.string(),
  keyLandmarks: z.array(z.string()),
  travelTime: z.record(z.string(), z.string()),
  socialEnvironment: z.string(),
  currentWeather: z.string(),
});

/**
 * 地点状态Schema
 */
export const LocationStateSchema = z.object({
  locationId: z.string(),
  currentWeather: z.string(),
  presentCharacters: z.array(z.string()),
  recentEvents: z.array(z.string()),
});

export type Location = z.infer<typeof LocationSchema>;
export type LocationState = z.infer<typeof LocationStateSchema>;
