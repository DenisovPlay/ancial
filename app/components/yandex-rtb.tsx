'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from 'react';

type BannerItem = {
  image: string;
  link: string;
  alt: string;
};

const COMMERCE_BANNERS: BannerItem[] = [
  {
    image: '/img/commercebanners/alfabank.webp',
    link: 'https://alfa.me/qR3wcN',
    alt: 'Альфа-Банк',
  },
  {
    image: '/img/commercebanners/ozonbank.webp',
    link: 'https://ozon.ru/fintech/promo/ref/N00IADTJI',
    alt: 'Ozon Банк',
  },
  {
    image: '/img/commercebanners/mexc.webp',
    link: 'https://s.mexc.com/referral/fdOudqfGw1',
    alt: 'MEXC Global',
  },
  {
    image: '/img/commercebanners/bybit.webp',
    link: 'https://www.bybit.com/invite?ref=YWEKXO&medium=referral&utm_campaign=evergreen&share_to=post',
    alt: 'Bybit Crypto',
  },
  {
    image: '/img/commercebanners/antarctic.webp',
    link: 'https://t.me/antarctic_wallet_bot/app?startapp=ref_32137172ca&startapp=ref_32137172ca',
    alt: 'Antarctic Wallet',
  },
  {
    image: '/img/commercebanners/okx.webp',
    link: 'https://okx.ac/join/62511252',
    alt: 'OKX Crypto Exchange',
  },
];

export default function YandexRtb({
  blockId,
  className,
}: {
  blockId?: string;
  className?: string;
}) {
  const [selectedBanner, setSelectedBanner] = useState<BannerItem | null>(null);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * COMMERCE_BANNERS.length);
    setSelectedBanner(COMMERCE_BANNERS[randomIndex]);
  }, []);

  if (!selectedBanner) {
    return (
      <div
        className={
          className ??
          'w-full max-h-24 block overflow-hidden rounded-3xl bg-zinc-900/40 animate-pulse'
        }
      />
    );
  }

  return (
    <div
      className={
        className ??
        'hidden w-full max-h-24 block overflow-hidden shadow-lg duration-300 cursor-pointer'
      }
    >
      <a
        href={selectedBanner.link}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block w-full h-full overflow-hidden group transition-opacity duration-300 bg-black"
      >
        <div className="z-[99] duration-300 opacity-50 group-hover:opacity-100 backdrop-blur-lg absolute top-0 right-0 px-1.5 text-[10px] text-white bg-zinc-800 rounded-bl-3xl">Реклама. 18+</div>
        <img
          src={selectedBanner.image}
          alt={selectedBanner.alt}
          className="w-full h-auto max-h-24 object-cover select-none pointer-events-none duration-300 group-hover:opacity-80"
          loading="lazy"
          draggable={false}
        />
      </a>
    </div>
  );
}
