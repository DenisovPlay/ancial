export type DraftImage = {
  id: string;
  previewUrl: string;
  status: 'error' | 'uploaded' | 'uploading';
  uploadedUrl?: string;
};

type Sticker = {
  code: string;
  src: string;
};

export const IMGBB_UPLOAD_URL =
  'https://api.imgbb.com/1/upload?key=595c8d872da11fdaa5225badc67cc6e6';
export const MAX_IMAGES = 3;

export const STICKERS: Sticker[] = [
  { code: ' btEZ', src: 'https://cdn.betterttv.net/emote/5590b223b344e2c42a9e28e3/1x' },
  { code: ' btCJ', src: 'https://cdn.betterttv.net/emote/5f1b0186cf6d2144653d2970/1x' },
  { code: ' btbDOLBIT', src: 'https://cdn.betterttv.net/emote/5fb91b870d141d6f06d7df81/1x' },
  { code: ' btbPOG', src: 'https://cdn.betterttv.net/emote/5fb023284dfba1644029eea4/1x' },
  { code: ' btPA', src: 'https://cdn.betterttv.net/emote/5d0d7140ca4f4b50240ff6b4/1x' },
  { code: ' btTU', src: 'https://cdn.betterttv.net/emote/61501b4fb63cc97ee6d35ea3/1x' },
  { code: ' btBOOBA', src: 'https://cdn.betterttv.net/emote/605c5f597493072efdeb430a/1x' },
  { code: ' btCLAP', src: 'https://cdn.betterttv.net/emote/5d38aaa592fc550c2d5996b8/1x' },
  { code: ' btLOVE', src: 'https://cdn.betterttv.net/emote/5ca7591926dfd77429327bb6/1x' },
  { code: ' btAFK', src: 'https://cdn.betterttv.net/emote/5edbf265f54be95e2a843385/1x' },
  { code: ' bt89', src: 'https://cdn.betterttv.net/emote/601f13f3f4d51165feda1886/1x' },
  { code: ' btPOP', src: 'https://cdn.betterttv.net/emote/601ef51af4d51165feda15cd/1x' },
  { code: ' btPOO', src: 'https://cdn.betterttv.net/emote/5c3427a55752683d16e409d1/1x' },
  { code: ' btEAT', src: 'https://cdn.betterttv.net/emote/61e8d6ac06fd6a9f5be16425/1x' },
  { code: ' btAGA', src: 'https://cdn.betterttv.net/emote/58a57fa706e70d0465b29cd3/1x' },
  { code: ' btVK', src: 'https://cdn.betterttv.net/emote/61afa691002cdeedc21e9950/1x' },
  { code: ' btYOUTUBE', src: 'https://cdn.betterttv.net/emote/62f14ed7ecbd41815423a7a9/1x' },
  { code: ' btHEART', src: 'https://cdn.betterttv.net/emote/6011197adf6a0665f2753118/1x' },
  { code: ' btNEA', src: 'https://cdn.betterttv.net/emote/605e21037493072efdeb50d2/1x' },
  { code: ' btBAN', src: 'https://cdn.betterttv.net/emote/6055e47f306b602acc5a06db/1x' },
  { code: ' btBB', src: 'https://cdn.betterttv.net/emote/5eef252af91de70dea5baedd/1x.webp' },
  { code: ' btALIEN', src: 'https://cdn.betterttv.net/emote/6052368c306b602acc59eb5c/1x' },
  { code: ' btDURAK', src: 'https://cdn.betterttv.net/emote/618fa6ef54f3344f8805759f/1x' },
  { code: ' btRACER', src: 'https://cdn.betterttv.net/emote/5ed0fd17f54be95e2a835054/1x' },
  { code: ' btNOOB', src: 'https://cdn.betterttv.net/emote/5e8b86328fb1ca5cde5866b5/1x' },
  { code: ' btHUG', src: 'https://cdn.betterttv.net/emote/5b53f5f2e78929110b2ac92c/1x' },
  { code: ' btTASTY', src: 'https://cdn.betterttv.net/emote/5ebe1f72ec17d81685a4f97a/1x' },
  { code: ' btDANCE', src: 'https://cdn.betterttv.net/emote/61ce1122c8cc7f36d52b0dd0/1x' },
  { code: ' btLAUGH', src: 'https://cdn.betterttv.net/emote/61ce10e0c8cc7f36d52b0dcb/1x' },
  { code: ' btCRY', src: 'https://cdn.betterttv.net/emote/61ce109ec8cc7f36d52b0dc5/1x' },
  { code: ' btGIGA', src: 'https://cdn.7tv.app/emote/60ae958e229664e8667aea38/1x.webp' },
  { code: ' donowall', src: 'https://cdn.7tv.app/emote/60a9cfe96daf811370b0b640/1x.webp' },
  { code: ' pepegiggles', src: 'https://cdn.7tv.app/emote/60af03597e8706b57220e8ce/1x.webp' },
  { code: ' catflashbang', src: 'https://cdn.7tv.app/emote/60baca0a3285d8b0b8a051c9/1x.webp' },
  { code: ' brffpoh', src: 'https://cdn.7tv.app/emote/64b227cb1cc37958c10efaeb/1x.webp' },
  { code: ' btcatplz', src: 'https://cdn.7tv.app/emote/612d78ab29ee958c97fe6b91/1x.webp' },
  { code: ' brffflex', src: 'https://cdn.7tv.app/emote/616b51f5d89696663cf3406a/1x.webp' },
  { code: ' btCatJam', src: 'https://cdn.7tv.app/emote/60ae4f0a5d3fdae583146082/1x.webp' },
  { code: ' l1337spin', src: 'https://cdn.7tv.app/emote/63a450b407b5c0d21b2f9a38/1x.webp' },
  { code: ' l1337dance', src: 'https://cdn.7tv.app/emote/6211cf2e5e821986e6f95ea9/1x.webp' },
  { code: ' l1337punch', src: 'https://cdn.7tv.app/emote/6195998170bd99598794f86c/1x.webp' },
  { code: ' l1337skoka', src: 'https://cdn.7tv.app/emote/654bc8f8cf586d12ce2f320c/1x.webp' },
  { code: ' l1337sng', src: 'https://cdn.7tv.app/emote/63b43c6e977fdddeadcf8be2/1x.webp' },
  { code: ' l1337arg', src: 'https://cdn.7tv.app/emote/66b61665071858acca1b3169/1x.webp' },
  { code: ' l1337drink', src: 'https://cdn.7tv.app/emote/626eef3debaf81a66f3d3773/1x.webp' },
  { code: ' l1337molu', src: 'https://cdn.7tv.app/emote/64df6048b7ce014343af9320/1x.webp' },
];

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function SvgIcon({
  className,
  id,
  viewBox = '0 0 48 48',
}: {
  className?: string;
  id: string;
  viewBox?: string;
}) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox={viewBox}>
      <use href={`/icons.svg#${id}`}></use>
    </svg>
  );
}

