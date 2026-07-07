'use client';

import { useState, useEffect } from 'react';
import Modal from './modal';
import { SvgIcon } from '../feed/editor-shared';
import { useAuth } from '../context/AuthContext';

export type PollWidgetDraft = {
  type: 'poll';
  question: string;
  options: string[];
};

type PostWidgetPollModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (poll: PollWidgetDraft) => void;
};

export default function PostWidgetPollModal({ isOpen, onClose, onAdd }: PostWidgetPollModalProps) {
  const { lang } = useAuth();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  useEffect(() => {
    if (isOpen) {
      setQuestion('');
      setOptions(['', '']);
    }
  }, [isOpen]);

  const handleAdd = () => {
    const validOptions = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim() || validOptions.length < 2) return;
    onAdd({
      type: 'poll',
      question: question.trim(),
      options: validOptions,
    });
    onClose();
  };

  const handleRemoveOption = (index: number) => {
    setOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddOption = () => {
    setOptions(prev => [...prev, '']);
  };

  const handleChangeOption = (index: number, value: string) => {
    setOptions(prev => prev.map((o, i) => i === index ? value : o));
  };

  const validOptionsCount = options.map(o => o.trim()).filter(Boolean).length;
  const isValid = question.trim().length > 0 && validOptionsCount >= 2;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lang?.create_poll || "Создать опрос"} width="md" bodyClassName="">
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder={lang?.poll_topic || "Тема опроса"}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          maxLength={300}
          className="w-full bg-zinc-900 border border-zinc-600/30 rounded-3xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500 transition-colors"
        />

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-zinc-400">{lang?.poll_options || "Варианты ответа"}</span>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-3">
              <input
                type="text"
                placeholder={`${lang?.poll_option || "Вариант"} ${i + 1}`}
                value={opt}
                onChange={e => handleChangeOption(i, e.target.value)}
                maxLength={200}
                className="flex-1 bg-zinc-900 border border-zinc-600/30 rounded-3xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500 transition-colors"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOption(i)}
                  className="w-10 h-10 flex shrink-0 items-center justify-center rounded-3xl bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-600/30 cursor-pointer active:scale-95 duration-300"
                  aria-label={lang?.remove_option || "Удалить вариант"}
                >
                  <SvgIcon className="w-5 h-5 fill-zinc-400" id="IC-times" />
                </button>
              )}
            </div>
          ))}

          {options.length < 10 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="w-full rounded-3xl border border-dashed border-zinc-600/30 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors cursor-pointer active:scale-95 duration-300"
            >
              {lang?.add_option || "+ Добавить вариант"}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!isValid}
          className="w-full rounded-3xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 text-sm font-medium transition-all duration-300 cursor-pointer active:scale-95"
        >
          {lang?.attach_poll || "Прикрепить опрос"}
        </button>
      </div>
    </Modal>
  );
}
