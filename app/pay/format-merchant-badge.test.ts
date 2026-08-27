import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMerchantBadge } from './format-merchant-badge.ts';
import { ru } from '../locales/ru.ts';
import { en } from '../locales/en.ts';
import { be } from '../locales/be.ts';

test('formatMerchantBadge handles key/count format for English', () => {
  assert.equal(formatMerchantBadge({ badge_key: 'years', badge_count: 1 }, en), '1 year');
  assert.equal(formatMerchantBadge({ badge_key: 'years', badge_count: 3 }, en), '3 years');
  assert.equal(formatMerchantBadge({ badge_key: 'years', badge_count: 5 }, en), '5 years');
  assert.equal(formatMerchantBadge({ badge_key: 'years', badge_count: 21 }, en), '21 years');

  assert.equal(formatMerchantBadge({ badge_key: 'months', badge_count: 1 }, en), '1 month');
  assert.equal(formatMerchantBadge({ badge_key: 'months', badge_count: 4 }, en), '4 months');

  assert.equal(formatMerchantBadge({ badge_key: 'pay_less_than_month', badge_count: 0 }, en), 'less than a month');
});

test('formatMerchantBadge handles key/count format for Russian', () => {
  assert.equal(formatMerchantBadge({ badge_key: 'years', badge_count: 1 }, ru), '1 год');
  assert.equal(formatMerchantBadge({ badge_key: 'years', badge_count: 3 }, ru), '3 года');
  assert.equal(formatMerchantBadge({ badge_key: 'years', badge_count: 5 }, ru), '5 лет');
  assert.equal(formatMerchantBadge({ badge_key: 'years', badge_count: 21 }, ru), '21 год');

  assert.equal(formatMerchantBadge({ badge_key: 'months', badge_count: 1 }, ru), '1 месяц');
  assert.equal(formatMerchantBadge({ badge_key: 'months', badge_count: 2 }, ru), '2 месяца');
  assert.equal(formatMerchantBadge({ badge_key: 'months', badge_count: 5 }, ru), '5 месяцев');

  assert.equal(formatMerchantBadge({ badge_key: 'pay_less_than_month', badge_count: 0 }, ru), 'менее месяца');
});

test('formatMerchantBadge handles key/count format for Belarusian', () => {
  assert.equal(formatMerchantBadge({ badge_key: 'years', badge_count: 1 }, be), '1 год');
  assert.equal(formatMerchantBadge({ badge_key: 'years', badge_count: 3 }, be), '3 гады');
  assert.equal(formatMerchantBadge({ badge_key: 'years', badge_count: 5 }, be), '5 гадоў');
  assert.equal(formatMerchantBadge({ badge_key: 'years', badge_count: 21 }, be), '21 год');

  assert.equal(formatMerchantBadge({ badge_key: 'months', badge_count: 1 }, be), '1 месяц');
  assert.equal(formatMerchantBadge({ badge_key: 'months', badge_count: 3 }, be), '3 месяцы');
  assert.equal(formatMerchantBadge({ badge_key: 'months', badge_count: 6 }, be), '6 месяцаў');

  assert.equal(formatMerchantBadge({ badge_key: 'pay_less_than_month', badge_count: 0 }, be), 'менш за месяц');
});

test('formatMerchantBadge backwards-compatibility parses raw Russian badge string', () => {
  assert.equal(formatMerchantBadge({ badge: '3 года' }, en), '3 years');
  assert.equal(formatMerchantBadge({ badge: '3 года' }, be), '3 гады');
  assert.equal(formatMerchantBadge({ badge: '3 года' }, ru), '3 года');

  assert.equal(formatMerchantBadge({ badge: 'менее месяца' }, en), 'less than a month');
  assert.equal(formatMerchantBadge({ badge: 'менее месяца' }, be), 'менш за месяц');
});
