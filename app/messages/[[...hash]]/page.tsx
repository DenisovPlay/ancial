import { appShellStaticParams } from '../../lib/app-shell-params';

// Приложение: базовая страница /messages/ обслуживает любой диалог — MessagesContent читает адрес сам.
export const generateStaticParams = appShellStaticParams({ hash: 'optionalCatchAll' });

export default function MessagesPage() {
  return null;
}
