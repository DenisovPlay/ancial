type PreviewImage = {
  id: string;
  status: 'error' | 'uploaded' | 'uploading';
  url: string;
};

type PreviewStrings = {
  nowTyping: string;
  placeholderAuthor: string;
  placeholderContent: string;
  placeholderTag: string;
  placeholderTitle: string;
  uploading: string;
};

type CreatePostPreviewProps = {
  authorImage?: string | null;
  authorName?: string;
  images: PreviewImage[];
  strings: PreviewStrings;
  tag?: string;
  text?: string;
  title?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function SvgIcon({
  className,
  id,
}: {
  className?: string;
  id: string;
}) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <use href={`/icons.svg#${id}`}></use>
    </svg>
  );
}

function PreviewAvatar({
  authorImage,
  authorName,
}: {
  authorImage?: string | null;
  authorName: string;
}) {
  if (authorImage) {
    return (
      <div
        className="w-10 h-10 rounded-full shadow bg-cover bg-center cursor-pointer"
        style={{ backgroundImage: `url(${authorImage})` }}
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full shadow bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-200">
      {authorName.trim().charAt(0).toUpperCase() || 'A'}
    </div>
  );
}

function PreviewImageBlock({
  images,
  strings,
}: {
  images: PreviewImage[];
  strings: Pick<PreviewStrings, 'uploading'>;
}) {
  if (!images.length) {
    return null;
  }

  if (images.length === 1) {
    const image = images[0];

    return (
      <div className="mb-3 relative w-full h-64 md:h-96 rounded-3xl shadow overflow-hidden bg-zinc-800">
        <div
          className="w-full h-full bg-center bg-contain bg-no-repeat"
          style={{ backgroundImage: `url(${image.url})` }}
        />
        {image.status === 'uploading' && (
          <div className="absolute inset-0 bg-zinc-900/70 flex items-center justify-center text-sm font-medium text-white backdrop-blur-sm">
            {strings.uploading}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="-mx-3 mb-3">
      <div className="relative">
        <div className="absolute top-1.5 right-1.5 z-20 rounded-full border border-zinc-700/60 bg-zinc-950/80 px-3 py-1 text-xs font-semibold text-white shadow backdrop-blur-md">
          <span className="flex items-center gap-1.5">
            <SvgIcon className="w-4 h-4 fill-white" id="IC-photos" />
            <span>{images.length}</span>
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth scroll-pl-3 scroll-pr-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden before:block before:w-3 before:shrink-0 before:content-[''] after:block after:w-3 after:shrink-0 after:content-['']">
          {images.map((image) => (
            <div
              key={image.id}
              className="snap-start shrink-0 w-[84%] sm:w-[78%] lg:w-[68%] h-64 md:h-96 rounded-3xl shadow overflow-hidden bg-zinc-800 relative"
            >
              <div
                className="w-full h-full bg-center bg-contain bg-no-repeat"
                style={{ backgroundImage: `url(${image.url})` }}
              />
              {image.status === 'uploading' && (
                <div className="absolute inset-0 bg-zinc-900/70 flex items-center justify-center text-sm font-medium text-white backdrop-blur-sm">
                  {strings.uploading}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CreatePostPreview({
  authorImage,
  authorName,
  images,
  strings,
  tag,
  text,
  title,
}: CreatePostPreviewProps) {
  const safeAuthorName = authorName?.trim() || strings.placeholderAuthor;
  const safeTitle = title?.trim() || strings.placeholderTitle;
  const safeText = text?.trim() || strings.placeholderContent;
  const safeTag = tag?.trim() || strings.placeholderTag;

  return (
    <div
      id="postdiv-preview"
      className="p-3 rounded-3xl bg-zinc-900 flex flex-col w-full shadow text-zinc-100 border border-zinc-600/30"
    >
      <div className="text-sm lg:text-base text-zinc-400 font-medium flex items-center gap-1.5">
        <PreviewAvatar authorImage={authorImage} authorName={safeAuthorName} />
        <div className="flex flex-col">
          <span className="cursor-pointer text-zinc-200 font-medium w-fit">{safeAuthorName}</span>
          <span className="text-zinc-400 text-xs lg:text-sm">{strings.nowTyping}</span>
        </div>
        <div className="flex-grow"></div>
        <button
          type="button"
          className="flex justify-center items-center cursor-default rounded-2xl w-8 h-8 bg-zinc-800/0 text-zinc-400"
        >
          <SvgIcon className="w-5 h-5 fill-white" id="IC-more" />
        </button>
      </div>

      <div id="titleblock-preview" className="text-lg lg:text-xl text-zinc-100 font-bold">
        {safeTitle}
      </div>

      <div
        id="textblock-preview"
        className={cn(
          'text-base lg:text-lg text-zinc-200 font-medium whitespace-pre-wrap',
          text?.trim() ? 'break-words' : 'break-all',
        )}
        style={{ userSelect: 'text' }}
      >
        {safeText}
      </div>

      <PreviewImageBlock images={images} strings={strings} />

      <div className="text-base lg:text-lg text-zinc-400 font-medium flex items-center">
        <div className="flex-grow flex items-center fill-zinc-400">
          <SvgIcon className="w-6 h-6 inline text-green-500 fill-green-500" id="IC-vote-up" />
          <span>2</span>
          <SvgIcon className="w-6 h-6 inline" id="IC-vote-down" />
          <SvgIcon className="ml-3 w-6 h-6 inline" id="IC-comments" />
          <span>2</span>
        </div>
        <span className="bg-zinc-700 text-zinc-200 rounded-2xl px-2 py-1 text-sm font-medium shadow cursor-default">
          {safeTag}
        </span>
      </div>
    </div>
  );
}
