import axios from 'axios';

// Configuration
const API_URL = 'http://10.0.0.252:5678/webhook/dbc-new-chat';
const STAFF_ID = '1001'; // Mock Staff ID

// Function สร้าง Session ใหม่
export const createChatSession = async (sessionName: string) => {
  try {
    const response = await axios.post(API_URL, {
      staff_id: STAFF_ID,
      session_name: sessionName
    });
    
    // Return data จาก n8n (คาดหวังว่าจะมี id หรือ session_id กลับมา)
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// ดึงประวัติ session จาก n8n
export const fetchSession = async (staffId?: string) => {
  try {
    const response = await axios.get('http://10.0.0.252:5678/webhook/dbc-fetch-session', {
      params: { staff_id: staffId || STAFF_ID }
    });
    return response.data;
  } catch (error) {
    console.error('Fetch history API Error:', error);
    throw error;
  }
};

// เปลี่ยนชื่อ session ผ่าน n8n
export const renameChatSession = async (id: string, sessionName: string) => {
  try {
    const response = await axios.post('http://10.0.0.252:5678/webhook/dbc-rename', {
      id,
      session_name: sessionName
    });
    return response.data;
  } catch (error) {
    console.error('Rename session API Error:', error);
    throw error;
  }
};

// ลบ session ผ่าน n8n
export const deleteChatSession = async (id: string) => {
  try {
    const response = await axios.post('http://10.0.0.252:5678/webhook/dbc-delete-session', {
      id
    });
    return response.data;
  } catch (error) {
    console.error('Delete session API Error:', error);
    throw error;
  }
};

// ดึงประวัติการสนทนาของ session (ส่ง session_id)
export const fetchChatHistory = async (sessionId: string) => {
  try {
    const response = await axios.get('http://10.0.0.252:5678/webhook/dbc-chat-history', {
      params: { session_id: sessionId }
    });
    return response.data;
  } catch (error) {
    console.error('Fetch chat history API Error:', error);
    throw error;
  }
};

// อนาคตสามารถเพิ่ม function อื่นๆ ได้ เช่น sendChat, getHistory

// ส่งข้อความไปถาม AI (session + message)
export const sendMessageToAI = async (sessionId: string, message: string) => {
  try {
    const response = await axios.post('http://10.0.0.252:5678/webhook/dbc-ai', {
      session_id: sessionId,
      message
    });
    return response.data;
  } catch (error) {
    console.error('Send message to AI API Error:', error);
    throw error;
  }
};

// ส่งผลการให้คะแนนความพึงพอใจของผู้ใช้สำหรับข้อความ
export type SatisfactionKind = 'LIKE' | 'DISLIKE';

export const submitSatisfaction = async (messageId: string | number, satisfaction: SatisfactionKind, satisfactionReason?: string) => {
  try {
    const response = await axios.post('http://10.0.0.252:5678/webhook/dbc-satisfaction', {
      message_id: messageId,
      satisfaction,
      satisfaction_reason: satisfactionReason || null
    });
    return response.data;
  } catch (error) {
    console.error('Submit satisfaction API Error:', error);
    throw error;
  }
};