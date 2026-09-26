'use client';

import { useEffect, useState } from 'react';

import Modal from './modal';
import { APP_DOCUMENT_EVENT, type AppDocumentDetail } from '../lib/open-backend-document';

/** Приложение: окно для HTML-документов бэкенда (чеки), открытых через openBackendDocument. */
export default function AppDocumentViewer() {
  const [doc, setDoc] = useState<AppDocumentDetail | null>(null);

  useEffect(() => {
    const handle = (event: Event) => {
      const detail = (event as CustomEvent<AppDocumentDetail>).detail;
      if (detail?.html) setDoc(detail);
    };
    window.addEventListener(APP_DOCUMENT_EVENT, handle);
    return () => window.removeEventListener(APP_DOCUMENT_EVENT, handle);
  }, []);

  return (
    <Modal isOpen={doc !== null} onClose={() => setDoc(null)} title={doc?.title || ''}>
      {doc ? (
        <iframe
          title={doc.title}
          srcDoc={doc.html}
          // Документ бэкенда: без скриптов и доступа к приложению.
          sandbox="allow-same-origin"
          className="h-[70dvh] w-full rounded-3xl border border-zinc-600/30 bg-white"
        />
      ) : null}
    </Modal>
  );
}
