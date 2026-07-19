'use client';

import React, { useState, useEffect } from 'react';
import Modal from './modal';

type PostBlockTableModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (bbcode: string) => void;
  strings?: Record<string, string>;
};

const MIN_ROWS = 2;
const MAX_ROWS = 6;
const MIN_COLS = 2;
const MAX_COLS = 6;

function buildEmptyGrid(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(''));
}

export default function PostBlockTableModal({
  isOpen,
  onClose,
  onInsert,
  strings,
}: PostBlockTableModalProps) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  // data[0] = заголовки (th), data[1..] = строки данных (td)
  const [data, setData] = useState<string[][]>(() => buildEmptyGrid(3, 3));

  // Пересобираем сетку при изменении размеров
  useEffect(() => {
    setData((prev) => {
      const newData = buildEmptyGrid(rows, cols);
      prev.forEach((row, ri) => {
        row.forEach((cell, ci) => {
          if (ri < rows && ci < cols) {
            newData[ri][ci] = cell;
          }
        });
      });
      return newData;
    });
  }, [rows, cols]);

  const handleCellChange = (ri: number, ci: number, val: string) => {
    setData((prev) => {
      const next = prev.map((r) => [...r]);
      next[ri][ci] = val;
      return next;
    });
  };

  const handleInsert = () => {
    let bbcode = '\n[table]\n';
    data.forEach((row, ri) => {
      bbcode += '[tr]';
      row.forEach((cell) => {
        const tag = ri === 0 ? 'th' : 'td';
        bbcode += `[${tag}]${cell}[/${tag}]`;
      });
      bbcode += '[/tr]\n';
    });
    bbcode += '[/table]\n';
    onInsert(bbcode);
    onClose();
  };

  const handleClose = () => {
    setData(buildEmptyGrid(rows, cols));
    onClose();
  };

  function SizeBtn({
    value,
    min,
    max,
    onChange,
    label,
  }: {
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
    label: string;
  }) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400 w-16">{label}</span>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-7 h-7 flex items-center justify-center rounded-2xl border border-zinc-600/30 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 duration-300 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm"
        >
          −
        </button>
        <span className="w-6 text-center font-bold text-zinc-100 text-sm">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-7 h-7 flex items-center justify-center rounded-2xl border border-zinc-600/30 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 duration-300 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={strings?.editor_table || 'Таблица'}
    >
      <div className="flex flex-col gap-3">
        {/* Размер таблицы */}
        <div className="flex gap-3 flex-wrap p-3 bg-zinc-800/40 rounded-3xl border border-zinc-700/40">
          <SizeBtn
            label="Строки"
            value={rows}
            min={MIN_ROWS}
            max={MAX_ROWS}
            onChange={setRows}
          />
          <SizeBtn
            label="Колонки"
            value={cols}
            min={MIN_COLS}
            max={MAX_COLS}
            onChange={setCols}
          />
        </div>

        <p className="text-xs text-zinc-500 px-1">
          Первая строка — заголовки таблицы.
        </p>

        {/* Редактор ячеек */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-700/50">
          <table className="w-full border-collapse min-w-max">
            <tbody>
              {data.map((row, ri) => (
                <tr key={ri} className={ri === 0 ? 'bg-zinc-800' : 'even:bg-zinc-800/30'}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-zinc-700/50 p-0.5">
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleCellChange(ri, ci, e.target.value)}
                        placeholder={ri === 0 ? `Загол. ${ci + 1}` : `Ячейка`}
                        className={`w-full bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-0 min-w-[80px] ${
                          ri === 0
                            ? 'font-semibold text-zinc-200 placeholder-zinc-600'
                            : 'text-zinc-300 placeholder-zinc-700'
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Кнопка вставки */}
        <button
          type="button"
          onClick={handleInsert}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold"
        >
          {strings?.editor_table || 'Вставить таблицу'}
        </button>
      </div>
    </Modal>
  );
}
