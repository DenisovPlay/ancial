import { proxyLegacyJson } from '../legacy';

export async function GET(request: Request) {
  return proxyLegacyJson('/api/apps/search.php', new URL(request.url).searchParams);
}
