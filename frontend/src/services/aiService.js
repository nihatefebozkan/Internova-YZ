import api from './api';

export const getAiRecommendations = async () => {
  const { data } = await api.get('/ai/recommendations');
  return data;
};

export const analyzeResume = async (resumeText) => {
  const { data } = await api.post('/ai/analyze-resume', { resumeText });
  return data;
};

export const generateCoverLetter = async (internshipId) => {
  const { data } = await api.post('/ai/cover-letter', { internshipId });
  return data;
};
