import { proxyLegacyJson } from '../legacy';

export async function GET(request: Request) {
  return proxyLegacyJson('/api/apps/category.php', new URL(request.url).searchParams);
}
