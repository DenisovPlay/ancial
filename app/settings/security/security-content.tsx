'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import Modal from '../../components/modal';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { SvgIcon } from '../../feed/editor-shared';

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

function LegacySwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        checked={checked}
        className="sr-only peer"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <div className="group peer bg-zinc-800 rounded-full duration-300 w-10 h-6 after:duration-300 after:bg-red-500 peer-checked:after:bg-green-500 after:rounded-full after:absolute after:h-6 after:w-6 after:top-0 after:left-0 after:flex after:justify-center after:items-center peer-checked:after:translate-x-4 peer-hover:after:scale-105"></div>
    </label>
  );
}

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, lang, checkAuth } = useAuth();
  const { showNote } = useNotification();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [changeEmail, setChangeEmail] = useState('');
  const [changePhone, setChangePhone] = useState('');
  const [searchShow, setSearchShow] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isSavingContacts, setIsSavingContacts] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  useEffect(() => {
    if (user) {
      setChangeEmail(user.email || '');
      setChangePhone(user.phone || '');
      setSearchShow(flag(user.searchshow));
      setMessagesOpen(flag(user.msgopen));
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?backurl=/settings/');
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

  const passwordButtonLabel = isSavingPassword ? '...' : lang?.save || 'Сохранить';
  const contactsButtonLabel = isSavingContacts ? '...' : lang?.save || 'Сохранить';
  const privacyButtonLabel = isSavingPrivacy ? '...' : lang?.save || 'Сохранить';
  const verificationButtonLabel = isSendingVerification
    ? '...'
    : lang?.verifimyemail || 'Подтвердить почту';

  const changePassword = async () => {
    if (!oldPassword) {
      showNote({
        content: lang?.enteroldpassword || 'Введите старый пароль',
        time: 5,
        type: 'info',
      });
      return;
    }

    if (!newPassword) {
      showNote({
        content: lang?.enternewpassword || 'Введите новый пароль',
        time: 5,
        type: 'info',
      });
      return;
    }

    if (!repeatPassword) {
      showNote({
        content: lang?.enterrepnewpassword || 'Повторите новый пароль',
        time: 5,
        type: 'info',
      });
      return;
    }

    if (newPassword.length <= 6) {
      showNote({
        content: lang?.newpasswordmustbe || 'Новый пароль должен быть длиннее 6 символов',
        time: 5,
        type: 'info',
      });
      return;
    }

    setIsSavingPassword(true);

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      const compatibleEntries: Array<[string, string]> = [
        ['oldpas', oldPassword],
        ['newpas', newPassword],
        ['nrepas', repeatPassword],
        ['old_pass', oldPassword],
        ['new_pass', newPassword],
        ['new_rep_pass', repeatPassword],
        ['old_password', oldPassword],
        ['new_password', newPassword],
        ['repeat_new_password', repeatPassword],
        ['oldPassword', oldPassword],
        ['newPassword', newPassword],
        ['repeatNewPassword', repeatPassword],
      ];

      compatibleEntries.forEach(([key, value]) => params.append(key, value));

      if (token) {
        params.append('token', token);
      }

      const response = await fetch('/api/user/changePassword.php', {
        body: params.toString(),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      const responseText = (await response.text()).trim();

      if (!response.ok) {
        throw new Error(responseText || 'Password change failed');
      }

      showNote({
        content: responseText || (lang?.done || 'Готово'),
        html: true,
        time: 5,
        type: guessNoteType(responseText || ''),
      });

      setOldPassword('');
      setNewPassword('');
      setRepeatPassword('');
      await checkAuth();
    } catch (error) {
      console.error(error);
      showNote({
        content: lang?.errorhappend || 'Произошла ошибка =(',
        time: 5,
        type: 'error',
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const sendVerificationEmail = async () => {
    setIsSendingVerification(true);

    try {
      const response = await fetch('/api/verification/sendemail.php', {
        credentials: 'include',
        method: 'POST',
      });

      const result = (await response.json()) as {
        data?: {
          message?: string;
        };
        error?: string;
        success?: boolean;
      };

      if (result?.success) {
        showNote({
          content: result.data?.message || lang?.done || 'Готово',
          time: 5,
          type: 'success',
        });
        return;
      }

      showNote({
        content: result?.error || lang?.errorhappend || 'Произошла ошибка =(',
        time: 5,
        type: 'error',
      });
    } catch (error) {
      console.error(error);
      showNote({
        content: lang?.errorhappend || 'Произошла ошибка =(',
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
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('phone', changePhone);
      params.append('email', changeEmail);

      if (token) {
        params.append('token', token);
      }

      const response = await fetch('/engine/modules/verification/changeemailphone.php', {
        body: params.toString(),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      const responseText = (await response.text()).trim();

      if (!response.ok) {
        throw new Error(responseText || 'Contacts change failed');
      }

      showNote({
        content: responseText || (lang?.done || 'Готово'),
        html: true,
        time: 5,
        type: guessNoteType(responseText || ''),
      });

      setChangeModalOpen(false);
      await checkAuth();
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

  const updateInform = async () => {
    setIsSavingPrivacy(true);

    try {
      const params = new URLSearchParams();
      params.append('searchshow', searchShow ? '1' : '2');
      params.append('msgopen', messagesOpen ? '1' : '2');

      const response = await fetch('/api/user/updateinfo.php', {
        body: params.toString(),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Privacy update failed');
      }

      showNote({
        content: lang?.informupdated || 'Информация обновлена',
        time: 5,
        type: 'success',
      });

      await checkAuth();
    } catch (error) {
      console.error(error);
      showNote({
        content: lang?.errorhappend || 'Произошла ошибка =(',
        time: 5,
        type: 'error',
      });
    } finally {
      setIsSavingPrivacy(false);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center w-full h-screen">
        <SvgIcon className="w-16 h-16 inline animate-spin fill-purple-500" id="IC-loader" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col jusitify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-blue-400/25 lg:from-transparent via-transparent to-transparent">
        <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-[99]">
          <span
            onClick={() => router.push('/settings/')}
            className="w-full max-w-3xl text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <SvgIcon className="w-8 h-8 fill-white inline" id="IC-chevron-left" />
            {lang?.security || 'Безопасность'}
          </span>
        </div>

        <span className="text-zinc-300 text-xl w-full max-w-3xl px-3 lg:px-0 -mb-3">
          {lang?.security || 'Безопасность'}
        </span>

        <div className="flex flex-col gap-0.5 w-full max-w-3xl px-3 lg:px-0">
          <div className="grid lg:grid-cols-3 gap-3 w-full">
            <div className="flex flex-col w-full">
              <span className="text-zinc-400 pl-4 z-20">{lang?.old_pass || 'Старый пароль'}</span>
              <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input
                  autoComplete="off"
                  className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600"
                  id="oldpas"
                  onChange={(event) => setOldPassword(event.target.value)}
                  type="password"
                  value={oldPassword}
                />
              </div>
            </div>
            <div className="flex flex-col w-full -mt-3 lg:mt-0">
              <span className="text-zinc-400 pl-4 z-20">{lang?.new_pass || 'Новый пароль'}</span>
              <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input
                  autoComplete="off"
                  className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600"
                  id="newpas"
                  onChange={(event) => setNewPassword(event.target.value)}
                  type="password"
                  value={newPassword}
                />
              </div>
            </div>
            <div className="flex flex-col w-full -mt-3 lg:mt-0">
              <span className="text-zinc-400 pl-4 z-20">
                {lang?.repeat_new_pass || 'Повторите новый пароль'}
              </span>
              <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input
                  autoComplete="off"
                  className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600"
                  id="nrepas"
                  onChange={(event) => setRepeatPassword(event.target.value)}
                  type="password"
                  value={repeatPassword}
                />
              </div>
            </div>
          </div>

          <button
            className="border border-zinc-600/30 cursor-pointer mt-3 flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-800 text-zinc-100 rounded-full w-full shadow disabled:opacity-60"
            disabled={isSavingPassword}
            onClick={changePassword}
            type="button"
          >
            {passwordButtonLabel}
          </button>
        </div>

        <span className="text-zinc-300 text-xl w-full max-w-3xl px-3 lg:px-0">
          {lang?.phoneandnumber || 'Телефон и почта'}
        </span>

        <div className="grid lg:grid-cols-2 gap-3 w-full max-w-3xl px-3 lg:px-0">
          <div className="border border-zinc-600/30 bg-zinc-800/90 w-full p-3 shadow rounded-3xl flex flex-col items-center">
            <Image
              alt="Ancial"
              className="w-12 h-12 shadow rounded-2xl mb-3"
              height={48}
              src="/includes/img/anlite/anlogo.webp"
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
                  src="/includes/img/yandexlogo.png"
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

              <button
                className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-1.5 duration-300 active:scale-95 bg-purple-700 hover:bg-purple-800 text-zinc-100 rounded-full w-full shadow mt-3"
                onClick={() => router.push('/settings/socials')}
                type="button"
              >
                {lang?.unlink || 'Отвязать'}
              </button>
            </div>
          ) : (
            <div className="border border-zinc-600/30 bg-zinc-800/90 w-full p-3 shadow rounded-3xl flex flex-col items-center">
              <div className="mb-3 rounded-full h-12 w-12 shadow flex items-center justify-center relative overflow-hidden">
                <Image
                  alt="Yandex"
                  className="w-12 h-12 shadow rounded-full"
                  height={48}
                  src="/includes/img/yandexlogo.png"
                  unoptimized
                  width={48}
                />
              </div>
              <span className="text-zinc-300 text-center my-auto">
                {lang?.connyandextover || 'Привяжите Яндекс для подтверждения данных'}
              </span>
              <button
                className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-1.5 duration-300 active:scale-95 bg-purple-700 hover:bg-purple-800 text-zinc-100 rounded-full w-full shadow mt-3"
                onClick={() => router.push('/settings/socials')}
                type="button"
              >
                {lang?.yalink || 'Привязать Яндекс'}
              </button>
            </div>
          )}
        </div>

        <span className="text-zinc-300 text-xl w-full max-w-3xl px-3 lg:px-0">
          {lang?.confidentiality || 'Конфиденциальность'}
        </span>

        <div className="flex flex-col gap-3 w-full max-w-3xl px-3 lg:px-0">
          <div className="cursor-pointer flex gap-3">
            <span className="w-full">{lang?.showinsearch || 'Показывать в поиске'}</span>
            <div className="flex items-center h-5">
              <LegacySwitch checked={searchShow} onChange={setSearchShow} />
            </div>
          </div>

          <div className="cursor-pointer flex gap-3">
            <span className="w-full">{lang?.openmessages || 'Открытые сообщения'}</span>
            <div className="flex items-center h-5">
              <LegacySwitch checked={messagesOpen} onChange={setMessagesOpen} />
            </div>
          </div>

          <button
            className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-800 text-zinc-100 rounded-full w-full shadow disabled:opacity-60"
            disabled={isSavingPrivacy}
            onClick={updateInform}
            type="button"
          >
            {privacyButtonLabel}
          </button>
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
              className="border border-zinc-600/30 flex bg-zinc-800/90 rounded-full w-full p-1 h-12 focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600"
              id="changeemail"
              onChange={(event) => setChangeEmail(event.target.value)}
              placeholder={lang?.email || 'Почта'}
              value={changeEmail}
            />
            <input
              className="border border-zinc-600/30 flex bg-zinc-800/90 rounded-full w-full p-1 h-12 focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600"
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
