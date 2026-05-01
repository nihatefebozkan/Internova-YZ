// BTÜ Odaklı Akıllı Asistan Servisi
// Görev: PDF analizi, BTÜ staj yönetmeliği Q&A, RAG mimarisi
// Dolduracak: Yusuf (LangChain + Pinecone entegrasyonu)

// const { OpenAI } = require('openai');
// const { Pinecone } = require('@pinecone-database/pinecone');
// const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

/**
 * Yüklenen PDF'i chunk'lara böler ve Pinecone vektör DB'ye yükler
 * @param {string} filePath - Yüklenen PDF dosyasının yolu
 * @param {string} userId - PDF'i yükleyen kullanıcı ID'si
 */
const analyzePDF = async (filePath, userId) => {};

/**
 * Kullanıcının sorusuna RAG pipeline ile yanıt üretir
 * @param {string} question - Kullanıcının sorusu
 * @param {string} userId - Kullanıcı ID'si (kişisel vektör namespace için)
 * @returns {object} { answer, sources }
 */
const askQuestion = async (question, userId) => {};

/**
 * BTÜ staj yönetmeliğinden belirli konuları getirir
 * @param {string} topic - Aranacak konu (ör: "staj süresi", "ücret")
 * @returns {Array} İlgili yönetmelik maddeleri
 */
const getRegulationInfo = async (topic) => {};

/**
 * Kullanıcının daha önce yüklediği PDF'leri listeler
 * @param {string} userId
 */
const getUserDocuments = async (userId) => {};

module.exports = { analyzePDF, askQuestion, getRegulationInfo, getUserDocuments };
