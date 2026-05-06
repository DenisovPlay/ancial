import { proxyLegacyJson } from '../legacy';

export async function GET() {
  return proxyLegacyJson('/api/apps/get_home_page.php');
}
