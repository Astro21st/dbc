import { useState, useRef, useEffect, type MouseEvent } from 'react';
import { createChatSession, fetchSession, renameChatSession, deleteChatSession, fetchChatHistory, sendMessageToAI, submitSatisfaction, fetchStaffFromSessionId, setStaffId } from '../../services/chat/chatService';
import { 
  Database, ShieldCheck, Bot, User, FileText, X, Paperclip, Send, 
  MessageSquare, Edit2, Trash2, Check, Plus, Loader2, ThumbsUp, ThumbsDown
} from 'lucide-react';

// --- Configuration ---
// Note: API interaction moved to `src/services/chat/chatService.ts`

// --- Types ---
export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachment?: { name: string; content: string };
};

export type Session = {
  id: string;
  title: string;
  date: string;
  messages: Message[];
};

// --- Utility: Markdown Renderer ---
const renderContent = (content: string) => {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      const codeContent = part.replace(/^```\w*\n?/, '').replace(/```$/, '');
      return (
        <div key={index} className="relative group my-3">
           <div className="absolute right-2 top-2 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded opacity-70">SQL</div>
           <pre className="block bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto border border-slate-700">
             <code>{codeContent}</code>
           </pre>
        </div>
      );
    } else {
      return (
        <div key={index} className="whitespace-pre-wrap text-sm leading-relaxed mb-1">
          {part.split(/(\*\*.*?\*\*)/g).map((subPart, subIndex) => {
              if (subPart.startsWith('**') && subPart.endsWith('**')) {
                  return <strong key={subIndex} className="font-semibold text-slate-900">{subPart.slice(2, -2)}</strong>;
              }
              const inlineCodeParts = subPart.split(/(`.*?`)/g);
              return inlineCodeParts.map((inlinePart, i) => {
                  if (inlinePart.startsWith('`') && inlinePart.endsWith('`')) {
                      return <code key={`${subIndex}-${i}`} className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-200 mx-0.5">{inlinePart.slice(1, -1)}</code>;
                  }
                  return <span key={`${subIndex}-${i}`}>{inlinePart}</span>;
              });
          })}
        </div>
      );
    }
  });
};

// Simple sanitizer using DOMParser to strip dangerous tags/attributes
const sanitizeHtml = (html: string) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // remove potentially dangerous elements
    ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'].forEach(tag => {
      doc.querySelectorAll(tag).forEach(el => el.remove());
    });

    // remove event handlers, javascript: URIs and inline styles
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null);
    const nodes: Element[] = [];
    // collect nodes
    while (walker.nextNode()) nodes.push(walker.currentNode as Element);
    nodes.forEach(el => {
      [...el.attributes].forEach(attr => {
        const name = attr.name.toLowerCase();
        const val = attr.value || '';
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
        } else if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(val)) {
          el.removeAttribute(attr.name);
        } else if (name === 'style') {
          el.removeAttribute(attr.name);
        }
      });
    });

    return doc.body.innerHTML;
  } catch (e) {
    return '';
  }
};

// --- Component: NewChatModal ---
interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  isLoading: boolean; // รับค่า Loading
}

