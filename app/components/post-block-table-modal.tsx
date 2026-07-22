'use client';

import React, { useState, useEffect } from 'react';
import Modal from './modal';
import { SvgIcon } from '../feed/editor-shared';

type TableCell = {
  text: string;
  isHeader?: boolean;
};

type PostBlockTableModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (bbcode: string) => void;
  initialBBCode?: string;
  strings?: Record<string, string>;
};

export function parseTableBBCode(bbcode: string): TableCell[][] {
  const matrix: TableCell[][] = [];
  const trRegex = /\[tr\]([\s\S]*?)\[\/tr\]/gi;
  let trMatch;

  while ((trMatch = trRegex.exec(bbcode)) !== null) {
    const row: TableCell[] = [];
    const cellRegex = /\[(th|td)\]([\s\S]*?)\[\/\1\]/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
      const tag = cellMatch[1].toLowerCase();
      row.push({
        text: cellMatch[2].trim(),
        isHeader: tag === 'th',
      });
    }
    if (row.length > 0) {
      matrix.push(row);
    }
  }

  if (matrix.length === 0) {
    // Дефолтная таблица 2x2
    return [
      [{ text: '', isHeader: true }, { text: '', isHeader: true }],
      [{ text: '', isHeader: false }, { text: '', isHeader: false }],
    ];
  }

  return matrix;
}

export function buildTableBBCode(matrix: TableCell[][]): string {
  if (!matrix.length || !matrix[0].length) return '';

  let result = '[table]\n';
  matrix.forEach((row) => {
    result += '[tr]';
    row.forEach((cell) => {
      const tag = cell.isHeader ? 'th' : 'td';
      result += `[${tag}]${cell.text.trim()}[/${tag}]`;
    });
    result += '[/tr]\n';
  });
  result += '[/table]';
  return result;
}

export default function PostBlockTableModal({
  isOpen,
  onClose,
  onInsert,
  initialBBCode,
  strings,
}: PostBlockTableModalProps) {
  const [matrix, setMatrix] = useState<TableCell[][]>(() => parseTableBBCode(initialBBCode || ''));

  useEffect(() => {
    if (isOpen) {
      setMatrix(parseTableBBCode(initialBBCode || ''));
    }
  }, [isOpen, initialBBCode]);

  const updateCell = (rowIndex: number, colIndex: number, text: string) => {
    setMatrix((prev) =>
      prev.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => (cIdx === colIndex ? { ...cell, text } : cell))
          : row
      )
    );
  };

  const toggleRowHeader = (rowIndex: number) => {
    setMatrix((prev) =>
      prev.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell) => ({ ...cell, isHeader: !cell.isHeader }))
          : row
      )
    );
  };

  const addRow = () => {
    setMatrix((prev) => {
      const colsCount = prev[0]?.length || 2;
      const newRow: TableCell[] = Array.from({ length: colsCount }, () => ({
        text: '',
        isHeader: false,
      }));
      return [...prev, newRow];
    });
  };

  const removeRow = (rowIndex: number) => {
    if (matrix.length <= 1) return;
    setMatrix((prev) => prev.filter((_, idx) => idx !== rowIndex));
  };

  const addColumn = () => {
    setMatrix((prev) =>
      prev.map((row, rIdx) => [
        ...row,
        { text: '', isHeader: rIdx === 0 && row[0]?.isHeader },
      ])
    );
  };

  const removeColumn = (colIndex: number) => {
    if ((matrix[0]?.length || 0) <= 1) return;
    setMatrix((prev) => prev.map((row) => row.filter((_, idx) => idx !== colIndex)));
  };

  const handleSave = () => {
    const bbcode = buildTableBBCode(matrix);
    if (bbcode) {
      onInsert(bbcode);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialBBCode ? strings?.edit_table || 'Редактировать таблицу' : strings?.create_table || 'Создать таблицу'}
      width="lg"
    >
      <div className="flex flex-col gap-3">
        {/* Верхняя панель управления колонками и строками */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600/30 rounded-2xl duration-300 active:scale-95 cursor-pointer"
            >
              <SvgIcon className="w-4 h-4 fill-current" id="IC-plus" />
              <span>{strings?.add_row || '+ Строка'}</span>
            </button>
            <button
              type="button"
              onClick={addColumn}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600/30 rounded-2xl duration-300 active:scale-95 cursor-pointer"
            >
              <SvgIcon className="w-4 h-4 fill-current" id="IC-plus" />
              <span>{strings?.add_column || '+ Столбец'}</span>
            </button>
          </div>
          <span className="text-xs text-zinc-400">
            {matrix.length} × {matrix[0]?.length || 0}
          </span>
        </div>

        {/* Табличная Notion-сетка */}
        <div className="overflow-x-auto max-h-[50vh] border border-zinc-700/50 rounded-2xl bg-zinc-950/40">
          <table className="w-full border-collapse">
            <thead className="px-2">
              <tr>
                <th className="w-10 p-1 text-xs text-zinc-500 font-normal border-b border-zinc-800">#</th>
                {matrix[0]?.map((_, colIdx) => (
                  <th key={`col-head-${colIdx}`} className="p-1 border-b border-zinc-800">
                    <div className="flex items-center justify-between gap-1 px-1">
                      <span className="text-xs text-zinc-400 font-medium">Столбец {colIdx + 1}</span>
                      {matrix[0].length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(colIdx)}
                          className="p-1 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 duration-200 cursor-pointer"
                          title="Удалить столбец"
                        >
                          <SvgIcon className="w-3.5 h-3.5 fill-current" id="IC-trash" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="px-2">
              {matrix.map((row, rowIdx) => (
                <tr key={`row-${rowIdx}`} className="group hover:bg-zinc-900/50">
                  <td className="w-10 p-1 text-center border-b border-zinc-800/60">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleRowHeader(rowIdx)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${row[0]?.isHeader
                          ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40'
                          : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                        title="Переключить заголовок (TH/TD)"
                      >
                        {row[0]?.isHeader ? 'TH' : 'TD'}
                      </button>
                      {matrix.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(rowIdx)}
                          className="p-1 text-zinc-500 hover:text-red-400 rounded-lg duration-200 cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Удалить строку"
                        >
                          <SvgIcon className="w-3.5 h-3.5 fill-current" id="IC-trash" />
                        </button>
                      )}
                    </div>
                  </td>
                  {row.map((cell, colIdx) => (
                    <td key={`cell-${rowIdx}-${colIdx}`} className="p-1 border-b border-zinc-800/60 min-w-[140px]">
                      <input
                        type="text"
                        value={cell.text}
                        onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                        placeholder={`Ячейка ${rowIdx + 1}:${colIdx + 1}`}
                        className={`w-full bg-zinc-900/90 border border-zinc-700/50 rounded-xl px-2.5 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-purple-500 duration-200 ${cell.isHeader ? 'font-semibold bg-zinc-800/70 text-purple-200' : ''
                          }`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Нижние кнопки сохранения */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600/30 rounded-3xl duration-300 active:scale-95 cursor-pointer"
          >
            {strings?.cancel || 'Отмена'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-sm font-bold text-white bg-purple-500 hover:bg-purple-600 border border-purple-400/30 rounded-3xl duration-300 active:scale-95 shadow cursor-pointer"
          >
            {initialBBCode ? strings?.save || 'Сохранить' : strings?.insert || 'Вставить'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
