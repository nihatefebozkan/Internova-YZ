import api from './api';

export const askYonetmelik = async (soru) => {
  const { data } = await api.post('/ai/ask', { soru });
  return data;
};

export const getRecommendations = async () => {
  const { data } = await api.get('/ai/recommendations');
  return data;
};

export const mentorCv = async (metin) => {
  const { data } = await api.post('/ai/mentor/cv', { metin });
  return data;
};

export const mentorInternship = async (metin) => {
  const { data } = await api.post('/ai/mentor/internship', { metin });
  return data;
};
