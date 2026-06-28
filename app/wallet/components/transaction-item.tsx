'use client';

import Modal from '../../components/modal';
import { type WalletTransaction } from '../../lib/api-v2';

// ─── Icon paths ─────────────────────────────────────────────────────────────

const PATH_INTERNAL = 'M 11.478516 5 A 1.50015 1.50015 0 0 0 10.439453 5.4394531 L 4.4394531 11.439453 A 1.50015 1.50015 0 1 0 6.5605469 13.560547 L 10 10.121094 L 10 35.25 C 10 39.512545 13.487455 43 17.75 43 C 22.012545 43 25.5 39.512545 25.5 35.25 L 25.5 12.75 C 25.5 10.108545 27.608545 8 30.25 8 C 32.891455 8 35 10.108545 35 12.75 L 35 37.878906 L 31.560547 34.439453 A 1.50015 1.50015 0 0 0 30.484375 33.984375 A 1.50015 1.50015 0 0 0 29.439453 36.560547 L 35.439453 42.560547 A 1.50015 1.50015 0 0 0 37.560547 42.560547 L 43.560547 36.560547 A 1.50015 1.50015 0 1 0 41.439453 34.439453 L 38 37.878906 L 38 12.75 C 38 8.4874554 34.512545 5 30.25 5 C 25.987455 5 22.5 8.4874554 22.5 12.75 L 22.5 35.25 C 22.5 37.891455 20.391455 40 17.75 40 C 15.108545 40 13 37.891455 13 35.25 L 13 10.121094 L 16.439453 13.560547 A 1.50015 1.50015 0 1 0 18.560547 11.439453 L 12.560547 5.4394531 A 1.50015 1.50015 0 0 0 11.478516 5 z';
const PATH_OUT = 'M 8.5 5 A 1.50015 1.50015 0 1 0 8.5 8 L 39.5 8 A 1.50015 1.50015 0 1 0 39.5 5 L 8.5 5 z M 23.925781 8.0019531 A 1.50015 1.50015 0 0 0 22.976562 8.4042969 L 15.476562 15.404297 A 1.50015 1.50015 0 0 0 16.5 18 L 31.5 18 A 1.50015 1.50015 0 0 0 32.523438 15.404297 L 25.023438 8.4042969 A 1.50015 1.50015 0 0 0 23.925781 8.0019531 z M 24 11.550781 L 27.695312 15 L 20.304688 15 L 24 11.550781 z M 14.556641 24 C 13.182903 24 12 25.12855 12 26.529297 L 12 41 L 5.5 41 A 1.50015 1.50015 0 1 0 5.5 44 L 42.5 44 A 1.50015 1.50015 0 1 0 42.5 41 L 36.001953 41 L 36.001953 26.529297 C 36.001953 25.12855 34.81905 24 33.445312 24 L 14.556641 24 z M 18.828125 27 L 29.173828 27 A 3 3 0 0 0 32 31 A 3 3 0 0 0 33.001953 30.824219 L 33.001953 41 L 29.972656 41 C 29.696418 38.195222 27.12612 36 24 36 C 20.87388 36 18.303582 38.195222 18.027344 41 L 15 41 L 15 30.828125 A 3 3 0 0 0 16 31 A 3 3 0 0 0 18.828125 27 z M 24 30 A 2 2 0 0 0 24 34 A 2 2 0 0 0 24 30 z M 24 39 C 25.445326 39 26.66023 39.859275 26.939453 41 L 21.060547 41 C 21.33977 39.859275 22.554674 39 24 39 z';
const PATH_IN = 'M 24 4 C 18.494917 4 14 8.494921 14 14 C 14 19.505079 18.494917 24 24 24 C 29.505083 24 34 19.505079 34 14 C 34 8.494921 29.505083 4 24 4 z M 24 7 C 27.883764 7 31 10.116238 31 14 C 31 17.883762 27.883764 21 24 21 C 20.116236 21 17 17.883762 17 14 C 17 10.116238 20.116236 7 24 7 z M 22.75 10 C 22.273 10 21.862531 10.336688 21.769531 10.804688 L 21.269531 13.304688 C 21.210531 13.598688 21.286562 13.903766 21.476562 14.134766 C 21.666562 14.366766 21.95 14.5 22.25 14.5 L 24.25 14.5 C 24.664 14.5 25 14.836 25 15.25 C 25 15.765 24.481 16 24 16 C 23.115 16 22.583922 15.685156 22.544922 15.660156 C 22.085922 15.363156 21.472969 15.489313 21.167969 15.945312 C 20.861969 16.405313 20.986313 17.026031 21.445312 17.332031 C 21.548313 17.400031 22.491 18 24 18 C 25.71 18 27 16.818 27 15.25 C 27 13.733 25.767 12.5 24.25 12.5 L 23.470703 12.5 L 23.570312 12 L 25.5 12 C 26.052 12 26.5 11.552 26.5 11 C 26.5 10.448 26.052 10 25.5 10 L 22.75 10 z M 2.5 13 A 1.50015 1.50015 0 1 0 2.5 16 L 5.5 16 C 5.7950452 16 6 16.204955 6 16.5 L 6 38.5 C 6 41.519774 8.4802259 44 11.5 44 L 36.5 44 C 39.519774 44 42 41.519774 42 38.5 L 42 16.5 C 42 16.204955 42.204955 16 42.5 16 L 45 16 A 1.50015 1.50015 0 1 0 45 13 L 42.5 13 C 40.585045 13 39 14.585045 39 16.5 L 39 38.5 C 39 39.898226 37.898226 41 36.5 41 L 11.5 41 C 10.101774 41 9 39.898226 9 38.5 L 9 16.5 C 9 14.585045 7.4149548 13 5.5 13 L 2.5 13 z M 18.402344 27.980469 A 1.50015 1.50015 0 0 0 17.394531 30.513672 L 22.894531 36.513672 A 1.50015 1.50015 0 0 0 25.105469 36.513672 L 30.605469 30.513672 A 1.50015 1.50015 0 0 0 29.554688 27.984375 A 1.50015 1.50015 0 0 0 28.394531 28.486328 L 24 33.28125 L 19.605469 28.486328 A 1.50015 1.50015 0 0 0 18.402344 27.980469 z';
const PATH_PENDING = 'M 24 4 C 12.972066 4 4 12.972074 4 24 C 4 35.027926 12.972066 44 24 44 C 35.027934 44 44 35.027926 44 24 C 44 12.972074 35.027934 4 24 4 z M 24 7 C 33.406615 7 41 14.593391 41 24 C 41 33.406609 33.406615 41 24 41 C 14.593385 41 7 33.406609 7 24 C 7 14.593391 14.593385 7 24 7 z M 23.476562 11.978516 A 1.50015 1.50015 0 0 0 22 13.5 L 22 25.5 A 1.50015 1.50015 0 0 0 23.5 27 L 31.5 27 A 1.50015 1.50015 0 1 0 31.5 24 L 25 24 L 25 13.5 A 1.50015 1.50015 0 0 0 23.476562 11.978516 z';
const PATH_CANCELED = 'M 39.486328 6.9785156 A 1.50015 1.50015 0 0 0 38.439453 7.4394531 L 24 21.878906 L 9.5605469 7.4394531 A 1.50015 1.50015 0 0 0 8.484375 6.984375 A 1.50015 1.50015 0 0 0 7.4394531 9.5605469 L 21.878906 24 L 7.4394531 38.439453 A 1.50015 1.50015 0 1 0 9.5605469 40.560547 L 24 26.121094 L 38.439453 40.560547 A 1.50015 1.50015 0 1 0 40.560547 38.439453 L 26.121094 24 L 40.560547 9.5605469 A 1.50015 1.50015 0 0 0 39.486328 6.9785156 z';

