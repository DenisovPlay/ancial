'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type NoteType = 'success' | 'error' | 'info';

interface Note {
  id: number;
  content: React.ReactNode;
  html?: boolean;
  type: NoteType;
  time?: number; // в секундах
}

interface NotificationContextType {
  showNote: (note: Omit<Note, 'id'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notes, setNotes] = useState<Note[]>([]);

  const showNote = useCallback(({ content, html = false, type = 'info', time = 5 }: Omit<Note, 'id'>) => {
    const id = Date.now() + Math.random();
    setNotes((prev) => [...prev, { id, content, html, type, time }]);

    if (time > 0) {
      setTimeout(() => {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }, time * 1000);
    }
  }, []);

  const removeNote = (id: number) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNote }}>
      {children}
      {/* Контейнер уведомлений (выводятся сверху справа) */}
      <div className="fixed top-4 right-4 z-[10010] flex flex-col gap-2 pointer-events-none">
        {notes.map((note) => (
          <div
            key={note.id}
            className={`pointer-events-auto flex items-center justify-between p-3 min-w-[250px] max-w-sm shadow-xl rounded-3xl backdrop-blur-md border transition-all duration-300 animate-in fade-in slide-in-from-top-5 slide-in-from-right-5 ${
              note.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100' :
              note.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-100' :
              'bg-zinc-800/80 border-zinc-600/50 text-zinc-100'
            }`}
          >
            {note.html && typeof note.content === 'string' ? (
              <span
                className="font-medium text-sm sm:text-base leading-tight break-words [&_a]:underline [&_a]:underline-offset-2"
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
            ) : (
              <span className="font-medium text-sm sm:text-base leading-tight break-words">
                {note.content}
              </span>
            )}
            <button onClick={() => removeNote(note.id)} className="ml-3 cursor-pointer p-1 opacity-60 hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <use href={`/icons.svg#IC-times`}></use>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
