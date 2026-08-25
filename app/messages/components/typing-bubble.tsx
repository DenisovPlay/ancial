'use client';

import { AnimatePresence, motion } from 'framer-motion';

/**
 * TypingDots
 * Прыгающие 3 точки — как в iMessage/Telegram.
 */
export function TypingDots() {
  return (
    <span className="flex items-center gap-[3px] h-5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-2 w-2 rounded-full bg-zinc-400"
          animate={{ y: [0, -5, 0] }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.15,
          }}
        />
      ))}
    </span>
  );
}

/**
 * TypingBubble
 * Для личного чата — только точки, для группового — аватары печатающих слева.
 */
export function TypingBubble({
  isGroup,
  typingUsersList = [],
}: {
  isGroup: boolean;
  typingUsersList?: { id: string; url: string }[];
}) {
  return (
    <motion.div
      key="typing-bubble"
      initial={{ opacity: 0, y: 10, x: -10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, x: -10, scale: 0.8 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ originX: 0, originY: 1 }}
      className="relative flex w-full gap-2 items-end justify-start pb-1"
    >
      {isGroup && typingUsersList.length > 0 && (
        <div className="flex items-center mb-1 shrink-0">
          <AnimatePresence>
            {typingUsersList.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -8, scale: 0.5 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.5 }}
                transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                className={`relative h-7 shrink-0 ${i === 0 ? 'w-7' : 'w-4'}`}
                style={{ zIndex: typingUsersList.length - i }}
              >
                <motion.img
                  src={user.url}
                  alt=""
                  initial={{ x: -20 }}
                  animate={{ x: 0 }}
                  exit={{ x: -20 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                  className="w-7 h-7 min-w-[28px] max-w-[28px] rounded-full object-cover border border-zinc-600/30 shadow absolute top-0"
                  style={{ left: i === 0 ? 0 : -12 }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <TypingDots />
      </div>
    </motion.div>
  );
}
