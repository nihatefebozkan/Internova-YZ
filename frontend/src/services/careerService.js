// Kariyer Haritası Servisi — Beceri matrisi, yol haritası, radar grafik verisi
// Dolduracak: Bilgenur & Rabia

import api from './api';

export const getCareerRoadmap = async (targetCompanyId) => {
  const { data } = await api.get('/career/roadmap', { params: { targetCompanyId } });
  return data;
};

export const getRadarChartData = async () => {
  const { data } = await api.get('/career/radar');
  return data;
};

export const getIndustrialSkillDemand = async (sector) => {
  const { data } = await api.get('/career/industry-skills', { params: { sector } });
  return data;
};

export const updateStudentSkills = async (skills) => {
  const { data } = await api.put('/career/skills', { skills });
  return data;
};
