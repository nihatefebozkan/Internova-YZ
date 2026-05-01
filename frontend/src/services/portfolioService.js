// Portfolyo Servisi — Portfolyo CRUD, GitHub/LinkedIn sync, sertifika yönetimi
// Dolduracak: Rabia & Melike

import api from './api';

export const getPortfolio = async (userId) => {
  const { data } = await api.get(`/portfolio/${userId}`);
  return data;
};

export const updatePortfolio = async (portfolioData) => {
  const { data } = await api.put('/portfolio', portfolioData);
  return data;
};

export const syncGithub = async (githubUsername) => {
  const { data } = await api.post('/portfolio/sync/github', { githubUsername });
  return data;
};

export const uploadCertificate = async (formData) => {
  const { data } = await api.post('/portfolio/certificates', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const getCertificates = async () => {
  const { data } = await api.get('/portfolio/certificates');
  return data;
};
