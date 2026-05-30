'use client';

import { authFetch } from './auth-fetch';

/**
 * Standard Ancial API V2 Response wrapper
 */
export interface AncialV2Response<T> {
  success: boolean;
  data: T;
  error: string | null;
}

/**
 * Centralized client for Ancial API V2
 */
export class AncialAPI {
  private static BASE_URL = '/api/V2';

  /**
   * Generic request handler for V2 API
   */
  public static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = endpoint.startsWith('/') ? `${this.BASE_URL}${endpoint}` : `${this.BASE_URL}/${endpoint}`;
    const response = await authFetch(url, options);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const result: AncialV2Response<T> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Unknown API error');
    }

    return result.data;
  }

  // --- AUTH ---

  static async login<T = unknown>(params: { login?: string, password?: string, token?: string }): Promise<T> {
    return this.request<T>('/auth/Login.php', {
      method: 'POST',
      body: new URLSearchParams(params as Record<string, string>)
    });
  }

  static async logout<T = unknown>(): Promise<T> {
    return this.request<T>('/auth/LogOut.php');
  }

  static async checkStatus<T = unknown>(): Promise<T> {
    return this.request<T>('/auth/CheckStatus.php');
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
    return this.request<T>(`/messages/UpdateBackground.php?diid=${dialogId}&img=${encodeURIComponent(imageUrl)}`);
  }

  static async getTurnConfig<T = unknown>(): Promise<T> {
    return this.request<T>('/calls/Turn.php');
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

  // --- FRIENDS ---

  static async friendAction<T = unknown>(action: 'create' | 'add' | 'delete' | 'cancel', targetId: string | number): Promise<T> {
    const endpoint = (action === 'delete' || action === 'cancel') ? '/friends/Delete.php' : '/friends/Add.php';
    const params: Record<string, string> = { action };
    if (action === 'create') params.fid = String(targetId);
    else if (action === 'add') params.frid = String(targetId);
    else params.fid = String(targetId);
    
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
    return this.request<T>('/user/UpdateInfo.php', { method: 'POST', body: new URLSearchParams({ [field]: url }) });
  }

  static async securityAction<T = unknown>(action: 'change_password' | 'change_email_phone', params: Record<string, string>): Promise<T> {
    const body = new URLSearchParams({ action, ...params });
    return this.request<T>('/user/SecurityAction.php', { method: 'POST', body });
  }

  static async getNotifications<T = unknown>(): Promise<T> {
    return this.request<T>('/user/Notifications.php');
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
    const response = await this.request<any>(`/pulse/GetHomePage.php?type=${type}`);
    return (response && typeof response === 'object' && type in response) ? response[type] : response;
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
    
    const response = await this.request<any>(`/pulse/GetPlaylist.php?${query.toString()}`);
    return (response && typeof response === 'object' && 'tracks' in response) ? response.tracks : response;
  }

  static async pulseGetTrack<T = unknown>(id: string | number): Promise<T> {
    return this.request<T>(`/pulse/GetTrack.php?id=${id}`);
  }

  static async pulseSearch<T = unknown>(query: string): Promise<T> {
    return this.request<T>(`/pulse/Search.php?q=${encodeURIComponent(query)}`);
  }

  static async pulseGetLibrary<T = unknown>(type: string): Promise<T> {
    const response = await this.request<any>(`/pulse/Library.php?type=${type}`);

    if (type === 'favorites') {
      const tracks = Array.isArray(response?.favorites) ? response.favorites : [];
      return { ids: tracks.map((t: any) => t.sid || t.id).filter(Boolean) } as T;
    }

    if (type === 'all' || type === 'my' || type === 'my_playlists') {
      return {
        playlists: Array.isArray(response?.my_playlists) ? response.my_playlists : []
      } as T;
    }

    if (type === 'history') {
      const historyItems = Array.isArray(response?.history) ? response.history : [];
      const mappedHistory = historyItems.map((item: any) => {
        if (item?.track) {
          return {
            HTYPE: '1',
            id: item.track.sid || item.track.id,
            name: item.track.title,
            artist: item.track.artist,
            img: Array.isArray(item.track.artwork) && item.track.artwork.length > 0 ? item.track.artwork[0].src : '',
            date: item.date,
            explicit: item.track.explicit
          };
        }
        return item;
      });
      return { history: mappedHistory } as T;
    }

    return response as T;
  }

  static async pulseTrackAction<T = unknown>(action: string, id: string | number): Promise<T> {
    if (action === 'add_favorite') {
      const response = await this.request<{ message?: string }>('/pulse/TrackAction.php', {
        method: 'POST',
        body: new URLSearchParams({ action: 'like', id: String(id) })
      });
      if (response?.message === 'Already in favorites') {
        await this.request<{ message?: string }>('/pulse/TrackAction.php', {
          method: 'POST',
          body: new URLSearchParams({ action: 'unlike', id: String(id) })
        });
        return { message: 'REMOVED' } as T;
      }
      return { message: 'ADDED' } as T;
    }

    const finalAction = action === 'listened' ? 'listen' : action;

    return this.request<T>('/pulse/TrackAction.php', {
      method: 'POST',
      body: new URLSearchParams({ action: finalAction, id: String(id) })
    });
  }

  static async pulsePlaylistAction<T = unknown>(action: string, params: Record<string, string | number>): Promise<T> {
    const body = new URLSearchParams({ action });
    Object.entries(params).forEach(([key, value]) => body.set(key, String(value)));
    const response = await this.request<any>('/pulse/PlaylistAction.php', { method: 'POST', body });
    
    if (action === 'list') {
      return { data: Array.isArray(response?.playlists) ? response.playlists : [] } as T;
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
}
