'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useTvNavigation() {
  const pathname = usePathname();

  // AUTOMATICALLY PRESERVE AND RESTORE FOCUS ON ACTIVE NAV TAB OR SEARCH INPUT ON ROUTE CHANGE
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentPath = (pathname || window.location.pathname || '/cinema').replace(/\/$/, '') || '/cinema';

      // ON SEARCH PAGE (/cinema/search): ALWAYS FOCUS SEARCH INPUT FIELD DIRECTLY
      if (currentPath.includes('/cinema/search')) {
        const searchInput = document.querySelector<HTMLElement>('[data-search-page-input="true"], main input');
        if (searchInput) {
          searchInput.focus();
          return;
        }
      }

      // ON INFO PAGE (/cinema/info/...): ALWAYS FOCUS BACK BUTTON DIRECTLY
      if (currentPath.includes('/cinema/info') || currentPath.includes('/cinema/watch')) {
        const backBtn = document.querySelector<HTMLElement>('[data-cinema-back="true"]');
        if (backBtn) {
          backBtn.focus();
          return;
        }
      }

      const navLinks = Array.from(document.querySelectorAll<HTMLElement>('nav a[href]')).filter(
        (el) => el.offsetWidth > 0 && el.offsetHeight > 0
      );
      if (navLinks.length === 0) return;

      const targetTab =
        navLinks.find((a) => {
          const href = (a.getAttribute('href') || '').replace(/\/$/, '');
          const aPath = (a as HTMLAnchorElement).pathname ? (a as HTMLAnchorElement).pathname.replace(/\/$/, '') : '';
          return href === currentPath || aPath === currentPath;
        }) ||
        navLinks.find((a) => a.classList.contains('bg-white')) ||
        navLinks[0];

      if (targetTab) {
        targetTab.focus();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!ARROWS.includes(e.key)) return;

      try {
        const active = document.activeElement as HTMLElement | null;

        // Helper 1: Get all visible nav links inside header <nav>
        const getNavLinks = (): HTMLElement[] => {
          return Array.from(document.querySelectorAll<HTMLElement>('nav a[href]')).filter(
            (el) => el.offsetWidth > 0 && el.offsetHeight > 0
          );
        };

        // Helper 2: Find search button or search input in header
        const getSearchInput = (): HTMLElement | null => {
          return (
            document.querySelector<HTMLElement>('[data-cinema-search]') ||
            document.querySelector<HTMLElement>('form input')
          );
        };

        // Helper 3: Find active nav tab OR back button EXCLUSIVELY
        const findActiveNavTab = (): HTMLElement | null => {
          const backBtn = document.querySelector<HTMLElement>('[data-cinema-back="true"]');
          if (backBtn && backBtn.offsetWidth > 0 && backBtn.offsetHeight > 0) {
            return backBtn;
          }

          const navLinks = getNavLinks();
          if (navLinks.length === 0) return null;

          const currentPath = (pathname || window.location.pathname || '/cinema').replace(/\/$/, '') || '/cinema';

          const match = navLinks.find((a) => {
            const href = (a.getAttribute('href') || '').replace(/\/$/, '');
            const aPath = (a as HTMLAnchorElement).pathname ? (a as HTMLAnchorElement).pathname.replace(/\/$/, '') : '';
            return href === currentPath || aPath === currentPath;
          });

          const activeClassMatch = navLinks.find((a) => a.classList.contains('bg-white'));
          return match || activeClassMatch || navLinks[0];
        };

        // IF NO ACTIVE FOCUS: BOOTSTRAP TO BACK BUTTON OR SEARCH INPUT OR ACTIVE NAV TAB
        if (!active || active === document.body) {
          e.preventDefault();
          const backBtn = document.querySelector<HTMLElement>('[data-cinema-back="true"]');
          if (backBtn) {
            backBtn.focus();
            return;
          }
          const currentPath = (pathname || window.location.pathname || '/cinema').replace(/\/$/, '');
          if (currentPath.includes('/cinema/search')) {
            const searchInput = document.querySelector<HTMLElement>('[data-search-page-input="true"], main input');
            if (searchInput) {
              searchInput.focus();
              return;
            }
          }
          const target = findActiveNavTab() || document.querySelector<HTMLElement>('.focusable-tv');
          target?.focus();
          return;
        }

        const isNavTab = active.tagName === 'A' && !!active.closest?.('nav');
        const isHeaderSearchBtn = !!active.getAttribute('data-cinema-search') || (active.tagName === 'INPUT' && !!active.closest?.('form'));
        const isBackButton = active.hasAttribute('data-cinema-back') || !!active.closest?.('[data-cinema-back]');
        const isHeader = !!active.closest?.('header');

        // ── 0. ABSOLUTE HIGHEST PRIORITY: SPECIAL RULES FOR BACK BUTTON IN HEADER ────
        if (isBackButton) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const firstContentBtn = document.querySelector<HTMLElement>('[data-watch-hero-btn], [data-hero-section] button, [data-hero-section] a, main .focusable-tv, main button, main a');
            if (firstContentBtn) {
              firstContentBtn.focus();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
          }
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            return;
          }
        }

        // ── 0.1 SPECIAL RULES FOR /CINEMA/SEARCH PAGE ────
        const currentPath = (pathname || window.location.pathname || '/cinema').replace(/\/$/, '');
        const isSearchPage = currentPath.includes('/cinema/search');

        if (isSearchPage) {
          const isSearchPageInput = active.hasAttribute('data-search-page-input') || (active.tagName === 'INPUT' && !isHeader);
          const isLeftmostKey = active.getAttribute('data-leftmost-vkey') === 'true';
          const isVKeyPanel = !!active.closest('[data-vkey-panel]');
          const isResultCard = !isHeader && !isSearchPageInput && !isVKeyPanel;

          // RULE A: FROM SEARCH PAGE MAIN INPUT -> ARROW UP GOES TO HEADER SEARCH BUTTON
          if (isSearchPageInput && e.key === 'ArrowUp') {
            e.preventDefault();
            const headerSearch = document.querySelector<HTMLElement>('[data-cinema-search]');
            if (headerSearch) {
              headerSearch.focus();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return;
            }
          }

          // RULE B: FROM SEARCH PAGE MAIN INPUT -> ARROW DOWN GOES STRICTLY TO THE FIRST RESULT CARD (TOP-LEFT)!
          if (isSearchPageInput && e.key === 'ArrowDown') {
            e.preventDefault();
            const firstResultCard = document.querySelector<HTMLElement>(
              '[data-search-results] [data-movie-card="true"], [data-search-results] .focusable-tv'
            );
            if (firstResultCard) {
              firstResultCard.focus();
              return;
            }
          }

          // RULE C: FROM RESULT CARDS -> ARROW UP GOES TO PAGE SEARCH INPUT (NEVER TO HEADER "ГЛАВНАЯ")
          if (isResultCard && e.key === 'ArrowUp') {
            e.preventDefault();
            const cur = active.getBoundingClientRect();
            const focusables = Array.from(
              document.querySelectorAll<HTMLElement>('[data-search-results] [data-movie-card="true"], [data-search-results] .focusable-tv')
            ).filter(
              (el) =>
                el !== active &&
                el.offsetWidth > 0 &&
                el.offsetHeight > 0 &&
                getComputedStyle(el).visibility !== 'hidden'
            );

            const cardAbove = focusables.find((el) => {
              const r = el.getBoundingClientRect();
              return r.top + r.height / 2 < cur.top - 10;
            });

            if (cardAbove) {
              cardAbove.focus();
            } else {
              const pageInput = document.querySelector<HTMLElement>('[data-search-page-input="true"], main input');
              if (pageInput) {
                pageInput.focus();
              }
            }
            return;
          }

          // RULE D: FROM VIRTUAL KEYBOARD -> ARROW LEFT TARGETS 4TH COLUMN (RIGHTMOST CARD) AT CORRESPONDING Y HEIGHT
          if (isVKeyPanel && e.key === 'ArrowLeft' && isLeftmostKey) {
            e.preventDefault();
            const cur = active.getBoundingClientRect();
            const cy = cur.top + cur.height / 2;

            const cards = Array.from(
              document.querySelectorAll<HTMLElement>('[data-search-results] [data-movie-card="true"], [data-search-results] .focusable-tv')
            ).filter((el) => el.offsetWidth > 0 && el.offsetHeight > 0);

            if (cards.length > 0) {
              let bestCard = cards[0];
              let minScore = Infinity;

              for (const card of cards) {
                const r = card.getBoundingClientRect();
                const ey = r.top + r.height / 2;
                const diffY = Math.abs(ey - cy);

                const score = diffY * 10 - r.right;
                if (score < minScore) {
                  minScore = score;
                  bestCard = card;
                }
              }

              bestCard.focus();
              return;
            }

            const pageInput = document.querySelector<HTMLElement>('[data-search-page-input="true"], main input');
            if (pageInput) {
              pageInput.focus();
              return;
            }
          }

          // RULE E: STRICT ROW-BY-ROW NAVIGATION INSIDE VIRTUAL KEYBOARD PANEL
          if (isVKeyPanel && ['ArrowUp', 'ArrowDown', 'ArrowRight'].includes(e.key)) {
            const vkeys = Array.from(
              document.querySelectorAll<HTMLElement>('[data-vkey-panel] button')
            ).filter((el) => el.offsetWidth > 0 && el.offsetHeight > 0);

            const cur = active.getBoundingClientRect();
            const cx = cur.left + cur.width / 2;
            const cy = cur.top + cur.height / 2;

            let bestKey: HTMLElement | null = null;
            let minDist = Infinity;

            for (const key of vkeys) {
              if (key === active) continue;
              const r = key.getBoundingClientRect();
              const ex = r.left + r.width / 2;
              const ey = r.top + r.height / 2;
              const dx = ex - cx;
              const dy = ey - cy;

              let valid = false;
              let dist = 0;

              switch (e.key) {
                case 'ArrowUp':
                  valid = dy < -5;
                  dist = Math.abs(dy) * 10 + Math.abs(dx);
                  break;
                case 'ArrowDown':
                  valid = dy > 5;
                  dist = Math.abs(dy) * 10 + Math.abs(dx);
                  break;
                case 'ArrowRight':
                  valid = dx > 5;
                  dist = Math.abs(dx) + Math.abs(dy) * 6;
                  break;
              }

              if (valid && dist < minDist) {
                minDist = dist;
                bestKey = key;
              }
            }

            if (bestKey) {
              e.preventDefault();
              bestKey.focus();
              return;
            }
          }
        }

        // ── 1. SEARCH BUTTON / HEADER SEARCH HANDLING ─────────────────────────────
        if (isHeaderSearchBtn) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            active.blur();
            const heroBtn = document.querySelector<HTMLElement>('[data-watch-hero-btn], [data-hero-section] button, [data-hero-section] a');
            const pageInput = document.querySelector<HTMLElement>('[data-search-page-input="true"]');
            const genreChip = document.querySelector<HTMLElement>('.focusable-tv[class*="rounded-full"]');
            const target = heroBtn || pageInput || genreChip || document.querySelector<HTMLElement>('.focusable-tv');
            if (target) {
              target.focus();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
          }

          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const navLinks = getNavLinks();
            if (navLinks.length > 0) {
              navLinks[navLinks.length - 1].focus();
            }
            return;
          }
          return;
        }

        // PREVENT DEFAULT FOR ALL OTHER NAVIGATION
        e.preventDefault();

        // ── 2. HEADER NAV TABS (INSTANT SECTION SWITCHING) ────────────────────────
        if (isNavTab) {
          const navLinks = getNavLinks();
          const idx = navLinks.indexOf(active);

          if (e.key === 'ArrowRight') {
            if (idx !== -1 && idx < navLinks.length - 1) {
              const next = navLinks[idx + 1];
              next.focus();
              next.click(); // Switch page
            } else {
              getSearchInput()?.focus(); // Move from "Anime" to Search button
            }
            return;
          }

          if (e.key === 'ArrowLeft') {
            if (idx > 0) {
              const prev = navLinks[idx - 1];
              prev.focus();
              prev.click(); // Switch page
            }
            return;
          }

          if (e.key === 'ArrowDown') {
            const heroBtn = document.querySelector<HTMLElement>('[data-watch-hero-btn], [data-hero-section] button, [data-hero-section] a');
            const pageInput = document.querySelector<HTMLElement>('[data-search-page-input="true"]');
            const genreChip = document.querySelector<HTMLElement>('.focusable-tv[class*="rounded-full"]');
            const target = heroBtn || pageInput || genreChip || document.querySelector<HTMLElement>('.focusable-tv');
            if (target) {
              target.focus();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
          }

          if (e.key === 'ArrowUp') {
            return; // Already at header top
          }
        }

        // ── 3. MOVING UP FROM CONTENT (GENRE CHIPS / BACK BUTTON RESPECT) ─────────
        if (e.key === 'ArrowUp') {
          const cur = active.getBoundingClientRect();
          const cy = cur.top + cur.height / 2;

          const bodyFocusables = Array.from(
            document.querySelectorAll<HTMLElement>(
              '.focusable-tv, button:not([disabled]):not([tabindex="-1"]), [tabindex="0"]'
            )
          ).filter(
            (el) =>
              el !== active &&
              !el.closest?.('header') &&
              el.offsetWidth > 0 &&
              el.offsetHeight > 0 &&
              getComputedStyle(el).visibility !== 'hidden'
          );

          const elementAbove = bodyFocusables.find((el) => {
            const r = el.getBoundingClientRect();
            return r.top + r.height / 2 < cy - 10;
          });

          if (!elementAbove || active.closest?.('[data-hero-section]')) {
            const targetHeader = findActiveNavTab();
            if (targetHeader) {
              targetHeader.focus();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
          }
        }

        // ── 5. SPATIAL NAVIGATION FOR LOWER CARDS & ROWS ──────────────────────────
        const focusables = Array.from(
          document.querySelectorAll<HTMLElement>(
            'nav a[href], [data-cinema-search], [data-cinema-back], form input, .focusable-tv, button:not([disabled]):not([tabindex="-1"]), [tabindex="0"]'
          )
        ).filter(
          (el) =>
            el.offsetWidth > 0 &&
            el.offsetHeight > 0 &&
            getComputedStyle(el).visibility !== 'hidden' &&
            el.getAttribute('tabindex') !== '-1' &&
            (!el.closest || !el.closest('.hidden'))
        );

        const cur = active.getBoundingClientRect();
        const cx = cur.left + cur.width / 2;
        const cy = cur.top + cur.height / 2;

        let best: HTMLElement | null = null;
        let minDist = Infinity;

        for (const el of focusables) {
          if (el === active || active.contains(el)) continue;
          const r = el.getBoundingClientRect();
          const ex = r.left + r.width / 2;
          const ey = r.top + r.height / 2;
          const dx = ex - cx;
          const dy = ey - cy;

          let valid = false;
          let dist = 0;

          switch (e.key) {
            case 'ArrowLeft':
              valid = dx < -5;
              dist = Math.abs(dx) + Math.abs(dy) * 6;
              break;
            case 'ArrowRight':
              valid = dx > 5;
              dist = Math.abs(dx) + Math.abs(dy) * 6;
              break;
            case 'ArrowUp':
              valid = dy < -5;
              dist = Math.abs(dy) + Math.abs(dx) * 4;
              break;
            case 'ArrowDown':
              valid = dy > 5;
              dist = Math.abs(dy) + Math.abs(dx) * 4;
              break;
          }

          if (valid && dist < minDist) {
            minDist = dist;
            best = el;
          }
        }

        if (best) {
          best.focus();
          if (best.closest?.('[data-hero-section]') || best.closest?.('header')) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            best.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
          }
        }
      } catch (err) {
        console.error('[TV Nav Error]', err);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [pathname]);
}
