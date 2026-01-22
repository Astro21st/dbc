import React, { useState, useRef, useEffect } from 'react';
import { Database, ShieldCheck, Bot, User, FileText, X, Paperclip, Send } from 'lucide-react';

// --- Types Definition (Inlined for standalone usage) ---
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

interface ChatAreaProps {
  currentSession?: Session;
  currentSessionId: string;
  isLoading: boolean;
  onSendMessage: (text: string, file: { name: string; content: string } | null) => void;
}

// --- Utility: Markdown Renderer (Inlined) ---
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

export default function ChatArea({ 
  currentSession, 
  currentSessionId, 
  isLoading, 
  onSendMessage 
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
                    {renderContent(msg.content)}
                  </div>
                </div>
                
                <div className={`text-[10px] text-slate-400 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
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