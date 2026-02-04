import type { SystemSettingDto } from '@paybridge/shared-types';
import { getHttpClient } from './http';

export const settingApi = {
  list: () => getHttpClient().get<SystemSettingDto[]>('/api/v1/settings'),

  get: <T>(key: string) => getHttpClient().get<T>(`/api/v1/settings/${key}`),

  update: (key: string, value: unknown) =>
    getHttpClient().put<SystemSettingDto>(`/api/v1/settings/${key}`, { value }),
};
