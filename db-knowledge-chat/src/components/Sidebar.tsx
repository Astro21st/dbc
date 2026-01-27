import { useState, useRef, useEffect, type MouseEvent } from 'react';
import { Database, MessageSquare, Edit2, Trash2, Check, Plus } from 'lucide-react';
import type { Session } from '../types/chat';

interface SidebarProps {
  sessions: Session[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newName: string) => void;
}

export default function Sidebar({ 
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