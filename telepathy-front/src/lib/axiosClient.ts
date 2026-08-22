import axios from 'axios';

import { resolveApiUrl } from './apiClient';

export const apiAxios = axios.create({
  withCredentials: true,
});

apiAxios.interceptors.request.use((config) => {
  if (config.url) {
    config.url = resolveApiUrl(config.url);
  }

  return config;
});
