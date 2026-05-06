import { proxyLegacyJson } from '../legacy';

export async function GET(request: Request) {
  return proxyLegacyJson('/engine/modules/apps/download_counter.php', new URL(request.url).searchParams);
}
