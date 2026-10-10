'use client';

import { memo } from 'react';

import Icon from '../../components/svg-icon';
import { cn } from '../../lib/cn';
import { describeCall, type CallRecord, type CallTone } from '../../lib/call-message';
import { formatMessageTime, toNumber, type DialogMessage, type LangMap } from '../lib/messages-shared';

const TONE_ICON: Record<CallTone, string> = {
  bad: 'bg-red-500/20 fill-red-400',
  neutral: 'bg-zinc-700/60 fill-zinc-300',
  ok: 'bg-lime-500/20 fill-lime-400',
};

/** Запись о звонке в ленте чата: иконка направления, исход, длительность. Без кнопок: позвонить можно из шапки диалога. */
function CallRecordBubbleComponent({
  currentUserId,
  lang,
  message,
  record,
}: {
  currentUserId: number;
  lang: LangMap;
  message: DialogMessage;
  record: CallRecord;
}) {
  const isMine = toNumber(message.sender_id) === currentUserId;
  const isGroup = record.outcome === 'group';
  const { icon, subtitle, title, tone } = describeCall(record, isMine, lang);
  const time = formatMessageTime(message);

  return (
    <div id={`msg-${message.id}`} className={cn('flex w-full py-1', isGroup ? 'justify-center' : isMine ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex max-w-full items-center gap-3 rounded-3xl p-3 shadow', isMine && !isGroup ? 'bg-purple-700' : 'bg-zinc-900 border border-zinc-600/30')}>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', TONE_ICON[tone])}>
          <Icon name={icon} className="h-5 w-5 fill-current" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className={cn('truncate text-base font-semibold', tone === 'bad' ? 'text-red-300' : 'text-white')}>{title}</span>
          <span className="truncate text-sm text-zinc-300">{[subtitle, time].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
    </div>
  );
}

const CallRecordBubble = memo(CallRecordBubbleComponent);
export default CallRecordBubble;