function NewChatModal({ isOpen, onClose, onConfirm, isLoading }: NewChatModalProps) {
  const [newChatName, setNewChatName] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (newChatName.trim()) {
      onConfirm(newChatName);
      setNewChatName('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Start New Chat</h3>
          <button onClick={onClose} disabled={isLoading} className="text-slate-400 hover:text-slate-600 disabled:opacity-50">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <label className="block text-sm font-medium text-slate-600 mb-2">ตั้งชื่อหัวข้อแชท</label>
          <input 
            type="text" 
            value={newChatName}
            onChange={(e) => setNewChatName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleConfirm()}
            autoFocus
            disabled={isLoading}
            placeholder="เช่น ตรวจสอบตาราง HR..."
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!newChatName.trim() || isLoading}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors flex items-center gap-2"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {isLoading ? 'Creating...' : 'เริ่มแชท'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Component: Sidebar ---
interface SidebarProps {
  sessions: Session[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newName: string) => void;
}

function Sidebar({ 
  sessions, 
  currentSessionId, 
  onSelectSession, 
  onNewChat,
  onDeleteSession,
  onRenameSession
}: SidebarProps) {
  
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingSessionId]);

  const startEditing = (e: MouseEvent, session: Session) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditNameValue(session.title);
  };

  const saveEditing = () => {
    if (editingSessionId && editNameValue.trim()) {
      onRenameSession(editingSessionId, editNameValue);
    }
    setEditingSessionId(null);
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col flex-shrink-0 z-20 h-full">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2">
        <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
          <Database className="text-white w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 text-sm">DB Knowledge</h1>
          <p className="text-xs text-slate-500">Center AI</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Chat History
        </div>
        {sessions.map(session => (
          <div 
            key={session.id} 
            onClick={() => onSelectSession(session.id)}
            className={`group w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 cursor-pointer relative ${
              session.id === currentSessionId ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50 border border-transparent'
            }`}
          >
            <MessageSquare size={16} className={`${session.id === currentSessionId ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
            
            {editingSessionId === session.id ? (
              /* Editing Mode */
              <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <input
                  ref={editInputRef}
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                  onBlur={saveEditing}
                  className="w-full text-sm bg-white border border-blue-300 rounded px-1 py-0.5 outline-none text-slate-700"
                />
                <button onClick={saveEditing} className="text-green-600 hover:text-green-700 p-1"><Check size={14}/></button>
              </div>
            ) : (
              /* Display Mode */
              <div className="flex-1 overflow-hidden">
                <div className={`text-sm font-medium truncate ${session.id === currentSessionId ? 'text-blue-700' : 'text-slate-700'}`}>
                  {session.title}
                </div>
                <div className="text-[10px] text-slate-400">{session.date}</div>
              </div>
            )}

            {/* Action Buttons */}
            {!editingSessionId && (
              <div className={`flex items-center gap-1 ${session.id === currentSessionId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                  <button 
                    onClick={(e) => startEditing(e, session)}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded"
                    title="แก้ไขชื่อ"
                 >
                   <Edit2 size={12} />
                 </button>
                  <button 
                    onClick={() => onDeleteSession(session.id)}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded"
                    title="ลบแชท"
                 >
                   <Trash2 size={12} />
                 </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100">
        <button 
          onClick={onNewChat}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus size={16} /> New Chat
        </button>
      </div>
    </aside>
  );
}

// --- Component: ChatArea ---
interface ChatAreaProps {
  currentSession?: Session;
  currentSessionId: string;
  isLoading: boolean;
  onSendMessage: (text: string, file: { name: string; content: string } | null) => void;
  satisfiedMap: Record<string, 'LIKE' | 'DISLIKE'>;
  onSatisfaction: (messageId: string, kind: 'LIKE' | 'DISLIKE') => void;
}

function ChatArea({ 
  currentSession, 
  currentSessionId, 
  isLoading, 
  onSendMessage,
  satisfiedMap,
  onSatisfaction
}: ChatAreaProps) {
  
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMessages = currentSession?.messages || [];

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, isLoading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'text/plain' || file.name.endsWith('.sql') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAttachedFile({
            name: file.name,
            content: event.target.result as string
          });
        }
      };
      reader.readAsText(file);
    } else {
      alert('กรุณาอัปโหลดไฟล์ .txt หรือ .sql เท่านั้นครับ');
    }
    e.target.value = '';
  };

  const handleSend = () => {
    if ((!input.trim() && !attachedFile) || isLoading) return;
    onSendMessage(input, attachedFile);
    setInput('');
    setAttachedFile(null);
  };

  return (
    <main className="flex-1 flex flex-col relative bg-slate-50 min-w-0 h-full">
        {/* Header */}
        <header className="bg-white px-6 py-4 border-b border-slate-200 shadow-sm flex justify-between items-center z-10">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="md:hidden bg-blue-600 p-1.5 rounded-lg flex-shrink-0">
              <Database className="text-white w-4 h-4" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <h2 className="font-semibold text-slate-800 truncate">{currentSession?.title || 'New Chat'}</h2>
              <span className="text-[10px] text-slate-400 font-mono">Session ID: {currentSessionId}</span>
            </div>
            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border border-green-200 flex-shrink-0 ml-2">
              <ShieldCheck size={10} /> Secure
            </span>
          </div>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {currentMessages.map((msg: Message) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-md">
                  <Bot size={18} className="text-white" />
                </div>
              )}

              <div className={`max-w-[85%] md:max-w-[70%] space-y-2`}>
                <div className={`p-4 rounded-2xl shadow-sm border ${
                  msg.role === 'user' 
                    ? 'bg-white border-slate-200 text-slate-800 rounded-tr-none' 
                    : 'bg-white border-slate-200 text-slate-800 rounded-tl-none'
                }`}>
                  
                  {msg.attachment && (
                    <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-md">
                        <FileText className="text-blue-600 w-5 h-5" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-medium text-slate-700 truncate">{msg.attachment.name}</div>
                        <div className="text-xs text-slate-500">Text File (SQL)</div>
                      </div>
                    </div>
                  )}

                  <div className="text-slate-700">
                    {msg.role === 'assistant' && /<\/?[a-z][\s\S]*>/i.test(msg.content) ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.content) }} />
                    ) : (
                      renderContent(msg.content)
                    )}
                  </div>
                </div>
                
                <div className={`text-[10px] text-slate-400 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                {msg.role === 'assistant' && (
                  <div className="mt-1 flex items-center gap-2 text-[12px]">
                    <button
                      onClick={() => onSatisfaction(msg.id, 'LIKE')}
                      disabled={!!satisfiedMap[msg.id]}
                      title="ชอบ"
                      className={`flex items-center gap-1 px-2 py-1 rounded ${satisfiedMap[msg.id] === 'LIKE' ? 'bg-green-100 text-green-700' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      <ThumbsUp size={14} />
                      <span>ถูกใจ</span>
                    </button>

                    <button
                      onClick={() => onSatisfaction(msg.id, 'DISLIKE')}
                      disabled={!!satisfiedMap[msg.id]}
                      title="ไม่ชอบ"
                      className={`flex items-center gap-1 px-2 py-1 rounded ${satisfiedMap[msg.id] === 'DISLIKE' ? 'bg-red-100 text-red-700' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      <ThumbsDown size={14} />
                      <span>ไม่ถูกใจ</span>
                    </button>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                  <User size={18} className="text-slate-500" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 items-start animate-pulse">
               <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
               <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none text-slate-500 text-sm flex items-center gap-2 shadow-sm">
                 <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                 </div>
                 <span className="ml-2">AI is analyzing...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white border-t border-slate-200 shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.05)] z-20">
          
          {attachedFile && (
            <div className="flex items-center gap-2 mb-3 bg-blue-50 border border-blue-100 p-2 rounded-lg w-fit animate-in slide-in-from-bottom-2 fade-in">
              <div className="bg-white p-1.5 rounded-md shadow-sm">
                <FileText size={16} className="text-blue-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-700 max-w-[200px] truncate">{attachedFile.name}</span>
                <span className="text-[10px] text-slate-500">พร้อมส่งให้ AI ตรวจสอบ</span>
              </div>
              <button onClick={() => setAttachedFile(null)} className="ml-2 p-1 hover:bg-blue-100 rounded-full text-slate-400 hover:text-red-500 transition-colors">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex gap-3 relative max-w-4xl mx-auto">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".txt,.sql"
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"
              title="แนบไฟล์ SQL (.txt)"
            >
              <Paperclip size={20} />
            </button>

            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={attachedFile ? "พิมพ์คำสั่งเพิ่มเติมเกี่ยวกับไฟล์นี้..." : "ถามคำถาม หรือพิมพ์ SQL เพื่อตรวจสอบ..."}
                rows={1}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 pr-12 outline-none transition-all resize-none min-h-[46px] max-h-32 text-sm md:text-base scrollbar-hide"
                style={{ lineHeight: '1.5' }}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={(!input.trim() && !attachedFile) || isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl px-5 py-2 font-medium transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center min-w-[50px]"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
    </main>
  );
}

// --- App Main Logic ---

export default function DBCChat() {
  // State
  const [sessions, setSessions] = useState<Session[]>([]);

  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false); // State for creating chat loading
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const [satisfiedMap, setSatisfiedMap] = useState<Record<string, 'LIKE' | 'DISLIKE'>>({});

  const handleSatisfaction = async (messageId: string, kind: 'LIKE' | 'DISLIKE') => {
    if (!messageId) return;
    if (satisfiedMap[messageId]) return; // already submitted

    const reason = window.prompt('เหตุผลที่คุณให้คะแนน (ใส่ข้อความหรือกดยกเลิกเพื่อข้าม):') || undefined;
    try {
      await submitSatisfaction(messageId, kind, reason);
      setSatisfiedMap(prev => ({ ...prev, [messageId]: kind }));
    } catch (err) {
      console.error('Submit satisfaction failed', err);
      alert('ไม่สามารถส่งผลการให้คะแนนได้ กรุณาลองใหม่');
    }
  };
  // Select session and load its real messages from server
  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setIsLoading(true);
    try {
      const data = await fetchChatHistory(sessionId);

      // normalize returned messages
      const rawMessages = Array.isArray(data) ? data : (data?.messages || data?.data || []);

      const mappedMessages: Message[] = Array.isArray(rawMessages) && rawMessages.length > 0
        ? rawMessages.map((m: any, idx: number) => {
            // Support n8n-like structure: { message: { type: 'human'|'ai', content: '...' }, ... }
            const msgWrapper = m?.message ?? m;
            const content = typeof msgWrapper === 'string'
              ? msgWrapper
              : (msgWrapper.content || msgWrapper.text || msgWrapper.output || msgWrapper.answer || '');

            const type = (msgWrapper && msgWrapper.type) || m.role || m.from || 'assistant';
            const role = (type === 'human' || type === 'user') ? 'user' : 'assistant';

            const id = m.id?.toString() || m.message_id?.toString() || `${sessionId}-${idx}`;
            const ts = m.created_at || msgWrapper.created_at || m.lastupdated_at || msgWrapper.timestamp || null;

            return {
              id,
              role: role as 'user' | 'assistant',
              content: content,
              timestamp: ts ? new Date(ts) : new Date(),
              attachment: m.attachment || msgWrapper.attachment
            } as Message;
          })
        : [];

      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: mappedMessages } : s));

      // Initialize satisfiedMap from server-provided `satisfaction` fields
      try {
        const newSatisfied: Record<string, 'LIKE' | 'DISLIKE'> = {};
        if (Array.isArray(rawMessages)) {
          rawMessages.forEach((m: any, i: number) => {
            const mid = m.id?.toString() || m.message_id?.toString() || `${sessionId}-${i}`;
            if (m.satisfaction) {
              newSatisfied[mid] = m.satisfaction as 'LIKE' | 'DISLIKE';
            }
          });
        }
        if (Object.keys(newSatisfied).length > 0) {
          setSatisfiedMap(prev => ({ ...prev, ...newSatisfied }));
        }
      } catch (e) {
        // ignore mapping errors
        console.warn('Could not map satisfaction values', e);
      }
    } catch (err) {
      console.warn('Could not load chat messages for session', sessionId, err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load sessions from server on mount
  useEffect(() => {
    let mounted = true;
    const loadHistory = async () => {
      try {
        // If sessionId present in URL, try to resolve staffId first
        const params = new URLSearchParams(window.location.search);
        const sessionParam = params.get('sessionId');
        let staffIdFromSession: string | number | undefined;
        if (sessionParam) {
          try {
            const fetched = await fetchStaffFromSessionId(sessionParam);
            if (fetched) {
              staffIdFromSession = fetched;
              setStaffId(fetched);

              // Remove sessionId from URL (keep path and other params)
              try {
                const cur = new URL(window.location.href);
                cur.searchParams.delete('sessionId');
                const newPath = cur.pathname + (cur.search ? `?${cur.searchParams.toString()}` : '');
                window.history.replaceState({}, document.title, newPath);
              } catch (urlErr) {
                // ignore history manipulation errors
                console.warn('Could not remove sessionId from URL', urlErr);
              }
            }
          } catch (e) {
            console.warn('Could not fetch staffId from sessionId:', e);
          }
        }

        const data = await fetchSession(staffIdFromSession ? String(staffIdFromSession) : undefined);

        // Expecting an array or an object containing array
        const rawList = Array.isArray(data) ? data : (data?.sessions || data?.data || []);

        if (!Array.isArray(rawList) || rawList.length === 0) return;

        const mapped = rawList.map((item: any, idx: number) => {
          const msgs = Array.isArray(item.messages)
            ? item.messages.map((m: any) => ({
                id: m.id?.toString() || `${idx}-${Math.random()}`,
                role: m.role || m.from || 'assistant',
                content: m.content || m.text || '',
                timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
                attachment: m.attachment
              }))
            : [];

          return {
            id: item.id?.toString() || item.session_id?.toString() || `${Date.now()}-${idx}`,
            title: item.title || item.session_name || `Session ${idx + 1}`,
            date: item.date || (item.created_at ? new Date(item.created_at).toLocaleDateString('th-TH') : new Date().toLocaleDateString('th-TH')),
            messages: msgs
          } as Session;
        });

        if (mounted && mapped.length > 0) {
          setSessions(mapped);
          setCurrentSessionId(mapped[0].id);
        }
      } catch (err) {
        console.warn('Could not load chat history:', err);
      }
    };

    loadHistory();
    return () => { mounted = false; };
  }, []);

  // Handlers
  const handleNewChat = async (name: string) => {
    setIsCreatingChat(true);
    
    try {
      // 1. Create session via chatService
      const data = await createChatSession(name);
      console.log('Session created:', data);

      // 2. Normalize various response shapes (array like [{id: 8}], or object {id} or {session_id})
      let newSessionId = Date.now().toString();
      if (Array.isArray(data) && data.length > 0 && data[0]?.id) {
        newSessionId = data[0].id.toString();
      } else if (data?.id) {
        newSessionId = data.id.toString();
      } else if (data?.session_id) {
        newSessionId = data.session_id.toString();
      }

      const newSession: Session = {
        id: newSessionId,
        title: name,
        date: new Date().toLocaleDateString('th-TH'),
        messages: []
      };

      // prepend using functional setState to avoid stale closure
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSessionId);
      setIsNewChatModalOpen(false);

    } catch (error) {
      console.error('Error creating session:', error);
      alert('ไม่สามารถสร้างแชทได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsCreatingChat(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!window.confirm('คุณต้องการลบแชทนี้ใช่หรือไม่?')) return;

    const previous = sessions;

    // Optimistic update
    const newSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);
    if (currentSessionId === sessionId && newSessions.length > 0) {
      setCurrentSessionId(newSessions[0].id);
     } else if (newSessions.length === 0) {
       // Create default session if all deleted (Local fallback)
       const defaultId = Date.now().toString();
       setSessions([{ id: defaultId, title: 'New Chat', date: 'วันนี้', messages: [] }]);
       setCurrentSessionId(defaultId);
    }

    try {
      await deleteChatSession(sessionId);
    } catch (err) {
      console.error('Delete failed:', err);
      setSessions(previous);
      alert('ไม่สามารถลบแชทได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const renameSession = async (id: string, newName: string) => {
    const previous = sessions;

    // Optimistic update
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, title: newName } : s
    ));

    try {
      await renameChatSession(id, newName);
    } catch (err) {
      // Revert on error
      console.error('Rename failed:', err);
      setSessions(previous);
      alert('ไม่สามารถเปลี่ยนชื่อแชทได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleSendMessage = (text: string, attachedFile: { name: string; content: string } | null) => {
    let userDisplayContent = text;
    let finalContent = text;

    if (attachedFile) {
      if (text.trim()) {
         finalContent = `${text}\n\n--- Attached File: ${attachedFile.name} ---\n${attachedFile.content}`;
      } else {
         finalContent = `ตรวจสอบไฟล์นี้ให้หน่อยครับ: ${attachedFile.name}\n\n${attachedFile.content}`;
         userDisplayContent = `ส่งไฟล์: ${attachedFile.name}`;
      }
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userDisplayContent,
      timestamp: new Date(),
      attachment: attachedFile ? attachedFile : undefined
    };

    // Update Session
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId 
        ? { ...s, messages: [...s.messages, newMessage] }
        : s
    ));
    setIsLoading(true);

    // Send to AI via API
    (async () => {
      try {
        const data = await sendMessageToAI(currentSessionId, finalContent);

        const extractAIText = (payload: any) => {
          if (!payload) return '';
          if (typeof payload === 'string') return payload;
          if (Array.isArray(payload) && payload.length > 0) {
            const first = payload[0];
            if (typeof first === 'string') return first;
            return first.output || first.answer || first.message || first.text || JSON.stringify(first);
          }
          return payload.output || payload.answer || payload.message || payload.text || JSON.stringify(payload);
        };

        const aiText = extractAIText(data) || 'ขออภัย ไม่ได้รับคำตอบจาก AI';

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiText,
          timestamp: new Date(),
        };

        setSessions(prev => prev.map(s => 
          s.id === currentSessionId 
            ? { ...s, messages: [...s.messages, botMessage] }
            : s
        ));
      } catch (err) {
        console.error('AI request failed:', err);
        const errMsg: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: 'เกิดข้อผิดพลาดในการติดต่อ AI กรุณาลองใหม่อีกครั้ง',
          timestamp: new Date(),
        };
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, errMsg] } : s));
      } finally {
        setIsLoading(false);
      }
    })();
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={() => setIsNewChatModalOpen(true)}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
      />
      
      <ChatArea 
        currentSession={currentSession}
        currentSessionId={currentSessionId}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        satisfiedMap={satisfiedMap}
        onSatisfaction={handleSatisfaction}
      />

      <NewChatModal 
        isOpen={isNewChatModalOpen} 
        onClose={() => setIsNewChatModalOpen(false)} 
        onConfirm={handleNewChat}
        isLoading={isCreatingChat}
      />
    </div>
  );
}