import api from './api';

export const getInternships = async (params) => {
  const { data } = await api.get('/internships', { params });
  return data;
};

export const getInternshipById = async (id) => {
  const { data } = await api.get(`/internships/${id}`);
  return data;
};

export const createInternship = async (formData) => {
  const { data } = await api.post('/internships', formData);
  return data;
};

export const updateInternship = async (id, formData) => {
  const { data } = await api.put(`/internships/${id}`, formData);
  return data;
};

export const deleteInternship = async (id) => {
  const { data } = await api.delete(`/internships/${id}`);
  return data;
};

export const applyToInternship = async (id) => {
  const { data } = await api.post(`/internships/${id}/apply`);
  return data;
};