export function PollIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path d="M 16.470703 4.9863281 A 1.50015 1.50015 0 0 0 15.439453 5.4394531 L 9.5 11.378906 L 6.5605469 8.4394531 A 1.50015 1.50015 0 1 0 4.4394531 10.560547 L 8.4394531 14.560547 A 1.50015 1.50015 0 0 0 10.560547 14.560547 L 17.560547 7.5605469 A 1.50015 1.50015 0 0 0 16.470703 4.9863281 z M 21.5 9 A 1.50015 1.50015 0 1 0 21.5 12 L 42.5 12 A 1.50015 1.50015 0 1 0 42.5 9 L 21.5 9 z M 21.5 22.5 A 1.50015 1.50015 0 1 0 21.5 25.5 L 42.5 25.5 A 1.50015 1.50015 0 1 0 42.5 22.5 L 21.5 22.5 z M 21.5 36 A 1.50015 1.50015 0 1 0 21.5 39 L 42.5 39 A 1.50015 1.50015 0 1 0 42.5 36 L 21.5 36 z"></path>
    </svg>
  );
}

export function StickersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path d="M 24 4 C 12.972066 4 4 12.972074 4 24 C 4 35.027926 12.972066 44 24 44 C 35.027934 44 44 35.027926 44 24 C 44 12.972074 35.027934 4 24 4 z M 24 7 C 33.406615 7 41 14.593391 41 24 C 41 33.406609 33.406615 41 24 41 C 14.593385 41 7 33.406609 7 24 C 7 14.593391 14.593385 7 24 7 z M 18 16.5 A 2.5 2.5 0 0 0 18 21.5 A 2.5 2.5 0 0 0 18 16.5 z M 28.5 18 A 1.50015 1.50015 0 1 0 28.5 21 L 32.5 21 A 1.50015 1.50015 0 1 0 32.5 18 L 28.5 18 z M 33.537109 24.980469 A 1.50015 1.50015 0 0 0 32.083984 26.005859 C 31.20006 28.544221 29.309421 30.633739 26.605469 31.564453 L 26.603516 31.564453 C 25.580358 31.91697 24.54455 32.071815 23.525391 32.054688 A 1.5002149 1.5002149 0 1 0 23.474609 35.054688 C 24.83545 35.077557 26.225189 34.867874 27.582031 34.400391 C 31.194079 33.157105 33.75794 30.319779 34.916016 26.994141 A 1.50015 1.50015 0 0 0 33.537109 24.980469 z"></path>
    </svg>
  );
}

export function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function decodeHtmlToTextareaValue(value: string | null | undefined) {
  if (!value) return '';

  if (typeof document === 'undefined') {
    return decodeHtmlEntities(value).replace(/<br\s*\/?>(\r\n|\n|\r)?/gi, '\n');
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value.replace(/<br\s*\/?>(\r\n|\n|\r)?/gi, '\n');
}

export function safeRevokeObjectUrl(url: string | null | undefined) {
  if (!url || !url.startsWith('blob:')) return;
  URL.revokeObjectURL(url);
}

export async function uploadImageToImgbb(file: File) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(IMGBB_UPLOAD_URL, {
    body: formData,
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    data?: {
      url?: string;
    };
  };

  const uploadedUrl = data.data?.url;

  if (!uploadedUrl) {
    throw new Error('Missing uploaded image url');
  }

  return uploadedUrl;
}
