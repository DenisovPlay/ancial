'use client';

import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { SettingsItem } from '../../components/settings-item';
import SettingSelect from '../../components/setting-select';
import AppImage from '../../components/app-image';
import { AncialAPI } from '../../lib/api-v2';
import { cn } from '../../lib/cn';
import { availableLocales, type SupportedLang } from '../../locales';
import {
  APPEARANCE_CHANGE_EVENT,
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  GLASS_ROLES,
  applyAppearance,
  parseAppearanceSettings,
  saveAppearance,
  type AppearanceSettings,
  type GlassPreset,
  type GlassRole,
  type LyricsSetting,
  type MotionToggle,
  type TooltipMotion,
} from '../../lib/appearance';
import Icon from '../../components/svg-icon';
import { useAppearanceMotion } from '../../lib/use-appearance';

type Lang = Record<string, string> | null | undefined;

const PRESETS: Exclude<GlassPreset, 'custom'>[] = ['off', 'lite', 'full', 'auto'];

function subscribeAppearance(onChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === APPEARANCE_STORAGE_KEY) onChange();
  };
  window.addEventListener('storage', handleStorage);
  window.addEventListener(APPEARANCE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(APPEARANCE_CHANGE_EVENT, onChange);
  };
}

/** Строка из localStorage — стабильный снимок для useSyncExternalStore; разбор — в useMemo. */
function readStoredAppearance(): string {
  try {
    return window.localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? `legacy:${window.localStorage.getItem('zypo_glass_mode') ?? ''}`;
  } catch {
    return '';
  }
}

function PercentSlider({ label, value, onChange, disabled }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', disabled && 'opacity-50')}>
      <span className="flex items-center justify-between text-sm text-zinc-300">
        <span>{label}</span>
        <span className="font-mono text-xs tabular-nums text-zinc-400">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={200}
        step={5}
        value={Math.round(value * 100)}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-cyan-500 disabled:cursor-default"
      />
    </label>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-zinc-600/30 duration-300',
        checked ? 'bg-cyan-500' : 'bg-zinc-800',
      )}
    >
      <span className={cn('absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow duration-300', checked ? 'left-5.5' : 'left-0.5')} />
    </button>
  );
}

/**
 * Плавное раскрытие, как у длинных постов: высота анимируется до точной высоты содержимого (grid 0fr → 1fr).
 * Закрытый блок не занимает место и не ловит фокус; отрицательный отступ гасит gap-3 родителя.
 */
