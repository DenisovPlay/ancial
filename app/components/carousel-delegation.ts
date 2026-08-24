/**
 * Делегированная обработка стрелок каруселей в сгенерированном HTML постов.
 * Заменяет inline onclick из parsePostContentToHtml: CSP-friendly,
 * работает для любого количества каруселей и не требует ре-бинда при ре-рендере.
 */

let installed = false;

export function ensureCarouselScrollDelegation(): void {
    if (installed || typeof window === 'undefined') return;
    installed = true;

    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null;
        const button = target?.closest?.('[data-carousel-scroll]') as HTMLElement | null;
        if (!button) return;

        event.preventDefault();
        event.stopPropagation();

        const direction = Number(button.dataset.carouselScroll);
        if (!direction) return;

        const container = button.parentElement?.querySelector('.overflow-x-auto') as HTMLElement | null;
        if (!container) return;

        container.scrollBy({ left: direction * container.clientWidth * 0.7, behavior: 'smooth' });
    }, true);
}