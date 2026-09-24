/** Чистая логика без сокета и React — чтобы её можно было проверить node-тестами. */

export type ReclaimDecision = 'claim' | 'yield' | 'idle';

/**
 * Что делать бывшему играющему устройству после переподключения.
 *  - claim: звук всё ещё за нами (висит наше старое соединение) или ничей, а музыка здесь играет;
 *  - yield: звук забрало другое устройство — становимся пультом и замолкаем;
 *  - idle: звук ничей и здесь не играет — просто остаёмся локальным плеером без захвата.
 */
export function resolveReclaim({
  activeDeviceId,
  activeSelf,
  ownDeviceId,
  playingHere,
}: {
  activeDeviceId: string;
  activeSelf: boolean;
  ownDeviceId: string;
  playingHere: boolean;
}): ReclaimDecision {
  if (activeSelf) return 'idle';
  if (activeDeviceId !== '' && activeDeviceId !== ownDeviceId) return 'yield';
  if (activeDeviceId === ownDeviceId) return 'claim';
  return playingHere ? 'claim' : 'idle';
}