function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  const smooth = useAppearanceMotion().expand;
  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={cn(
        'grid',
        smooth && 'transition-[grid-template-rows,opacity,margin] duration-500 ease-in-out',
        open ? 'grid-rows-[1fr] opacity-100' : '-mt-3 grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/** Превью всех ролей стекла поверх картинки: меняется вместе с настройками. */
function GlassPreview({ lang }: { lang: Lang }) {
  return (
    <div className="relative h-64 w-full select-none overflow-hidden rounded-3xl border border-zinc-600/30 bg-zinc-950">
      <AppImage
        src="/img/backgrounds/bg.webp"
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 768px"
        skeleton={false}
        className="pointer-events-none object-cover"
        draggable={false}
      />

      {/* Модалка поверх затемнения — справа */}
      <div className="glass-overlay absolute inset-y-0 right-0 flex w-2/5 items-center justify-center p-3">
        <div className="glass-panel flex w-full max-w-48 flex-col gap-1.5 rounded-3xl border border-zinc-600/30 p-3 text-xs text-zinc-200 shadow-xl">
          <span className="font-semibold text-white">{lang?.appearance_preview_panel || 'Панель'}</span>
          <span className="text-zinc-400">{lang?.appearance_preview_panel_text || 'Модалки, шторки, карточки'}</span>
        </div>
      </div>

      {/* Дропдаун */}
      <div className="glass-menu absolute left-3 top-3 flex w-36 flex-col rounded-3xl border border-zinc-600/30 p-1.5 text-xs text-zinc-200 shadow-xl">
        {[lang?.appearance_preview_menu_1 || 'Профиль', lang?.appearance_preview_menu_2 || 'Настройки', lang?.appearance_preview_menu_3 || 'Выйти'].map((item) => (
          <span key={item} className="rounded-full px-3 py-1.5">{item}</span>
        ))}
      </div>

      {/* Поле ввода */}
      <div className="glass-input absolute left-3 top-[7.75rem] flex h-9 w-36 items-center gap-1.5 rounded-full border border-zinc-600/30 px-3 text-xs text-zinc-400">
        <Icon name="IC-search" className="h-4 w-4 fill-current" />
        {lang?.appearance_preview_input || 'Поиск'}
      </div>

      {/* Подсказка над нав-пиллом */}
      <span className="glass-tooltip absolute bottom-[3.75rem] left-[3.5rem] rounded-full border border-zinc-600/30 px-2 py-0.5 text-[11px] leading-4 text-zinc-100">
        {lang?.appearance_preview_tooltip || 'Подсказка'}
      </span>

      {/* Нав-пилл */}
      <div className="glass-nav absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-zinc-600/30 p-1.5 shadow-xl">
        {(['IC-home', 'IC-feed', 'IC-music', 'IC-settings'] as const).map((icon, index) => (
          <span key={icon} className={cn('flex h-9 w-9 items-center justify-center rounded-full', index === 0 && 'bg-white/10')}>
            <Icon name={icon} className="h-5 w-5 fill-white" />
          </span>
        ))}
      </div>
    </div>
  );
}

export default function UiSettingsContent() {
  const { showNote } = useNotification();
  const { isAuthenticated, lang, langCode, setLanguage } = useAuth();
  const [finetuneOpen, setFinetuneOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);

  const stored = useSyncExternalStore(subscribeAppearance, readStoredAppearance, () => '');
  const settings = useMemo<AppearanceSettings>(
    () => (stored.startsWith('legacy:') ? parseAppearanceSettings(null, stored.slice(7) || null) : parseAppearanceSettings(stored || null)),
    [stored],
  );
  // Действующие значения (пресет «Авто» раскрыт под устройство) — для ползунков и подсказок.
  // До гидратации снимок пустой (SSR не знает устройства) — не показываем ничего устройство-зависимого.
  const resolved = useMemo(() => (stored === '' ? null : applyAppearance(settings, false)), [settings, stored]);

  const update = (mutate: (draft: AppearanceSettings) => void) => {
    const draft: AppearanceSettings = JSON.parse(JSON.stringify(settings));
    mutate(draft);
    saveAppearance(draft);
  };

  /** Любая ручная правка стекла превращает пресет в «Свой» — стартуем от того, что действует сейчас. */
  const updateGlass = (mutate: (glass: AppearanceSettings['glass']) => void) => {
    update((draft) => {
      if (draft.glass.preset !== 'custom') {
        // Стартуем ровно с того, что действует сейчас (у «Выкл» — нули), поэтому ползунок двигается плавно.
        const current = applyAppearance(settings, false).global;
        draft.glass.preset = 'custom';
        draft.glass.blur = current.blur;
        draft.glass.clarity = current.clarity;
        draft.glass.saturate = current.saturate;
        draft.glass.roles = JSON.parse(JSON.stringify(DEFAULT_APPEARANCE.glass.roles));
      }
      mutate(draft.glass);
    });
  };

  const presetLabel = (preset: GlassPreset) => ({
    off: lang?.glass_mode_off || 'Отключено',
    lite: lang?.glass_mode_lite || 'Облегчённое',
    full: lang?.glass_mode_full || 'Полное',
    auto: lang?.glass_mode_auto || 'Авто',
    custom: lang?.glass_mode_custom || 'Своё',
  })[preset];

  const presetDescription = (preset: GlassPreset) => ({
    off: lang?.glass_mode_off_desc || 'Размытие выключено для наилучшей производительности.',
    lite: lang?.glass_mode_lite_desc || 'Оптимизированное размытие для плавной работы.',
    full: lang?.glass_mode_full_desc || 'Максимальные эффекты размытия и полупрозрачности.',
    auto: `${lang?.glass_mode_auto_desc || 'Автоматическая настройка под мощность устройства.'} ${resolved ? `(${presetLabel(resolved.preset)})` : ''}`.trim(),
    custom: lang?.glass_mode_custom_desc || 'Ваши собственные значения размытия, прозрачности и насыщенности.',
  })[preset];

  const roleLabel = (role: GlassRole) => ({
    nav: lang?.glass_role_nav || 'Навигация',
    menu: lang?.glass_role_menu || 'Меню и дропдауны',
    tooltip: lang?.glass_role_tooltip || 'Подсказки',
    input: lang?.glass_role_input || 'Поля ввода',
    panel: lang?.glass_role_panel || 'Панели и модалки',
    overlay: lang?.glass_role_overlay || 'Затемнение',
  })[role];

  const toggleOptions: { value: MotionToggle; label: string }[] = [
    { value: 'auto', label: lang?.motion_auto || 'Авто' },
    { value: 'on', label: lang?.motion_on || 'Включено' },
    { value: 'off', label: lang?.motion_off || 'Выключено' },
  ];
  const autoHint = (enabled: boolean | undefined) => `${lang?.motion_auto_hint || 'Авто — выключено на Android'}${enabled === undefined ? '' : ` · ${enabled ? (lang?.motion_now_on || 'сейчас включено') : (lang?.motion_now_off || 'сейчас выключено')}`}`;

  const heavyGlass = Boolean(resolved?.device.android && resolved.global.blur > 1);

  const selectLanguage = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLang = e.target.value as SupportedLang;
    setLanguage(selectedLang);
    try {
      if (isAuthenticated) {
        await AncialAPI.updateProfile<{ lang?: string }>({ lang: selectedLang });
      }
      showNote({ content: lang?.language_updated || 'Язык успешно изменён!', type: 'success' });
    } catch {
      showNote({ content: lang?.language_update_error || 'Ошибка при смене языка', type: 'error' });
    }
  };

  const preset = settings.glass.preset;
  const global = resolved?.global ?? { blur: 1, clarity: 1, saturate: 1 };

  return (
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-cyan-400/25 md:from-transparent via-transparent to-transparent">
      {/* Sticky Header */}
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40">
        <div className="w-full max-w-3xl flex items-center gap-3">
          <Link
            href="/settings"
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Icon name="IC-chevron-left" className="w-8 h-8 fill-white inline" />
            {lang?.interface_settings || 'Интерфейс'}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-3xl px-3 lg:px-0">
        {/* Language Section */}
        <div className="rounded-3xl flex flex-col border border-zinc-600/30 bg-zinc-900 overflow-hidden">
          <SettingsItem
            title={lang?.language || 'Язык'}
            iconBgClass="bg-red-500/10"
            icon={
              <Icon name="IC-globe" className="w-6 h-6 fill-red-500" />
            }
            rightContent={
              <select
                onChange={selectLanguage}
                value={langCode}
                className="h-10 cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800 px-3 text-white outline-none"
              >
                {availableLocales.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.title}
                  </option>
                ))}
              </select>
            }
          />
        </div>

        {/* Стекло */}
        <div className="flex flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/10">
              <Icon name="IC-full-mode" className="h-5 w-5 fill-cyan-400" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-lg text-white">{lang?.glass_effects || 'Эффекты стекла'}</span>
              <span className="text-xs text-zinc-400">{presetDescription(preset)}</span>
            </div>
          </div>

          <GlassPreview lang={lang} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => update((draft) => { draft.glass.preset = value; })}
                className={cn(
                  'cursor-pointer rounded-full border border-zinc-600/30 px-3 py-2 text-sm duration-300 active:scale-95',
                  preset === value ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700',
                )}
              >
                {presetLabel(value)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setFinetuneOpen((open) => !open)}
            aria-expanded={finetuneOpen}
            className="flex cursor-pointer items-center justify-between gap-3 py-2 text-sm text-zinc-300 duration-300 hover:text-white"
          >
            <span className="flex items-center gap-3">
              {lang?.glass_finetune || 'Тонкая настройка'}
              {preset === 'custom' ? <span className="rounded-full bg-cyan-500/15 px-3 py-0.5 text-xs text-cyan-300">{presetLabel('custom')}</span> : null}
            </span>
            <Icon name="IC-chevron-down" className={cn('h-5 w-5 fill-current duration-300', finetuneOpen && 'rotate-180')} />
          </button>

          <Collapse open={finetuneOpen}>
            <div className="flex flex-col gap-3">
              <PercentSlider label={lang?.glass_blur || 'Размытие'} value={global.blur} onChange={(value) => updateGlass((glass) => { glass.blur = value; })} />
              <PercentSlider label={lang?.glass_clarity || 'Прозрачность'} value={global.clarity} onChange={(value) => updateGlass((glass) => { glass.clarity = value; })} />
              <PercentSlider label={lang?.glass_saturate || 'Насыщенность'} value={global.saturate} onChange={(value) => updateGlass((glass) => { glass.saturate = value; })} />

              {heavyGlass ? (
                <span className="flex items-center gap-3 rounded-3xl bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  <Icon name="IC-warning" className="h-4 w-4 shrink-0 fill-current" />
                  {lang?.glass_heavy_warning || 'Сильное размытие на этом устройстве может подтормаживать.'}
                </span>
              ) : null}

              <button
                type="button"
                onClick={() => setRolesOpen((open) => !open)}
                aria-expanded={rolesOpen}
                className="flex cursor-pointer items-center justify-between gap-3 py-2 text-sm text-zinc-300 duration-300 hover:text-white"
              >
                {lang?.glass_by_element || 'По элементам'}
                <Icon name="IC-chevron-down" className={cn('h-5 w-5 fill-current duration-300', rolesOpen && 'rotate-180')} />
              </button>

              <Collapse open={rolesOpen}>
                <div className="flex flex-col gap-3">
                  <span className="text-xs text-zinc-500">
                    {lang?.glass_by_element_hint || 'Множитель поверх общих настроек: 100% — как задано выше, 0% — без размытия у этого элемента.'}
                  </span>
                  {GLASS_ROLES.map((role) => {
                    const roleSetting = preset === 'custom' ? settings.glass.roles[role] : DEFAULT_APPEARANCE.glass.roles[role];
                    const enabled = roleSetting.on;
                    return (
                      <div key={role} className="flex flex-col gap-1.5 rounded-3xl border border-zinc-600/30 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-zinc-200">{roleLabel(role)}</span>
                          <Switch
                            checked={enabled}
                            label={roleLabel(role)}
                            onChange={(checked) => updateGlass((glass) => { glass.roles[role].on = checked; })}
                          />
                        </div>
                        <PercentSlider
                          label={lang?.glass_role_intensity || 'Размытие и насыщенность'}
                          value={roleSetting.level}
                          disabled={!enabled}
                          onChange={(value) => updateGlass((glass) => { glass.roles[role].level = value; })}
                        />
                      </div>
                    );
                  })}
                </div>
              </Collapse>

              <button
                type="button"
                onClick={() => update((draft) => { draft.glass = JSON.parse(JSON.stringify(DEFAULT_APPEARANCE.glass)); })}
                className="w-full cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-200 duration-300 hover:bg-zinc-700 hover:text-white active:scale-95"
              >
                {lang?.glass_reset || 'Сбросить'}
              </button>
            </div>
          </Collapse>
        </div>

        {/* Анимации */}
        <div className="flex flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
              <Icon name="IC-app-bolt" className="h-5 w-5 fill-purple-400" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-lg text-white">{lang?.motion_title || 'Анимации'}</span>
              <span className="text-xs text-zinc-400">{lang?.motion_desc || 'Эффекты при наведении, подсказки и анимация текста.'}</span>
            </div>
          </div>

          <SettingSelect
            selectClassName="w-40 shrink-0"
            label={lang?.motion_nav || 'Отзывчивое меню'}
            hint={autoHint(settings.motion.nav === 'auto' ? resolved?.motion.nav : undefined)}
            options={toggleOptions}
            value={settings.motion.nav}
            onChange={(value) => update((draft) => { draft.motion.nav = value; })}
          />
          <SettingSelect
            selectClassName="w-40 shrink-0"
            label={lang?.motion_menu || 'Отзывчивые дропдауны'}
            hint={autoHint(settings.motion.menu === 'auto' ? resolved?.motion.menu : undefined)}
            options={toggleOptions}
            value={settings.motion.menu}
            onChange={(value) => update((draft) => { draft.motion.menu = value; })}
          />
          <SettingSelect<TooltipMotion>
            selectClassName="w-40 shrink-0"
            label={lang?.motion_tooltips || 'Подсказки'}
            hint={lang?.motion_tooltips_hint || 'Как появляются подсказки у бейджей и стикеров'}
            options={[
              { value: 'auto', label: lang?.motion_auto || 'Авто' },
              { value: 'smooth', label: lang?.motion_smooth || 'Плавно' },
              { value: 'instant', label: lang?.motion_instant || 'Мгновенно' },
            ]}
            value={settings.motion.tooltips}
            onChange={(value) => update((draft) => { draft.motion.tooltips = value; })}
          />
          <SettingSelect
            selectClassName="w-40 shrink-0"
            label={lang?.motion_expand || 'Плавное раскрытие'}
            hint={lang?.motion_expand_hint || 'Длинные посты и разделы настроек'}
            options={toggleOptions}
            value={settings.motion.expand}
            onChange={(value) => update((draft) => { draft.motion.expand = value; })}
          />
          <SettingSelect<LyricsSetting>
            selectClassName="w-40 shrink-0"
            label={lang?.motion_lyrics || 'Анимация текста'}
            hint={lang?.motion_lyrics_hint || 'Текст песен в Pulse'}
            options={[
              { value: 'auto', label: lang?.motion_auto || 'Авто' },
              { value: 'words', label: lang?.motion_lyrics_words || 'По словам' },
              { value: 'lines', label: lang?.motion_lyrics_lines || 'Построчно' },
            ]}
            value={settings.motion.lyrics}
            onChange={(value) => update((draft) => { draft.motion.lyrics = value; })}
          />
        </div>
      </div>

      <div className="lg:hidden">
        <br /><br /><br /><br />
      </div>
    </div>
  );
}
