import { redirect } from 'next/navigation';

export default async function LegacyInviteRedirectPage({
  params,
}: {
  params: Promise<{ code: string }> | { code: string };
}) {
  const resolvedParams = await params;
  redirect(`/messages/invite/${encodeURIComponent(resolvedParams?.code || '')}`);
}
