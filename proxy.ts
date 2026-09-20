import { NextResponse, type NextRequest } from 'next/server';

/**
 * Проброс реального IP клиента на бэкенд.
 *
 * Топология: клиент → edge-nginx → RatHole → Front (Next) → nginx → RatHole → Back (PHP).
 * Из-за двойного прокси back видит IP домашнего сервера, а не клиента. Здесь, на фронте, мы ещё
 * знаем реальный IP (edge проставил его в X-Forwarded-For / X-Real-IP) и кладём его в X-Client-IP —
 * этот заголовок проходит через rewrite-проксирование к бэку неизменным, и PHP читает именно его.
 *
 * Предусловие на edge-nginx: реальный клиентский IP должен быть в X-Forwarded-For (первым) или
 * X-Real-IP, а клиентский X-Forwarded-For — вычищен (иначе первый элемент можно подделать).
 */
export function proxy(request: NextRequest) {
  const xff = request.headers.get('x-forwarded-for') || '';
  const realIp = request.headers.get('x-real-ip') || '';
  const clientIp = (xff.split(',')[0] || realIp).trim();

  const requestHeaders = new Headers(request.headers);
  if (clientIp) {
    requestHeaders.set('x-client-ip', clientIp);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

// Только проксируемые к бэкенду пути — остальному приложению это не нужно.
export const config = {
  matcher: ['/api/:path*', '/image.php', '/track.php', '/engine/:path*'],
};
