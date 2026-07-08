import type { ReactNode } from 'react';
import { Dropdown } from '../components/navigation';
import CreatePostPreview from './create/create-post-preview';
import RichTextEditor from '../components/rich-text-editor';
import {
    type DraftImage,
    STICKERS,
    StickersIcon,
    PollIcon,
    SvgIcon,
    cn,
} from './editor-shared';
type AvailableAuthor = {
    id: string;
    name: string;
};
export type FeedEditorUIProps = {
    mode: 'create' | 'edit';
    activeTab: 'write' | 'preview';
    setActiveTab: (tab: 'write' | 'preview') => void;
    title: string;
    setTitle: (title: string) => void;
    content: string;
    setContent: (content: string) => void;
    images: DraftImage[];
    handleDeleteImage: (id: string) => void;
    widgets: any[];
    handleRemoveWidget: (index: number) => void;
    topicOptions: string[];
    selectedTopic: string;
    setSelectedTopic: (topic: string) => void;
    authors?: AvailableAuthor[];
    selectedAuthorId?: string;
    setSelectedAuthorId?: (id: string) => void;
    authorName?: string;
    strings: Record<string, string>;
    isSubmitting: boolean;
    hasUploadingImages: boolean;
    handleSubmit: () => void;
    handleOpenFilePicker: () => void;
    setIsPollModalOpen: (open: boolean) => void;
    setIsMusicModalOpen: (open: boolean) => void;
    handleStickerSelect: (code: string) => void;
    previewAuthorName: string;
    previewAuthorImage: string | null;
    onBack: () => void;
    loadingOrErrorComponent?: ReactNode;
    children: ReactNode;
};
export function FeedEditorUI({
    mode,
    activeTab,
    setActiveTab,
    title,
    setTitle,
    content,
    setContent,
    images,
    handleDeleteImage,
    widgets,
    handleRemoveWidget,
    topicOptions,
    selectedTopic,
    setSelectedTopic,
    authors,
    selectedAuthorId,
    setSelectedAuthorId,
    authorName,
    strings,
    isSubmitting,
    hasUploadingImages,
    handleSubmit,
    handleOpenFilePicker,
    setIsPollModalOpen,
    setIsMusicModalOpen,
    handleStickerSelect,
    previewAuthorName,
    previewAuthorImage,
    onBack,
    loadingOrErrorComponent,
    children,
}: FeedEditorUIProps) {
    return (
        <div className="flex flex-col jusitify-center items-center gap-3 py-3">
            {children}
            <div className="w-full max-w-3xl">
                <button
                    type="button"
                    onClick={onBack}
                    className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer"
                >
                    <SvgIcon className="w-8 h-8 fill-white inline" id="IC-chevron-left" />
                    {mode === 'create' ? (
                        <span>{strings.newpost}</span>
                    ) : (
                        <>
                            <span>{strings.edit}</span>
                            <span className="lowercase">{strings.post}</span>
                        </>
                    )}
                </button>
            </div>
            {loadingOrErrorComponent ? (
                loadingOrErrorComponent
            ) : (
                <>
                    <div className="flex gap-3 w-full px-3 lg:px-0 max-w-3xl">
                        <button
                            type="button"
                            onClick={() => setActiveTab('write')}
                            className={cn(
                                'border border-zinc-600/30 hover:bg-zinc-600 duration-300 active:scale-95 px-3 py-1 shadow rounded-3xl shrink-0 cursor-pointer',
                                activeTab === 'write' && 'bg-zinc-700 hover:bg-zinc-600',
                            )}
                        >
                            {strings.post}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('preview')}
                            className={cn(
                                'border border-zinc-600/30 hover:bg-zinc-600 duration-300 active:scale-95 px-3 py-1 shadow rounded-3xl shrink-0 cursor-pointer',
                                activeTab === 'preview' && 'bg-zinc-700 hover:bg-zinc-600',
                            )}
                        >
                            {strings.preview}
                        </button>
                        <div className="flex-grow"></div>
                        <button
                            id="publicpost"
                            type="button"
                            onClick={() => void handleSubmit()}
                            disabled={isSubmitting || hasUploadingImages}
                            className="border border-zinc-600/30 bg-purple-500 hover:bg-purple-600 duration-300 active:scale-95 px-3 py-1 shadow rounded-3xl shrink-0 text-sm cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                        >
                            <svg className="fill-white w-6 h-6 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                                <use href="#IC-send"></use>
                            </svg>
                            <span>{mode === 'create' ? strings.publicpost : strings.save}</span>
                        </button>
                    </div>
                    <div className={cn('flex flex-col w-full max-w-3xl', activeTab !== 'write' && 'hidden')}>
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                            }}
                            className="border border-zinc-600/30 duration-300 bg-zinc-900 shadow rounded-3xl text-zinc-700 flex flex-col"
                        >
                            <input
                                className="bg-transparent p-3 w-full placeholder-zinc-500 text-zinc-100 text-lg font-bold border-b border-zinc-800 duration-300 focus:ring-0 focus:outline-none"
                                autoComplete="off"
                                type="text"
                                name={mode === 'create' ? 'new_post_title' : 'edit_post_title'}
                                id={mode === 'create' ? 'new_post_title' : 'edit_post_title'}
                                maxLength={64}
                                placeholder={strings.title}
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                            />
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                placeholder={strings.postcontent}
                            />
                            <input type="hidden" name={mode === 'create' ? 'contentext' : 'edit_content'} value={content} />
                            {images.length > 0 && (
                                <div className="p-3 flex gap-3 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                    {images.map((image) => (
                                        <button
                                            key={image.id}
                                            type="button"
                                            onClick={() => handleDeleteImage(image.id)}
                                            className="h-32 w-32 rounded-2xl shadow bg-center bg-cover shrink-0 cursor-pointer relative overflow-hidden"
                                            style={{ backgroundImage: `url(${image.previewUrl})` }}
                                        >
                                            {image.status === 'uploading' ? (
                                                <div className="bg-zinc-800 text-white rounded-2xl flex items-center justify-center w-full h-full text-5xl font-bold duration-300">
                                                    <svg className="w-16 h-16 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                                                        <use href="#IC-loader"></use>
                                                    </svg>
                                                </div>
                                            ) : (
                                                <div className="bg-zinc-800 text-white rounded-2xl flex items-center justify-center w-full h-full opacity-0 hover:opacity-90 text-5xl font-bold duration-300">
                                                    <SvgIcon className="w-8 h-8 inline fill-white" id="IC-times" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {widgets.length > 0 && (
                                <div className="px-3 pb-1 flex gap-1.5 overflow-x-auto overflow-y-hidden">
                                    {widgets.map((w, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-zinc-800/50 rounded-3xl border border-zinc-700/40">
                                            {w.type === 'music' ? (
                                                <div
                                                    className="w-6 h-6 rounded-full bg-cover bg-center shrink-0 bg-zinc-700"
                                                    style={{ backgroundImage: `url(${w.track_img})` }}
                                                />
                                            ) : (
                                                <span className="shrink-0 flex items-center justify-center w-6 h-6">
                                                    {w.type === 'quote' ? (
                                                        <SvgIcon className="w-4 h-4 fill-zinc-400" id="IC-share" />
                                                    ) : (
                                                        <PollIcon className="w-4 h-4 fill-zinc-400" />
                                                    )}
                                                </span>
                                            )}
                                            <span className="text-xs text-zinc-200 truncate flex-1">
                                                {w.type === 'music' ? `${w.artist_name} — ${w.track_name}` : w.type === 'poll' ? w.question : (strings.reply_to_post || 'Ответ')}
                                            </span>
                                            <button type="button" onClick={() => handleRemoveWidget(i)} className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 duration-200 active:scale-95 cursor-pointer">
                                                <SvgIcon className="w-3.5 h-3.5 fill-zinc-300" id="IC-times" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="px-1.5 pb-1.5 flex items-center justify-center gap-1.5">
                                <Dropdown
                                    triggerSize="sm"
                                    width="auto"
                                    triggerIcon="IC-plus"
                                    triggerAriaLabel="Add content"
                                    position="top"
                                    align="start"
                                    triggerClassName="h-7 w-7 border border-zinc-600/30 bg-zinc-900 hover:bg-zinc-700 rounded-3xl shadow text-white"
                                    menuClassName="min-w-32 !gap-1.5 !p-2"
                                >
                                    <button
                                        type="button"
                                        onClick={handleOpenFilePicker}
                                        className="flex items-center hover:shadow cursor-pointer rounded-2xl duration-150 px-1.5 py-0.5 bg-zinc-700/0 hover:bg-zinc-700/95 font-medium text-white w-full"
                                    >
                                        <SvgIcon className="w-6 h-6 inline fill-white mr-1" id="IC-photos" />
                                        <span>{strings.photo}</span>
                                    </button>
                                    <div className="flex items-center hover:shadow rounded-2xl duration-150 px-1.5 py-0.5 font-medium bg-zinc-600/30 text-zinc-400 cursor-not-allowed w-full">
                                        <SvgIcon className="inline w-6 h-6 fill-zinc-400 mr-1" id="IC-play" />
                                        <span>{strings.video}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsPollModalOpen(true)}
                                        className="flex items-center hover:shadow cursor-pointer rounded-2xl duration-150 px-1.5 py-0.5 font-medium text-white hover:bg-zinc-700/95 w-full"
                                    >
                                        <PollIcon className="inline h-6 w-6 mr-1 fill-white" />
                                        <span>{strings.poll}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsMusicModalOpen(true)}
                                        className="flex items-center hover:shadow cursor-pointer rounded-2xl duration-150 px-1.5 py-0.5 font-medium text-white hover:bg-zinc-700/95 w-full"
                                    >
                                        <SvgIcon className="inline w-6 h-6 fill-white mr-1" id="IC-music" />
                                        <span>{strings.music}</span>
                                    </button>
                                </Dropdown>
                                <select
                                    name={mode === 'create' ? 'new_post_topic' : 'edit_post_topic'}
                                    className="p-0.5 h-7 border border-zinc-600/30 bg-zinc-900 hover:bg-zinc-700 rounded-3xl shadow text-xs lg:text-sm cursor-pointer duration-300 text-zinc-100 focus:ring-0 focus:outline-none"
                                    id={mode === 'create' ? 'new_post_topic' : 'edit_post_topic'}
                                    value={selectedTopic}
                                    onChange={(event) => setSelectedTopic(event.target.value)}
                                >
                                    <option value="" disabled={mode === 'create'}>
                                        {strings.choisetopic}
                                    </option>
                                    {topicOptions.map((topicOption) => (
                                        <option key={topicOption} value={topicOption}>
                                            {topicOption}
                                        </option>
                                    ))}
                                </select>
                                {mode === 'create' && authors && setSelectedAuthorId ? (
                                    <select
                                        name="new_post_cr"
                                        className="p-0.5 h-7 border border-zinc-600/30 bg-zinc-900 hover:bg-zinc-700 rounded-3xl shadow text-xs lg:text-sm cursor-pointer duration-300 text-zinc-100 focus:ring-0 focus:outline-none"
                                        id="new_post_cr"
                                        value={selectedAuthorId}
                                        onChange={(event) => setSelectedAuthorId(event.target.value)}
                                    >
                                        <option value="0">{strings.frommyname}</option>
                                        {authors.map((author) => (
                                            <option key={author.id} value={author.id}>
                                                {author.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : mode === 'edit' ? (
                                    <div className="p-0.5 h-7 border border-zinc-600/30 bg-zinc-900 rounded-3xl shadow text-xs lg:text-sm duration-300 text-zinc-400 flex items-center px-2 cursor-default max-w-[12rem]">
                                        <span className="truncate">{authorName}</span>
                                    </div>
                                ) : null}
                                <div className="flex-grow"></div>
                                <Dropdown
                                    triggerSize="sm"
                                    triggerAriaLabel="Insert sticker"
                                    position="top"
                                    align="end"
                                    triggerClassName="h-7 w-7 border border-zinc-600/30 bg-zinc-900 hover:bg-zinc-700 rounded-2xl shadow text-white"
                                    menuClassName="!grid !grid-cols-6 !w-[15rem] !rounded-3xl !p-1.5 h-32 overflow-auto"
                                    triggerNode={<StickersIcon className="w-5 h-5 fill-white" />}
                                >
                                    {STICKERS.map((sticker) => (
                                        <button
                                            key={`${sticker.code}-${sticker.src}`}
                                            type="button"
                                            onClick={() => handleStickerSelect(sticker.code)}
                                            className="inline cursor-pointer active:scale-95 duration-300"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={sticker.src} alt={sticker.code.trim()} className="w-8 h-8 object-contain" />
                                        </button>
                                    ))}
                                </Dropdown>
                            </div>
                        </form>
                    </div>
                    <div className={cn('flex flex-col w-full max-w-3xl', activeTab !== 'preview' && 'hidden')}>
                        <CreatePostPreview
                            authorImage={previewAuthorImage}
                            authorName={previewAuthorName}
                            images={images.map((image) => ({
                                id: image.id,
                                status: image.status,
                                url: image.previewUrl,
                            }))}
                            strings={{
                                nowTyping: strings.nowTyping,
                                placeholderAuthor: strings.placeholderAuthor,
                                placeholderContent: strings.placeholderContent,
                                placeholderTag: strings.placeholderTag,
                                placeholderTitle: strings.placeholderTitle,
                                uploading: strings.uploading,
                            }}
                            tag={selectedTopic}
                            text={content}
                            title={title}
                            widgets={widgets}
                        />
                    </div>
                    <div className="lg:hidden">
                        <br />
                        <br />
                        <br />
                    </div>
                </>
            )}
        </div>
    );
}