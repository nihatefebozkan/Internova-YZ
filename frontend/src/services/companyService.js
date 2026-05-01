import api from './api';

export const getCompanies = async (params) => {
  const { data } = await api.get('/companies', { params });
  return data;
};

export const getCompanyById = async (id) => {
  const { data } = await api.get(`/companies/${id}`);
  return data;
};

export const updateCompanyProfile = async (formData) => {
  const { data } = await api.put('/companies/me', formData);
  return data;
};
