import axios from 'axios';

// Configuration
// สังเกต: ผมตัด path ย่อยออกเพื่อให้ต่อ string ได้ยืดหยุ่นขึ้น
const API_BASE_URL = 'http://10.0.0.252:6060/DBC'; 
let STAFF_ID = '1001'; // default mock Staff ID; can be updated from session token

// Initialize from sessionStorage if available (so refresh preserves staff id)
try {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const saved = window.sessionStorage.getItem('dbc_staffId');
    if (saved) STAFF_ID = saved;
  }
} catch (e) {
  // ignore storage access errors
}

// Set staff id (from external auth / session lookup) and persist to sessionStorage
export const setStaffId = (id: string | number) => {
  STAFF_ID = String(id);
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('dbc_staffId', String(id));
    }
  } catch (e) {
    // ignore storage errors
  }
};

export const getStoredStaffId = () => STAFF_ID;

// Fetch staff info (staffId) from sessionId via BackOffice API
export const fetchStaffFromSessionId = async (sessionId: string) => {
  try {
    const url = 'http://10.0.0.159/BackOffice/Permission/GetTokenFromSessionId';
    const response = await axios.post(url, {
      request: { sessionId }
    }, {
      headers: {
        'Content-Type': 'application/json',
        accept: 'text/plain'
      }
    });

    const data = response.data;
    const staffId = data?.responseObject?.staffId;
    if (staffId) {
      // persist the fetched staffId for subsequent reloads
      setStaffId(staffId);
    }
    return staffId;
  } catch (error) {
    console.error('Fetch staff from session API Error:', error);
    throw error;
  }
};

// 1. สร้าง Session ใหม่ (POST Body เหมือนเดิม เพราะข้อมูลเยอะไม่ใช่ Params)
export const createChatSession = async (sessionName: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/new-chat`, {
      staff_id: STAFF_ID,
      session_name: sessionName
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// 2. ดึงประวัติ session (GET)
// เปลี่ยน: จาก Query String (?staff_id=...) เป็น Path Param (/sessions/1001)
export const fetchSession = async (staffId?: string) => {
  const targetStaffId = staffId || STAFF_ID;
  try {
    // ส่ง staff_id ไปกับ URL โดยตรง
    const response = await axios.get(`${API_BASE_URL}/sessions/${targetStaffId}`);
    return response.data;
  } catch (error) {
    console.error('Fetch history API Error:', error);
    throw error;
  }
};

// 3. เปลี่ยนชื่อ session (POST)
// เปลี่ยน: เอา ID ไปไว้ที่ URL เพื่อความชัดเจน (RESTful) ส่วนชื่อใหม่ไว้ใน Body
export const renameChatSession = async (id: string, sessionName: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/rename/${id}`, {
      session_name: sessionName
    });
    return response.data;
  } catch (error) {
    console.error('Rename session API Error:', error);
    throw error;
  }
};

// 4. ลบ session (POST หรือ DELETE)
// เปลี่ยน: ส่ง ID ไปกับ URL
export const deleteChatSession = async (id: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/delete-session/${id}`); 
    // หรือถ้า Backend ใช้ method DELETE: await axios.delete(`${API_BASE_URL}/delete-session/${id}`);
    return response.data;
  } catch (error) {
    console.error('Delete session API Error:', error);
    throw error;
  }
};

// 5. ดึงประวัติการสนทนา (GET)
// เปลี่ยน: จาก Query String (?session_id=...) เป็น Path Param (/chat-history/xyz123)
export const fetchChatHistory = async (sessionId: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/chat-history/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Fetch chat history API Error:', error);
    throw error;
  }
};

// 6. ส่งข้อความ (POST Body เหมือนเดิม)
export const sendMessageToAI = async (sessionId: string, message: string) => {
  try {
    // มักจะส่ง sessionId ใน Body หรือ URL ก็ได้ แต่ Body สะดวกกว่าถ้า payload ใหญ่
    const response = await axios.post(`${API_BASE_URL}/send-message`, {
      session_id: sessionId,
      message
    });
    return response.data;
  } catch (error) {
    console.error('Send message to AI API Error:', error);
    throw error;
  }
};

// 7. ให้คะแนน (POST Body เหมือนเดิม)
export type SatisfactionKind = 'LIKE' | 'DISLIKE';

export const submitSatisfaction = async (messageId: string | number, satisfaction: SatisfactionKind, satisfactionReason?: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/satisfaction/${messageId}`, {
      satisfaction,
      satisfaction_reason: satisfactionReason || null
    });
    return response.data;
  } catch (error) {
    console.error('Submit satisfaction API Error:', error);
    throw error;
  }
};