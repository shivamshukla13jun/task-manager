import axios from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ENCRYPTION_ENABLED } from '../lib/config';
import { decryptResponse, encryptRequest, isEncryptedResponse } from '../lib/crypto';
import { store } from '../store';
import { clearCredentials } from '../store/auth.slice';

export const api = axios.create({ baseURL: "https://task-manager-zpny.onrender.com" });

type EncryptedConfig = InternalAxiosRequestConfig & { _encKey?: CryptoKey };

api.interceptors.request.use(async (config: EncryptedConfig) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!ENCRYPTION_ENABLED) return config;

  const enc = await encryptRequest(config.data);
  config._encKey = enc.key;
  config.headers['isencrypted'] = 'true';
  if (enc.body) {
    config.data = enc.body;
  } else {
    // Bodiless request (GET/DELETE) — session key rides in x-ek so the
    // response can still be encrypted.
    config.headers['x-ek'] = enc.ek;
  }
  return config;
});

const decryptIfNeeded = async (response: AxiosResponse): Promise<void> => {
  const key = (response.config as EncryptedConfig)._encKey;
  if (key && isEncryptedResponse(response.data)) {
    response.data = await decryptResponse(key, response.data);
  }
};

api.interceptors.response.use(
  async (res) => {
    await decryptIfNeeded(res);
    return res;
  },
  async (err) => {
    if (err.response) {
      // Error responses are encrypted under the same session key too
      try {
        await decryptIfNeeded(err.response);
      } catch {
        // leave the raw envelope — errorMessage() falls back gracefully
      }
      if (err.response.status === 401) {
        store.dispatch(clearCredentials());
      }
    }
    return Promise.reject(err);
  }
);

export const errorMessage = (err: unknown): string =>
  axios.isAxiosError(err)
    ? (err.response?.data?.message ?? err.message)
    : 'Something went wrong';
