'use client';

import dynamic from 'next/dynamic';
import { useState, useSyncExternalStore } from 'react';

import { useAuth } from '../context/AuthContext';
import { closeLinkGuard, getLinkGuardSnapshot, subscribeLinkGuard } from '../lib/link-guard-store';
import Modal from './modal';

// Проверка ссылки грузится только при первом открытии окна.
const LinkGuardBody = dynamic(() => import('./link-guard-body'), { ssr: false });

/** Окно «Переход на сторонний ресурс»: проверка внешней ссылки на месте, без ухода со страницы. */
export default function LinkGuardHost() {
  const { lang } = useAuth();
  const link = useSyncExternalStore(subscribeLinkGuard, getLinkGuardSnapshot, () => null);
  // Ссылка остаётся в окне на время анимации закрытия.
  const [shownLink, setShownLink] = useState<string | null>(null);
  if (link && link !== shownLink) setShownLink(link);

  if (!shownLink) return null;
  return (
    <Modal
      isOpen={link !== null}
      onClose={closeLinkGuard}
      title={lang?.redirect_title || 'Переход на сторонний ресурс'}
      width="sm"
    >
      <div className="flex flex-col gap-3">
        <LinkGuardBody key={shownLink} rawLink={shownLink} onCancel={closeLinkGuard} onProceed={closeLinkGuard} proceedInNewTab />
      </div>
    </Modal>
  );
}
