"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Modal from "../../components/modal";

export default function LegalPage() {
  const router = useRouter();
  const { lang } = useAuth();
  const [langFilter, setLangFilter] = useState("ALL");
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const isVisible = (lng: string) => langFilter === "ALL" || langFilter === lng;

  return (
    <>
      <div className="flex flex-col jusitify-center items-center gap-3 py-3">
        <div className="w-full max-w-4xl flex sm:items-center flex-col sm:flex-row">
          <span
            onClick={() => router.push("/about")}
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer"
          >
            <svg
              className="w-8 h-8 fill-white inline"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
            >
              <use href={`#IC-chevron-left`}></use>
            </svg>
            {lang?.documents || "Документы"}
          </span>
          <div className="flex-grow"></div>
          <div className="shrink-0 w-fit rounded-3xl bg-zinc-900/95 ring ring-zinc-600/30 duration-300 flex mx-3 mt-3 sm:mt-0 sm:mx-0 gap-0.5 sm:mr-3 lg:mr-0">
            <button
              id="allbutton"
              onClick={() => setLangFilter("ALL")}
              className={`aspect-square h-12 w-12 p-2 lg:text-lg rounded-3xl duration-300 flex items-center justify-center active:scale-95 cursor-pointer ${
                langFilter === "ALL"
                  ? "bg-zinc-800 text-white border-r border-zinc-600/30"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border-transparent"
              }`}
            >
              <svg
                className={`w-6 h-6 inline duration-300 ${
                  langFilter === "ALL" ? "fill-white" : "fill-zinc-400"
                }`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
              >
                <use href={`#IC-globe`}></use>
              </svg>
            </button>
            <button
              id="rubutton"
              onClick={() => setLangFilter("RU")}
              className={`p-2 px-4 lg:text-lg rounded-3xl duration-300 active:scale-95 cursor-pointer ${
                langFilter === "RU"
                  ? "bg-zinc-800 text-white border-x border-zinc-600/30"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border-transparent"
              }`}
            >
              Русский
            </button>
            <button
              id="enbutton"
              onClick={() => setLangFilter("EN")}
              className={`p-2 px-4 lg:text-lg rounded-3xl duration-300 active:scale-95 cursor-pointer ${
                langFilter === "EN"
                  ? "bg-zinc-800 text-white border-l border-zinc-600/30"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border-transparent"
              }`}
            >
              English
            </button>
          </div>
        </div>

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-3 lg:px-0 duration-300 transition-all">
          <div
            onClick={() => setActiveModal("bezopasnost")}
            className={`RU  relative bg-zinc-900 rounded-3xl shadow p-3 lg:p-6 gap-3 flex flex-col items-center justify-center duration-300 hover:bg-zinc-800/70 cursor-pointer active:scale-95 border border-zinc-600/30 ${
              isVisible("RU") ? "flex" : "hidden"
            }`}
          >
            <span className="text-sm px-2 py-1 font-medium bg-purple-500/50 rounded-3xl rounded-bl-none rounded-tr-none absolute top-0 left-0 text-default duration-300 shadow">
              Русский
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" viewBox="0,0,256,256">
              <use href="#IC-goverment-document"></use>
            </svg>
            <span className="text-zinc-200 text-center">
              Политика обработки персональных данных
            </span>
          </div>
          <div
            onClick={() => setActiveModal("rules-ru")}
            className={`RU  relative bg-zinc-900 rounded-3xl shadow p-3 lg:p-6 gap-3 flex flex-col items-center justify-center duration-300 hover:bg-zinc-800/70 cursor-pointer active:scale-95 border border-zinc-600/30 ${
              isVisible("RU") ? "flex" : "hidden"
            }`}
          >
            <span className="text-sm px-2 py-1 font-medium bg-purple-500/50 rounded-3xl rounded-bl-none rounded-tr-none absolute top-0 left-0 text-default duration-300 shadow">
              Русский
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" viewBox="0 0 32 32">
              <use href="#IC-document"></use>
            </svg>
            <span className="text-zinc-200 text-center">Правила</span>
          </div>
          <div
            onClick={() => setActiveModal("rules-pulse-ru")}
            className={`RU  relative bg-zinc-900 rounded-3xl shadow p-3 lg:p-6 gap-3 flex flex-col items-center justify-center duration-300 hover:bg-zinc-800/70 cursor-pointer active:scale-95 border border-zinc-600/30 ${
              isVisible("RU") ? "flex" : "hidden"
            }`}
          >
            <span className="text-sm px-2 py-1 font-medium bg-purple-500/50 rounded-3xl rounded-bl-none rounded-tr-none absolute top-0 left-0 text-default duration-300 shadow">
              Русский
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" viewBox="0 0 32 32">
              <use href="#IC-document"></use>
            </svg>
            <span className="text-zinc-200 text-center">
              Правила публикации на Pulse
            </span>
          </div>
          <div
            onClick={() => setActiveModal("rules-en")}
            className={`EN  relative bg-zinc-900 rounded-3xl shadow p-3 lg:p-6 gap-3 flex flex-col items-center justify-center duration-300 hover:bg-zinc-800/70 cursor-pointer active:scale-95 border border-zinc-600/30 ${
              isVisible("EN") ? "flex" : "hidden"
            }`}
          >
            <span className="text-sm px-2 py-1 font-medium bg-amber-500/50 rounded-3xl rounded-bl-none rounded-tr-none absolute top-0 left-0 text-default duration-300 shadow">
              English
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" viewBox="0 0 32 32">
              <use href="#IC-document"></use>
            </svg>
            <span className="text-zinc-200 text-center">Terms of Service</span>
          </div>
          <div
            onClick={() => setActiveModal("cookie")}
            className={`RU  relative bg-zinc-900 rounded-3xl shadow p-3 lg:p-6 gap-3 flex flex-col items-center justify-center duration-300 hover:bg-zinc-800/70 cursor-pointer active:scale-95 border border-zinc-600/30 ${
              isVisible("RU") ? "flex" : "hidden"
            }`}
          >
            <span className="text-sm px-2 py-1 font-medium bg-purple-500/50 rounded-3xl rounded-bl-none rounded-tr-none absolute top-0 left-0 text-default duration-300 shadow">
              Русский
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" viewBox="0,0,256,256">
              <use href="#IC-goverment-document"></use>
            </svg>
            <span className="text-zinc-200 text-center">
              Политика использования файлов Cookie
            </span>
          </div>
        </div>
      </div>

      <Modal
        width="lg"
        isOpen={activeModal === "rules-pulse-ru"}
        onClose={() => setActiveModal(null)}
        title="Правила Pulse"
        swipeable={true}
      >
        <div
          className="bg-zinc-900 text-zinc-100 rounded-3xl p-3"
          id="rules-pulse-ru"
        >
          <div className="container mx-auto py-12 prose prose-invert max-w-4xl">
            {/*  HEADER  */}
            <header className="mb-12 text-center">
              <p className="text-zinc-400 text-lg">
                Актуально с 03.03.2026, версия 2.0 (Pulse)
              </p>
              <p className="mt-2">
                <a
                  href="https://ancial.ru/about/legal"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Официальная публикация
                </a>
              </p>
              <div className="mt-6 p-4 bg-zinc-900 rounded-3xl border border-zinc-800">
                <p className="text-sm">
                  <strong>
                    Контакт для обращений правообладателей и властей:
                  </strong>
                  <a
                    href="mailto:contact@ancial.ru?subject=[Копирайт]"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    [Копирайт]
                  </a>{" "}
                  |
                  <a
                    href="mailto:contact@ancial.ru?subject=[Пропаганда]"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    [Пропаганда]
                  </a>
                  <br />
                  <span className="text-red-400">
                    ❗ Блокируем в течение 24 часов по обоснованному требованию
                    (ст. 15.1 149-ФЗ)
                  </span>
                </p>
              </div>
            </header>
            {/*  NAVIGATION  */}
            <nav className="mb-12 bg-black/80 backdrop-blur-sm p-4 rounded-3xl border border-zinc-800">
              <h2 className="text-xl font-semibold text-purple-500 mb-3">
                Содержание
              </h2>
              <ul className="space-y-2 text-sm">
                <li>1. Общие положения (информационный посредник)</li>
                <li>2. Загрузка контента (ваши обязанности)</li>
                <li>3. Запрещённый контент</li>
                <li>4. Авторские права и жалобы</li>
                <li>5. Политические ограничения</li>
                <li>6. Модерация и санкции</li>
                <li>7. Контакты для властей</li>
                <li>Заключение</li>
              </ul>
            </nav>
            {/*  SECTION 1  */}
            <section id="section-1" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                1. Общие положения (информационный посредник)
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  <strong>
                    Pulse — информационный посредник по ст. 15.1 Федерального
                    закона № 149-ФЗ.
                  </strong>
                  Платформа обеспечивает загрузку и прослушивание аудиофайлов
                  исключительно пользователями. Администрация не размещает
                  контент самостоятельно, не модерирует его заранее и не несёт
                  ответственности за правомерность материалов.
                </li>
                <li>
                  Загружая контент, вы <strong>гарантируете</strong>:
                  <ul className="list-disc ml-6 mt-2 space-y-1 text-amber-300">
                    <li>
                      Полные права на дистрибуцию (автор или разрешение
                      правообладателя)
                    </li>
                    <li>Отсутствие нарушений российского законодательства</li>
                    <li>
                      Согласие на публичное прослушивание другими пользователями
                    </li>
                  </ul>
                </li>
                <li>
                  После публикации трек/альбом <strong>не редактируется</strong>{" "}
                  и удаляется только по требованию правообладателя, суда или
                  Роскомнадзора.
                </li>
                <li>
                  Используя Pulse, вы принимаете настоящие{" "}
                  <a
                    href="https://ancial.ru/about/legal"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    Правила
                  </a>{" "}
                  и
                  <a
                    href="https://ancial.ru/about/legal"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    Политику конфиденциальности
                  </a>
                  .
                </li>
              </ol>
            </section>
            {/*  SECTION 2  */}
            <section id="section-2" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                2. Загрузка контента (ваши обязанности)
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Вы обязаны загружать только <strong>легальный контент</strong>
                  , соответствующий законодательству РФ.
                </li>
                <li>
                  Форматы: MP3, WAV, FLAC (до 10 МБ на трек, до 10 треков в 1
                  альбоме). Технически повреждённые файлы блокируются
                  автоматически.
                </li>
                <li>
                  Метаданные (название, исполнитель, обложка) должны быть
                  достоверными. Фейковые метаданные = блокировка.
                </li>
                <li>
                  <strong>Вы несёте полную ответственность</strong> за
                  нарушения. Блокировка аккаунта во всех сервисах Ancial без
                  возврата токенов anci.
                </li>
              </ol>
            </section>
            {/*  SECTION 3  */}
            <section id="section-3" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-red-500 pl-4 mb-4">
                3. Запрещённый контент
              </h2>
              <div className="bg-red-900/30 border border-red-800 p-6 rounded-3xl mb-6">
                <p className="text-red-200 font-semibold mb-4">
                  ❌ СТРОГО ЗАПРЕЩЕНО загружать:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-red-100">
                  <ul className="list-disc ml-6 space-y-1">
                    <li>
                      Нарушение авторских прав (без письменного разрешения)
                    </li>
                    <li>
                      Пропаганда/упоминания наркотиков <br />{" "}
                      <span className="text-red-300">
                        (даже негативные без маркировки "опасно и незаконно")
                      </span>
                    </li>
                    <li>
                      Порнография, эротика, ЛГБТ-пропаганда <br />{" "}
                      <span className="text-red-300">
                        («Деятельность „Международного общественного движения
                        ЛГБТ“ запрещена в Российской Федерации»)
                      </span>
                    </li>
                    <li>Призывы к насилию, экстремизм, терроризм</li>
                  </ul>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Оскорбления русской культуры, традиций, граждан РФ</li>
                    <li>Фейковые новости, дезинформация</li>
                    <li>Спам, мошенничество, вредоносный код</li>
                    <li>Контент 18+ без возрастной маркировки</li>
                  </ul>
                </div>
              </div>
            </section>
            {/*  SECTION 4  */}
            <section id="section-4" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                4. Авторские права и жалобы
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Правообладатели направляют уведомления на
                  <a
                    href="mailto:contact@ancial.ru?subject=[Копирайт]"
                    className="text-purple-400"
                  >
                    [Копирайт]
                  </a>
                  :
                  <ul className="list-disc ml-6 mt-2 space-y-1 text-sm">
                    <li>Контакты заявителя</li>
                    <li>Ссылка на трек</li>
                    <li>Доказательства прав</li>
                    <li>Электронная подпись</li>
                  </ul>
                </li>
                <li>
                  <strong>Блокировка в 24 часа</strong> с момента получения.
                  Логи жалоб хранятся 3 года.
                </li>
                <li>
                  Контр-уведомление:{" "}
                  <a
                    href="mailto:contact@ancial.ru?subject=[Апелляция]"
                    className="text-purple-400"
                  >
                    [Апелляция]
                  </a>
                  .
                </li>
                <li>3 жалобы = бессрочная блокировка.</li>
              </ol>
            </section>
            {/*  SECTION 5  */}
            <section id="section-5" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-red-500 pl-4 mb-4">
                5. Политические ограничения
              </h2>
              <div className="bg-red-900/30 border border-red-800 p-6 rounded-3xl mb-6">
                <p className="text-red-300 font-semibold mb-4">
                  🚫 Запрещено публиковать материалы:
                </p>
                <ul className="list-disc ml-6 space-y-2 text-red-100">
                  <li>
                    Исполнителей, публично оскорбляющих русскую культуру,
                    традиции, граждан РФ
                  </li>
                  <li>
                    Поддерживающих/донатящих ВСУ или другие
                    запрещённые/террористические структуры
                  </li>
                  <li>С призывами к дискриминации по национальному признаку</li>
                  <li>
                    Пропагандирующих "русофобию" или дискредитирующих ВС РФ
                  </li>
                </ul>
                <p className="text-sm text-red-400 mt-4">
                  <strong>Такие треки блокируются немедленно по жалобе.</strong>{" "}
                  Список "нежелательных" исполнителей ведётся Администрацией.
                </p>
              </div>
            </section>
            {/*  SECTION 6  */}
            <section id="section-6" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                6. Модерация и санкции
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  <strong>Автоматическая модерация:</strong> ключевые слова
                  (может применяться в будущем, сейчас не действует).
                </li>
                <li>
                  <strong>Ручная:</strong> по жалобам пользователей и
                  требованиям РКН.
                </li>
                <li>
                  Санкции:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>1 нарушение = удаление трека + предупреждение</li>
                    <li>2 = временная блокировка (7 дней)</li>
                    <li>3+ = бессрочная блокировка всех сервисов Ancial</li>
                  </ul>
                </li>
                <li>
                  Апелляция:{" "}
                  <a
                    href="mailto:contact@ancial.ru?subject=[Апелляция]"
                    className="text-purple-400"
                  >
                    [Апелляция]
                  </a>{" "}
                  (5 дней).
                </li>
              </ol>
            </section>
            <section id="section-8" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-red-500 pl-4 mb-4">
                7. Запрещённые исполнители в Pulse
              </h2>
              <p className="mb-4">
                Этот список генерируется автоматически на базе искуственного
                интеллекта с доступом к актуальной информации и соцсетям, может
                быть неполным или устаревшим, содержать неточности.
                <br />
                Если вы считаете, что какой-то исполнитель ошибочно попал в этот
                список, пожалуйста, свяжитесь с нами через
                <a
                  href="mailto:contact@ancial.ru?subject=[Запрещённый исполнитель]"
                  className="text-purple-400"
                >
                  contact@ancial.ru
                </a>
                с указанием имени исполнителя и причины, по которой вы считаете
                его ошибочно включённым.
                <br />
                Мы рассмотрим ваше обращение и при необходимости внесём
                изменения.
              </p>
              <div className="overflow-auto w-full h-full relative rounded-3xl border border-red-800">
                <table className="w-full text-sm text-zinc-300 border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-red-900/50 to-red-800/50 border-b border-red-600/50">
                      <th className="p-3 text-left font-semibold text-red-200 border-r border-red-500/30">
                        Исполнитель
                      </th>
                      <th className="p-3 text-left font-semibold text-red-200 border-r border-red-500/30">
                        Причина
                      </th>
                      <th className="p-3 text-left font-semibold text-red-200 w-48">
                        Статус
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/*  Российские  */}
                    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
                      <td className="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">
                        Земфира (Рамазанова)
                      </td>
                      <td className="p-3 text-amber-300 border-r border-zinc-600/50">
                        Сборы для ВСУ, иноагент Минюста РФ
                      </td>
                      <td className="p-3">
                        <span className="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">
                          Публикация запрещена
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
                      <td className="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">
                        Рената Литвинова
                      </td>
                      <td className="p-3 text-amber-300 border-r border-zinc-600/50">
                        Сборы для ВСУ
                      </td>
                      <td className="p-3">
                        <span className="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">
                          Публикация запрещена
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
                      <td className="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">
                        Артём Смольянинов
                      </td>
                      <td className="p-3 text-amber-300 border-r border-zinc-600/50">
                        Сборы для ВСУ
                      </td>
                      <td className="p-3">
                        <span className="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">
                          Публикация запрещена
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
                      <td className="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">
                        Юрий Шевчук (ДДТ)
                      </td>
                      <td className="p-3 text-amber-300 border-r border-zinc-600/50">
                        Сборы для ВСУ
                      </td>
                      <td className="p-3">
                        <span className="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">
                          Публикация запрещена
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
                      <td className="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">
                        Максим Покровский ("Ногу свело!")
                      </td>
                      <td className="p-3 text-amber-300 border-r border-zinc-600/50">
                        Сборы для ВСУ
                      </td>
                      <td className="p-3">
                        <span className="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">
                          Публикация запрещена
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
                      <td className="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">
                        Татьяна Лазарева
                      </td>
                      <td className="p-3 text-amber-300 border-r border-zinc-600/50">
                        Сборы для ВСУ
                      </td>
                      <td className="p-3">
                        <span className="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">
                          Публикация запрещена
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
                      <td className="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">
                        Алексей Кортнев
                      </td>
                      <td className="p-3 text-amber-300 border-r border-zinc-600/50">
                        Публичная поддержка Украины против РФ
                      </td>
                      <td className="p-3">
                        <span className="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">
                          Публикация запрещена
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
                      <td className="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">
                        Моргенштерн
                      </td>
                      <td className="p-3 text-amber-300 border-r border-zinc-600/50">
                        Иноагент Минюста РФ
                      </td>
                      <td className="p-3">
                        <span className="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">
                          Публикация запрещена
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
                      <td className="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">
                        Oxxxymiron
                      </td>
                      <td className="p-3 text-amber-300 border-r border-zinc-600/50">
                        "Антивоенные"/Проукраинские концерты, поддержка Украины,
                        иноагент Минюста РФ
                      </td>
                      <td className="p-3">
                        <span className="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">
                          Публикация запрещена
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
                      <td className="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">
                        Монеточка / NoizeMC
                      </td>
                      <td className="p-3 text-amber-300 border-r border-zinc-600/50">
                        "Антивоенные"/Проукраинские концерты, поддержка Украины,
                        иноагент Минюста РФ
                      </td>
                      <td className="p-3">
                        <span className="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">
                          Публикация запрещена
                        </span>
                      </td>
                    </tr>
                    {/*  Украинские  */}
                    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
                      <td className="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">
                        Андрей Хлывнюк ("Бумбокс")
                      </td>
                      <td className="p-3 text-amber-300 border-r border-zinc-600/50">
                        Служит в ВСУ, оператор БПЛА
                      </td>
                      <td className="p-3">
                        <span className="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">
                          Публикация запрещена
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50 transition-all duration-200">
                      <td className="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">
                        Макс Барских
                      </td>
                      <td className="p-3 text-amber-300 border-r border-zinc-600/50">
                        Вступил в ВСУ, запретил музыку в РФ
                      </td>
                      <td className="p-3">
                        <span className="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">
                          Публикация запрещена
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-zinc-800/50 transition-all duration-200">
                      <td className="p-3 font-medium text-zinc-200 border-r border-zinc-600/50">
                        Потап
                      </td>
                      <td className="p-3 text-amber-300 border-r border-zinc-600/50">
                        Донаты ВСУ
                      </td>
                      <td className="p-3">
                        <span className="bg-red-900/50 text-red-200 px-2 py-1 rounded-full text-xs font-bold">
                          Публикация запрещена
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            {/*  SECTION 7  */}
            <section id="section-7" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-amber-500 pl-4 mb-4">
                8. Контакты для властей и пользователей
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-amber-900/30 border border-amber-800 p-4 rounded-3xl">
                  <h3 className="font-semibold text-amber-300 mb-2">
                    [Копирайт]
                  </h3>
                  <a
                    href="mailto:contact@ancial.ru?subject=[Копирайт]"
                    className="text-amber-200"
                  >
                    [Копирайт]
                  </a>
                  <p className="text-amber-400 text-sm mt-1">
                    Авторские права, DMCA
                  </p>
                </div>
                <div className="bg-amber-900/30 border border-amber-800 p-4 rounded-3xl">
                  <h3 className="font-semibold text-amber-300 mb-2">
                    [Пропаганда]
                  </h3>
                  <a
                    href="mailto:contact@ancial.ru?subject=[Пропаганда]"
                    className="text-amber-200"
                  >
                    [Пропаганда]
                  </a>
                  <p className="text-amber-400 text-sm mt-1">
                    Наркотики, экстремизм, политика
                  </p>
                </div>
                <div className="bg-amber-900/30 border border-amber-800 p-4 rounded-3xl">
                  <h3 className="font-semibold text-amber-300 mb-2">
                    [Жалоба]
                  </h3>
                  <a
                    href="mailto:contact@ancial.ru?subject=[Жалоба]"
                    className="text-amber-200"
                  >
                    [Жалоба]
                  </a>
                  <p className="text-amber-400 text-sm mt-1">Общие нарушения</p>
                </div>
                <div className="bg-amber-900/30 border border-amber-800 p-4 rounded-3xl">
                  <h3 className="font-semibold text-amber-300 mb-2">
                    [Апелляция]
                  </h3>
                  <a
                    href="mailto:contact@ancial.ru?subject=[Апелляция]"
                    className="text-amber-200"
                  >
                    [Апелляция]
                  </a>
                  <p className="text-amber-400 text-sm mt-1">
                    Оспорить блокировку
                  </p>
                </div>
              </div>
              <div className="mt-8 p-6 bg-zinc-900 rounded-3xl border border-zinc-700">
                <p className="text-sm">
                  Полная версия правил:
                  <a
                    href="https://ancial.ru/about/legal"
                    className="text-purple-400 hover:text-purple-300 underline font-medium"
                  >
                    ancial.ru/about/legal
                  </a>
                </p>
              </div>
            </section>
            {/*  FOOTER  */}
            <footer className="text-center py-8 text-zinc-500 text-sm border-t border-zinc-800 mt-12">
              <p>© 2026 Ancial Pulse. Все права защищены. Версия 2.0</p>
            </footer>
          </div>
        </div>
      </Modal>

      <Modal
        width="lg"
        isOpen={activeModal === "rules-ru"}
        onClose={() => setActiveModal(null)}
        title="Правила"
        swipeable={true}
      >
        <div
          className="bg-zinc-900 text-zinc-100 rounded-3xl p-3"
          id="rules-ru"
        >
          <div className="container mx-auto py-12 prose prose-invert max-w-4xl">
            {/*  HEADER  */}
            <header className="mb-12 text-center">
              <p className="text-zinc-400 text-lg">
                Актуально с 22.09.2025, версия 1.3
              </p>
              <p className="mt-2">
                <a
                  href="https://ancial.ru/about/legal"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Официальная публикация
                </a>
              </p>
              <div className="mt-6 p-4 bg-zinc-900 rounded-3xl border border-zinc-800">
                <p className="text-sm">
                  <strong>Контакт для обращений:</strong>
                  <a
                    href="mailto:contact@ancial.ru"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    contact@ancial.ru
                  </a>
                  <br />
                  <span className="text-red-400">
                    ❗ Обязательно указывайте тему письма в формате{" "}
                    <code className="email-tag">[ТЕМА]</code>
                  </span>
                </p>
              </div>
            </header>
            {/*  NAVIGATION  */}
            <nav className="mb-12 bg-black/80 backdrop-blur-sm p-4 rounded-3xl border border-zinc-800">
              <h2 className="text-xl font-semibold text-purple-500 mb-3">
                Содержание
              </h2>
              <ul className="space-y-2 text-sm">
                <li>1. Общие положения</li>
                <li>2. Регистрация и аккаунт</li>
                <li>3. Лента (посты)</li>
                <li>4. Чаты (личные и групповые сообщения)</li>
                <li>5. Музыка (Pulse)</li>
                <li>6. Видео (ClickPlay/Stream)</li>
                <li>7. Кошелёк (Wallet) и токены anci</li>
                <li>8. Авторские права и жалобы</li>
                <li>9. Запрещённое поведение и санкции</li>
                <li>10. Конфиденциальность и данные</li>
                <li>11. Модерация и апелляции</li>
                <li>12. Изменения правил и юридические аспекты</li>
                <li>13. Сообщества и группы</li>
                <li>Заключение</li>
              </ul>
            </nav>
            {/*  SECTION 1  */}
            <section id="section-1" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                1. Общие положения
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Настоящие Правила регулируют отношения между Пользователями и
                  Администрацией платформы Ancial (зарегистрированной в
                  Российской Федерации), предоставляющей доступ к сервисам:
                  Лента (посты с медиа), Чаты (личные и групповые сообщения),
                  Pulse (музыкальный раздел), ClickPlay/Stream (видеоагрегатор),
                  Wallet (кошелёк с токенами anci), Сообщества и группы (раздел
                  13).
                </li>
                <li>
                  Используя любой из сервисов Ancial, Пользователь безоговорочно
                  принимает настоящие Правила, Политику конфиденциальности и
                  иные официальные документы платформы.
                </li>
                <li>
                  Администрация оставляет за собой право в одностороннем порядке
                  изменять Правила. Изменения публикуются на
                  https://ancial.ru/about/legal и вступают в силу через 7 (семь)
                  календарных дней. Продолжение использования платформы после
                  вступления изменений в силу означает их принятие.
                </li>
                <li>
                  Платформа функционирует в соответствии с законодательством
                  Российской Федерации, а также учитывает международные
                  стандарты (включая GDPR для пользователей ЕС). В случае
                  противоречий — приоритет имеют законы РФ.
                </li>
                <li>
                  Минимальный возраст для регистрации и использования платформы
                  — 14 лет.
                  <br />❗ Платформа может содержать контент, предназначенный
                  для пользователей старше 18 лет. Пользователи младше 18 лет
                  обязаны использовать платформу под контролем родителей или
                  законных представителей.
                </li>
              </ol>
            </section>
            {/*  SECTION 2  */}
            <section id="section-2" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                2. Регистрация и аккаунт
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Для регистрации требуется указать: действующий email и/или
                  номер телефона; придумать уникальный логин; установить
                  надёжный пароль.
                </li>
                <li>
                  Для подтверждения email и/или номера телефона, а также для
                  удобного входа на платформу, Пользователь может привязать
                  аккаунт Telegram или Yandex.
                  <br />
                  Привязка позволяет:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>подтвердить контактные данные (email/телефон);</li>
                    <li>
                      авторизовываться на платформе через Telegram или Yandex
                      без ввода логина/пароля.
                    </li>
                  </ul>
                </li>
                <li>
                  Пользователь обязан:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>предоставлять достоверную информацию;</li>
                    <li>
                      не регистрировать несколько аккаунтов без согласования с
                      Администрацией;
                    </li>
                    <li>не передавать доступ к аккаунту третьим лицам;</li>
                    <li>
                      немедленно уведомлять contact@ancial.ru (с темой
                      [Безопасность]) о взломе или несанкционированном доступе.
                    </li>
                  </ul>
                </li>
                <li>
                  Администрация вправе:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>отказать в регистрации без объяснения причин;</li>
                    <li>
                      заблокировать или удалить аккаунт при нарушении Правил;
                    </li>
                    <li>
                      потребовать верификацию личности (например, подтверждение
                      email/телефона) при подозрении на мошенничество, спам или
                      нарушения.
                    </li>
                  </ul>
                </li>
                <li>
                  При удалении аккаунта по запросу пользователя (письмо на
                  contact@ancial.ru с темой [Удаление аккаунта]):
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>
                      все данные (посты, сообщения, медиа, подписки) удаляются
                      безвозвратно;
                    </li>
                    <li>
                      токены anci аннулируются и не подлежат восстановлению или
                      выводу;
                    </li>
                    <li>процесс удаления занимает до 30 дней.</li>
                  </ul>
                </li>
                <li>
                  Двухфакторная аутентификация на платформе отсутствует.
                  Рекомендуется использовать привязку Telegram или Yandex для
                  повышения безопасности и удобства входа.
                </li>
              </ol>
            </section>
            {/*  SECTION 3  */}
            <section id="section-3" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                3. Лента (посты)
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Пользователь может публиковать посты от своего имени или от
                  имени Сообщества, где он имеет статус Создателя или Редактора.
                </li>
                <li>
                  Запрещено публиковать в Ленте:
                  <div className="bg-red-900/30 border border-red-800 p-4 rounded-3xl mt-3 mb-3">
                    <ul className="list-disc ml-6 space-y-1 text-red-100">
                      <li>
                        Порнографический, эротический или сексуально откровенный
                        контент;
                      </li>
                      <li>
                        Контент, изображающий насилие, жестокость, причинение
                        вреда людям или животным;
                      </li>
                      <li>
                        Оскорбления, угрозы, доксинг (публикация личных данных
                        без согласия), клевета;
                      </li>
                      <li>
                        Призывы к насилию, экстремизму, терроризму, разжиганию
                        ненависти по любым признакам;
                      </li>
                      <li>Спам, флуд, накрутка, бот-активность;</li>
                      <li>
                        Фейковые новости, дезинформация, способная причинить
                        вред (например, в сфере здоровья, безопасности);
                      </li>
                      <li>
                        Контент, нарушающий авторские права (см. раздел 8);
                      </li>
                      <li>
                        Пропаганду наркотиков, самоубийств, опасных практик.
                      </li>
                    </ul>
                  </div>
                </li>
                <li>
                  Контент может содержать обсуждение любых тем (политика,
                  религия, общество и т.д.), если это делается без оскорблений,
                  угроз и разжигания вражды.
                </li>
                <li>
                  Администрация не модерирует Ленту превентивно, но реагирует на
                  жалобы пользователей и удаляет нарушающий контент.
                  Пользователь, опубликовавший запрещённый материал, может быть
                  заблокирован без предупреждения.
                </li>
              </ol>
            </section>
            {/*  SECTION 4  */}
            <section id="section-4" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                4. Чаты (личные и групповые сообщения)
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Чаты предназначены для личного общения между пользователями.
                  Администрация не модерирует чаты в реальном времени и не
                  хранит переписки, за исключением случаев расследования жалоб
                  или запросов правоохранительных органов.
                </li>
                <li>
                  Запрещено в чатах:
                  <div className="bg-red-900/30 border border-red-800 p-4 rounded-3xl mt-3 mb-3">
                    <ul className="list-disc ml-6 space-y-1 text-red-100">
                      <li>
                        Отправка спама, флуда, цепочек, мошеннических ссылок;
                      </li>
                      <li>
                        Оскорбления, угрозы, доксинг, сексуальные
                        домогательства;
                      </li>
                      <li>
                        Рассылка порнографии, насилия, запрещённого контента;
                      </li>
                      <li>
                        Использование чатов для координации нарушений Правил
                        (например, рейдов, троллинга).
                      </li>
                    </ul>
                  </div>
                </li>
                <li>
                  При получении жалобы на сообщение в чате — Администрация может
                  запросить логи переписки (если технически доступны) для
                  проверки. При подтверждении нарушения — отправитель
                  блокируется.
                </li>
                <li>
                  Пользователи несут полную ответственность за содержание своих
                  сообщений. Администрация не обязана уведомлять о модерации
                  чатов.
                </li>
              </ol>
            </section>
            {/*  SECTION 5  */}
            <section id="section-5" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                5. Музыка (Pulse)
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Pulse — раздел для загрузки и прослушивания аудиотреков и
                  альбомов. Загрузка доступна зарегистрированным пользователям.
                </li>
                <li>
                  Пользователь, загружающий трек, несёт полную ответственность
                  за соблюдение авторских прав. Администрация не проверяет
                  контент до публикации.
                </li>
                <li>
                  Запрещено загружать в Pulse:
                  <div className="bg-red-900/30 border border-red-800 p-4 rounded-3xl mt-3 mb-3">
                    <ul className="list-disc ml-6 space-y-1 text-red-100">
                      <li>
                        Треки, нарушающие авторские права (без разрешения
                        правообладателя);
                      </li>
                      <li>
                        Аудио с порнографическим, насильственным или
                        экстремистским содержанием;
                      </li>
                      <li>
                        Аудио, содержащие прямые оскорбления, призывы к насилию;
                      </li>
                      <li>Технически неисправные или вредоносные файлы.</li>
                    </ul>
                  </div>
                </li>
                <li>
                  Разрешены:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Оригинальные композиции;</li>
                    <li>
                      Каверы, ремиксы, фан-версии — только при наличии
                      разрешения правообладателя или в рамках добросовестного
                      использования (fair use), если это допускается
                      законодательством страны пользователя.
                    </li>
                  </ul>
                </li>
                <li>
                  При поступлении жалобы от правообладателя (на
                  contact@ancial.ru с темой [Авторские права]) — трек удаляется
                  в течение 72 часов, пользователь получает уведомление.
                  Повторные нарушения ведут к блокировке аккаунта.
                </li>
              </ol>
            </section>
            {/*  SECTION 6  */}
            <section id="section-6" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                6. Видео (ClickPlay/Stream)
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  ClickPlay/Stream — агрегатор видео, позволяющий добавлять
                  ссылки на видео из YouTube, RuTube, VK Video и других
                  публичных платформ. Загрузка файлов напрямую не предусмотрена.
                </li>
                <li>
                  Пользователь, добавляющий видео, подтверждает, что:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>видео является публичным и разрешено к встраиванию;</li>
                    <li>он не нарушает авторские права;</li>
                    <li>контент не содержит запрещённого материала.</li>
                  </ul>
                </li>
                <li>
                  Запрещено добавлять видео, содержащие:
                  <div className="bg-red-900/30 border border-red-800 p-4 rounded-3xl mt-3 mb-3">
                    <ul className="list-disc ml-6 space-y-1 text-red-100">
                      <li>Порнографию, насилие, жестокость;</li>
                      <li>
                        Экстремизм, терроризм, призывы к незаконной
                        деятельности;
                      </li>
                      <li>Оскорбления, доксинг, клевету;</li>
                      <li>Нарушение авторских прав (без разрешения).</li>
                    </ul>
                  </div>
                </li>
                <li>
                  Если видео на исходной платформе (например, YouTube) удалено
                  или заблокировано — оно становится недоступным и на Ancial.
                </li>
                <li>
                  При жалобе правообладателя (на contact@ancial.ru с темой
                  [Авторские права]) — ссылка на видео удаляется в течение 72
                  часов. Пользователь предупреждается. Повторные нарушения —
                  блокировка.
                </li>
              </ol>
            </section>
            {/*  SECTION 7  */}
            <section id="section-7" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                7. Кошелёк (Wallet) и токены anci
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  anci — внутренние виртуальные токены платформы, привязанные к
                  криптовалюте anci в сети TON. Токены не являются деньгами или
                  финансовым инструментом, а предназначены для поощрения
                  активности и взаимодействия внутри платформы.
                </li>
                <li>
                  Получение токенов:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>
                      Только через добровольные пожертвования от других
                      пользователей (например, за понравившийся пост, музыку,
                      видео);
                    </li>
                    <li>Не продаются за реальные деньги;</li>
                    <li>
                      Не начисляются автоматически за регистрацию или
                      активность.
                    </li>
                  </ul>
                </li>
                <li>
                  Использование токенов:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Перевод другим пользователям;</li>
                    <li>
                      Обмен на внутренние поощрения (например: бейджи, стикеры,
                      премиум-функции — если предусмотрены);
                    </li>
                    <li>
                      Вывод на внешний TON-кошелёк (при наличии
                      верифицированного аккаунта и соблюдении лимитов).
                    </li>
                  </ul>
                </li>
                <li>
                  Вывод токенов:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Возможен только на TON-кошельки;</li>
                    <li>
                      Считается «поощерением», а не продажей или переводом
                      денежных средств;
                    </li>
                    <li>
                      Не облагается налогами со стороны платформы — пользователь
                      самостоятельно несёт ответственность перед своим
                      государством при выводе.
                    </li>
                  </ul>
                </li>
                <li>
                  Запрещено:
                  <div className="bg-red-900/30 border border-red-800 p-4 rounded-3xl mt-3 mb-3">
                    <ul className="list-disc ml-6 space-y-1 text-red-100">
                      <li>
                        Использование токенов для покупки запрещённого контента
                        или услуг;
                      </li>
                      <li>
                        Мошенничество, накрутка, спам ради получения токенов;
                      </li>
                      <li>
                        Переводы, имитирующие продажу товаров/услуг (платформа
                        не является маркетплейсом).
                      </li>
                    </ul>
                  </div>
                </li>
                <li>
                  При блокировке аккаунта — все токены аннулируются. При
                  удалении — не возвращаются.
                </li>
                <li>
                  Администрация вправе заморозить кошелёк при подозрении на
                  мошенничество, отмывание, спам или нарушение Правил. Для
                  разморозки — письмо на contact@ancial.ru с темой [Кошелёк].
                </li>
              </ol>
            </section>
            {/*  SECTION 8  */}
            <section id="section-8" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                8. Авторские права и жалобы
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Пользователь гарантирует, что загружаемый им контент (посты,
                  музыка, видео, изображения) не нарушает авторских, смежных,
                  патентных или иных прав третьих лиц.
                </li>
                <li>
                  При обнаружении нарушения — правообладатель может отправить
                  жалобу на contact@ancial.ru с темой [Авторские права] и
                  указанием:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Своих контактных данных;</li>
                    <li>Описания нарушенного произведения;</li>
                    <li>Ссылки на контент на Ancial;</li>
                    <li>Заявления о добросовестности претензии;</li>
                    <li>Подписи (электронной или скан-копии).</li>
                  </ul>
                </li>
                <li>
                  Администрация обязуется рассмотреть жалобу в течение 72 часов
                  и удалить контент при подтверждении нарушения.
                </li>
                <li>
                  Пользователь, чей контент удалён, получает уведомление и может
                  направить контр-уведомление (если считает удаление ошибочным)
                  на contact@ancial.ru с темой [Апелляция — Авторские права].
                </li>
                <li>
                  Повторные нарушения авторских прав ведут к бессрочной
                  блокировке аккаунта.
                </li>
              </ol>
            </section>
            {/*  SECTION 9  */}
            <section id="section-9" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                9. Запрещённое поведение и санкции
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Запрещено:
                  <div className="bg-red-900/30 border border-red-800 p-4 rounded-3xl mt-3 mb-3">
                    <ul className="list-disc ml-6 space-y-1 text-red-100">
                      <li>Создание аккаунтов с целью обхода блокировок;</li>
                      <li>
                        Использование ботов, скриптов, автоматизации без
                        согласия Администрации;
                      </li>
                      <li>Фишинг, мошенничество, сбор данных пользователей;</li>
                      <li>Продажа аккаунтов, токенов, мест в сообществах;</li>
                      <li>
                        Имитация администрации или других пользователей
                        (поддельные аккаунты);
                      </li>
                      <li>Координация массовых атак, рейдов, троллинга.</li>
                    </ul>
                  </div>
                </li>
                <li>
                  Санкции:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>
                      Предупреждение (редко, только в исключительных случаях);
                    </li>
                    <li>
                      Блокировка аккаунта (временная или бессрочная) — основная
                      мера;
                    </li>
                    <li>Удаление контента;</li>
                    <li>Аннулирование токенов;</li>
                    <li>
                      Передача данных в правоохранительные органы — при
                      нарушении закона.
                    </li>
                  </ul>
                </li>
                <li>
                  Блокировка выдаётся немедленно без предварительного
                  предупреждения, за исключением случаев, когда Администрация
                  сочтёт возможным запросить пояснения — письмо на
                  contact@ancial.ru с темой [Пояснение].
                </li>
              </ol>
            </section>
            {/*  SECTION 10  */}
            <section id="section-10" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                10. Конфиденциальность и данные
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Администрация собирает и обрабатывает:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Email, телефон, логин, страну проживания;</li>
                    <li>IP-адрес при регистрации и входе;</li>
                    <li>
                      Данные поведения (просмотры, лайки, переходы) — для
                      улучшения рекомендаций;
                    </li>
                    <li>
                      Файлы (фото, видео, аудио), загруженные пользователем;
                    </li>
                    <li>Переписки — только при расследовании жалоб.</li>
                  </ul>
                </li>
                <li>
                  Данные не продаются третьим лицам. Используются для:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Работы платформы;</li>
                    <li>Модерации;</li>
                    <li>Рассылок (можно отключить);</li>
                    <li>Статистики и улучшения сервиса.</li>
                  </ul>
                </li>
                <li>
                  Пользователь вправе:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>
                      Запросить копию своих данных (contact@ancial.ru с темой
                      [Мои данные]);
                    </li>
                    <li>Удалить аккаунт и данные — см. пункт 2.5.</li>
                  </ul>
                </li>
                <li>
                  Платформа использует cookies и аналогичные технологии.
                  Продолжая использовать сайт — пользователь соглашается с этим.
                </li>
              </ol>
            </section>
            {/*  SECTION 11  */}
            <section id="section-11" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                11. Модерация и апелляции
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Модераторы — сотрудники Администрации. В отдельных случаях
                  могут привлекаться обученные волонтёры под контролем команды.
                </li>
                <li>
                  Жалобы на контент подаются через кнопку «Пожаловаться» под
                  материалом или на contact@ancial.ru с темой [Жалоба на
                  контент].
                </li>
                <li>
                  Решения модераторов окончательны, за исключением случаев,
                  когда пользователь может запросить пересмотр, отправив письмо
                  на contact@ancial.ru с темой [Апелляция] и приложением
                  доказательств.
                </li>
                <li>
                  Апелляция рассматривается в течение 5 рабочих дней. Отказ в
                  восстановлении аккаунта — финальное решение.
                </li>
                <li>
                  Статистика модерации не публикуется регулярно, но может быть
                  раскрыта в годовых отчётах.
                </li>
              </ol>
            </section>
            {/*  SECTION 12  */}
            <section id="section-12" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                12. Изменения правил и юридические аспекты
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Платформа не несёт ответственности за:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>
                      Убытки, вызванные использованием или невозможностью
                      использования сервисов;
                    </li>
                    <li>Действия третьих лиц (включая пользователей);</li>
                    <li>Содержание внешних ссылок и видео (YouTube и др.).</li>
                  </ul>
                </li>
                <li>
                  Все споры разрешаются в соответствии с законодательством
                  Российской Федерации.
                </li>
                <li>
                  В случае признания какого-либо положения Правил
                  недействительным — остальные положения сохраняют силу.
                </li>
                <li>
                  Форс-мажор: Администрация не отвечает за сбои, вызванные
                  обстоятельствами непреодолимой силы (войны, стихийные
                  бедствия, действия властей, хакерские атаки).
                </li>
                <li>
                  Официальная переписка с Администрацией ведётся только через
                  contact@ancial.ru с обязательным указанием темы письма в
                  формате [ТЕМА]. Письма без темы могут быть проигнорированы или
                  обработаны с задержкой.
                </li>
              </ol>
            </section>
            {/*  SECTION 13  */}
            <section id="section-13" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                13. Сообщества и группы
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Сообщества — публичные или частные страницы, созданные
                  пользователями для объединения аудитории по интересам, темам,
                  проектам.
                </li>
                <li>
                  Создатель Сообщества — пользователь, инициировавший его
                  создание. Назначает Редакторов (модераторов) по своему
                  усмотрению.
                </li>
                <li>
                  Права Создателя и Редакторов:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Публикация постов от имени Сообщества;</li>
                    <li>
                      Управление участниками (приглашение, удаление, назначение
                      ролей);
                    </li>
                    <li>Настройка приватности (публичное/частное);</li>
                    <li>
                      Установка правил внутри Сообщества (дополнительных к
                      настоящим Правилам).
                    </li>
                  </ul>
                </li>
                <li>
                  Запрещено в Сообществах:
                  <div className="bg-red-900/30 border border-red-800 p-4 rounded-3xl mt-3 mb-3">
                    <ul className="list-disc ml-6 space-y-1 text-red-100">
                      <li>
                        Публикация контента, запрещённого разделами 3, 5, 6;
                      </li>
                      <li>
                        Создание Сообществ с названиями, имитирующими
                        официальные органы, бренды, администрацию без
                        разрешения;
                      </li>
                      <li>
                        Использование Сообществ для спама, мошенничества, сбора
                        данных;
                      </li>
                      <li>
                        Продажа управления Сообществом или мест в нём за
                        реальные деньги или токены (если не разрешено
                        Администрацией).
                      </li>
                    </ul>
                  </div>
                </li>
                <li>
                  Ответственность за контент в Сообществе несёт Создатель и
                  Редакторы, опубликовавшие материал. При нарушении — удаляется
                  контент, предупреждается или блокируется аккаунт
                  ответственного лица.
                </li>
                <li>
                  Администрация вправе удалить Сообщество без предупреждения при
                  грубом или повторном нарушении Правил.
                </li>
                <li>
                  Пользователи могут жаловаться на контент или действия
                  модераторов Сообщества через кнопку «Пожаловаться» или на
                  contact@ancial.ru с темой [Жалоба на сообщество].
                </li>
                <li>
                  Администрация не обязана модерировать Сообщества превентивно,
                  но реагирует на жалобы.
                </li>
              </ol>
            </section>
            {/*  CONCLUSION  */}
            <section
              id="conclusion"
              className="mb-16 scroll-mt-20 pt-8 border-t border-zinc-800"
            >
              <h2 className="text-3xl font-bold text-zinc-50 mb-6">
                Заключение
              </h2>
              <p className="mb-6">
                Настоящие Правила являются публичной офертой и вступают в силу с
                момента начала использования Платформы Ancial.
                <br />
                Полная версия всегда доступна по адресу:
                <a
                  href="https://ancial.ru/about/legal"
                  className="text-purple-400 hover:text-purple-300 underline font-medium"
                >
                  https://ancial.ru/about/legal
                </a>
              </p>
              <div className="bg-zinc-900 p-6 rounded-3xl border border-purple-800/50">
                <h3 className="text-xl font-semibold text-purple-400 mb-3">
                  ❗ ВАЖНО
                </h3>
                <p>
                  При отправке любого письма на{" "}
                  <strong>contact@ancial.ru</strong> обязательно указывайте тему
                  в формате <code className="email-tag">[ТЕМА]</code>, например:
                </p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <code className="email-tag">[Жалоба на контент]</code>
                  <code className="email-tag">[Авторские права]</code>
                  <code className="email-tag">[Апелляция]</code>
                  <code className="email-tag">[Удаление аккаунта]</code>
                  <code className="email-tag">[Мои данные]</code>
                  <code className="email-tag">[Кошелёк]</code>
                  <code className="email-tag">[Безопасность]</code>
                  <code className="email-tag">[Пояснение]</code>
                  <code className="email-tag">[Жалоба на сообщество]</code>
                </div>
                <p className="mt-4 text-sm text-red-400">
                  Письма без темы могут быть проигнорированы или обработаны с
                  задержкой.
                </p>
              </div>
            </section>
            {/*  FOOTER  */}
            <footer className="text-center py-8 text-zinc-500 text-sm border-t border-zinc-800 mt-12">
              <p>© 2025 Ancial. Все права защищены.</p>
              <p className="mt-2">
                Версия правил: 1.3 | Опубликовано:{" "}
                <a
                  href="https://ancial.ru/about/legal"
                  className="text-purple-400 hover:underline"
                >
                  ancial.ru/about/legal
                </a>
              </p>
            </footer>
          </div>
        </div>
      </Modal>

      <Modal
        width="lg"
        isOpen={activeModal === "rules-en"}
        onClose={() => setActiveModal(null)}
        title="Terms of Service"
        swipeable={true}
      >
        <div
          className="bg-zinc-900 text-zinc-100 rounded-3xl p-3"
          id="rules-en"
        >
          <div className="container mx-auto py-12 prose prose-invert max-w-4xl">
            {/*  HEADER  */}
            <header className="mb-12 text-center">
              <p className="text-zinc-400 text-lg">
                Effective from September 22, 2025, version 1.3
              </p>
              <p className="mt-2">
                <a
                  href="https://ancial.ru/about/legal"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Official Publication
                </a>
              </p>
              <div className="mt-6 p-4 bg-zinc-900 rounded-3xl border border-zinc-800">
                <p className="text-sm">
                  <strong>Contact for inquiries:</strong>
                  <a
                    href="mailto:contact@ancial.ru"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    contact@ancial.ru
                  </a>
                  <br />
                  <span className="text-red-400">
                    ❗ Always specify the subject of the email in the format{" "}
                    <code className="email-tag">[SUBJECT]</code>
                  </span>
                </p>
              </div>
            </header>
            {/*  NAVIGATION  */}
            <nav className="mb-12 bg-black/80 backdrop-blur-sm p-4 rounded-3xl border border-zinc-800">
              <h2 className="text-xl font-semibold text-purple-500 mb-3">
                Table of Contents
              </h2>
              <ul className="space-y-2 text-sm">
                <li>1. General Provisions</li>
                <li>2. Registration and Account</li>
                <li>3. Feed (Posts)</li>
                <li>4. Chats (Private and Group Messages)</li>
                <li>5. Music (Pulse)</li>
                <li>6. Videos (ClickPlay/Stream)</li>
                <li>7. Wallet and anci Tokens</li>
                <li>8. Copyright and Complaints</li>
                <li>9. Prohibited Behavior and Sanctions</li>
                <li>10. Privacy and Data</li>
                <li>11. Moderation and Appeals</li>
                <li>12. Changes to Terms and Legal Aspects</li>
                <li>13. Communities and Groups</li>
                <li>Conclusion</li>
              </ul>
            </nav>
            {/*  SECTION 1  */}
            <section id="section-1" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                1. General Provisions
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  These Terms regulate the relationship between Users and the
                  Administration of the Ancial platform (registered in the
                  Russian Federation), which provides access to the following
                  services: Feed (posts with media), Chats (private and group
                  messages), Pulse (music section), ClickPlay/Stream (video
                  aggregator), Wallet (with anci tokens), Communities and Groups
                  (section 13).
                </li>
                <li>
                  By using any of the Ancial services, the User unconditionally
                  accepts these Terms, Privacy Policy, and other official
                  platform documents.
                </li>
                <li>
                  The Administration reserves the right to unilaterally change
                  the Terms. Changes are published at https://ancial.ru/about/legal
                  and take effect after 7 (seven) calendar days. Continued use
                  of the platform after the changes take effect means acceptance
                  of them.
                </li>
                <li>
                  The platform operates in accordance with the laws of the
                  Russian Federation and also takes into account international
                  standards (including GDPR for EU users). In case of
                  contradictions, Russian laws take priority.
                </li>
                <li>
                  The minimum age for registration and use of the platform is 14
                  years.
                  <br />❗ The platform may contain content intended for users
                  over 18 years of age. Users under 18 years of age must use the
                  platform under the supervision of parents or legal guardians.
                </li>
              </ol>
            </section>
            {/*  SECTION 2  */}
            <section id="section-2" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                2. Registration and Account
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Registration requires: a valid email and/or phone number; a
                  unique username; a secure password.
                </li>
                <li>
                  To verify email and/or phone number, as well as for convenient
                  login to the platform, the User can link their Telegram or
                  Yandex account.
                  <br />
                  Linking allows you to:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>verify contact information (email/phone);</li>
                    <li>
                      log in to the platform via Telegram or Yandex without
                      entering a username/password.
                    </li>
                  </ul>
                </li>
                <li>
                  The User is obliged to:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>provide accurate information;</li>
                    <li>
                      not register multiple accounts without the
                      Administration's consent;
                    </li>
                    <li>
                      not transfer access to the account to third parties;
                    </li>
                    <li>
                      immediately notify contact@ancial.ru (with the subject
                      [Security]) of any hacking or unauthorized access.
                    </li>
                  </ul>
                </li>
                <li>
                  The Administration has the right to:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>refuse registration without explanation;</li>
                    <li>
                      block or delete an account in case of violation of the
                      Terms;
                    </li>
                    <li>
                      require identity verification (for example, email/phone
                      confirmation) in case of suspected fraud, spam, or
                      violations.
                    </li>
                  </ul>
                </li>
                <li>
                  When deleting an account at the user's request (email to
                  contact@ancial.ru with the subject [Account Deletion]):
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>
                      all data (posts, messages, media, subscriptions) are
                      permanently deleted;
                    </li>
                    <li>
                      anci tokens are forfeited and are not subject to recovery
                      or withdrawal;
                    </li>
                    <li>the deletion process takes up to 30 days.</li>
                  </ul>
                </li>
                <li>
                  Two-factor authentication is not available on the platform. It
                  is recommended to use Telegram or Yandex linking to enhance
                  security and login convenience.
                </li>
              </ol>
            </section>
            {/*  SECTION 3  */}
            <section id="section-3" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                3. Feed (Posts)
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  A User can publish posts on their own behalf or on behalf of a
                  Community where they have Creator or Editor status.
                </li>
                <li>
                  It is prohibited to publish in the Feed:
                  <div className="bg-red-900/30 border border-red-800 p-4 rounded-3xl mt-3 mb-3">
                    <ul className="list-disc ml-6 space-y-1 text-red-100">
                      <li>
                        Pornographic, erotic, or sexually explicit content;
                      </li>
                      <li>
                        Content depicting violence, cruelty, harm to people or
                        animals;
                      </li>
                      <li>
                        Insults, threats, doxxing (publishing personal data
                        without consent), defamation;
                      </li>
                      <li>
                        Calls for violence, extremism, terrorism, inciting
                        hatred based on any grounds;
                      </li>
                      <li>
                        Spam, flooding, artificial engagement, bot activity;
                      </li>
                      <li>
                        Fake news, misinformation that can cause harm (for
                        example, in health, safety);
                      </li>
                      <li>Content that violates copyright (see section 8);</li>
                      <li>Promotion of drugs, suicide, dangerous practices.</li>
                    </ul>
                  </div>
                </li>
                <li>
                  Content may contain discussions of any topics (politics,
                  religion, society, etc.) if done without insults, threats, and
                  inciting hostility.
                </li>
                <li>
                  The Administration does not moderate the Feed proactively but
                  responds to user complaints and removes violating content. A
                  User who has published prohibited material may be blocked
                  without warning.
                </li>
              </ol>
            </section>
            {/*  SECTION 4  */}
            <section id="section-4" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                4. Chats (Private and Group Messages)
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Chats are intended for personal communication between users.
                  The Administration does not moderate chats in real-time and
                  does not store correspondence, except in cases of
                  investigating complaints or requests from law enforcement
                  agencies.
                </li>
                <li>
                  Prohibited in chats:
                  <div className="bg-red-900/30 border border-red-800 p-4 rounded-3xl mt-3 mb-3">
                    <ul className="list-disc ml-6 space-y-1 text-red-100">
                      <li>
                        Sending spam, flooding, chain messages, fraudulent
                        links;
                      </li>
                      <li>Insults, threats, doxxing, sexual harassment;</li>
                      <li>
                        Distributing pornography, violence, prohibited content;
                      </li>
                      <li>
                        Using chats to coordinate violations of the Terms (for
                        example, raids, trolling).
                      </li>
                    </ul>
                  </div>
                </li>
                <li>
                  Upon receiving a complaint about a message in a chat, the
                  Administration may request correspondence logs (if technically
                  available) for verification. If the violation is confirmed,
                  the sender is blocked.
                </li>
                <li>
                  Users are fully responsible for the content of their messages.
                  The Administration is not obligated to notify about chat
                  moderation.
                </li>
              </ol>
            </section>
            {/*  SECTION 5  */}
            <section id="section-5" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                5. Music (Pulse)
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Pulse is a section for uploading and listening to audio tracks
                  and albums. Uploading is available to registered users.
                </li>
                <li>
                  The User uploading a track is fully responsible for compliance
                  with copyright. The Administration does not check content
                  before publication.
                </li>
                <li>
                  It is prohibited to upload to Pulse:
                  <div className="bg-red-900/30 border border-red-800 p-4 rounded-3xl mt-3 mb-3">
                    <ul className="list-disc ml-6 space-y-1 text-red-100">
                      <li>
                        Tracks that violate copyright (without the copyright
                        holder's permission);
                      </li>
                      <li>
                        Audio with pornographic, violent, or extremist content;
                      </li>
                      <li>
                        Audio containing direct insults, calls for violence;
                      </li>
                      <li>Technically defective or malicious files.</li>
                    </ul>
                  </div>
                </li>
                <li>
                  Allowed:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Original compositions;</li>
                    <li>
                      Covers, remixes, fan versions — only with the copyright
                      holder's permission or within fair use, if permitted by
                      the user's country's legislation.
                    </li>
                  </ul>
                </li>
                <li>
                  Upon receiving a complaint from a copyright holder (to
                  contact@ancial.ru with the subject [Copyright]), the track is
                  removed within 72 hours, the user is notified. Repeated
                  violations lead to account blocking.
                </li>
              </ol>
            </section>
            {/*  SECTION 6  */}
            <section id="section-6" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                6. Videos (ClickPlay/Stream)
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  ClickPlay/Stream is a video aggregator that allows adding
                  links to videos from YouTube, RuTube, VK Video, and other
                  public platforms. Direct file uploading is not provided.
                </li>
                <li>
                  A User adding a video confirms that:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>the video is public and allowed to be embedded;</li>
                    <li>they do not violate copyright;</li>
                    <li>the content does not contain prohibited material.</li>
                  </ul>
                </li>
                <li>
                  It is prohibited to add videos containing:
                  <div className="bg-red-900/30 border border-red-800 p-4 rounded-3xl mt-3 mb-3">
                    <ul className="list-disc ml-6 space-y-1 text-red-100">
                      <li>Pornography, violence, cruelty;</li>
                      <li>
                        Extremism, terrorism, calls for illegal activities;
                      </li>
                      <li>Insults, doxxing, defamation;</li>
                      <li>Copyright violations (without permission).</li>
                    </ul>
                  </div>
                </li>
                <li>
                  If a video on the original platform (for example, YouTube) is
                  deleted or blocked, it becomes unavailable on Ancial as well.
                </li>
                <li>
                  Upon a copyright holder's complaint (to contact@ancial.ru with
                  the subject [Copyright]), the video link is removed within 72
                  hours. The user is warned. Repeated violations result in
                  blocking.
                </li>
              </ol>
            </section>
            {/*  SECTION 7  */}
            <section id="section-7" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                7. Wallet and anci Tokens
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  anci are internal virtual tokens of the platform, linked to
                  the anci cryptocurrency on the TON network. Tokens are not
                  money or a financial instrument, and are intended to encourage
                  activity and interaction within the platform.
                </li>
                <li>
                  Obtaining tokens:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>
                      Only through voluntary donations from other users (for
                      example, for a liked post, music, video);
                    </li>
                    <li>Not sold for real money;</li>
                    <li>
                      Not automatically awarded for registration or activity.
                    </li>
                  </ul>
                </li>
                <li>
                  Using tokens:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Transfer to other users;</li>
                    <li>
                      Exchange for internal rewards (for example: badges,
                      stickers, premium features — if provided);
                    </li>
                    <li>
                      Withdrawal to an external TON wallet (with a verified
                      account and compliance with limits).
                    </li>
                  </ul>
                </li>
                <li>
                  Token withdrawal:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Only possible to TON wallets;</li>
                    <li>
                      Considered a "reward", not a sale or transfer of funds;
                    </li>
                    <li>
                      Not subject to taxes by the platform — the user is
                      independently responsible to their government upon
                      withdrawal.
                    </li>
                  </ul>
                </li>
                <li>
                  Prohibited:
                  <div className="bg-red-900/30 border border-red-800 p-4 rounded-3xl mt-3 mb-3">
                    <ul className="list-disc ml-6 space-y-1 text-red-100">
                      <li>
                        Using tokens to purchase prohibited content or services;
                      </li>
                      <li>
                        Fraud, artificial engagement, spam for the purpose of
                        obtaining tokens;
                      </li>
                      <li>
                        Transfers simulating the sale of goods/services (the
                        platform is not a marketplace).
                      </li>
                    </ul>
                  </div>
                </li>
                <li>
                  Upon account blocking, all tokens are forfeited. Upon
                  deletion, they are not returned.
                </li>
                <li>
                  The Administration has the right to freeze a wallet in case of
                  suspected fraud, money laundering, spam, or violation of the
                  Terms. To unfreeze, email contact@ancial.ru with the subject
                  [Wallet].
                </li>
              </ol>
            </section>
            {/*  SECTION 8  */}
            <section id="section-8" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                8. Copyright and Complaints
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  The User guarantees that the content they upload (posts,
                  music, videos, images) does not violate copyright, related
                  rights, patent rights, or other rights of third parties.
                </li>
                <li>
                  Upon discovering a violation, the copyright holder may send a
                  complaint to contact@ancial.ru with the subject [Copyright]
                  and include:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Their contact information;</li>
                    <li>Description of the infringed work;</li>
                    <li>Link to the content on Ancial;</li>
                    <li>Statement of good faith of the claim;</li>
                    <li>Signature (electronic or scanned copy).</li>
                  </ul>
                </li>
                <li>
                  The Administration undertakes to review the complaint within
                  72 hours and remove the content upon confirmation of the
                  violation.
                </li>
                <li>
                  A User whose content has been removed receives a notification
                  and may send a counter-notice (if they believe the removal was
                  erroneous) to contact@ancial.ru with the subject [Appeal —
                  Copyright].
                </li>
                <li>
                  Repeated copyright violations lead to permanent account
                  blocking.
                </li>
              </ol>
            </section>
            {/*  SECTION 9  */}
            <section id="section-9" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                9. Prohibited Behavior and Sanctions
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Prohibited:
                  <div className="bg-red-900/30 border border-red-800 p-4 rounded-3xl mt-3 mb-3">
                    <ul className="list-disc ml-6 space-y-1 text-red-100">
                      <li>Creating accounts to bypass blocks;</li>
                      <li>
                        Using bots, scripts, automation without Administration
                        consent;
                      </li>
                      <li>Phishing, fraud, collecting user data;</li>
                      <li>Selling accounts, tokens, places in communities;</li>
                      <li>
                        Impersonating administration or other users (fake
                        accounts);
                      </li>
                      <li>Coordinating mass attacks, raids, trolling.</li>
                    </ul>
                  </div>
                </li>
                <li>
                  Sanctions:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Warning (rare, only in exceptional cases);</li>
                    <li>
                      Account blocking (temporary or permanent) — the main
                      measure;
                    </li>
                    <li>Content removal;</li>
                    <li>Token forfeiture;</li>
                    <li>
                      Data transfer to law enforcement agencies — in case of law
                      violation.
                    </li>
                  </ul>
                </li>
                <li>
                  Blocking is issued immediately without prior warning, except
                  in cases where the Administration deems it possible to request
                  clarifications — email to contact@ancial.ru with the subject
                  [Clarification].
                </li>
              </ol>
            </section>
            {/*  SECTION 10  */}
            <section id="section-10" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                10. Privacy and Data
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  The Administration collects and processes:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Email, phone, username, country of residence;</li>
                    <li>IP address during registration and login;</li>
                    <li>
                      Behavioral data (views, likes, transitions) — to improve
                      recommendations;
                    </li>
                    <li>Files (photos, videos, audio) uploaded by the user;</li>
                    <li>
                      Correspondence — only when investigating complaints.
                    </li>
                  </ul>
                </li>
                <li>
                  Data is not sold to third parties. Used for:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Platform operation;</li>
                    <li>Moderation;</li>
                    <li>Mailings (can be disabled);</li>
                    <li>Statistics and service improvement.</li>
                  </ul>
                </li>
                <li>
                  The User has the right to:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>
                      Request a copy of their data (contact@ancial.ru with the
                      subject [My Data]);
                    </li>
                    <li>Delete account and data — see paragraph 2.5.</li>
                  </ul>
                </li>
                <li>
                  The platform uses cookies and similar technologies. By
                  continuing to use the site, the user agrees to this.
                </li>
              </ol>
            </section>
            {/*  SECTION 11  */}
            <section id="section-11" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                11. Moderation and Appeals
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Moderators are Administration employees. In some cases,
                  trained volunteers may be involved under team supervision.
                </li>
                <li>
                  Complaints about content are submitted through the "Report"
                  button under the material or to contact@ancial.ru with the
                  subject [Content Complaint].
                </li>
                <li>
                  Moderator decisions are final, except in cases where the user
                  can request a review by sending an email to contact@ancial.ru
                  with the subject [Appeal] and attaching evidence.
                </li>
                <li>
                  Appeals are reviewed within 5 business days. Refusal to
                  restore an account is a final decision.
                </li>
                <li>
                  Moderation statistics are not published regularly but may be
                  disclosed in annual reports.
                </li>
              </ol>
            </section>
            {/*  SECTION 12  */}
            <section id="section-12" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                12. Changes to Terms and Legal Aspects
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  The platform is not responsible for:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>
                      Losses caused by the use or inability to use the services;
                    </li>
                    <li>Actions of third parties (including users);</li>
                    <li>
                      Content of external links and videos (YouTube, etc.).
                    </li>
                  </ul>
                </li>
                <li>
                  All disputes are resolved in accordance with the laws of the
                  Russian Federation.
                </li>
                <li>
                  If any provision of the Terms is deemed invalid, the remaining
                  provisions remain in force.
                </li>
                <li>
                  Force majeure: The Administration is not responsible for
                  failures caused by force majeure circumstances (wars, natural
                  disasters, government actions, hacker attacks).
                </li>
                <li>
                  Official correspondence with the Administration is conducted
                  only through contact@ancial.ru with mandatory subject
                  indication in the format [SUBJECT]. Emails without a subject
                  may be ignored or processed with a delay.
                </li>
              </ol>
            </section>
            {/*  SECTION 13  */}
            <section id="section-13" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-50 border-l-4 border-purple-500 pl-4 mb-4">
                13. Communities and Groups
              </h2>
              <ol className="list-decimal list-inside space-y-4">
                <li>
                  Communities are public or private pages created by users to
                  unite an audience by interests, topics, projects.
                </li>
                <li>
                  Community Creator is the user who initiated its creation.
                  Appoints Editors (moderators) at their discretion.
                </li>
                <li>
                  Rights of Creator and Editors:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Publishing posts on behalf of the Community;</li>
                    <li>
                      Managing members (inviting, removing, assigning roles);
                    </li>
                    <li>Setting privacy (public/private);</li>
                    <li>
                      Establishing rules within the Community (additional to
                      these Terms).
                    </li>
                  </ul>
                </li>
                <li>
                  Prohibited in Communities:
                  <div className="bg-red-900/30 border border-red-800 p-4 rounded-3xl mt-3 mb-3">
                    <ul className="list-disc ml-6 space-y-1 text-red-100">
                      <li>
                        Publishing content prohibited by sections 3, 5, 6;
                      </li>
                      <li>
                        Creating Communities with names imitating official
                        bodies, brands, administration without permission;
                      </li>
                      <li>
                        Using Communities for spam, fraud, data collection;
                      </li>
                      <li>
                        Selling Community management or membership for real
                        money or tokens (unless permitted by Administration).
                      </li>
                    </ul>
                  </div>
                </li>
                <li>
                  Responsibility for content in the Community lies with the
                  Creator and Editors who published the material. In case of
                  violation, the content is removed, and the responsible party
                  is warned or blocked.
                </li>
                <li>
                  The Administration has the right to delete a Community without
                  warning in case of gross or repeated violation of the Terms.
                </li>
                <li>
                  Users can complain about content or actions of Community
                  moderators through the "Report" button or to contact@ancial.ru
                  with the subject [Community Complaint].
                </li>
                <li>
                  The Administration is not obligated to moderate Communities
                  proactively but responds to complaints.
                </li>
              </ol>
            </section>
            {/*  CONCLUSION  */}
            <section
              id="conclusion"
              className="mb-16 scroll-mt-20 pt-8 border-t border-zinc-800"
            >
              <h2 className="text-3xl font-bold text-zinc-50 mb-6">
                Conclusion
              </h2>
              <p className="mb-6">
                These Terms constitute a public offer and take effect from the
                moment you start using the Ancial Platform.
                <br />
                The full version is always available at:
                <a
                  href="https://ancial.ru/about/legal"
                  className="text-purple-400 hover:text-purple-300 underline font-medium"
                >
                  https://ancial.ru/about/legal
                </a>
              </p>
              <div className="bg-zinc-900 p-6 rounded-3xl border border-purple-800/50">
                <h3 className="text-xl font-semibold text-purple-400 mb-3">
                  ❗ IMPORTANT
                </h3>
                <p>
                  When sending any email to <strong>contact@ancial.ru</strong>,
                  always specify the subject in the format{" "}
                  <code className="email-tag">[SUBJECT]</code>, for example:
                </p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <code className="email-tag">[Content Complaint]</code>
                  <code className="email-tag">[Copyright]</code>
                  <code className="email-tag">[Appeal]</code>
                  <code className="email-tag">[Account Deletion]</code>
                  <code className="email-tag">[My Data]</code>
                  <code className="email-tag">[Wallet]</code>
                  <code className="email-tag">[Security]</code>
                  <code className="email-tag">[Clarification]</code>
                  <code className="email-tag">[Community Complaint]</code>
                </div>
                <p className="mt-4 text-sm text-red-400">
                  Emails without a subject may be ignored or processed with a
                  delay.
                </p>
              </div>
            </section>
            {/*  FOOTER  */}
            <footer className="text-center py-8 text-zinc-500 text-sm border-t border-zinc-800 mt-12">
              <p>© 2025 Ancial. All rights reserved.</p>
              <p className="mt-2">
                Terms version: 1.3 | Published:{" "}
                <a
                  href="https://ancial.ru/about/legal"
                  className="text-purple-400 hover:underline"
                >
                  ancial.ru/about/legal
                </a>
              </p>
            </footer>
          </div>
        </div>
      </Modal>

      <Modal
        width="lg"
        isOpen={activeModal === "cookie"}
        onClose={() => setActiveModal(null)}
        title="Документ"
        swipeable={true}
      >
        <div className="bg-zinc-900 text-zinc-100 rounded-3xl p-3" id="cookie">
          <div>
            Дата последнего обновления:&nbsp;25.03.2026
            <br />
            <br />
            Продолжая использовать данный веб-сайт без изменения настроек
            браузера, вы выражаете согласие на использование cookie-файлов в
            соответствии с настоящей Политикой. Если вы не согласны с
            использованием файлов cookie, пожалуйста, измените настройки своего
            браузера или прекратите использование сайта.
            <br />
            <br />
            <strong>1. Что такое cookie</strong>
            <br />
            Cookie - это небольшие текстовые файлы, которые сохраняются на вашем
            устройстве при посещении сайта. Они позволяют распознавать вас при
            повторных визитах, сохранять настройки и обеспечивать работу
            определённых функций сайта.
            <br />
            <br />
            <p>Типы cookie-файлов:</p>
            <ul className="list-disc">
              <li>Сеансовые - удаляются после закрытия браузера</li>
              <li>
                Постоянные - хранятся на устройстве до установленного срока
                истечения
              </li>
              <li>
                Сторонние - устанавливаются внешними сервисами и платформами
              </li>
            </ul>
            <p>
              Мы не используем cookie для хранения персональных данных без
              вашего согласия.
              <br />
              <br />
              <strong>2. Цели использования файлов cookie</strong>
              <br />
              Мы используем cookie-файлы и аналогичные технологии для следующих
              целей:
              <br />
              <br />
              Обязательные (критически важные). Необходимы для корректной работы
              сайта:
            </p>
            <ul className="list-disc">
              <li>Хранение содержимого корзины</li>
              <li>Поддержка сессии и авторизации</li>
              <li>
                Сохранение данных, введённых в формах, в течение одного сеанса
              </li>
            </ul>
            <br />
            <p>Функциональные. Улучшают пользовательский опыт:</p>
            <ul className="list-disc">
              <li>Запоминают выбранный язык, регион, другие настройки</li>
              <li>
                Хранят информацию об уже предложенных функциях (например,
                онлайн-чат)
              </li>
            </ul>
            <br />
            <p>
              Аналитические. Используются для сбора статистических данных и
              оптимизации сайта:
            </p>
            <ul className="list-disc">
              <li>Google Analytics, Яндекс.Метрика, Appsflyer и др.</li>
              <li>Анализ пользовательских действий</li>
              <li>
                Подсчёт ошибок, улучшение производительности сайта и интерфейса
              </li>
            </ul>
            <br />
            <p>
              Рекламные и ссылочные
              <br />
              Позволяют оценивать эффективность рекламных кампаний и переходов с
              внешних источников (например, с сайтов партнёров или баннеров).
              <br />
              <br />
              <strong>3. Сторонние cookie</strong>
              <br />
              Некоторые cookie-файлы могут быть установлены сторонними сервисами
              (например, Google, Яндекс, VK, YouTube). Мы не управляем их
              использованием и не контролируем содержание таких cookie. Мы
              рекомендуем ознакомиться с политиками конфиденциальности этих
              сервисов для получения дополнительной информации.
              <br />
              <br />
              Вы можете отказаться от использования сторонних cookie, изменив
              настройки в вашем браузере или воспользовавшись инструментами
              настройки на сайтах соответствующих сервисов.
              <br />
              <br />
              <strong>4. Управление cookie</strong>
              <br />
              Вы можете настроить браузер для блокировки или удаления
              cookie-файлов. Обратите внимание, что отключение cookie может
              повлиять на корректную работу некоторых функций сайта.
              <br />
              <br />
              Если вы используете несколько устройств (например, смартфон и
              компьютер), настройки необходимо изменять отдельно для каждого
              устройства и браузера.
              <br />
              <br />
              <strong>5. Веб-маяки и подобные технологии</strong>
              <br />
              На сайте и в электронных рассылках мы можем использовать веб-маяки
              (однопиксельные изображения), которые позволяют отслеживать
              взаимодействие с контентом. Они работают совместно с cookie и
              могут быть отключены при деактивации cookie или при блокировке
              загрузки изображений в настройках почтовой программы или браузера.
              <br />
              <br />
              <strong>6. Обновление политики</strong>
              <br />
              Актуальная версия настоящей Политики использования файлов cookie
              размещена в сети Интернет по адресу:
              <a
                href="https://ancial.ru/about/legal/"
                target="_blank"
                className="text-blue-500 hover:underline"
              >
                https://ancial.ru/about/legal/
              </a>
              . Мы оставляем за собой право вносить в неё изменения в любое
              время без предварительного уведомления. Обновлённая редакция
              вступает в силу с момента её публикации по указанному адресу.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        width="lg"
        isOpen={activeModal === "bezopasnost"}
        onClose={() => setActiveModal(null)}
        title="Политика обработки персональных данных"
        swipeable={true}
      >
        <div
          className="bg-zinc-900 text-zinc-100 rounded-3xl p-3"
          id="bezopasnost"
        >
          <div>
            <h5>1. Общие положения</h5>
            <br />
            <p>
              Настоящая политика обработки персональных данных составлена в
              соответствии с требованиями Федерального закона от 27.07.2006.
              №152-ФЗ &laquo;О персональных данных&raquo; (далее - Закон о
              персональных данных) и определяет порядок обработки персональных
              данных и меры по обеспечению безопасности персональных данных,
              предпринимаемые&nbsp;ZeniFlow&nbsp;(далее &ndash;
              Оператор).
            </p>
            <br />
            <p>
              1.1. Оператор ставит своей важнейшей целью и условием
              осуществления своей деятельности соблюдение прав и свобод человека
              и гражданина при обработке его персональных данных, в том числе
              защиты прав на неприкосновенность частной жизни, личную и семейную
              тайну.
            </p>
            <br />
            <p>
              1.2. Настоящая политика Оператора в отношении обработки
              персональных данных (далее &ndash; Политика) применяется ко всей
              информации, которую Оператор может получить о посетителях
              веб-сайта&nbsp;
              <span className="text-purple-500">https://ancial.ru</span>.
            </p>
            <br />
            <h5>2. Основные понятия, используемые в Политике</h5>
            <br />
            <p>
              2.1. Автоматизированная обработка персональных данных &ndash;
              обработка персональных данных с помощью средств вычислительной
              техники.
            </p>
            <br />
            <p>
              2.2. Блокирование персональных данных &ndash; временное
              прекращение обработки персональных данных (за исключением случаев,
              если обработка необходима для уточнения персональных данных).
            </p>
            <br />
            <p>
              2.3. Веб-сайт &ndash; совокупность графических и информационных
              материалов, а также программ для ЭВМ и баз данных, обеспечивающих
              их доступность в сети интернет по сетевому адресу&nbsp;
              <span className="text-purple-500">https://ancial.ru</span>.
            </p>
            <br />
            <p>
              2.4. Информационная система персональных данных &mdash;
              совокупность содержащихся в базах данных персональных данных, и
              обеспечивающих их обработку информационных технологий и
              технических средств.
            </p>
            <br />
            <p>
              2.5. Обезличивание персональных данных &mdash; действия, в
              результате которых невозможно определить без использования
              дополнительной информации принадлежность персональных данных
              конкретному Пользователю или иному субъекту персональных данных.
            </p>
            <br />
            <p>
              2.6. Обработка персональных данных &ndash; любое действие
              (операция) или совокупность действий (операций), совершаемых с
              использованием средств автоматизации или без использования таких
              средств с персональными данными, включая сбор, запись,
              систематизацию, накопление, хранение, уточнение (обновление,
              изменение), извлечение, использование, передачу (распространение,
              предоставление, доступ), обезличивание, блокирование, удаление,
              уничтожение персональных данных.
            </p>
            <br />
            <p>
              2.7. Оператор &ndash; государственный орган, муниципальный орган,
              юридическое или физическое лицо, самостоятельно или совместно с
              другими лицами организующие и (или) осуществляющие обработку
              персональных данных, а также определяющие цели обработки
              персональных данных, состав персональных данных, подлежащих
              обработке, действия (операции), совершаемые с персональными
              данными.
            </p>
            <br />
            <p>
              2.8. Персональные данные &ndash; любая информация, относящаяся
              прямо или косвенно к определенному или определяемому Пользователю
              веб-сайта&nbsp;
              <span className="text-purple-500">https://ancial.ru</span>.
            </p>
            <br />
            <p>
              2.9. Персональные данные, разрешенные субъектом персональных
              данных для распространения, - персональные данные, доступ
              неограниченного круга лиц к которым предоставлен субъектом
              персональных данных путем дачи согласия на обработку персональных
              данных, разрешенных субъектом персональных данных для
              распространения в порядке, предусмотренном Законом о персональных
              данных (далее - персональные данные, разрешенные для
              распространения).
            </p>
            <br />
            <p>
              2.10. Пользователь &ndash; любой посетитель веб-сайта&nbsp;
              <span className="text-purple-500">https://ancial.ru</span>.
            </p>
            <br />
            <p>
              2.11. Предоставление персональных данных &ndash; действия,
              направленные на раскрытие персональных данных определенному лицу
              или определенному кругу лиц.
            </p>
            <br />
            <p>
              2.12. Распространение персональных данных &ndash; любые действия,
              направленные на раскрытие персональных данных неопределенному
              кругу лиц (передача персональных данных) или на ознакомление с
              персональными данными неограниченного круга лиц, в том числе
              обнародование персональных данных в средствах массовой информации,
              размещение в информационно-телекоммуникационных сетях или
              предоставление доступа к персональным данным каким-либо иным
              способом.
            </p>
            <br />
            <p>
              2.13. Трансграничная передача персональных данных &ndash; передача
              персональных данных на территорию иностранного государства органу
              власти иностранного государства, иностранному физическому или
              иностранному юридическому лицу.
            </p>
            <br />
            <p>
              2.14. Уничтожение персональных данных &ndash; любые действия, в
              результате которых персональные данные уничтожаются безвозвратно с
              невозможностью дальнейшего восстановления содержания персональных
              данных в информационной системе персональных данных и (или)
              уничтожаются материальные носители персональных данных.
            </p>
            <br />
            <h5>3. Основные права и обязанности Оператора</h5>
            <br />
            <p>3.1. Оператор имеет право:</p>
            <br />
            <p>
              &ndash; получать от субъекта персональных данных достоверные
              информацию и/или документы, содержащие персональные данные;
            </p>
            <p>
              &ndash; в случае отзыва субъектом персональных данных согласия на
              обработку персональных данных Оператор вправе продолжить обработку
              персональных данных без согласия субъекта персональных данных при
              наличии оснований, указанных в Законе о персональных данных;
            </p>
            <p>
              &ndash; самостоятельно определять состав и перечень мер,
              необходимых и достаточных для обеспечения выполнения обязанностей,
              предусмотренных Законом о персональных данных и принятыми в
              соответствии с ним нормативными правовыми актами, если иное не
              предусмотрено Законом о персональных данных или другими
              федеральными законами.
            </p>
            <br />
            <p>3.2. Оператор обязан:</p>
            <br />
            <p>
              &ndash; предоставлять субъекту персональных данных по его просьбе
              информацию, касающуюся обработки его персональных данных;
            </p>
            <p>
              &ndash; организовывать обработку персональных данных в порядке,
              установленном действующим законодательством РФ;
            </p>
            <p>
              &ndash; отвечать на обращения и запросы субъектов персональных
              данных и их законных представителей в соответствии с требованиями
              Закона о персональных данных;
            </p>
            <p>
              &ndash; сообщать в уполномоченный орган по защите прав субъектов
              персональных данных по запросу этого органа необходимую информацию
              в течение 30 дней с даты получения такого запроса;
            </p>
            <p>
              &ndash; публиковать или иным образом обеспечивать неограниченный
              доступ к настоящей Политике в отношении обработки персональных
              данных;
            </p>
            <p>
              &ndash; принимать правовые, организационные и технические меры для
              защиты персональных данных от неправомерного или случайного
              доступа к ним, уничтожения, изменения, блокирования, копирования,
              предоставления, распространения персональных данных, а также от
              иных неправомерных действий в отношении персональных данных;
            </p>
            <p>
              &ndash; прекратить передачу (распространение, предоставление,
              доступ) персональных данных, прекратить обработку и уничтожить
              персональные данные в порядке и случаях, предусмотренных Законом о
              персональных данных;
            </p>
            <p>
              &ndash; исполнять иные обязанности, предусмотренные Законом о
              персональных данных.
            </p>
            <br />
            <h5>
              4. Основные права и обязанности субъектов персональных данных
            </h5>
            <br />
            <p>4.1. Субъекты персональных данных имеют право:</p>
            <br />
            <p>
              &ndash; получать информацию, касающуюся обработки его персональных
              данных, за исключением случаев, предусмотренных федеральными
              законами. Сведения предоставляются субъекту персональных данных
              Оператором в доступной форме, и в них не должны содержаться
              персональные данные, относящиеся к другим субъектам персональных
              данных, за исключением случаев, когда имеются законные основания
              для раскрытия таких персональных данных. Перечень информации и
              порядок ее получения установлен Законом о персональных данных;
            </p>
            <p>
              &ndash; требовать от оператора уточнения его персональных данных,
              их блокирования или уничтожения в случае, если персональные данные
              являются неполными, устаревшими, неточными, незаконно полученными
              или не являются необходимыми для заявленной цели обработки, а
              также принимать предусмотренные законом меры по защите своих прав;
            </p>
            <p>
              &ndash; выдвигать условие предварительного согласия при обработке
              персональных данных в целях продвижения на рынке товаров, работ и
              услуг;
            </p>
            <p>&ndash; на отзыв согласия на обработку персональных данных;</p>
            <p>
              &ndash; обжаловать в уполномоченный орган по защите прав субъектов
              персональных данных или в судебном порядке неправомерные действия
              или бездействие Оператора при обработке его персональных данных;
            </p>
            <p>
              &ndash; на осуществление иных прав, предусмотренных
              законодательством РФ.
            </p>
            <br />
            <p>4.2. Субъекты персональных данных обязаны:</p>
            <br />
            <p>&ndash; предоставлять Оператору достоверные данные о себе;</p>
            <p>
              &ndash; сообщать Оператору об уточнении (обновлении, изменении)
              своих персональных данных.
            </p>
            <br />
            <p>
              4.3. Лица, передавшие Оператору недостоверные сведения о себе,
              либо сведения о другом субъекте персональных данных без согласия
              последнего, несут ответственность в соответствии с
              законодательством РФ.
            </p>
            <br />
            <h5>
              5. Оператор может обрабатывать следующие персональные данные
              Пользователя
            </h5>
            <br />
            <p>5.1.&nbsp;Фамилия, имя, отчество.</p>
            <br />
            <p>5.2.&nbsp;Электронный адрес.</p>
            <br />
            <p>5.3.&nbsp;Номера телефонов.</p>
            <br />
            <p>5.4.&nbsp;Год, месяц, дата и место рождения.</p>
            <br />
            <p>5.5.&nbsp;Фотографии.</p>
            <br />
            <p>
              5.6. Также на сайте происходит сбор и обработка обезличенных
              данных о посетителях (в т.ч. файлов &laquo;cookie&raquo;) с
              помощью сервисов интернет-статистики (Яндекс Метрика и Гугл
              Аналитика и других).
            </p>
            <br />
            <p>
              5.7. Вышеперечисленные данные далее по тексту Политики объединены
              общим понятием Персональные данные.
            </p>
            <br />
            <p>
              5.8. Обработка специальных категорий персональных данных,
              касающихся расовой, национальной принадлежности, политических
              взглядов, религиозных или философских убеждений, интимной жизни,
              Оператором не осуществляется.
            </p>
            <br />
            <p>
              5.9. Обработка персональных данных, разрешенных для
              распространения, из числа специальных категорий персональных
              данных, указанных в ч. 1 ст. 10 Закона о персональных данных,
              допускается, если соблюдаются запреты и условия, предусмотренные
              ст. 10.1 Закона о персональных данных.
            </p>
            <br />
            <p>
              5.10. Согласие Пользователя на обработку персональных данных,
              разрешенных для распространения, оформляется отдельно от других
              согласий на обработку его персональных данных. При этом
              соблюдаются условия, предусмотренные, в частности, ст. 10.1 Закона
              о персональных данных. Требования к содержанию такого согласия
              устанавливаются уполномоченным органом по защите прав субъектов
              персональных данных.
            </p>
            <br />
            <p>
              5.10.1 Согласие на обработку персональных данных, разрешенных для
              распространения, Пользователь предоставляет Оператору
              непосредственно.
            </p>
            <br />
            <p>
              5.10.2 Оператор обязан в срок не позднее трех рабочих дней с
              момента получения указанного согласия Пользователя опубликовать
              информацию об условиях обработки, о наличии запретов и условий на
              обработку неограниченным кругом лиц персональных данных,
              разрешенных для распространения.
            </p>
            <br />
            <p>
              5.10.3 Передача (распространение, предоставление, доступ)
              персональных данных, разрешенных субъектом персональных данных для
              распространения, должна быть прекращена в любое время по
              требованию субъекта персональных данных. Данное требование должно
              включать в себя фамилию, имя, отчество (при наличии), контактную
              информацию (номер телефона, адрес электронной почты или почтовый
              адрес) субъекта персональных данных, а также перечень персональных
              данных, обработка которых подлежит прекращению. Указанные в данном
              требовании персональные данные могут обрабатываться только
              Оператором, которому оно направлено.
            </p>
            <br />
            <p>
              5.10.4 Согласие на обработку персональных данных, разрешенных для
              распространения, прекращает свое действие с момента поступления
              Оператору требования, указанного в п. 5.10.3 настоящей Политики в
              отношении обработки персональных данных.
            </p>
            <br />
            <h5>6. Принципы обработки персональных данных</h5>
            <br />
            <p>
              6.1. Обработка персональных данных осуществляется на законной и
              справедливой основе.
            </p>
            <br />
            <p>
              6.2. Обработка персональных данных ограничивается достижением
              конкретных, заранее определенных и законных целей. Не допускается
              обработка персональных данных, несовместимая с целями сбора
              персональных данных.
            </p>
            <br />
            <p>
              6.3. Не допускается объединение баз данных, содержащих
              персональные данные, обработка которых осуществляется в целях,
              несовместимых между собой.
            </p>
            <br />
            <p>
              6.4. Обработке подлежат только персональные данные, которые
              отвечают целям их обработки.
            </p>
            <br />
            <p>
              6.5. Содержание и объем обрабатываемых персональных данных
              соответствуют заявленным целям обработки. Не допускается
              избыточность обрабатываемых персональных данных по отношению к
              заявленным целям их обработки.
            </p>
            <br />
            <p>
              6.6. При обработке персональных данных обеспечивается точность
              персональных данных, их достаточность, а в необходимых случаях и
              актуальность по отношению к целям обработки персональных данных.
              Оператор принимает необходимые меры и/или обеспечивает их принятие
              по удалению или уточнению неполных или неточных данных.
            </p>
            <br />
            <p>
              6.7. Хранение персональных данных осуществляется в форме,
              позволяющей определить субъекта персональных данных, не дольше,
              чем этого требуют цели обработки персональных данных, если срок
              хранения персональных данных не установлен федеральным законом,
              договором, стороной которого, выгодоприобретателем или поручителем
              по которому является субъект персональных данных. Обрабатываемые
              персональные данные уничтожаются либо обезличиваются по достижении
              целей обработки или в случае утраты необходимости в достижении
              этих целей, если иное не предусмотрено федеральным законом.
            </p>
            <br />
            <h5>7. Цели обработки персональных данных</h5>
            <br />
            <p>7.1. Цель обработки персональных данных Пользователя:</p>
            <br />
            <p>
              &ndash;&nbsp;информирование Пользователя посредством отправки
              электронных писем;
            </p>
            <p>
              &ndash;&nbsp;предоставление доступа Пользователю к сервисам,
              информации и/или материалам, содержащимся на веб-сайте{" "}
              <span className="text-purple-500">https://ancial.ru</span>.
            </p>
            <br />
            <p>
              7.2. Также Оператор имеет право направлять Пользователю
              уведомления о новых продуктах и услугах, специальных предложениях
              и различных событиях. Пользователь всегда может отказаться от
              получения информационных сообщений, направив Оператору письмо на
              адрес электронной почты&nbsp;contact@ancial.ru&nbsp;с пометкой
              &laquo;Отказ от уведомлений о новых продуктах и услугах и
              специальных предложениях&raquo;.
            </p>
            <br />
            <p>
              7.3. Обезличенные данные Пользователей, собираемые с помощью
              сервисов интернет-статистики, служат для сбора информации о
              действиях Пользователей на сайте, улучшения качества сайта и его
              содержания.
            </p>
            <br />
            <h5>8. Правовые основания обработки персональных данных</h5>
            <br />
            <p>
              8.1. Правовыми основаниями обработки персональных данных
              Оператором являются:
            </p>
            <br />
            <p>&ndash;&nbsp;уставные (учредительные) документы Оператора;</p>
            <p>
              &ndash;&nbsp;договоры, заключаемые между оператором и субъектом
              персональных данных;
            </p>
            <p>
              &ndash; федеральные законы, иные нормативно-правовые акты в сфере
              защиты персональных данных;
            </p>
            <p>
              &ndash; согласия Пользователей на обработку их персональных
              данных, на обработку персональных данных, разрешенных для
              распространения.
            </p>
            <br />
            <p>
              8.2. Оператор обрабатывает персональные данные Пользователя только
              в случае их заполнения и/или отправки Пользователем самостоятельно
              через специальные формы, расположенные на сайте&nbsp;
              <span className="text-purple-500">https://ancial.ru</span>
              &nbsp;или направленные Оператору посредством электронной почты.
              Заполняя соответствующие формы и/или отправляя свои персональные
              данные Оператору, Пользователь выражает свое согласие с данной
              Политикой.
            </p>
            <br />
            <p>
              8.3. Оператор обрабатывает обезличенные данные о Пользователе в
              случае, если это разрешено в настройках браузера Пользователя
              (включено сохранение файлов &laquo;cookie&raquo; и использование
              технологии JavaScript).
            </p>
            <br />
            <p>
              8.4. Субъект персональных данных самостоятельно принимает решение
              о предоставлении его персональных данных и дает согласие свободно,
              своей волей и в своем интересе.
            </p>
            <br />
            <h5>9. Условия обработки персональных данных</h5>
            <br />
            <p>
              9.1. Обработка персональных данных осуществляется с согласия
              субъекта персональных данных на обработку его персональных данных.
            </p>
            <br />
            <p>
              9.2. Обработка персональных данных необходима для достижения
              целей, предусмотренных международным договором Российской
              Федерации или законом, для осуществления возложенных
              законодательством Российской Федерации на оператора функций,
              полномочий и обязанностей.
            </p>
            <br />
            <p>
              9.3. Обработка персональных данных необходима для осуществления
              правосудия, исполнения судебного акта, акта другого органа или
              должностного лица, подлежащих исполнению в соответствии с
              законодательством Российской Федерации об исполнительном
              производстве.
            </p>
            <br />
            <p>
              9.4. Обработка персональных данных необходима для исполнения
              договора, стороной которого либо выгодоприобретателем или
              поручителем по которому является субъект персональных данных, а
              также для заключения договора по инициативе субъекта персональных
              данных или договора, по которому субъект персональных данных будет
              являться выгодоприобретателем или поручителем.
            </p>
            <br />
            <p>
              9.5. Обработка персональных данных необходима для осуществления
              прав и законных интересов оператора или третьих лиц либо для
              достижения общественно значимых целей при условии, что при этом не
              нарушаются права и свободы субъекта персональных данных.
            </p>
            <br />
            <p>
              9.6. Осуществляется обработка персональных данных, доступ
              неограниченного круга лиц к которым предоставлен субъектом
              персональных данных либо по его просьбе (далее &ndash;
              общедоступные персональные данные).
            </p>
            <br />
            <p>
              9.7. Осуществляется обработка персональных данных, подлежащих
              опубликованию или обязательному раскрытию в соответствии с
              федеральным законом.
            </p>
            <br />
            <h5>
              10. Порядок сбора, хранения, передачи и других видов обработки
              персональных данных
            </h5>
            <br />
            <p>
              Безопасность персональных данных, которые обрабатываются
              Оператором, обеспечивается путем реализации правовых,
              организационных и технических мер, необходимых для выполнения в
              полном объеме требований действующего законодательства в области
              защиты персональных данных.
            </p>
            <br />
            <p>
              10.1. Оператор обеспечивает сохранность персональных данных и
              принимает все возможные меры, исключающие доступ к персональным
              данным неуполномоченных лиц.
            </p>
            <br />
            <p>
              10.2. Персональные данные Пользователя никогда, ни при каких
              условиях не будут переданы третьим лицам, за исключением случаев,
              связанных с исполнением действующего законодательства либо в
              случае, если субъектом персональных данных дано согласие Оператору
              на передачу данных третьему лицу для исполнения обязательств по
              гражданско-правовому договору.
            </p>
            <br />
            <p>
              10.3. В случае выявления неточностей в персональных данных,
              Пользователь может актуализировать их самостоятельно, путем
              направления Оператору уведомление на адрес электронной почты
              Оператора&nbsp;
              <span className="text-purple-500">contact@ancial.ru</span>&nbsp;с
              пометкой &laquo;Актуализация персональных данных&raquo;.
            </p>
            <br />
            <p>
              10.4. Срок обработки персональных данных определяется достижением
              целей, для которых были собраны персональные данные, если иной
              срок не предусмотрен договором или действующим законодательством.
              <br />
              Пользователь может в любой момент отозвать свое согласие на
              обработку персональных данных, направив Оператору уведомление
              посредством электронной почты на электронный адрес Оператора&nbsp;
              <span className="text-purple-500">contact@ancial.ru</span>&nbsp;с
              пометкой &laquo;Отзыв согласия на обработку персональных
              данных&raquo;.
            </p>
            <br />
            <p>
              10.5. Вся информация, которая собирается сторонними сервисами, в
              том числе платежными системами, средствами связи и другими
              поставщиками услуг, хранится и обрабатывается указанными лицами
              (Операторами) в соответствии с их Пользовательским соглашением и
              Политикой конфиденциальности. Субъект персональных данных и/или
              Пользователь обязан самостоятельно своевременно ознакомиться с
              указанными документами. Оператор не несет ответственность за
              действия третьих лиц, в том числе указанных в настоящем пункте
              поставщиков услуг.
            </p>
            <br />
            <p>
              10.6. Установленные субъектом персональных данных запреты на
              передачу (кроме предоставления доступа), а также на обработку или
              условия обработки (кроме получения доступа) персональных данных,
              разрешенных для распространения, не действуют в случаях обработки
              персональных данных в государственных, общественных и иных
              публичных интересах, определенных законодательством РФ.
            </p>
            <br />
            <p>
              10.7. Оператор при обработке персональных данных обеспечивает
              конфиденциальность персональных данных.
            </p>
            <br />
            <p>
              10.8. Оператор осуществляет хранение персональных данных в форме,
              позволяющей определить субъекта персональных данных, не дольше,
              чем этого требуют цели обработки персональных данных, если срок
              хранения персональных данных не установлен федеральным законом,
              договором, стороной которого, выгодоприобретателем или поручителем
              по которому является субъект персональных данных.
            </p>
            <br />
            <p>
              10.9. Условием прекращения обработки персональных данных может
              являться достижение целей обработки персональных данных, истечение
              срока действия согласия субъекта персональных данных или отзыв
              согласия субъектом персональных данных, а также выявление
              неправомерной обработки персональных данных.
            </p>
            <br />
            <h5>
              11. Перечень действий, производимых Оператором с полученными
              персональными данными
            </h5>
            <br />
            <p>
              11.1. Оператор осуществляет сбор, запись, систематизацию,
              накопление, хранение, уточнение (обновление, изменение),
              извлечение, использование, передачу (распространение,
              предоставление, доступ), обезличивание, блокирование, удаление и
              уничтожение персональных данных.
            </p>
            <br />
            <p>
              11.2. Оператор осуществляет автоматизированную обработку
              персональных данных с получением и/или передачей полученной
              информации по информационно-телекоммуникационным сетям или без
              таковой.
            </p>
            <br />
            <h5>12. Трансграничная передача персональных данных</h5>
            <br />
            <p>
              12.1. Оператор до начала осуществления трансграничной передачи
              персональных данных обязан убедиться в том, что иностранным
              государством, на территорию которого предполагается осуществлять
              передачу персональных данных, обеспечивается надежная защита прав
              субъектов персональных данных.
            </p>
            <br />
            <p>
              12.2. Трансграничная передача персональных данных на территории
              иностранных государств, не отвечающих вышеуказанным требованиям,
              может осуществляться только в случае наличия согласия в письменной
              форме субъекта персональных данных на трансграничную передачу его
              персональных данных и/или исполнения договора, стороной которого
              является субъект персональных данных.
            </p>
            <br />
            <h5>13. Конфиденциальность персональных данных</h5>
            <br />
            <p>
              Оператор и иные лица, получившие доступ к персональным данным,
              обязаны не раскрывать третьим лицам и не распространять
              персональные данные без согласия субъекта персональных данных,
              если иное не предусмотрено федеральным законом.
            </p>
            <br />
            <h5>14. Заключительные положения</h5>
            <br />
            <p>
              14.1. Пользователь может получить любые разъяснения по
              интересующим вопросам, касающимся обработки его персональных
              данных, обратившись к Оператору с помощью электронной почты&nbsp;
              <span className="text-purple-500">contact@ancial.ru</span>.
            </p>
            <br />
            <p>
              14.2. В данном документе будут отражены любые изменения политики
              обработки персональных данных Оператором. Политика действует
              бессрочно до замены ее новой версией.
            </p>
            <br />
            <p>
              14.3. Актуальная версия Политики в свободном доступе расположена в
              сети Интернет по адресу&nbsp;
              <span className="text-purple-500">https://ancial.ru/about/legal</span>.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
