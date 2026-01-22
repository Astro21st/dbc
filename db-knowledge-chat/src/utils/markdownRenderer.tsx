import React from 'react';

export const renderContent = (content: string) => {
  // แยกส่วน Code Block (```...```) ออกจากข้อความปกติ
  const parts = content.split(/(```[\s\S]*?```)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      // Render Code Block (SQL Highlight)
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
      // Render Text with Basic Bold (**text**) & Inline Code (`code`) Support
      return (
        <div key={index} className="whitespace-pre-wrap text-sm leading-relaxed mb-1">
          {part.split(/(\*\*.*?\*\*)/g).map((subPart, subIndex) => {
              if (subPart.startsWith('**') && subPart.endsWith('**')) {
                  return <strong key={subIndex} className="font-semibold text-slate-900">{subPart.slice(2, -2)}</strong>;
              }
              // Handle inline code `code`
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