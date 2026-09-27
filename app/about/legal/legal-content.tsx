"use client";

import Link from "next/link";
import { useState } from "react";

import Icon from "../../components/svg-icon";
import { useAuth } from "../../context/AuthContext";
import { LEGAL_CATALOG } from "./documents/catalog";
import type { LegalLang } from "./documents/types";

type LangFilter = "all" | LegalLang;

/** Список юридических документов: у каждого свой адрес /about/legal/<slug>. */
export default function LegalContent() {
  const { lang } = useAuth();
  const [filter, setFilter] = useState<LangFilter>("all");
  const docs = LEGAL_CATALOG.filter((doc) => filter === "all" || doc.lang === filter);

  return (
    <div className="flex flex-col items-center gap-3 py-3">
      <div className="w-full max-w-4xl flex sm:items-center flex-col sm:flex-row">
        <Link
          href="/about"
          className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer"
        >
          <Icon name="IC-chevron-left" className="w-8 h-8 fill-white inline" />
          {lang?.documents || "Документы"}
        </Link>
        <div className="flex-grow"></div>
        <div
          role="group"
          aria-label={lang?.legal_lang_filter || "Язык документов"}
          className="shrink-0 w-fit rounded-3xl bg-zinc-900/95 ring ring-zinc-600/30 duration-300 flex mx-3 mt-3 sm:mt-0 sm:mx-0 gap-0.5 sm:mr-3 lg:mr-0"
        >
          <button
            type="button"
            aria-label={lang?.legal_filter_all || "Все"}
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
            className={`aspect-square h-12 w-12 p-2 lg:text-lg rounded-3xl duration-300 flex items-center justify-center active:scale-95 cursor-pointer ${filter === "all"
              ? "bg-zinc-800 text-white border-r border-zinc-600/30"
              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border-transparent"
              }`}
          >
            <Icon name="IC-globe" className={`w-6 h-6 inline duration-300 ${filter === "all" ? "fill-white" : "fill-zinc-400"}`} />
          </button>
          <button
            type="button"
            aria-pressed={filter === "ru"}
            onClick={() => setFilter("ru")}
            className={`p-2 px-4 lg:text-lg rounded-3xl duration-300 active:scale-95 cursor-pointer ${filter === "ru"
              ? "bg-zinc-800 text-white border-x border-zinc-600/30"
              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border-transparent"
              }`}
          >
            Русский
          </button>
          <button
            type="button"
            aria-pressed={filter === "en"}
            onClick={() => setFilter("en")}
            className={`p-2 px-4 lg:text-lg rounded-3xl duration-300 active:scale-95 cursor-pointer ${filter === "en"
              ? "bg-zinc-800 text-white border-l border-zinc-600/30"
              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border-transparent"
              }`}
          >
            English
          </button>
        </div>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-3 px-3 lg:px-0">
        {docs.map((doc) => (
          <Link
            key={doc.slug}
            href={`/about/legal/${doc.slug}`}
            className="rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3 flex items-center gap-3 hover:bg-zinc-800/60 active:scale-95 duration-300 cursor-pointer group"
          >
            <span className="relative w-12 h-12 shrink-0 rounded-full bg-zinc-800 flex items-center justify-center">
              <Icon name="IC-file" className="w-6 h-6 stroke-white fill-transparent" />
              {filter === "all" ? (
                // Язык документа — плашкой с наездом на низ иконки.
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full border border-zinc-600/30 bg-zinc-900 text-[10px] leading-none font-semibold text-zinc-300 uppercase">
                  {doc.lang}
                </span>
              ) : null}
            </span>
            <span className="flex flex-col min-w-0 flex-grow">
              <span className="font-semibold text-white">{doc.title}</span>
              <span className="text-sm text-zinc-400">{doc.summary}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="lg:hidden"><br /><br /><br /><br /></div>
    </div>
  );
}
