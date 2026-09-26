'use client';

import Modal from '../../components/modal';
import { type WalletTransaction } from '../../lib/api-v2';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/svg-icon';
import { openBackendDocument } from '../../lib/open-backend-document';

// ─── Icon paths ─────────────────────────────────────────────────────────────

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

function makeIcon(bg: string, fill: string, icon: string, animate = false) {
  return (
    <div className={`border border-zinc-600/30 shrink-0 flex justify-center items-center ${bg} h-10 w-10 lg:h-12 lg:w-12 rounded-full`}>
      <Icon name={icon} className={`${fill} h-6 w-6 lg:w-8 lg:h-8 inline${animate ? ' animate-pulse' : ''}`} />
    </div>
  );
}

function getIcon(trans: WalletTransaction, kind: TransactionKind) {
  if (trans.status === 0) return makeIcon('bg-yellow-500/25', 'fill-yellow-500', 'IC-clock', true);
  if (trans.status === 2) return makeIcon('bg-red-500/25', 'fill-red-500', 'IC-times');
  if (kind === 'internal') return makeIcon('bg-blue-500/25', 'fill-blue-500', 'IC-transfer');
  if (kind === 'in') return makeIcon('bg-green-500/25', 'fill-green-500', 'IC-topup');
  return makeIcon('bg-red-500/25', 'fill-red-500', 'IC-withdraw');
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

function resolveParty(id: number, name?: string, otherPartyName?: string, systemLabel = 'System') {
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

function getKindLabel(kind: TransactionKind, lang?: Record<string, string> | null) {
  if (kind === 'internal') return lang?.internal_transfer || 'Внутренний перевод';
  if (kind === 'in') return lang?.incoming_transfer || 'Входящий перевод';
  return lang?.outgoing_transfer || 'Исходящий перевод';
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
          {prefix}{Number(trans.amount)}<Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1 ml-0.5" />
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

export function TransactionDetailsModal({ transaction, isOpen, onClose, ownedIds, systemLabel = 'System' }: TransactionDetailsModalProps) {
  const { lang } = useAuth();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lang?.transaction_details || "Детали операции"} width="sm">
      {transaction && (() => {
        const kind = getTransactionKind(transaction, ownedIds);
        const senderDisplay = transaction.sender === -1
          ? systemLabel
          : `${lang?.account_num || 'Счёт №'}${transaction.sender}${kind !== 'internal' && kind === 'in' && transaction.other_party_name
            ? ` (${transaction.other_party_name})`
            : transaction.sender_name
              ? ` (${transaction.sender_name})`
              : ''
          }`;
        const receiverDisplay = transaction.receiver === -1
          ? systemLabel
          : `${lang?.account_num || 'Счёт №'}${transaction.receiver}${kind !== 'internal' && kind === 'out' && transaction.other_party_name
            ? ` (${transaction.other_party_name})`
            : transaction.receiver_name
              ? ` (${transaction.receiver_name})`
              : ''
          }`;

        return (
          <div className="flex flex-col gap-3 text-zinc-100 text-left">
            <div className="bg-zinc-800/60 rounded-3xl p-4 w-full text-sm space-y-2.5 border border-zinc-600/30">
              <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                <span className="text-zinc-400">{lang?.transaction_id || 'ID Операции:'}</span>
                <span className="font-mono text-zinc-200">#{transaction.id}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                <span className="text-zinc-400">{lang?.type || 'Тип:'}</span>
                <span className="font-semibold text-zinc-200">{getKindLabel(kind, lang)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                <span className="text-zinc-400">{lang?.amount || 'Сумма:'}</span>
                <span className="text-lg font-bold text-zinc-100">{transaction.amount} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1 ml-0.5" /></span>
              </div>
              {transaction.fees > 0 && (
                <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                  <span className="text-zinc-400">{lang?.commission || 'Комиссия:'}</span>
                  <span className="text-zinc-300">{transaction.fees} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1 ml-0.5" /></span>
                </div>
              )}
              <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                <span className="text-zinc-400">{lang?.credited || 'Зачислено:'}</span>
                <span className="text-lg font-bold text-green-500">{transaction.total} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1 ml-0.5" /></span>
              </div>
              {transaction.comment && (
                <div className="flex flex-col gap-1 border-b border-zinc-700 pb-2">
                  <span className="text-zinc-400 text-xs">{lang?.comment || 'Комментарий:'}</span>
                  <span className="text-zinc-100">{transaction.comment}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                <span className="text-zinc-400">{lang?.sender || 'Отправитель:'}</span>
                <span className="text-zinc-300">{senderDisplay}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                <span className="text-zinc-400">{lang?.receiver || 'Получатель:'}</span>
                <span className="text-zinc-300">{receiverDisplay}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-zinc-400">{lang?.date || 'Дата:'}</span>
                <span className="text-zinc-400 text-xs">{transaction.date}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  openBackendDocument(`/api/V2/wallet/Transaction.php?action=receipt&id=${transaction.id}`, lang?.receipt || 'Чек')
                    .catch((error: unknown) => console.error('Failed to open receipt', error));
                }}
                className="flex-1 flex items-center justify-center gap-3 px-4 py-3 text-base duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold"
              >
                {lang?.receipt || 'Чек'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-3 px-4 py-3 text-base duration-300 active:scale-95 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-3xl cursor-pointer font-semibold border border-zinc-700"
              >
                {lang?.close || 'Закрыть'}
              </button>
            </div>
          </div>
        );
      })()}
    </Modal>
  );
}

