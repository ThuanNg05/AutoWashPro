import axios from 'axios';

// Trong quá trình phát triển (development) sử dụng Vite Proxy, chúng ta dùng relative path.
// Trong production hoặc khi không dùng proxy, cấu hình VITE_API_BASE_URL trỏ tới http://localhost:5023
export const API_BASE_URL = "";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, 
  headers: { 
    'Content-Type': 'application/json',
  },
});


let activeCount = 0;
const loadingListeners = new Set();

const emitLoading = () => {
  for (const listener of loadingListeners) listener();
};

export const subscribeLoading = (listener) => {
  loadingListeners.add(listener);
  return () => loadingListeners.delete(listener);
};

export const getLoadingCount = () => activeCount;

const shouldTrack = (config) =>
  config &&
  config.skipGlobalLoader !== true &&
  String(config.method || 'get').toLowerCase() === 'get';

api.interceptors.request.use(
  (config) => {
    if (shouldTrack(config)) {
      config.__trackedLoading = true;
      activeCount += 1;
      emitLoading();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const releaseTracked = (config) => {
  if (config && config.__trackedLoading) {
    config.__trackedLoading = false;
    activeCount = Math.max(0, activeCount - 1);
    emitLoading();
  }
};

api.interceptors.response.use(
  (response) => {
    releaseTracked(response.config);
    return response;
  },
  (error) => {
    releaseTracked(error.config);
    return Promise.reject(error);
  }
);

export default api;
