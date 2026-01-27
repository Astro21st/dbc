import { useState } from 'react';
import { X } from 'lucide-react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

export default function NewChatModal({ isOpen, onClose, onConfirm }: NewChatModalProps) {
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <label className="block text-sm font-medium text-slate-600 mb-2">ตั้งชื่อหัวข้อแชท</label>
          <input 
            type="text" 
            value={newChatName}
            onChange={(e) => setNewChatName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            autoFocus
            placeholder="เช่น ตรวจสอบตาราง HR..."
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800"
          />
        </div>
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ยกเลิก
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!newChatName.trim()}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
          >
            เริ่มแชท
          </button>
        </div>
      </div>
    </div>
  );
}