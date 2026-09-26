'use client';

import { useSearchParams } from 'next/navigation';

import EditPostContent from './edit-content';

/** Приложение (статический экспорт): параметры редактирования читаются на клиенте, как сервер на сайте. */
export default function EditPostFromQuery() {
  const searchParams = useSearchParams();
  return <EditPostContent postId={searchParams.get('id')} returnToPost={searchParams.get('from') === 'post'} />;
}
