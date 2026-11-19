import axios from 'axios';
import { API_URL } from '../lib/config';
import { store } from '../store';
import { clearCredentials } from '../store/auth.slice';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      store.dispatch(clearCredentials());
    }
    return Promise.reject(err);
  }
);

export const errorMessage = (err: unknown): string =>
  axios.isAxiosError(err)
    ? (err.response?.data?.message ?? err.message)
    : 'Something went wrong';
