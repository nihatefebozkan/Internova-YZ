// Çift Odaklı YZ Mentor Bot Servisi
// Görev: LLM + RAG, öğrenci & şirket taraflı rehberlik
// Dolduracak: Yusuf & Rabia (OpenAI GPT-4o + LangChain RAG pipeline)

// const { ChatOpenAI } = require('langchain/chat_models/openai');
// const { ConversationChain } = require('langchain/chains');

/**
 * Öğrenci için mentor bot yanıtı üretir
 * Özellikler: Bursa sanayi terminolojisi, özgeçmiş yazım düzeltme
 * @param {string} userId
 * @param {string} message
 * @param {Array} conversationHistory - Önceki mesajlar
 * @returns {object} { reply, suggestions }
 */
const studentMentorChat = async (userId, message, conversationHistory) => {};

/**
 * Şirket için mentor bot yanıtı üretir
 * Özellikler: CNC terminolojisi, üretim toleransları, ilan formatı önerileri
 * @param {string} companyId
 * @param {string} message
 * @param {Array} conversationHistory
 */
const companyMentorChat = async (companyId, message, conversationHistory) => {};

/**
 * İlan metnini analiz edip iyileştirme önerileri sunar
 * @param {string} jobDescription
 * @returns {object} { improvedText, suggestions, industryTerms }
 */
const improveJobDescription = async (jobDescription) => {};

/**
 * Özgeçmiş metnini analiz eder, yazım/içerik önerileri üretir
 * @param {string} resumeText
 * @param {string} targetPosition
 */
const reviewResume = async (resumeText, targetPosition) => {};

module.exports = { studentMentorChat, companyMentorChat, improveJobDescription, reviewResume };
