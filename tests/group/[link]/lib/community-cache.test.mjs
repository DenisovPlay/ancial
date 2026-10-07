import assert from 'node:assert/strict';

import {
  communityStructureCacheKey,
  validateCachedCommunityStructure,
} from './community-types.ts';

assert.notEqual(
  communityStructureCacheKey(12, 7),
  communityStructureCacheKey(12, 8),
  'community permissions must be cached separately per viewer',
);
assert.equal(
  communityStructureCacheKey(12, null),
  'community_structure_cache:v1:guest:12',
);
assert.notEqual(
  communityStructureCacheKey(12, 'authenticated'),
  communityStructureCacheKey(12, null),
  'an authenticated viewer without a hydrated numeric id must not reuse guest permissions',
);

const emptyStructure = {
  community_id: 12,
  categories: [],
  channels: [],
  permissions: {},
  highest_role_position: null,
};

assert.deepEqual(
  validateCachedCommunityStructure(emptyStructure, 12),
  emptyStructure,
  'an empty channel list is valid cached data',
);
assert.equal(
  validateCachedCommunityStructure(emptyStructure, 99),
  null,
  'cached data from another community must not be reused',
);
assert.equal(
  validateCachedCommunityStructure({ ...emptyStructure, channels: null }, 12),
  null,
  'malformed cached data must be ignored',
);

console.log('community channel cache: ok');
