'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import Modal from '../../../components/modal';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import { SvgIcon } from '../../../feed/editor-shared';

function flag(value: boolean | number | string | null | undefined) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function hasValue(value: string | null | undefined) {
  return Boolean(value && value.trim() !== '' && value.trim() !== '0');
}

function guessNoteType(responseText: string) {
  const normalized = responseText.toLowerCase();
  if (
    normalized.includes('ошиб') ||
    normalized.includes('error') ||
    normalized.includes('невер') ||
    normalized.includes('invalid')
  ) {
    return 'error' as const;
  }

  return 'success' as const;
}

function StatusBadge({
  iconId,
  tone,
}: {
  iconId: 'IC-check' | 'IC-clock' | 'IC-times';
  tone: 'green' | 'amber' | 'red';
}) {
  const toneClass =
    tone === 'green'
      ? 'bg-green-500'
      : tone === 'amber'
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div
      className={`rounded-full h-5 w-5 text-xs ${toneClass} flex items-center justify-center text-white duration-300 shrink-0`}
    >
      <SvgIcon className="h-4 w-4 fill-white" id={iconId} />
    </div>
  );
}

export default function ContactsSecurityContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, lang, checkAuth } = useAuth();
  const { showNote } = useNotification();

  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [changeEmail, setChangeEmail] = useState('');
  const [changePhone, setChangePhone] = useState('');
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isSavingContacts, setIsSavingContacts] = useState(false);

  useEffect(() => {
    if (user) {
      // Десериализация пропа user — сеттлер здесь источник правды, альтернативы без каскада нет.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChangeEmail(user.email || '');
      setChangePhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?backurl=/settings/security/contacts');
    }
  }, [isAuthenticated, isLoading, router]);

  const numberVerified = flag(user?.numberverif);
  const emailVerified = flag(user?.emailverif);
  const hasConnectedYandex = hasValue(user?.connected_yacc);
  const hasYandexPhone = hasValue(user?.yandex_phone);

  const emailText = user?.email || '--';
  const phoneText = user?.phone || '--';
  const yandexEmailText = user?.connected_yacc || (lang?.unknown || 'Неизвестен');
  const yandexPhoneText = user?.yandex_phone || (lang?.unknown || 'Неизвестен');

  const contactsButtonLabel = isSavingContacts ? '...' : lang?.save || 'Сохранить';
  const verificationButtonLabel = isSendingVerification
    ? '...'
    : lang?.verifimyemail || 'Подтвердить почту';

  const sendVerificationEmail = async () => {
    setIsSendingVerification(true);

    try {
      const result = await AncialAPI.request<{ message?: string }>('/verification/Email.php?action=send', {
        method: 'POST',
      });

      showNote({
        content: result?.message || lang?.done || 'Готово',
        time: 5,
        type: 'success',
      });
    } catch (error) {
      console.error(error);
      showNote({
        content: error instanceof Error ? error.message : (lang?.errorhappend || 'Произошла ошибка =('),
        time: 5,
        type: 'error',
      });
    } finally {
      setIsSendingVerification(false);
    }
  };

  const changePhoneEmail = async () => {
    setIsSavingContacts(true);

    try {
      const responseText = await AncialAPI.securityAction<string>('change_email_phone', {
        phone: changePhone,
        email: changeEmail,
      });

      showNote({
        content: responseText || (lang?.done || 'Готово'),
        html: true,
        time: 5,
        type: guessNoteType(responseText || ''),
      });

      setChangeModalOpen(false);
      await checkAuth({ silent: true });
    } catch (error) {
      console.error(error);
      showNote({
        content: lang?.errorhappend || 'Произошла ошибка =(',
        time: 5,
        type: 'error',
      });
    } finally {
      setIsSavingContacts(false);
    }
  };

  const securityStatus = useMemo(
    () => ({
      email: emailVerified
        ? { iconId: 'IC-check' as const, tone: 'green' as const }
        : { iconId: 'IC-clock' as const, tone: 'amber' as const },
      phone: numberVerified
        ? { iconId: 'IC-check' as const, tone: 'green' as const }
        : { iconId: 'IC-clock' as const, tone: 'amber' as const },
      yandexPhone: hasYandexPhone
        ? { iconId: 'IC-check' as const, tone: 'green' as const }
        : { iconId: 'IC-times' as const, tone: 'red' as const },
    }),
    [emailVerified, hasYandexPhone, numberVerified],
  );

  if (isLoading && !user) {
    return (
      <div className="flex justify-center items-center w-full h-[60vh]">
        <svg className="w-10 h-10 animate-spin fill-purple-500" viewBox="0 0 48 48">
          <use href="#IC-loader"></use>
        </svg>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-emerald-400/25 md:from-transparent via-transparent to-transparent">
        {/* Sticky Header */}
        <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40">
          <div className="w-full max-w-3xl flex items-center gap-3">
            <Link
              href="/settings/security"
              className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <use href="#IC-chevron-left"></use>
              </svg>
              {lang?.phoneandnumber || 'Телефон и почта'}
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-3 w-full max-w-3xl px-3 lg:px-0">
          <div className="border border-zinc-600/30 bg-zinc-800/90 w-full p-3 shadow rounded-3xl flex flex-col items-center">
            <Image
              alt="Zypo logo"
              className="w-12 h-12 shadow rounded-2xl mb-3"
              height={48}
              src="/img/zypo/logo.webp"
              unoptimized
              width={48}
            />

            <div className="flex w-full items-center gap-1.5">
              <span className="text-zinc-100 text-sm w-16">{lang?.phone || 'Телефон'}</span>
              <span className="text-zinc-300">{phoneText}</span>
              <StatusBadge {...securityStatus.phone} />
            </div>

            <div className="flex w-full items-center gap-1.5">
              <span className="text-zinc-100 text-sm w-16">{lang?.email || 'Почта'}</span>
              <span className="text-zinc-300 truncate w-52 md:w-max">{emailText}</span>
              <StatusBadge {...securityStatus.email} />
            </div>

            <div className="flex gap-3 mt-3 w-full justify-center">
              <button
                className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-1.5 duration-300 active:scale-95 bg-purple-700 hover:bg-purple-800 text-zinc-100 rounded-full w-full shadow"
                onClick={() => setChangeModalOpen(true)}
                type="button"
              >
                {lang?.change || 'Изменить'}
              </button>

              {!emailVerified ? (
                <button
                  className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-1.5 duration-300 active:scale-95 bg-zinc-700 hover:bg-zinc-700/80 text-zinc-100 rounded-full w-full shadow disabled:opacity-60"
                  disabled={isSendingVerification}
                  onClick={sendVerificationEmail}
                  type="button"
                >
                  {verificationButtonLabel}
                </button>
              ) : null}
            </div>
          </div>

          {hasConnectedYandex ? (
            <div className="border border-zinc-600/30 bg-zinc-800/90 w-full p-3 shadow rounded-3xl flex flex-col items-center">
              <div className="mb-3 rounded-2xl h-12 w-12 shadow flex items-center justify-center relative">
                <Image
                  alt="Yandex"
                  className="w-12 h-12 shadow rounded-2xl"
                  height={48}
                  src="/img/socials/yandexlogo.png"
                  unoptimized
                  width={48}
                />
                {hasYandexPhone ? (
                  <div className="rounded-full h-4 w-4 bg-green-500 flex items-center justify-center text-white duration-300 absolute -bottom-0.5 -right-0.5 shadow">
                    <SvgIcon className="h-3 w-3 fill-white" id="IC-check" />
                  </div>
                ) : null}
              </div>

              <div className="flex w-full items-center gap-1.5">
                <span className="text-zinc-100 text-sm w-16">{lang?.phone || 'Телефон'}</span>
                <span className="text-zinc-300">{yandexPhoneText}</span>
                <StatusBadge {...securityStatus.yandexPhone} />
              </div>

              <div className="flex w-full items-center gap-1.5">
                <span className="text-zinc-100 text-sm w-16">{lang?.email || 'Почта'}</span>
                <span className="text-zinc-300 truncate w-52 md:w-max">{yandexEmailText}</span>
                <StatusBadge iconId="IC-check" tone="green" />
              </div>

              <Link
                className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-1.5 duration-300 active:scale-95 bg-purple-700 hover:bg-purple-800 text-zinc-100 rounded-full w-full shadow mt-3"
                href="/settings/socials"
              >
                {lang?.unlink || 'Отвязать'}
              </Link>
            </div>
          ) : (
            <div className="border border-zinc-600/30 bg-zinc-800/90 w-full p-3 shadow rounded-3xl flex flex-col items-center">
              <div className="mb-3 rounded-full h-12 w-12 shadow flex items-center justify-center relative overflow-hidden">
                <Image
                  alt="Yandex"
                  className="w-12 h-12 shadow rounded-full"
                  height={48}
                  src="/img/socials/yandexlogo.png"
                  unoptimized
                  width={48}
                />
              </div>
              <span className="text-zinc-300 text-center my-auto">
                {lang?.connyandextover || 'Привяжите Яндекс для подтверждения данных'}
              </span>
              <Link
                className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-1.5 duration-300 active:scale-95 bg-purple-700 hover:bg-purple-800 text-zinc-100 rounded-full w-full shadow mt-3"
                href="/settings/socials"
              >
                {lang?.yalink || 'Привязать Яндекс'}
              </Link>
            </div>
          )}
        </div>

        <div className="lg:hidden">
          <br />
          <br />
          <br />
          <br />
        </div>
      </div>

      <Modal
        align="responsive"
        animation="sheet"
        bodyClassName="p-3 pt-[72px]"
        isOpen={changeModalOpen}
        onClose={() => setChangeModalOpen(false)}
        panelClassName="max-w-screen-sm w-full"
        swipeable
        title={lang?.changeemailandphone || 'Изменить почту и телефон'}
        width="full"
      >
        <div className="text-zinc-100 w-full">
          <form
            className="flex flex-col gap-3 justify-center items-center"
            onSubmit={(event) => {
              event.preventDefault();
              void changePhoneEmail();
            }}
          >
            <input
              className="border border-zinc-600/30 flex bg-zinc-800/90 rounded-full w-full p-1 h-12 focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white"
              id="changeemail"
              onChange={(event) => setChangeEmail(event.target.value)}
              placeholder={lang?.email || 'Почта'}
              value={changeEmail}
            />
            <input
              className="border border-zinc-600/30 flex bg-zinc-800/90 rounded-full w-full p-1 h-12 focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white"
              id="changephone"
              onChange={(event) => setChangePhone(event.target.value)}
              placeholder={lang?.phone || 'Телефон'}
              value={changePhone}
            />
          </form>
          <div className="gap-3 grid grid-cols-2 mt-3">
            <button
              className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-1.5 duration-300 active:scale-95 bg-purple-700 hover:bg-purple-800 text-zinc-100 rounded-full w-full shadow text-lg disabled:opacity-60"
              disabled={isSavingContacts}
              onClick={changePhoneEmail}
              type="button"
            >
              {contactsButtonLabel}
            </button>
            <button
              className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-1.5 duration-300 active:scale-95 bg-zinc-700 hover:bg-zinc-800 text-zinc-100 rounded-full w-full shadow text-lg"
              onClick={() => setChangeModalOpen(false)}
              type="button"
            >
              {lang?.cancel || 'Отмена'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
