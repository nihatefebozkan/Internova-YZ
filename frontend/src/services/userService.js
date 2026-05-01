// Kullanıcı Servisi — Profil getir/güncelle, öğrenci listesi (admin), kullanıcı silme
// Dolduracak: Nihat

import api from './api';

export const getUserProfile = async (userId) => {
  const { data } = await api.get(`/users/${userId}`);
  return data;
};

export const updateUserProfile = async (userId, formData) => {
  const { data } = await api.put(`/users/${userId}`, formData);
  return data;
};

export const getAllUsers = async (params) => {
  const { data } = await api.get('/users', { params });
  return data;
};

export const deleteUser = async (userId) => {
  const { data } = await api.delete(`/users/${userId}`);
  return data;
};
