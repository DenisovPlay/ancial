# Community Audit Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показывать локализованные пользовательские названия вместо технических кодов событий журнала.

**Architecture:** Чистый formatter строит локализационный ключ из action и предоставляет безопасный fallback. Модалка только передаёт action и глобальный словарь, а RU/EN локали владеют пользовательским текстом.

**Tech Stack:** React 19, TypeScript 5, Next.js 16, Node native assertions.

## Global Constraints

- Не отправлять изменения в GitHub и не выполнять deploy.
- Новые тексты хранятся только в `app/locales/ru.ts` и `app/locales/en.ts`.
- Raw action не рендерится напрямую в JSX.

---

### Task 1: Audit action formatter and dictionaries

**Files:**
- Modify: `app/group/[link]/lib/community-presentation.ts`
- Modify: `app/group/[link]/lib/community-presentation.test.mjs`
- Modify: `app/group/[link]/components/community-manage-modal.tsx`
- Modify: `app/group/[link]/components/community-presentation-wiring.test.mjs`
- Modify: `app/locales/ru.ts`
- Modify: `app/locales/en.ts`

**Interfaces:**
- Produces: `communityAuditActionLabel(action: string, dictionary?: Record<string, unknown> | null): string`.

- [ ] Write failing formatter and wiring assertions for known and unknown actions.
- [ ] Run tests and confirm failure because the formatter is missing.
- [ ] Implement canonical key generation and readable fallback.
- [ ] Add the full known action key set to RU and EN dictionaries.
- [ ] Render the formatter result in the audit list.
- [ ] Run focused tests, TypeScript, ESLint, build, and commit locally.
