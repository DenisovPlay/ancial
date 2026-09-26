import InviteContent from './invite-content';
import { AppRouteGate } from '../../../components/app-route-shell';
import { appShellStaticParams } from '../../../lib/app-shell-params';
import { IS_NATIVE_APP } from '../../../lib/platform';

// Приложение: одна страница-заготовка, код приглашения берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ code: 'param' });

export default function InvitePage() {
  return IS_NATIVE_APP ? (
    <AppRouteGate>
      <InviteContent />
    </AppRouteGate>
  ) : <InviteContent />;
}
