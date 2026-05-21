import api from './api';

export const getMyProjects = async () => {
  const { data } = await api.get('/portfolio/projects');
  return data;
};

export const addProject = async (projectData) => {
  const { data } = await api.post('/portfolio/projects', projectData);
  return data;
};

export const updateProject = async (id, projectData) => {
  const { data } = await api.put(`/portfolio/projects/${id}`, projectData);
  return data;
};

export const deleteProject = async (id) => {
  await api.delete(`/portfolio/projects/${id}`);
};

export const getUserPortfolio = async (userId) => {
  const { data } = await api.get(`/portfolio/${userId}`);
  return data;
};

export const getMyCertificates = async () => {
  const { data } = await api.get('/certificates/me');
  return data;
};

export const addCertificate = async (certData) => {
  const { data } = await api.post('/certificates', certData);
  return data;
};

export const deleteCertificate = async (id) => {
  await api.delete(`/certificates/${id}`);
};

export const getMyCv = async () => {
  const { data } = await api.get('/cv/me');
  return data;
};

export const updateCv = async (cvData) => {
  const { data } = await api.put('/cv/me', cvData);
  return data;
};
