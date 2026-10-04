'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { AncialAPI, getApiMessage } from '../../../lib/api-v2';
import { uploadImage } from '../../../lib/upload';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { useRouter, useSearchParams } from 'next/navigation';
import AppImage from '../../../components/app-image';
import Icon from '../../../components/svg-icon';
import BrandLoader from '../../../components/brand-loader';
import RoundCheck from '../../../components/round-check';

interface AutoLinkedTrack {
  id: number;
  title: string;
  artist: string;
  external?: boolean;
}

export default function EditArtistContent() {
  const { lang, isAuthenticated } = useAuth();
  const { showNote } = useNotification();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');
  const id = idParam ? parseInt(idParam, 10) : 0;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [socLinks, setSocLinks] = useState('');
  const [desk, setDesk] = useState('');
  const [img, setImg] = useState('');
  // Автопривязка треков (переключатели работают только у проверенной карточки)
  const [aliases, setAliases] = useState('');
  const [autoExternal, setAutoExternal] = useState(false);
  const [autoUsers, setAutoUsers] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [autoLinks, setAutoLinks] = useState<AutoLinkedTrack[]>([]);
  const [linkBusy, setLinkBusy] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  const cleanupBlobUrl = () => {
    if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupBlobUrl();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      interface PulseArtistRow {
        id?: number | string;
        name?: string;
        img?: string;
        desk?: string;
        soc_links?: string;
        aliases?: string | null;
        auto_link_external?: number | string;
        auto_link_users?: number | string;
        verify?: number | string;
      }

      if (id > 0) {
        AncialAPI.pulseManagement<PulseArtistRow[]>('artist', 'list', {})
          .then((res) => {
            if (Array.isArray(res)) {
              const artist = res.find((a) => parseInt(String(a.id), 10) === id);
              if (artist) {
                setName(artist.name || '');
                setSocLinks(artist.soc_links || '');
                setDesk(artist.desk || '');
                setImg(artist.img || '');
                setAliases(artist.aliases || '');
                // У непроверенной карточки переключатели не действуют (сервер их сбрасывает) — не показываем их включёнными.
                const verified = String(artist.verify) === '1';
                setAutoExternal(verified && String(artist.auto_link_external) === '1');
                setAutoUsers(verified && String(artist.auto_link_users) === '1');
                setIsVerified(verified);
              }
            }
          })
          .finally(() => setLoading(false));
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(false);
      }
    }
  }, [isAuthenticated, id]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    cleanupBlobUrl();
    const tempUrl = URL.createObjectURL(file);
    blobUrlRef.current = tempUrl;
    setImg(tempUrl);

    uploadImage(file, { type: 'avatar', targetType: 'artist' })
      .then((uploadedUrl) => {
        if (uploadedUrl) {
          cleanupBlobUrl();
          setImg(uploadedUrl);
        }
      })
      .catch(console.error);
  };

  const saveArtist = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const action = id > 0 ? 'update' : 'create';
    const data = {
      id: id > 0 ? id : undefined,
      name: name.trim(),
      soc_links: socLinks.trim(),
      desk: desk.trim(),
      img,
      aliases: aliases.trim(),
      auto_link_external: autoExternal ? '1' : '0',
      auto_link_users: autoUsers ? '1' : '0',
    };

    AncialAPI.pulseManagement<{ autolink?: { added?: number } }>('artist', action, data)
      .then((result) => {
        const added = Number(result?.autolink?.added ?? 0);
        showNote({
          content: (id > 0
            ? (lang?.creators_artist_updated || 'Профиль артиста обновлён!')
            : (lang?.creators_artist_created || 'Профиль артиста создан!'))
            + (added > 0 ? ` ${lang?.pulse_autolink_added || 'Привязано новых треков:'} ${added}` : ''),
          type: 'success',
          time: 3,
        });
        router.push('/pulse/create/artists');
      })
      .catch((err) => {
        showNote({
          content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.errorhappend || 'Произошла ошибка'),
          type: 'error',
          time: 5,
        });
        setSaving(false);
      });
  };

  // Автопривязанные треки: загрузка и действия (отвязать / пересчитать) — только владелец существующей карточки.
  const runLinkAction = useCallback(async (action: 'links' | 'unlink' | 'unlink_all' | 'relink', songId?: number) => {
    if (id <= 0) return;
    setLinkBusy(true);
    try {
      const result = await AncialAPI.pulseManagement<{ links?: AutoLinkedTrack[]; autolink?: { added?: number } | null }>('artist', action, { id: String(id), ...(songId ? { song_id: String(songId) } : {}) });
      setAutoLinks(Array.isArray(result?.links) ? result.links : []);
      const added = Number(result?.autolink?.added ?? 0);
      if (action === 'relink') {
        showNote({ content: `${lang?.pulse_autolink_added || 'Привязано новых треков:'} ${added}`, type: 'success', time: 4 });
      }
    } catch (err) {
      showNote({ content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.errorhappend || 'Произошла ошибка'), type: 'error', time: 5 });
    } finally {
      setLinkBusy(false);
    }
  }, [id, lang, showNote]);

  useEffect(() => {
    if (isAuthenticated && id > 0 && !loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- запрос списка автопривязанных: состояние выставляется после ответа
      void runLinkAction('links');
    }
  }, [id, isAuthenticated, loading, runLinkAction]);

  if (!isAuthenticated) return null;

  return (
    <div className="w-full flex flex-col gap-3">
      <h1 className="text-2xl font-bold text-zinc-100">
        {id > 0 ? (lang?.creators_edit_artist || 'Редактировать артиста') : (lang?.creators_new_artist || 'Новый артист')}
      </h1>

      {loading ? (
        <BrandLoader page />
      ) : (
        <form onSubmit={saveArtist} className="flex flex-col gap-3 w-full">
          <div className="flex flex-col items-center justify-center py-3">
            <input type="file" id="artistcover" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <label
              htmlFor="artistcover"
              className="w-44 h-44 rounded-full bg-zinc-800/70 border border-zinc-600/30 flex flex-col items-center justify-center gap-2 shadow cursor-pointer duration-300 active:scale-95 hover:bg-zinc-700/70 overflow-hidden relative group"
            >
              {img ? (
                <>
                  <AppImage width={176} height={176} className="w-full h-full object-cover" src={img} alt="Preview" />
                  <div className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.6] [--glass-blur:4px] absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                    <span className="text-white text-xs font-medium px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-600/30">
                      {lang?.creators_replace_photo || 'Заменить фото'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-center p-3">
                  <div className="p-3 rounded-full bg-zinc-700/60 text-zinc-300">
                    <Icon name="IC-user" className="inline w-8 h-8 fill-current" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-300">{lang?.creators_artist_photo || 'Фото артиста'}</span>
                </div>
              )}
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex w-full flex-col -mt-3">
              <span className="z-20 pl-4 text-zinc-400">{lang?.creators_artist_name || 'Имя артиста'} *</span>
              <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                <input
                  required
                  type="text"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={lang?.creators_artist_name_placeholder || 'Псевдоним или сценическое имя'}
                  className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
                />
              </div>
            </div>

            <div className="flex w-full flex-col -mt-3">
              <span className="z-20 pl-4 text-zinc-400">{lang?.creators_artist_socials || 'Соц. сети (через запятую)'}</span>
              <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="vk.com/..., t.me/..."
                  value={socLinks}
                  onChange={(e) => setSocLinks(e.target.value)}
                  className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
                />
              </div>
            </div>

            <div className="col-span-1 sm:col-span-2 flex w-full flex-col -mt-3">
              <span className="z-20 pl-4 text-zinc-400">{lang?.creators_artist_bio || 'Описание / биография'}</span>
              <div className="-mt-3 z-10 flex min-h-[100px] w-full rounded-3xl border border-zinc-600/30 bg-zinc-800/90 p-3 pt-4">
                <textarea
                  rows={4}
                  value={desk}
                  onChange={(e) => setDesk(e.target.value)}
                  placeholder={lang?.creators_artist_bio_placeholder || 'Расскажите слушателям о себе, стиле музыки и творческом пути...'}
                  className="w-full bg-transparent text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0 text-sm resize-none"
                />
              </div>
            </div>
          </div>

          <section className="flex flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3">
            <h2 className="text-lg font-semibold text-zinc-100">{lang?.pulse_autolink_title || 'Автопривязка треков'}</h2>

            <div className="flex w-full flex-col -mt-3">
              <span className="z-20 pl-4 text-zinc-400">{lang?.pulse_autolink_aliases || 'Другие названия'}</span>
              <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
                <input
                  type="text"
                  autoComplete="off"
                  value={aliases}
                  onChange={(e) => setAliases(e.target.value)}
                  placeholder={lang?.pulse_autolink_aliases_hint || 'Через запятую, например: BigBabyTape, ББТ'}
                  className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
                />
              </div>
            </div>

            <RoundCheck checked={autoExternal} disabled={!isVerified} label={lang?.pulse_autolink_external || 'Треки Яндекса и других сервисов'} onChange={setAutoExternal} />
            <RoundCheck checked={autoUsers} disabled={!isVerified} label={lang?.pulse_autolink_users || 'Треки других пользователей'} onChange={setAutoUsers} />
            {!isVerified ? <span className="text-xs text-zinc-500">{lang?.pulse_autolink_verify_required || 'Станет доступно после проверки карточки'}</span> : null}

            {id > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-medium text-zinc-300">{lang?.pulse_autolink_list || 'Привязаны автоматически'} · {autoLinks.length}</span>
                  <div className="flex gap-3">
                    <button type="button" disabled={linkBusy} onClick={() => void runLinkAction('relink')} className="cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-800 px-3 py-1.5 text-xs text-white duration-300 hover:bg-zinc-700 active:scale-95 disabled:opacity-50">
                      {lang?.pulse_autolink_relink || 'Пересчитать'}
                    </button>
                    {autoLinks.length > 0 ? (
                      <button type="button" disabled={linkBusy} onClick={() => void runLinkAction('unlink_all')} className="cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-800 px-3 py-1.5 text-xs text-white duration-300 hover:bg-zinc-700 active:scale-95 disabled:opacity-50">
                        {lang?.pulse_autolink_unlink_all || 'Отвязать все'}
                      </button>
                    ) : null}
                  </div>
                </div>
                {autoLinks.length === 0 ? (
                  <span className="text-sm text-zinc-500">{lang?.pulse_autolink_empty || 'Пока нет автоматически привязанных треков'}</span>
                ) : (
                  <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
                    {autoLinks.map((track) => (
                      <div key={track.id} className="flex items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3">
                        <div className="flex min-w-0 flex-grow flex-col">
                          <span className="truncate text-sm font-medium text-white">{track.title}</span>
                          <span className="truncate text-xs text-zinc-400">{track.artist}</span>
                        </div>
                        <button type="button" disabled={linkBusy} onClick={() => void runLinkAction('unlink', track.id)} className="shrink-0 cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-800 px-3 py-1.5 text-xs text-white duration-300 hover:bg-zinc-700 active:scale-95 disabled:opacity-50">
                          {lang?.pulse_autolink_unlink || 'Отвязать'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </section>

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2.5 rounded-full bg-white text-black font-semibold text-base hover:bg-zinc-200 active:scale-95 duration-300 shadow cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Icon name="IC-loader" className="inline h-5 w-5 animate-spin fill-black" />
                <span>{lang?.creators_saving || 'Сохранение...'}</span>
              </>
            ) : (
              <span>
                {id > 0
                  ? (lang?.creators_save_changes || 'Сохранить изменения')
                  : (lang?.creators_create_artist || 'Создать артиста')}
              </span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
