import { ApiService } from './ApiService';
import { getEnvVar } from '../../shared/utils/getEnvVar';

export const packmindApiService = new ApiService(
  getEnvVar('VITE_PACKMIND_API_BASE_URL'),
);