// ─── Types & Helpers ────────────────────────────────────────────────────────

export type TransactionKind = 'internal' | 'in' | 'out';

export function getTransactionKind(trans: WalletTransaction, ownedIds: Set<number>): TransactionKind {
  if (trans.is_internal) return 'internal';
  const senderOwned = ownedIds.has(trans.sender);
  const receiverOwned = ownedIds.has(trans.receiver);
  if (senderOwned && receiverOwned) return 'internal';
  if (receiverOwned) return 'in';
  if (senderOwned) return 'out';
  if (trans.direction === 'in' || trans.direction === 'out') return trans.direction;
  if (trans.type === 1) return 'in';
  return 'out';
}

function makeIcon(bg: string, fill: string, path: string, animate = false) {
  return (
    <div className={`border border-zinc-600/30 shrink-0 flex justify-center items-center ${bg} h-10 w-10 lg:h-12 lg:w-12 rounded-full`}>
      <svg className={`${fill} h-6 w-6 lg:w-8 lg:h-8 inline${animate ? ' animate-pulse' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path d={path} />
      </svg>
    </div>
  );
}

function getIcon(trans: WalletTransaction, kind: TransactionKind) {
  if (trans.status === 0) return makeIcon('bg-yellow-500/25', 'fill-yellow-500', PATH_PENDING, true);
  if (trans.status === 2) return makeIcon('bg-red-500/25', 'fill-red-500', PATH_CANCELED);
  if (kind === 'internal') return makeIcon('bg-blue-500/25', 'fill-blue-500', PATH_INTERNAL);
  if (kind === 'in') return makeIcon('bg-green-500/25', 'fill-green-500', PATH_IN);
  return makeIcon('bg-red-500/25', 'fill-red-500', PATH_OUT);
}

function AIcon() {
  return (
    <svg className="w-4 h-4 inline fill-purple-500 -mt-1 ml-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <use href="/icons.svg#IC-anci" />
    </svg>
  );
}

function getAmountColor(trans: WalletTransaction, kind: TransactionKind) {
  if (trans.status === 2) return 'text-zinc-500';
  if (kind === 'internal') return 'text-blue-500';
  if (kind === 'in') return 'text-green-500';
  return 'text-red-500';
}

function getAmountPrefix(trans: WalletTransaction, kind: TransactionKind) {
  if (trans.status === 2 || kind === 'internal') return '';
  if (kind === 'in') return '+ ';
  return '- ';
}

function resolveParty(id: number, name?: string, otherPartyName?: string, systemLabel = 'Система') {
  if (id === -1) return systemLabel;
  return name || otherPartyName || String(id);
}

function getDirectionLabel(trans: WalletTransaction, kind: TransactionKind, systemLabel: string) {
  if (kind === 'internal') {
    return `${trans.sender} \u2192 ${trans.receiver}`;
  }
  if (kind === 'in') {
    const senderParty = resolveParty(trans.sender, trans.sender_name, trans.other_party_name, systemLabel);
    return `${senderParty} \u2192 ${trans.receiver}`;
  }
  const receiverParty = resolveParty(trans.receiver, trans.receiver_name, trans.other_party_name, systemLabel);
  return `${trans.sender} \u2192 ${receiverParty}`;
}

function getKindLabel(kind: TransactionKind) {
  if (kind === 'internal') return '\u0412\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0439 \u043f\u0435\u0440\u0435\u0432\u043e\u0434';
  if (kind === 'in') return '\u0412\u0445\u043e\u0434\u044f\u0449\u0438\u0439 \u043f\u0435\u0440\u0435\u0432\u043e\u0434';
  return '\u0418\u0441\u0445\u043e\u0434\u044f\u0449\u0438\u0439 \u043f\u0435\u0440\u0435\u0432\u043e\u0434';
}

// ─── TransactionItem ────────────────────────────────────────────────────────

interface TransactionItemProps {
  trans: WalletTransaction;
  ownedIds: Set<number>;
  systemLabel?: string;
  onClick: (trans: WalletTransaction) => void;
}

export function TransactionItem({ trans, ownedIds, systemLabel = '\u0421\u0438\u0441\u0442\u0435\u043c\u0430', onClick }: TransactionItemProps) {
  const kind = getTransactionKind(trans, ownedIds);
  const icon = getIcon(trans, kind);
  const amountColor = getAmountColor(trans, kind);
  const prefix = getAmountPrefix(trans, kind);
  const dirLabel = getDirectionLabel(trans, kind, systemLabel);

  return (
    <div
      onClick={() => onClick(trans)}
      className="hover:bg-zinc-700/50 relative shrink-0 flex items-center gap-3 justify-between active:rounded-3xl active:scale-95 duration-300 cursor-pointer w-full p-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon}
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-sm lg:text-base text-zinc-100 truncate max-w-48 md:max-w-80">{dirLabel}</span>
          {trans.comment && (
            <span className="text-xs lg:text-sm text-zinc-400 truncate max-w-48 md:max-w-80">{trans.comment}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0">
        <span className={`${amountColor} font-semibold`}>
          {prefix}{Number(trans.amount)}<AIcon />
        </span>
        {trans.date && (
          <span className="text-zinc-400 text-xs lg:text-sm max-w-20 md:max-w-64 text-right">{trans.date}</span>
        )}
      </div>
    </div>
  );
}

// ─── TransactionDetailsModal ─────────────────────────────────────────────────

interface TransactionDetailsModalProps {
  transaction: WalletTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  ownedIds: Set<number>;
  systemLabel?: string;
}

export function TransactionDetailsModal({ transaction, isOpen, onClose, ownedIds, systemLabel = 'Система' }: TransactionDetailsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Детали операции" width="sm">
      {transaction && (() => {
        const kind = getTransactionKind(transaction, ownedIds);
        const senderDisplay = transaction.sender === -1
          ? systemLabel
          : `Счёт №${transaction.sender}${kind !== 'internal' && kind === 'in' && transaction.other_party_name
            ? ` (${transaction.other_party_name})`
            : transaction.sender_name
              ? ` (${transaction.sender_name})`
              : ''
          }`;
        const receiverDisplay = transaction.receiver === -1
          ? systemLabel
          : `Счёт №${transaction.receiver}${kind !== 'internal' && kind === 'out' && transaction.other_party_name
            ? ` (${transaction.other_party_name})`
            : transaction.receiver_name
              ? ` (${transaction.receiver_name})`
              : ''
          }`;

        return (
          <div className="flex flex-col gap-3 text-zinc-100 text-left">
            <div className="bg-zinc-800/60 rounded-3xl p-4 w-full text-sm space-y-2.5 border border-zinc-600/30">
              <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                <span className="text-zinc-400">ID Операции:</span>
                <span className="font-mono text-zinc-200">#{transaction.id}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                <span className="text-zinc-400">Тип:</span>
                <span className="font-semibold text-zinc-200">{getKindLabel(kind)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                <span className="text-zinc-400">Сумма:</span>
                <span className="text-lg font-bold text-zinc-100">{transaction.amount} <AIcon /></span>
              </div>
              {transaction.fees > 0 && (
                <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                  <span className="text-zinc-400">Комиссия:</span>
                  <span className="text-zinc-300">{transaction.fees} <AIcon /></span>
                </div>
              )}
              <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                <span className="text-zinc-400">Зачислено:</span>
                <span className="text-lg font-bold text-green-500">{transaction.total} <AIcon /></span>
              </div>
              {transaction.comment && (
                <div className="flex flex-col gap-1 border-b border-zinc-700 pb-2">
                  <span className="text-zinc-400 text-xs">Комментарий:</span>
                  <span className="text-zinc-100">{transaction.comment}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                <span className="text-zinc-400">Отправитель:</span>
                <span className="text-zinc-300">{senderDisplay}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                <span className="text-zinc-400">Получатель:</span>
                <span className="text-zinc-300">{receiverDisplay}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-zinc-400">Дата:</span>
                <span className="text-zinc-400 text-xs">{transaction.date}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.open(`https://ancial.ru/api/wallet/generate_receipt.php?id=${transaction.id}`, '_blank')}
                className="flex-1 flex items-center justify-center gap-3 px-4 py-3 text-base duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold"
              >
                Чек
              </button>
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-3 px-4 py-3 text-base duration-300 active:scale-95 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-3xl cursor-pointer font-semibold border border-zinc-700"
              >
                Закрыть
              </button>
            </div>
          </div>
        );
      })()}
    </Modal>
  );
}

