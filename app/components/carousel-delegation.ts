/**
 * Делегированная обработка стрелок каруселей в сгенерированном HTML постов.
 * Заменяет inline onclick из parsePostContentToHtml: CSP-friendly,
 * работает для любого количества каруселей и не требует ре-бинда при ре-рендере.
 */

let installed = false;

/** Внутренний отступ ленты слайдов (шаг 3): слайд при остановке стоит на нём от края карусели. */
const SLIDE_INSET = 12;

/**
 * Листает карусель ровно на слайд: к следующему/предыдущему, а не на долю ширины (так картинки
 * не останавливались на полпути и стрелки не промахивались мимо левого края слайда).
 */
export function scrollCarousel(container: HTMLElement, direction: number): void {
    const slides = Array.from(container.children).filter((el): el is HTMLElement => el instanceof HTMLElement && el.offsetWidth > 0);
    if (slides.length === 0) return;
    const base = container.getBoundingClientRect().left - container.scrollLeft;
    const lefts = slides.map((slide) => slide.getBoundingClientRect().left - base - SLIDE_INSET);
    // Вперёд — первый слайд правее текущей позиции, назад — последний левее (допуск на округление):
    // так и из «упёршегося» конца ленты стрелка назад не перескакивает слайд.
    const pos = container.scrollLeft;
    const target = direction > 0
        ? lefts.find((left) => left > pos + 2) ?? lefts[lefts.length - 1]
        : [...lefts].reverse().find((left) => left < pos - 2) ?? lefts[0];
    container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
}

/** Начало/конец ленты: на группе ставятся data-start / data-end, стрелки прячутся классами group-data-[…]/carousel. */
function syncCarouselEdges(scroller: HTMLElement): void {
    const group = scroller.closest<HTMLElement>('.group\\/carousel');
    if (!group) return;
    group.toggleAttribute('data-start', scroller.scrollLeft <= 2);
    group.toggleAttribute('data-end', scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2);
}

export function ensureCarouselScrollDelegation(): void {
    if (installed || typeof window === 'undefined') return;
    installed = true;

    // scroll не всплывает — слушаем в фазе перехвата; лента — .carousel-track внутри группы.
    document.addEventListener('scroll', (event) => {
        const el = event.target;
        if (el instanceof HTMLElement && el.classList.contains('carousel-track') && el.closest('.group\\/carousel')) syncCarouselEdges(el);
    }, { capture: true, passive: true });

    // Ширина ленты меняется, когда догружаются картинки, — пересчитываем края; и при наведении
    // (стрелки видны только тогда), чтобы они сразу показывали верное состояние.
    const syncFromTarget = (event: Event) => {
        const el = event.target;
        if (!(el instanceof HTMLElement)) return;
        const group = el.closest<HTMLElement>('.group\\/carousel');
        const scroller = group?.querySelector<HTMLElement>('.carousel-track');
        if (scroller) syncCarouselEdges(scroller);
    };
    document.addEventListener('load', syncFromTarget, { capture: true, passive: true });
    document.addEventListener('pointerover', syncFromTarget, { passive: true });

    // Перетаскивание мышью (на сенсорных — родной скролл). После перетаскивания клик по слайду гасим,
    // чтобы не открывался просмотрщик.
    let drag: { track: HTMLElement; startX: number; startLeft: number; moved: boolean } | null = null;
    let suppressClick = false;
    document.addEventListener('mousedown', (event) => {
        if (event.button !== 0) return;
        const track = (event.target as HTMLElement | null)?.closest?.<HTMLElement>('.carousel-track');
        if (!track || track.scrollWidth <= track.clientWidth) return;
        drag = { track, startX: event.clientX, startLeft: track.scrollLeft, moved: false };
    });
    document.addEventListener('mousemove', (event) => {
        if (!drag) return;
        const dx = event.clientX - drag.startX;
        if (!drag.moved && Math.abs(dx) > 6) {
            drag.moved = true;
            drag.track.classList.add('dragging');
        }
        if (drag.moved) {
            event.preventDefault();
            drag.track.scrollLeft = drag.startLeft - dx;
        }
    });
    const endDrag = () => {
        if (!drag) return;
        drag.track.classList.remove('dragging');
        if (drag.moved) {
            suppressClick = true;
            setTimeout(() => { suppressClick = false; }, 0);
        }
        drag = null;
    };
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('dragstart', (event) => {
        if ((event.target as HTMLElement | null)?.closest?.('.carousel-track')) event.preventDefault();
    });
    document.addEventListener('click', (event) => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
    }, true);

    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        const button = target?.closest?.('[data-carousel-scroll]') as HTMLElement | null;
        if (!button) return;

        event.preventDefault();
        event.stopPropagation();

        const direction = Number(button.dataset.carouselScroll);
        if (!direction) return;

        const container = button.parentElement?.querySelector('.carousel-track') as HTMLElement | null;
        if (!container) return;

        scrollCarousel(container, direction);
    }, true);
}