import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
});

export const fetchPeople = async () => {
  const { data } = await api.get('/people');
  return data;
};

export const createPerson = async (payload: Record<string, unknown>) => {
  const { data } = await api.post('/people', payload);
  return data;
};

export const sendEvent = async (payload: Record<string, unknown>) => {
  const { data } = await api.post('/events/presence', payload);
  return data;
};

export const fetchStatusNow = async () => {
  const { data } = await api.get('/status/now');
  return data;
};

export const fetchDiagnostics = async () => {
  const [health, status] = await Promise.all([
    api.get('/health').then((res) => res.data),
    api.get('/status/now').then((res) => res.data)
  ]);
  return { health, status };
};

export default api;
