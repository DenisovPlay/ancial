'use client';

import { authFetch } from './auth-fetch';
import type {
  CommunityAuditEntry,
  CommunityChannelOverride,
  CommunityLinkRequest,
  CommunityMember,
  CommunityPermissionMap,
  CommunityRoleList,
  CommunityStructure,
} from '../group/[link]/lib/community-types';

/**
 * Standard Ancial API V2 Response wrapper
 */
export interface AncialV2Response<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export interface VoiceInviteInfo {
  dialog_id: number;
  hash?: string;
  title: string;
  avatar: string;
  members_count: number;
  in_call: number;
}

export interface VoiceInviteTurn {
  iceServers: RTCIceServer[];
}

export class AncialAPIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'AncialAPIError';
  }
}

// --- WALLET TYPINGS ---
/** Параметры перевода средств (wallet/Transaction.php?action=send). */
export interface SendMoneyParams {
  sender_id: number;
  amount: number;
  comment: string;
  receiver_id?: number;
  receiver_login?: string;
  receiver_email?: string;
  receiver_phone?: string;
}

export interface WalletAccount {
  id: number;
  name: string;
  balance: number;
  status: number;
}

export interface WalletGateway {
  id: number;
  name: string;
  image: string;
  withdrawal_description: string;
  fee_percent: number;
}

export interface WalletTopupOrder {
  id: number;
  label: string;
  status: string;
  order_hash: string;
  amount: number;
  created_at: string;
}

export interface WalletTransaction {
  id: number;
  sender: number;
  receiver: number;
  amount: number;
  total: number;
  status: number;
  date?: string;
  type?: number;
  comment?: string;
  fees: number;
  other_party_name: string;
  is_internal: boolean;
  direction: 'in' | 'out';
  sender_name?: string;
  receiver_name?: string;
}

export interface WalletOverview {
  accounts: WalletAccount[];
  gateways: WalletGateway[];
  topupOrders: WalletTopupOrder[];
  transactions: WalletTransaction[];
}

/** Динамическое поле формы вывода, отдаваемое шлюзом. */
export interface WalletGatewayFormField {
  key?: string;
  label?: string;
  required?: boolean | number | string;
  type?: string;
  hint?: string;
  placeholder?: string;
  options?: Array<{ value?: string; label?: string }>;
}

/** Форма вывода конкретного шлюза (GetGateWayForm.php). */
export interface WalletGatewayForm extends WalletGateway {
  withdrawal_fields?: string | null | {
    title?: string;
    fields?: WalletGatewayFormField[];
  };
}

export interface WalletMerchant {
  id: number;
  name: string;
  img: string;
  status: number;
  c_url: string;
  payments_count: number;
}

export interface WalletMerchantStats {
  total_merchants: number;
  total_payments: number;
  total_earned: number;
}

export interface WalletMerchantDetails {
  id: number;
  name: string;
  img: string;
  status: number;
  c_url: string;
  s_url: string;
  e_url: string;
  description: string;
  fee_paid: 'buyer' | 'merchant';
}

export interface WalletMerchantOrder {
  id: number;
  merchant_id: number;
  order_hash: string;
  amount: number;
  status: string;
  label: string;
  description: string;
  created_at: string;
}

export interface PayOrder {
  id: number;
  merchant_id: number;
  order_hash: string;
  amount: number;
  description: string;
  label: string;
  status: 'created' | 'pending' | 'paid' | 'failed' | 'refunded' | 'finished' | string;
  gateway_id: string | null;
  gateway_url: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface PayMerchant {
  id: number;
  name: string;
  img: string;
  description: string;
  badge: string;
  fee_paid: 'user' | 'merchant' | string;
  s_url: string;
  e_url: string;
}

export interface PayGateway {
  id: string;
  name: string;
  description: string;
  image: string;
  fee_percent: number;
  fee_fixed: number;
  fee_text: string;
  fee_color: string;
  theme_color: string;
  final_amount: number;
  is_disabled: boolean;
  disabled_reason: string | null;
}

export interface PayGatewayPending {
  id: string;
  name: string;
  image: string;
  description: string;
  theme_color: string;
}

export interface PayOrderDetails {
  order: PayOrder;
  merchant: PayMerchant;
  gateways: PayGateway[];
  gateway_pending: PayGatewayPending | null;
}

export interface LinkGuardAnalysis {

  isSuspicious: boolean;
  wrongDomain: boolean;
  blockRecommended: boolean;
  score: number;
  level: 'safe' | 'warning' | 'danger';
  reasons: string[];
  normalizedUrl: string;
  finalUrl: string;
  redirectChain: string[];
  redirectHops: number;
  displayDomain: string;
}

/**
 * Centralized client for Ancial API V2
 */
export class AncialAPI {
  private static BASE_URL = '/api/V2';

