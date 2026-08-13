'use client';

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { AncialAPI } from '../../../lib/api-v2';
import { cache } from '../../../lib/cache.ts';
import { globalWS } from '../../../lib/global-ws';
import {
  COMMUNITY_INVALIDATION_DELAY_MS,
  communityEventMatches,
  communityStructureCacheKey,
  validateCachedCommunityStructure,
  type CommunityStructure,
} from '../lib/community-types';

const COMMUNITY_EVENTS = [
  'community:structure_changed',
  'community:permissions_changed',
  'community:role_changed',
  'community:member_roles_changed',
  'community:member_restricted',
  'community:link_request_changed',
];

export function useCommunityStructure(communityId: number) {
  const { isAuthenticated, user } = useAuth();
  const viewerId = isAuthenticated ? (user?.id || 'authenticated') : null;
  const cacheKey = useMemo(
    () => communityStructureCacheKey(communityId, viewerId),
    [communityId, viewerId],
  );
  const [structure, setStructure] = useState<CommunityStructure | null>(() => (
    communityId > 0
      ? validateCachedCommunityStructure(
        cache.get<unknown>(cacheKey, { category: 'groups', subcategory: 'profile' }),
        communityId,
      )
      : null
  ));
  const hasUsableStructureRef = useRef(structure !== null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [failed, setFailed] = useState(false);

  const refreshStructure = useCallback(async () => {
    if (communityId <= 0) return;
    try {
      const next = await AncialAPI.communityStructure(communityId);
      const validated = validateCachedCommunityStructure(next, communityId);
      if (!validated) throw new Error('Invalid community structure response');
      hasUsableStructureRef.current = true;
      setStructure(validated);
      cache.set(cacheKey, validated, { category: 'groups', subcategory: 'profile' });
      setFailed(false);
    } catch (error) {
      console.error('Community channels loading failed', error);
      if (!hasUsableStructureRef.current) setFailed(true);
    }
  }, [cacheKey, communityId]);
  const refresh = useEffectEvent(() => void refreshStructure());

  useEffect(() => {
    if (communityId <= 0) return;
    const cached = validateCachedCommunityStructure(
      cache.get<unknown>(cacheKey, { category: 'groups', subcategory: 'profile' }),
      communityId,
    );
    if (cached) {
      hasUsableStructureRef.current = true;
      const cachedTimer = setTimeout(() => setStructure(cached), 0);
      const timer = setTimeout(refresh, 0);
      return () => { clearTimeout(cachedTimer); clearTimeout(timer); };
    }
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [cacheKey, communityId]);

  useEffect(() => {
    if (communityId <= 0) return;
    const invalidate = (raw?: unknown) => {
      if (!communityEventMatches(raw, communityId)) return;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(refresh, COMMUNITY_INVALIDATION_DELAY_MS);
    };
    COMMUNITY_EVENTS.forEach((event) => globalWS.addDialogListener(event, invalidate));
    return () => {
      COMMUNITY_EVENTS.forEach((event) => globalWS.removeDialogListener(event, invalidate));
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [communityId]);

  return { failed, refreshStructure, structure };
}
