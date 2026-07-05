import TrackPreview from '../../messages/components/track-preview';
import PostWidgetPoll from '../../components/post-widget-poll';

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

export type PreviewWidget = {
  type: 'poll' | 'music' | string;
  [key: string]: any;
};

type CreatePostPreviewProps = {
  authorImage?: string | null;
  authorName?: string;
  images: PreviewImage[];
  strings: PreviewStrings;
  tag?: string;
  text?: string;
  title?: string;
  widgets?: PreviewWidget[];
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
      <use href={`#${id}`}></use>
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

function PreviewImageBlock({ images, strings }: { images: PreviewImage[]; strings: PreviewStrings }) {
  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="relative group w-full">
        <div
          className="h-64 md:h-96 w-full rounded-3xl user-select-none focus:outline-none focus:ring-0 bg-zinc-800 bg-center bg-contain bg-no-repeat"
          style={{ backgroundImage: `url(${images[0].url})` }}
        />
        {images[0].status === 'uploading' && (
          <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center">
            <span className="text-white font-medium">{strings.uploading}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="-mx-3">
      <div className="relative">
        <div className="absolute top-1.5 right-1.5 z-20 rounded-full border border-zinc-600/30 bg-zinc-950/80 px-3 py-1 text-xs font-semibold text-white shadow backdrop-blur-md">
          <span className="flex items-center gap-1.5">
            <SvgIcon className="w-4 h-4 fill-white" id="IC-photos" />
            <span>{images.length}</span>
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth scroll-pl-3 scroll-pr-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden before:block before:w-3 before:shrink-0 before:content-[''] after:block after:w-3 after:shrink-0 after:content-['']">
          {images.map((img) => (
            <div key={`prev-${img.id}`} className="snap-start shrink-0 w-[84%] sm:w-[78%] lg:w-[68%] relative group">
              <div
                className="h-64 md:h-96 w-full rounded-3xl user-select-none focus:outline-none focus:ring-0 bg-zinc-800 bg-center bg-contain bg-no-repeat"
                style={{ backgroundImage: `url(${img.url})` }}
              />
              {img.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center">
                  <span className="text-white font-medium">{strings.uploading}</span>
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
  widgets,
}: CreatePostPreviewProps) {
  const safeAuthorName = authorName?.trim() || strings.placeholderAuthor;
  const safeTitle = title?.trim() || strings.placeholderTitle;
  const safeText = text?.trim() || strings.placeholderContent;
  const safeTag = tag?.trim() || strings.placeholderTag;

  return (
    <div
      id="postdiv-preview"
      className="p-3 rounded-3xl bg-zinc-900 flex flex-col gap-3 w-full shadow text-zinc-100 border border-zinc-600/30"
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

      {title?.trim() && (
        <div id="titleblock-preview" className="text-lg lg:text-xl text-zinc-100 font-bold">
          {title.trim()}
        </div>
      )}

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

      {widgets && widgets.length > 0 && (
        <div className="flex flex-col gap-3 w-full pointer-events-none">
          {widgets.map((widget, i) => {
            if (widget.type === 'music') {
              return <TrackPreview key={`w-music-${i}`} trackId={widget.track_id} className="w-full !max-w-none bg-zinc-800/40 border-zinc-600/30" />;
            }
            if (widget.type === 'poll') {
              return (
                <PostWidgetPoll
                  key={`w-poll-${i}`}
                  postId={0}
                  type="poll"
                  question={widget.question}
                  options={widget.options}
                  votes={widget.options.map(() => 0)}
                  total_votes={0}
                  user_vote_option={null}
                />
              );
            }
            return null;
          })}
        </div>
      )}

      <div className="text-base lg:text-lg text-zinc-400 font-medium flex items-center">
        <div className="flex-grow flex items-center fill-zinc-400">
          <SvgIcon className="w-6 h-6 inline text-green-500 fill-green-500" id="IC-vote-up" />
          <span>2</span>
          <SvgIcon className="w-6 h-6 inline" id="IC-vote-down" />
          <SvgIcon className="ml-3 w-6 h-6 inline" id="IC-comments" />
          <span>2</span>
        </div>
        {tag?.trim() && tag.trim() !== 'null' && (
          <span className="bg-zinc-700 text-zinc-200 rounded-2xl px-2 py-1 text-sm font-medium shadow cursor-default">
            {tag.trim()}
          </span>
        )}
      </div>
    </div>
  );
}