  /**
   * Low-level V2 response for callers that need the legacy `{ success, data, error }` envelope.
   * HTTP failures still reject; API-level failures remain available to the caller.
   */
  public static async requestRaw<T>(endpoint: string, options?: RequestInit): Promise<AncialV2Response<T>> {
    const url = endpoint.startsWith('/') ? `${this.BASE_URL}${endpoint}` : `${this.BASE_URL}/${endpoint}`;
    const response = await authFetch(url, options);

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new AncialAPIError(payload?.error || `API request failed with status ${response.status}`, response.status, payload);
    }

    return response.json() as Promise<AncialV2Response<T>>;
  }

  /**
   * Generic request handler for V2 API. Returns unwrapped payloads and rejects API-level errors.
   */
  public static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const result = await this.requestRaw<T>(endpoint, options);

    if (!result.success) {
      throw new Error(result.error || 'Unknown API error');
    }

    return result.data;
  }

  private static communityMutation<T>(endpoint: string, payload: Record<string, unknown>): Promise<T> {
    return this.request<T>(`/communities/${endpoint}.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // --- COMMUNITIES ---

  static communityStructure(communityId: number): Promise<CommunityStructure> {
    return this.request<CommunityStructure>(`/communities/Structure.php?community_id=${communityId}`);
  }

  static communityRoles(communityId: number): Promise<CommunityRoleList> {
    return this.request<CommunityRoleList>(`/communities/Roles.php?community_id=${communityId}`);
  }

  static communityPermissions(
    communityId: number,
    dialogId?: number,
  ): Promise<{ community_id: number; dialog_id: number | null; is_owner: boolean; highest_role_position: number | null; permissions: CommunityPermissionMap }> {
    const query = new URLSearchParams({ community_id: String(communityId) });
    if (dialogId !== undefined) query.set('dialog_id', String(dialogId));
    return this.request(`/communities/Permissions.php?${query.toString()}`);
  }

  static mutateCommunityCategory(payload: Record<string, unknown>): Promise<{ category_id: number; action: string }> {
    return this.communityMutation('Categories', payload);
  }

  static mutateCommunityChannel(payload: Record<string, unknown>): Promise<{ dialog_id: number; action: string }> {
    return this.communityMutation('Channels', payload);
  }

  static mutateCommunityRole(payload: Record<string, unknown>): Promise<{ role_id: number; action: string }> {
    return this.communityMutation('Roles', payload);
  }

  static mutateCommunityMemberRole(payload: {
    community_id: number;
    user_id: number;
    role_id: number;
    action: 'assign' | 'remove';
  }): Promise<{ user_id: number; role_id: number; action: string }> {
    return this.communityMutation('MemberRoles', payload);
  }

  static communityChannelOverrides(
    communityId: number,
    dialogId: number,
  ): Promise<{ overrides: CommunityChannelOverride[] }> {
    return this.request(`/communities/ChannelPermissions.php?community_id=${communityId}&dialog_id=${dialogId}`);
  }

  static mutateCommunityChannelOverride(payload: {
    community_id: number;
    dialog_id: number;
    target_type: 'role' | 'member';
    target_id: number;
    action?: 'set' | 'delete';
    allow?: CommunityPermissionMap;
    deny?: CommunityPermissionMap;
  }): Promise<{ action: string; dialog_id: number; target_type: string; target_id: number }> {
    return this.communityMutation('ChannelPermissions', payload);
  }

  static communityLinkRequests(communityId: number): Promise<{ requests: CommunityLinkRequest[] }> {
    return this.request(`/communities/LinkRequests.php?community_id=${communityId}`);
  }

  static communityMembers(communityId: number): Promise<{ members: CommunityMember[] }> {
    return this.request(`/communities/Members.php?community_id=${communityId}`);
  }

  static mutateCommunityLinkRequest(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.communityMutation('LinkRequests', payload);
  }

  static moderateCommunity(payload: Record<string, unknown>): Promise<{ action: string; user_id?: number; message_id?: number }> {
    return this.communityMutation('Moderation', payload);
  }

  static communityAudit(
    communityId: number,
    options: { beforeId?: number; limit?: number } = {},
  ): Promise<{ entries: CommunityAuditEntry[]; has_more: boolean }> {
    const query = new URLSearchParams({
      community_id: String(communityId),
      limit: String(options.limit ?? 30),
    });
    if (options.beforeId !== undefined) query.set('before_id', String(options.beforeId));
    return this.request(`/communities/Audit.php?${query.toString()}`);
  }

  // --- AUTH ---

  static async loginResponse<T = unknown>(params: { login?: string; password?: string; token?: string }): Promise<AncialV2Response<T>> {
    return this.requestRaw<T>('/auth/Login.php', {
      method: 'POST',
      body: new URLSearchParams({ do_login: 'True', ...params } as Record<string, string>),
    });
  }

  static async login<T = unknown>(params: { login?: string; password?: string; token?: string }): Promise<T> {
    const result = await this.loginResponse<T>(params);
    if (!result.success) throw new Error(result.error || 'Unknown API error');
    return result.data;
  }

  static async signupResponse<T = unknown>(params: {
    login: string;
    email: string;
    fname: string;
    lname: string;
    phone: string;
    password: string;
    password_2: string;
  }): Promise<AncialV2Response<T>> {
    return this.requestRaw<T>('/auth/SignUp.php', {
      method: 'POST',
      body: new URLSearchParams({ do_signup: 'True', ...params }),
    });
  }

  static async logout<T = unknown>(): Promise<T> {
    return this.request<T>('/auth/LogOut.php');
  }

  static async checkStatusResponse<T = unknown>(): Promise<AncialV2Response<T>> {
    return this.requestRaw<T>('/auth/CheckStatus.php', { cache: 'no-store' });
  }

  static async checkStatus<T = unknown>(): Promise<T> {
    return this.request<T>('/auth/CheckStatus.php');
  }

  static async checkLinkGuard(link: string): Promise<LinkGuardAnalysis> {
    return this.request<LinkGuardAnalysis>(`/info/LinkGuard.php?link=${encodeURIComponent(link)}`);
  }

  // --- APPS ---

  static async getAppsHomePage<T = unknown>(): Promise<T> {
    return this.request<T>('/apps/GetHomePage.php');
  }

  static async getAppInfo<T = unknown>(id: string | number): Promise<T> {
    return this.request<T>(`/apps/GetAppInfo.php?id=${id}`);
  }

  static async getAppsCategory<T = unknown>(category: string): Promise<T> {
    return this.request<T>(`/apps/GetCategory.php?q=${encodeURIComponent(category)}`);
  }

  static async searchApps<T = unknown>(query: string): Promise<T> {
    return this.request<T>(`/apps/Search.php?q=${encodeURIComponent(query)}`);
  }

  static async trackAppLaunch<T = unknown>(appId: string | number): Promise<T> {
    return this.request<T>(`/apps/DownloadCounter.php?appid=${appId}`);
  }

  // --- POSTS ---

  static async getFeed<T = unknown>(topic?: string, lastId?: string | number, authorId?: string | number, authorType?: 1 | 2, options?: RequestInit): Promise<T> {
    const query = new URLSearchParams();
    if (topic) query.set('topic', topic);
    if (lastId) query.set('last_id', String(lastId));
    if (authorId) query.set('author', String(authorId));
    if (authorType) query.set('type', String(authorType));
    
    return this.request<T>(`/posts/Feed.php?${query.toString()}`, options);
  }

  static async getPost<T = unknown>(postId: string | number, options?: RequestInit): Promise<T> {
    return this.request<T>(`/posts/GetPost.php?id=${postId}`, options);
  }

  static async getTrack<T = unknown>(trackId: string | number, options?: RequestInit): Promise<T> {
    return this.request<T>(`/pulse/GetTrack.php?id=${trackId}`, options);
  }

  static async createPost<T = unknown>(params: Record<string, string | number>): Promise<T> {
    const query = new URLSearchParams();
    if (params.gid !== undefined) query.set('gid', String(params.gid));
    if (params.tags !== undefined) query.set('tags', String(params.tags));
    if (params.author_type !== undefined) query.set('author_type', String(params.author_type));
    
    const body = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'gid' && key !== 'tags' && key !== 'author_type') {
        body.set(key, String(value));
      }
    });
    
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<T>(`/posts/CreatePost.php${queryString}`, { method: 'POST', body });
  }

  static async editPost<T = unknown>(params: Record<string, string | number>): Promise<T> {
    const body = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => body.set(key, String(value)));
    return this.request<T>('/posts/EditPost.php', { method: 'POST', body });
  }

  static async deletePost<T = unknown>(postId: string | number): Promise<T> {
    return this.request<T>('/posts/DeletePost.php', {
      method: 'POST',
      body: new URLSearchParams({ pid: String(postId) })
    });
  }

  static async votePost<T = unknown>(postId: string | number, vote: 'up' | 'down'): Promise<T> {
    return this.request<T>(`/posts/Vote.php?pid=${postId}&vt=${vote}`);
  }

  static async pollVote(postId: number, optionIndex: number): Promise<{ votes: number[]; total_votes: number; user_vote_option: number | null }> {
    const body = new URLSearchParams({ pid: String(postId), option: String(optionIndex) });
    return this.request<{ votes: number[]; total_votes: number; user_vote_option: number | null }>('/posts/PollVote.php', { method: 'POST', body });
  }

  static async postAction<T = unknown>(action: 'vote' | 'bookmark' | 'delete', params: Record<string, string | number>): Promise<T> {
    let endpoint = '';
    if (action === 'vote') endpoint = '/posts/Vote.php';
    else if (action === 'bookmark') endpoint = '/posts/Bookmarks.php';
    else if (action === 'delete') endpoint = '/posts/DeletePost.php';

    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => query.set(key, String(value)));

    return this.request<T>(`${endpoint}?${query.toString()}`);
  }

  static async getComments<T = unknown>(postId: string | number): Promise<T> {
    return this.request<T>(`/posts/Comments.php?id=${postId}`);
  }

  static async createComment<T = unknown>(postId: string | number, message: string): Promise<T> {
    return this.request<T>(`/posts/CreateComment.php?pid=${postId}`, {
      method: 'POST',
      body: new URLSearchParams({ content: message })
    });
  }

  static async deleteComment<T = unknown>(commentId: string | number): Promise<T> {
    return this.request<T>(`/posts/DeleteComment.php?id=${commentId}`);
  }

  // --- MESSAGES ---

  static async getDialogListResponse<T = unknown>(): Promise<AncialV2Response<T>> {
    return this.requestRaw<T>('/messages/GetDialogList.php');
  }

  static async getDialogList<T = unknown>(): Promise<T> {
    return this.request<T>('/messages/GetDialogList.php');
  }

  static async getDialog<T = unknown>(dialogId: string | number, lastId?: string | number, limit = 50, afterId?: string | number, beforeId?: string | number, options?: RequestInit): Promise<T> {
    const query = new URLSearchParams({ di_id: String(dialogId), limit: String(limit) });
    if (lastId) query.set('last_id', String(lastId));
    if (afterId) query.set('after_id', String(afterId));
    if (beforeId) query.set('before_id', String(beforeId));
    
    return this.request<T>(`/messages/GetDialog.php?${query.toString()}`, options);
  }

  static async sendMessage<T = unknown>(params: { di_id: string | number, message?: string, img?: string, sticker?: string | number }): Promise<T> {
    const body = new URLSearchParams();
    const query = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'sticker' || key === 'img') {
          query.set(key, String(value));
        } else {
          body.set(key, String(value));
        }
      }
    });
    
    const queryString = query.toString();
    const url = queryString ? `/messages/SendMessage.php?${queryString}` : '/messages/SendMessage.php';
    
    return this.request<T>(url, { method: 'POST', body });
  }

    static async messageAction<T = unknown>(action: 'reaction' | 'edit' | 'delete', params: Record<string, string | number>): Promise<T> {
    const body = new URLSearchParams({ action });
    Object.entries(params).forEach(([key, value]) => body.set(key, String(value)));

    let endpoint = '';
    if( action === 'edit') {
      endpoint = '/messages/EditMessage.php';
    }else if (action == 'reaction') {
      endpoint = '/messages/Reaction.php';
    } else if (action === 'delete') {
      endpoint = '/messages/DeleteMessage.php';
    }

    return this.request<T>(endpoint, { method: 'POST', body });
  }


  static async dialogAction<T = unknown>(action: 'delete' | 'clear' | 'block', dialogId: string | number): Promise<T> {
    const body = new URLSearchParams({ action, id: String(dialogId) });
    return this.request<T>('/messages/DialogAction.php', { method: 'POST', body });
  }

  static async createDialog<T = unknown>(userId: string | number): Promise<T> {
    return this.request<T>(`/messages/CreateDialog.php?withu=${encodeURIComponent(String(userId))}`, {
      method: 'POST'
    });
  }

  static async getDialogByHash<T = unknown>(hash: string): Promise<T> {
    return this.request<T>(`/messages/GetDialog.php?hash=${encodeURIComponent(hash)}`);
  }

  static async updateDialogBackground<T = unknown>(dialogId: string | number, imageUrl: string): Promise<T> {
    return this.request<T>('/messages/UpdateBackground.php', {
      method: 'POST',
      body: JSON.stringify({
        dialog_id: Number(dialogId),
        image_url: imageUrl,
        clear: imageUrl === '',
      }),
    });
  }

  static async getPublicChats<T = unknown>(params: { communityId?: string | number; query?: string } = {}): Promise<T> {
    const query = new URLSearchParams();
    if (params.communityId) query.set('community_id', String(params.communityId));
    if (params.query?.trim()) query.set('q', params.query.trim());
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<T>(`/messages/PublicChats.php${suffix}`);
  }

  static async joinPublicChat<T = unknown>(dialogId: string | number): Promise<T> {
    return this.request<T>('/messages/JoinPublic.php', {
      method: 'POST',
      body: JSON.stringify({ dialog_id: dialogId }),
    });
  }

  static async getChatJoinRequests<T = unknown>(dialogId: string | number): Promise<T> {
    return this.request<T>(`/messages/JoinRequests.php?dialog_id=${encodeURIComponent(String(dialogId))}`);
  }

  static async moderateChatJoinRequest<T = unknown>(
    dialogId: string | number,
    requestId: string | number,
    action: 'approve' | 'reject',
  ): Promise<T> {
    return this.request<T>('/messages/JoinRequests.php', {
      method: 'POST',
      body: JSON.stringify({ dialog_id: dialogId, request_id: requestId, action }),
    });
  }

  /** Создать/получить активную ссылку-инвайт в групповой звонок (авторизованный). */
  static async createVoiceInvite(dialogId: number): Promise<{ code: string }> {
    return this.request<{ code: string }>('/calls/CreateVoiceInvite.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dialog_id: dialogId }),
    });
  }

  /**
   * Публичная информация по коду инвайта (гость без авторизации).
   * Относительный путь — Same-Origin через прокси Next (как весь сайт,
   * без требований CORS); credentials 'omit': куки авторизованного
   * пользователя не должны влиять на гостевой сценарий.
   */
  static async getVoiceInviteInfo(code: string): Promise<VoiceInviteInfo> {
    const response = await fetch(`/api/V2/calls/GetVoiceInviteInfo.php?code=${encodeURIComponent(code)}`, {
      credentials: 'omit',
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null) as AncialV2Response<VoiceInviteInfo> | null;
    if (!response.ok || !payload?.success || !payload.data) {
      throw new Error(payload?.error || 'Invite not found');
    }
    return payload.data;
  }

  /** Публичный TURN для гостя (без авторизации, Same-Origin через прокси). */
  static async getGuestTurnConfig(): Promise<VoiceInviteTurn> {
    const response = await fetch('/api/V2/calls/TurnGuest.php', {
      credentials: 'omit',
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null) as AncialV2Response<VoiceInviteTurn> | null;
    if (!response.ok || !payload?.success || !payload.data) {
      throw new Error(payload?.error || 'TURN unavailable');
    }
    return payload.data;
  }

  static async getTurnConfig<T = unknown>(): Promise<T> {
    return this.request<T>('/calls/Turn.php');
  }

  static async updatePresence<T = unknown>(
    params: Record<string, unknown>,
    options: Pick<RequestInit, 'keepalive'> = {},
  ): Promise<T> {
    return this.request<T>('/presence/Update.php', {
      method: 'POST',
      body: JSON.stringify(params),
      ...options,
    });
  }

  static async getPresence<T = unknown>(userIds: Array<string | number>): Promise<T> {
    return this.request<T>(`/presence/Status.php?ids=${encodeURIComponent(userIds.join(','))}`);
  }

  static async getPresencePrivacy<T = unknown>(): Promise<T> {
    return this.request<T>('/presence/Privacy.php');
  }

  static async updatePresencePrivacy<T = unknown>(params: object): Promise<T> {
    return this.request<T>('/presence/Privacy.php', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // --- GROUPS ---

  static async getGroupPage<T = unknown>(link: string): Promise<T> {
    return this.request<T>(`/groups/GetGroupPage.php?link=${encodeURIComponent(link)}`);
  }

  static async groupSubscription<T = unknown>(action: 'sub' | 'unsub', groupId: string | number): Promise<T> {
    const body = new URLSearchParams({ action, gid: String(groupId) });
    return this.request<T>('/groups/Subscription.php', { method: 'POST', body });
  }

  static async createGroup<T = unknown>(params: { gr_title: string, gr_desc: string }): Promise<T> {
    return this.request<T>('/groups/Create.php', { method: 'POST', body: new URLSearchParams(params as Record<string, string>) });
  }

  static async updateGroupInfo<T = unknown>(params: Record<string, string | number>): Promise<T> {
    const body = new URLSearchParams();
    const query = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (key === 'img' || key === 'cover') {
        query.set(key, String(value));
      } else {
        body.set(key, String(value));
      }
    });

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<T>(`/groups/UpdateInfo.php${queryString}`, { method: 'POST', body });
  }

  static async getManagedCommunities<T = unknown>(): Promise<T> {
    return this.request<T>('/groups/GetManaged.php');
  }

  // --- FRIENDS ---

  static async friendAction<T = unknown>(action: 'create' | 'add' | 'delete' | 'cancel', targetId: string | number): Promise<T> {
    const endpoint = (action === 'delete' || action === 'cancel') ? '/friends/Delete.php' : '/friends/Add.php';
    const params: Record<string, string> = { action };
    if (action === 'create') params.fid = String(targetId);
    else if (action === 'add') {
      params.frid = String(targetId);
      params.fid = String(targetId);
    } else {
      params.fid = String(targetId);
      params.frid = String(targetId);
    }
    
    return this.request<T>(endpoint, { method: 'POST', body: new URLSearchParams(params) });
  }

  // --- USER ---

  static async getProfile<T = unknown>(idOrLogin: string | number, full = false): Promise<T> {
    const val = String(idOrLogin ?? '').trim();
    const key = /^\d+$/.test(val) ? 'id' : 'login';
    return this.request<T>(`/user/GetProfile.php?${key}=${encodeURIComponent(val)}${full ? '&full=1' : ''}`);
  }

  static async getUserPage<T = unknown>(login: string): Promise<T> {
    return this.request<T>(`/user/GetProfile.php?login=${encodeURIComponent(login)}&full=1`);
  }

  static async report<T = unknown>(targetId: string | number, type: string | number, reason: string): Promise<T> {
    return this.request<T>('/user/Report.php', { method: 'POST', body: new URLSearchParams({ target_id: String(targetId), type: String(type), reason }) });
  }

  static async updateProfile<T = unknown>(params: Record<string, string | number>): Promise<T> {
    const body = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => body.set(key, String(value)));
    return this.request<T>('/user/UpdateProfile.php', { method: 'POST', body });
  }

  static async updateProfileMedia<T = unknown>(field: 'cover' | 'img', url: string): Promise<T> {
    return this.request<T>('/user/UpdateProfile.php', { method: 'POST', body: new URLSearchParams({ [field]: url }) });
  }

  static async securityAction<T = unknown>(action: 'change_password' | 'change_email_phone', params: Record<string, string>): Promise<T> {
    const body = new URLSearchParams({ action, ...params });
    return this.request<T>('/user/SecurityAction.php', { method: 'POST', body });
  }

  static async verifyEmailCode(code: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/verification/Email.php?action=verify&code=${encodeURIComponent(code)}`);
  }

  static async sendEmailVerification(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/verification/Email.php?action=send');
  }

  static async disconnectTelegram(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/oauth/Telegram.php?action=disconnect', { method: 'POST' });
  }

  static async disconnectYandex(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/oauth/Yandex.php?action=disconnect', { method: 'POST' });
  }

  static async getNotificationsResponse<T = unknown>(): Promise<AncialV2Response<T>> {
    return this.requestRaw<T>('/user/Notifications.php');
  }

  static async getNotifications<T = unknown>(): Promise<T> {
    return this.request<T>('/user/Notifications.php');
  }

  static async markNotificationsRead<T = unknown>(): Promise<T> {
    return this.request<T>('/user/Notifications.php', {
      method: 'POST',
      body: new URLSearchParams({ action: 'mark_read' }),
    });
  }

  static async clearNotifications<T = unknown>(): Promise<T> {
    return this.request<T>('/user/Notifications.php', { method: 'POST', body: new URLSearchParams({ action: 'clear' }) });
  }

  static async updatePushToken<T = unknown>(params: Record<string, string>): Promise<T> {
    const body = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => body.set(key, String(value)));
    return this.request<T>('/user/Notifications.php', { method: 'POST', body });
  }

  static async socialAction<T = unknown>(type: 'friends' | 'groups', query?: string): Promise<T> {
    const url = `/user/Social.php?type=${type}${query ? `&q=${encodeURIComponent(query)}` : ''}`;
    return this.request<T>(url);
  }

  // --- PULSE ---

  static async pulseGetHomePage<T = unknown>(type: string): Promise<T> {
    const response = await this.request<Record<string, unknown>>(`/pulse/GetHomePage.php?type=${type}`);
    return (response && typeof response === 'object' && type in response) ? response[type] as T : response as T;
  }

  static async pulseGetArtist<T = unknown>(id: string | number): Promise<T> {
    return this.request<T>(`/pulse/GetArtist.php?id=${id}`);
  }

  static async pulseGetPlaylistMeta<T = unknown>(id: string | number): Promise<T> {
    return this.request<T>(`/pulse/GetPlaylist.php?pid=${id}`);
  }

  static async pulseGetPlaylist<T = unknown>(params: { id?: string | number, pid?: string | number, gid?: string, aid?: string | number, tid?: string | number }): Promise<T> {
    const query = new URLSearchParams();
    if (params.id) query.set('pid', String(params.id));
    else if (params.pid) query.set('pid', String(params.pid));
    
    if (params.gid) query.set('gid', params.gid);
    
    // В V2 GetPlaylist может не поддерживать aid/tid напрямую, 
    // но мы оставим их для совместимости, если бэкенд их обрабатывает.
    if (params.aid) query.set('aid', String(params.aid));
    if (params.tid) query.set('tid', String(params.tid));
    
    const response = await this.request<{ tracks?: unknown } | unknown>(`/pulse/GetPlaylist.php?${query.toString()}`);
    return (response && typeof response === 'object' && 'tracks' in response) ? (response as { tracks: unknown }).tracks as T : response as T;
  }

  static async pulseGetTrack<T = unknown>(id: string | number): Promise<T> {
    return this.request<T>(`/pulse/GetTrack.php?id=${id}`);
  }

  /**
   * Получить следующую порцию треков для режима радио.
   * @param seedTrackId - ID трека-источника (на основе которого строится волна)
   * @param excludeIds  - ID уже воспроизведённых треков (не повторять)
   */
  static async pulseGetRadioWave<T = unknown>(
    seedTrackId: number | string,
    excludeIds: (number | string)[] = [],
  ): Promise<T> {
    const query = new URLSearchParams();
    query.set('gid', `Radio_${seedTrackId}`);
    if (excludeIds.length > 0) {
      query.set('exclude', excludeIds.join(','));
    }
    const response = await this.request<{ tracks?: unknown } | unknown>(`/pulse/GetPlaylist.php?${query.toString()}`);
    return (response && typeof response === 'object' && 'tracks' in response) ? (response as { tracks: unknown }).tracks as T : response as T;
  }


  static async pulseSearch<T = unknown>(query: string, type?: 'artists' | 'playlists' | 'tracks'): Promise<T> {
    const params = new URLSearchParams({ q: query });
    if (type) params.set('type', type);
    return this.request<T>(`/pulse/Search.php?${params.toString()}`);
  }

  static async pulseGetLibrary<T = unknown>(type: string): Promise<T> {
    const response = await this.request<Record<string, unknown>>(`/pulse/Library.php?type=${type}`);

    if (type === 'favorites') {
      const tracks = Array.isArray(response?.favorites) ? response.favorites : [];
      return { ids: tracks.map((t) => (typeof t === 'object' && t !== null ? ((t as { sid?: unknown }).sid ?? (t as { id?: unknown }).id) : t)).filter(Boolean) } as T;
    }

    if (type === 'all' || type === 'my' || type === 'my_playlists') {
      return {
        playlists: Array.isArray(response?.my_playlists) ? response.my_playlists : []
      } as T;
    }

    if (type === 'history') {
      type RawHistoryItem = { track?: { sid?: number | string; id?: number | string; title?: string; artist?: string; artwork?: Array<{ src?: string }>; explicit?: boolean }; date?: string };
      const historyItems = Array.isArray(response?.history) ? response.history : [];
      const mappedHistory = historyItems.map((item) => {
        const h = item as RawHistoryItem;
        if (h?.track) {
          return {
            HTYPE: '1',
            id: h.track.sid || h.track.id,
            name: h.track.title,
            artist: h.track.artist,
            img: Array.isArray(h.track.artwork) && h.track.artwork.length > 0 ? h.track.artwork[0].src : '',
            date: h.date,
            explicit: h.track.explicit
          };
        }
        return item;
      });
      return { history: mappedHistory } as T;
    }

    return response as T;
  }

  static async pulseTrackAction<T = unknown>(action: string, id: string | number): Promise<T> {
    const finalAction = action === 'listened' ? 'listen' : action;

    return this.request<T>('/pulse/TrackAction.php', {
      method: 'POST',
      body: new URLSearchParams({ action: finalAction, id: String(id) }),
    });
  }


  static async pulsePlaylistAction<T = unknown>(action: string, params: Record<string, string | number>): Promise<T> {
    const body = new URLSearchParams({ action });
    Object.entries(params).forEach(([key, value]) => body.set(key, String(value)));
    const response = await this.request<{ playlists?: unknown } | unknown>('/pulse/PlaylistAction.php', { method: 'POST', body });

    if (action === 'list') {
      return { data: Array.isArray(response) && 'playlists' in response ? (response as { playlists: unknown }).playlists : [] } as T;
    }

    return response as T;
  }

  static async pulseManagement<T = unknown>(target: string, action: string, data: unknown): Promise<T> {
    const isFormData = data instanceof FormData;
    const body = isFormData ? data : new URLSearchParams({ target, action, ...(data as Record<string, string>) });
    if (isFormData) {
        (data as FormData).append('target', target);
        (data as FormData).append('action', action);
    }
    return this.request<T>('/pulse/Management.php', { method: 'POST', body });
  }

  // --- OTHERS ---

  static async reportAction<T = unknown>(params: { id: string | number, type: string | number, comment: string }): Promise<T> {
    let typeStr = String(params.type);
    if (typeStr === '1') typeStr = 'user';
    else if (typeStr === '2') typeStr = 'post';
    else if (typeStr === '4') typeStr = 'comment';
    
    const body = new URLSearchParams({ 
      target_id: String(params.id), 
      type: typeStr, 
      reason: params.comment 
    });
    return this.request<T>('/Support.php', { method: 'POST', body });
  }

  static async search7tv<T = unknown>(query: string, limit = 24, exact = false, options?: RequestInit): Promise<T> {
    const url = `/7tv/Search.php?q=${encodeURIComponent(query)}&limit=${limit}${exact ? '&exact=1' : ''}`;
    return this.request<T>(url, options);
  }

  static async getStatic<T = unknown>(type: string): Promise<T> {
    return this.request<T>(`/info/GetStatic.php?type=${type}`);
  }

  // --- WALLET ---
  
  static async getWalletOverview(): Promise<WalletOverview> {
    return this.request<WalletOverview>('/wallet/Overview.php');
  }

  static async createAccount(title: string): Promise<{ id: number; message: string }> {
    return this.request<{ id: number; message: string }>('/wallet/Account.php?action=create', {
      method: 'POST',
      body: new URLSearchParams({ title })
    });
  }

  static async deleteAccount(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/wallet/Account.php?action=delete&id=${id}`, {
      method: 'POST'
    });
  }

  static async sendMoney(params: SendMoneyParams): Promise<{ transaction_id: number; amount: number; fees: number }> {
    const body = new URLSearchParams();
    body.set('sender_id', String(params.sender_id));
    body.set('amount', String(params.amount));
    body.set('comment', params.comment);
    if (params.receiver_id !== undefined) body.set('receiver_id', String(params.receiver_id));
    if (params.receiver_login !== undefined) body.set('receiver_login', params.receiver_login);
    if (params.receiver_email !== undefined) body.set('receiver_email', params.receiver_email);
    if (params.receiver_phone !== undefined) body.set('receiver_phone', params.receiver_phone);

    return this.request<{ transaction_id: number; amount: number; fees: number }>('/wallet/Transaction.php?action=send', {
      method: 'POST',
      body
    });
  }

  static async createTopup(amount: number, accountId: number): Promise<{ payment_url: string; order_hash: string }> {
    return this.request<{ payment_url: string; order_hash: string }>('/wallet/Topup.php?action=create', {
      method: 'POST',
      body: new URLSearchParams({ amount: String(amount), account_id: String(accountId) })
    });
  }

  static async cancelTopup(orderHash: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/wallet/Topup.php?action=cancel', {
      method: 'POST',
      body: new URLSearchParams({ order_hash: orderHash })
    });
  }

  static async generateQRCode(accountId: number): Promise<{ qr_data: string; qr_url: string }> {
    return this.request<{ qr_data: string; qr_url: string }>(`/wallet/QRCode.php?action=generate&account_id=${accountId}`);
  }

  static async getAccountInfo(id: number): Promise<WalletAccount> {
    return this.request<WalletAccount>(`/wallet/Account.php?action=info&id=${id}`);
  }

  static async getTransactions(params: { account_id?: number; sort?: string }): Promise<{ transactions: WalletTransaction[] }> {
    const query = new URLSearchParams();
    if (params.account_id !== undefined) query.set('account_id', String(params.account_id));
    if (params.sort !== undefined) query.set('sort', params.sort);
    return this.request<{ transactions: WalletTransaction[] }>(`/wallet/Transaction.php?action=list&${query.toString()}`);
  }

  static async getMerchants(): Promise<{ merchants: WalletMerchant[]; stats: WalletMerchantStats }> {
    return this.request<{ merchants: WalletMerchant[]; stats: WalletMerchantStats }>('/wallet/Merchant.php?action=list');
  }

  static async getMerchantInfo(id: number): Promise<{ merchant: WalletMerchantDetails; stats: { total_payments: number; total_earned: number }; orders: WalletMerchantOrder[] }> {
    return this.request<{ merchant: WalletMerchantDetails; stats: { total_payments: number; total_earned: number }; orders: WalletMerchantOrder[] }>(`/wallet/Merchant.php?action=info&id=${id}`);
  }

  static async updateMerchant(id: number, params: Partial<WalletMerchantDetails>): Promise<{ success: boolean; message?: string }> {
    const body = new URLSearchParams();
    body.set('id', String(id));
    if (params.img !== undefined) body.set('img', params.img);
    if (params.description !== undefined) body.set('description', params.description);
    if (params.s_url !== undefined) body.set('s_url', params.s_url);
    if (params.e_url !== undefined) body.set('e_url', params.e_url);
    if (params.c_url !== undefined) body.set('c_url', params.c_url);
    if (params.fee_paid !== undefined) body.set('fee_paid', params.fee_paid);

    return this.request<{ success: boolean; message?: string }>('/wallet/Merchant.php?action=update', {
      method: 'POST',
      body
    });
  }

  static async resolveQRCode(qrData: string): Promise<{ type: string; account_id?: number; account_name?: string; owner_name?: string; owner_login?: string }> {
    return this.request<{ type: string; account_id?: number; account_name?: string; owner_name?: string; owner_login?: string }>(`/wallet/QRCode.php?action=resolve&qr_data=${encodeURIComponent(qrData)}`);
  }

  static async createWithdrawal(params: {
    account_id: number;
    gateway_id: number;
    amount: number;
    details: string;
  }): Promise<{ success?: boolean; message?: string; transaction_id?: number }> {
    const body = new URLSearchParams();
    body.set('account_id', String(params.account_id));
    body.set('gateway_id', String(params.gateway_id));
    body.set('amount', String(params.amount));
    body.set('details', params.details);

    return this.request<{ success?: boolean; message?: string; transaction_id?: number }>('/wallet/Withdraw.php?action=create', {
      method: 'POST',
      body
    });
  }

  static async getGatewayForm(gatewayId: number): Promise<{ gateway: WalletGatewayForm }> {
    return this.request<{ gateway: WalletGatewayForm }>(`/wallet/GetGateWayForm.php?gateway=${gatewayId}`);
  }

  // --- PAY ---

  static async getPayOrderDetails(orderHash: string): Promise<PayOrderDetails> {
    return this.request<PayOrderDetails>(`/payments/GetOrderDetails.php?order_hash=${encodeURIComponent(orderHash)}`);
  }

  static async pollPayOrderStatus(orderHash: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/payments/PollStatus.php?order_hash=${encodeURIComponent(orderHash)}`);
  }

  static async redirectPayOrder(orderHash: string, gatewayId: string | number): Promise<{ payment_url: string; gateway_name: string }> {
    return this.request<{ payment_url: string; gateway_name: string }>('/payments/Redirect.php', {
      method: 'POST',
      body: new URLSearchParams({ order: orderHash, gateway: String(gatewayId) })
    });
  }
}
