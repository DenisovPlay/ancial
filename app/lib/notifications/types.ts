/** Rich-уведомление в формате API v2 (/user/Notifications.php?v=2) и WS-события `notification:new`. */

export type NotificationFilter = 'all' | 'people' | 'content' | 'security';

export interface NotificationActor {
  id: number;
  img: string;
  name: string;
  type: 'community' | 'user';
  username: string;
  verify: number;
}

export interface NotificationSecret {
  /** Срок жизни кода; код в списке не приходит никогда — только по запросу «показать». */
  expired: boolean;
  expires_at: string | null;
  kind: string;
  state?: 'active' | 'confirmed' | 'expired';
}

export interface NotificationAction {
  id: string;
}

export interface NotificationObject {
  id: number | null;
  image: string | null;
  preview: string | null;
  type: string | null;
}

export interface RichNotification {
  actions: NotificationAction[];
  actor_count: number;
  actors: NotificationActor[];
  content: string;
  count: number;
  date: string | null;
  id: number;
  kind: string;
  object: NotificationObject | null;
  params: Record<string, string>;
  read: boolean;
  secret: NotificationSecret | null;
  sender_id: number | null;
  target_id: number | null;
  ts: string | null;
  type: number;
  url: string | null;
}

export interface NotificationsPage {
  has_more: boolean;
  next_before_id: number | null;
  notifications: RichNotification[];
  unread_count: number;
}
