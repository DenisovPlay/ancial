# Pulse Backend Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Pulse audio, S3 operations, and lyrics from legacy Ancial subdomains to `https://backend.ru.zypo.cc` and update every backend/client URL producer and consumer.

**Architecture:** Pure helpers under `backend.ru.zypo/modules/pulse` own URL normalization, upload validation, object-key parsing, and Range parsing. V2 endpoints call one internal S3 storage service; `track.php` is the only S3 streaming proxy, while local MP3 files remain directly available under `/music`. Lyrics move unchanged at the public-contract boundary to `/api/V2`, with graceful cache fallback.

**Tech Stack:** PHP 8.1+ syntax, mysqli, cURL, AWS SDK for PHP, Memcached when available, Next.js/TypeScript.

## Global Constraints

- The only public host for migrated functionality is `backend.ru.zypo.cc`; do not add redirects or proxies for old domains.
- Preserve the current S3 endpoint, region, bucket, access key, and secret key exactly as requested.
- Move all 24 local MP3 files into `php-v2-api/backend.ru.zypo/music/`.
- Move the existing AWS SDK into `php-v2-api/backend.ru.zypo/modules/aws/`.
- Do not expose anonymous HTTP upload or delete endpoints.
- Keep V2 JSON responses in the `success`, `data`, `error` shape.
- Preserve the text/LRC response contract of `UniLyrics.php`.
- Do not modify the user's existing change in `app/pulse/player/pulse-player-full.tsx`.
- `/php-v2-api/` is intentionally ignored by Git. Modify it in place, but do not force-add the SDK or MP3 binaries to Git.

---

### Task 1: Pure Pulse URL and validation helpers

**Files:**
- Create: `php-v2-api/backend.ru.zypo/modules/pulse/config.php`
- Create: `php-v2-api/backend.ru.zypo/modules/pulse/helpers.php`
- Create: `php-v2-api/tests/pulse/bootstrap.php`
- Create: `php-v2-api/tests/pulse/helpers_test.php`

**Interfaces:**
- Produces: `pulse_storage_config(): array`
- Produces: `pulse_validate_audio_filename(string $filename): ?array`
- Produces: `pulse_public_track_url(string $filename): string`
- Produces: `pulse_normalize_track_src(string $src): string`
- Produces: `pulse_object_key_from_src(string $src): ?string`
- Produces: `pulse_parse_range(?string $header, int $size): array`
- Consumes: no DB, session, S3, or network.

- [ ] **Step 1: Write the failing helper tests**

Create a dependency-free assertion harness in `bootstrap.php` and table-driven
tests in `helpers_test.php`. The URL cases must include:

```php
$urlCases = [
    ['https://pulse.ancial.ru/music/a%20b.mp3', 'https://backend.ru.zypo.cc/music/a%20b.mp3'],
    ['https://anci.hb.ru-msk.vkcs.cloud/music/a.mp3', 'https://backend.ru.zypo.cc/track.php?track=a.mp3'],
    ['https://anci.hb.bizmrg.com/music/%D1%82%D1%80%D0%B5%D0%BA.mp3', 'https://backend.ru.zypo.cc/track.php?track=%D1%82%D1%80%D0%B5%D0%BA.mp3'],
    ['https://pulse.ancial.ru/track/a.mp3', 'https://backend.ru.zypo.cc/track.php?track=a.mp3'],
    ['https://backend.ru.zypo.cc/music/a.mp3', 'https://backend.ru.zypo.cc/music/a.mp3'],
    ['https://example.com/audio/a.mp3', 'https://example.com/audio/a.mp3'],
];
```

Add rejection assertions for `../a.mp3`, `%2e%2e%2fa.mp3`, `dir/a.mp3`,
control characters, empty names, and `.php`. Add object-key assertions for the
two S3 hosts and their `/music/` path. Add Range assertions:

```php
assert_same(['valid' => true, 'partial' => true, 'start' => 0, 'end' => 99], pulse_parse_range('bytes=0-99', 1000));
assert_same(['valid' => true, 'partial' => true, 'start' => 900, 'end' => 999], pulse_parse_range('bytes=-100', 1000));
assert_same(['valid' => false, 'partial' => false, 'start' => 0, 'end' => 999], pulse_parse_range('bytes=1000-', 1000));
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```bash
php php-v2-api/tests/pulse/helpers_test.php
```

Expected: non-zero exit because `modules/pulse/helpers.php` and its functions do
not exist.

- [ ] **Step 3: Implement configuration and pure helpers**

`config.php` returns a single configuration array with:

```php
[
    'public_base_url' => 'https://backend.ru.zypo.cc',
    's3_endpoint' => 'https://hb.ru-msk.vkcloud-storage.ru',
    's3_public_base_url' => 'https://anci.hb.bizmrg.com/music/',
    's3_region' => 'ru-msk',
    's3_bucket' => 'anci',
    's3_prefix' => 'music/',
    'max_upload_bytes' => 10388608,
    'cache_max_bytes' => 2147483648,
    'cache_ttl_seconds' => 604800,
];
```

Add `access_key` and `secret_key` entries by copying their exact current string
values from `php-v2-api/pulse.ancial/s3upd.php`; do not retype, transform,
rotate, redact, or print them during execution.

Implement strict basename validation, case-insensitive extension mapping for
`mp3`, `wav`, `ogg`, and `m4a`, URL parsing for the explicitly supported legacy
hosts, and a single-range parser. Do not use substring replacement for hosts or
paths.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
php php-v2-api/tests/pulse/helpers_test.php
php -l php-v2-api/backend.ru.zypo/modules/pulse/config.php
php -l php-v2-api/backend.ru.zypo/modules/pulse/helpers.php
```

Expected: all assertions pass and both files report no syntax errors.

- [ ] **Step 5: Record the task boundary**

Because `/php-v2-api/` is ignored, do not force-add these files. Record their
checksums for the final verification:

```bash
shasum -a 256 php-v2-api/backend.ru.zypo/modules/pulse/config.php php-v2-api/backend.ru.zypo/modules/pulse/helpers.php
```

---

### Task 2: Internal S3 storage service

**Files:**
- Create: `php-v2-api/backend.ru.zypo/modules/pulse/storage.php`
- Create: `php-v2-api/tests/pulse/storage_validation_test.php`
- Move: `php-v2-api/pulse.ancial/aws/` → `php-v2-api/backend.ru.zypo/modules/aws/`

**Interfaces:**
- Consumes: `pulse_storage_config()`, `pulse_validate_audio_filename()`, `Aws\S3\S3Client`
- Produces: `pulse_validate_uploaded_audio(array $file, ?callable $isUploadedFile = null, ?callable $detectMime = null): array`
- Produces: `pulse_create_s3_client(): Aws\S3\S3Client`
- Produces: `pulse_upload_audio(array $file): array`
- Produces: `pulse_delete_audio_by_src(string $src): bool`

- [ ] **Step 1: Write failing upload-validation tests**

Test real validation logic without S3. Inject upload-file and MIME callbacks so
tests can exercise the function using temporary fixtures:

```php
$valid = [
    'name' => 'song.mp3',
    'tmp_name' => __FILE__,
    'size' => 1024,
    'error' => UPLOAD_ERR_OK,
];

$result = pulse_validate_uploaded_audio(
    $valid,
    static fn(string $path): bool => true,
    static fn(string $path): string => 'audio/mpeg',
);
assert_same(true, $result['valid']);
assert_same('mp3', $result['extension']);
```

Add separate failing cases for upload error, file over 10,388,608 bytes,
unapproved extension, MIME mismatch, empty file, and a path that is not an HTTP
upload.

- [ ] **Step 2: Verify RED**

Run:

```bash
php php-v2-api/tests/pulse/storage_validation_test.php
```

Expected: non-zero exit because the storage functions are missing.

- [ ] **Step 3: Move the AWS SDK and implement storage**

Move the directory as one filesystem operation, excluding the redundant
`aws.zip` archive. Require:

```php
require_once __DIR__ . '/../aws/aws-autoloader.php';
```

Generate object names using:

```php
$filename = bin2hex(random_bytes(16)) . '.' . $validation['extension'];
$objectKey = $config['s3_prefix'] . $filename;
```

`pulse_upload_audio()` returns:

```php
[
    'object_key' => 'music/' . $filename,
    'source_url' => rtrim($config['s3_public_base_url'], '/') . '/' . rawurlencode($filename),
    'public_url' => 'https://backend.ru.zypo.cc/track.php?track=' . rawurlencode($filename),
];
```

Catch AWS exceptions, log a generic diagnostic server-side, and throw a
`RuntimeException('Audio storage operation failed')` without credentials or SDK
messages. Delete only a key returned by `pulse_object_key_from_src()`.

- [ ] **Step 4: Verify GREEN and SDK load**

Run:

```bash
php php-v2-api/tests/pulse/storage_validation_test.php
php -r "require 'php-v2-api/backend.ru.zypo/modules/aws/aws-autoloader.php'; exit(class_exists('Aws\\\\S3\\\\S3Client') ? 0 : 1);"
php -l php-v2-api/backend.ru.zypo/modules/pulse/storage.php
```

Expected: validation tests pass, AWS client class loads, syntax is valid.

- [ ] **Step 5: Confirm no redundant SDK archive**

Run:

```bash
test ! -e php-v2-api/backend.ru.zypo/modules/aws/aws.zip
test -e php-v2-api/backend.ru.zypo/modules/aws/aws-autoloader.php
```

---

### Task 3: Hardened audio streaming endpoint and local music move

**Files:**
- Create: `php-v2-api/backend.ru.zypo/track.php`
- Move: `php-v2-api/pulse.ancial/music/*.mp3` → `php-v2-api/backend.ru.zypo/music/`
- Create: `php-v2-api/tests/pulse/track_contract_test.php`

**Interfaces:**
- Consumes: `pulse_storage_config()`, `pulse_validate_audio_filename()`, `pulse_parse_range()`
- Produces: public `GET|HEAD /track.php?track={rawurlencoded filename}`

- [ ] **Step 1: Write failing endpoint-contract tests**

Keep network I/O outside the test. Assert the endpoint source requires helpers,
contains explicit `GET`/`HEAD` handling, enables TLS peer/host verification,
sets redirect following to false, and never contains the old absolute cache
path:

```php
$source = file_get_contents($trackPath);
assert_contains("pulse_validate_audio_filename", $source);
assert_contains("CURLOPT_SSL_VERIFYPEER => true", $source);
assert_contains("CURLOPT_FOLLOWLOCATION => false", $source);
assert_not_contains("/www/wwwroot/pulse.ancial.ru", $source);
```

- [ ] **Step 2: Verify RED**

Run:

```bash
php php-v2-api/tests/pulse/track_contract_test.php
```

Expected: failure because the new endpoint does not exist.

- [ ] **Step 3: Implement `track.php`**

Adapt the existing cache/Range behavior with these corrections:

- cache path is `__DIR__ . '/runtime/pulse-audio-cache/'`;
- accept only `GET` and `HEAD`;
- use the helper-validated filename;
- use fixed S3 base URL plus `rawurlencode($filename)`;
- use TLS verification and no redirects;
- accept only upstream HTTP 200;
- download into a unique `.tmp` file and atomically rename;
- clean lock/temp files on all failures;
- do not emit a response body for `HEAD`;
- return `416` with `Content-Range: bytes */<size>` for an invalid Range.

- [ ] **Step 4: Move local audio**

Create `backend.ru.zypo/music` and move all 24 `.mp3` files. Do not move
`uploadPLS.php`, because public anonymous upload is removed.

- [ ] **Step 5: Verify endpoint and file inventory**

Run:

```bash
php php-v2-api/tests/pulse/track_contract_test.php
php -l php-v2-api/backend.ru.zypo/track.php
test "$(find php-v2-api/backend.ru.zypo/music -maxdepth 1 -type f -name '*.mp3' | wc -l | tr -d ' ')" = "24"
test "$(find php-v2-api/pulse.ancial/music -maxdepth 1 -type f -name '*.mp3' | wc -l | tr -d ' ')" = "0"
```

---

### Task 4: Integrate storage and URL normalization into V2

**Files:**
- Modify: `php-v2-api/backend.ru.zypo/api/V2/pulse/Management.php`
- Modify: `php-v2-api/backend.ru.zypo/api/V2/Media.php`
- Modify: `php-v2-api/backend.ru.zypo/api/V2/admin/Music.php`
- Modify: `php-v2-api/backend.ru.zypo/api/V2/pulse/GetArtist.php`
- Modify: `php-v2-api/backend.ru.zypo/api/V2/pulse/GetPlaylist.php`
- Modify: `php-v2-api/backend.ru.zypo/api/V2/pulse/GetTrack.php`
- Modify: `php-v2-api/backend.ru.zypo/api/V2/pulse/Library.php`
- Modify: `php-v2-api/backend.ru.zypo/api/V2/pulse/Search.php`
- Create: `php-v2-api/tests/pulse/v2_contract_test.php`

**Interfaces:**
- Consumes: `pulse_upload_audio()`, `pulse_delete_audio_by_src()`, `pulse_normalize_track_src()`
- Preserves: current auth/ownership/admin checks and V2 JSON envelope.

- [ ] **Step 1: Write failing V2 source-contract tests**

For every response producer, assert it requires `modules/pulse/helpers.php` and
calls `pulse_normalize_track_src`. For upload/delete handlers, assert they
require `storage.php`, call the internal function, and contain none of:

```php
$forbidden = [
    'pulse.ancial.ru',
    's3delHIDDENsecret.php',
    'uploadPLS.php',
    'CURLOPT_SSL_VERIFYPEER, false',
];
```

- [ ] **Step 2: Verify RED**

Run:

```bash
php php-v2-api/tests/pulse/v2_contract_test.php
```

Expected: failure listing current legacy proxy calls and URL replacements.

- [ ] **Step 3: Replace upload proxies**

In `Management.php` and `Media.php`, call `pulse_upload_audio($_FILES['file'])`
after the existing session check. Store `source_url` in `music_songs`; return
`public_url` in JSON. Map validation failures to `400` or `413`, auth to `401`,
and storage failures to `502`, while keeping the V2 envelope.

- [ ] **Step 4: Replace delete proxies**

In user management, fetch the owned track from DB before calling
`pulse_delete_audio_by_src($row['src'])`. In admin management, retain the role-3
check before the same call. Delete the DB row only after a successful storage
delete, except when the `src` is not a managed S3 object.

- [ ] **Step 5: Replace every src rewrite**

Require `helpers.php` once per endpoint and replace each two-array
`str_replace(...)` with:

```php
$row['src'] = pulse_normalize_track_src((string)$row['src']);
```

Apply the same helper when building nested song arrays and lists.

- [ ] **Step 6: Remove legacy host dependencies from old PHP API files**

The old `/api/pulse` files remain outside the current public V2 contract but must
not depend on Ancial subdomains. Replace their track output with the shared
normalizer and their upload/delete network calls with storage functions where
those actions still exist.

- [ ] **Step 7: Verify GREEN**

Run:

```bash
php php-v2-api/tests/pulse/v2_contract_test.php
find php-v2-api/backend.ru.zypo/api/V2 php-v2-api/backend.ru.zypo/modules/pulse -type f -name '*.php' -print0 | xargs -0 -n1 php -l
```

Expected: source-contract tests pass; all PHP files report no syntax errors.

---

### Task 5: Move and harden lyrics endpoints

**Files:**
- Move/Modify: `php-v2-api/pulse-lyrics.ancial/UniLyrics.php` → `php-v2-api/backend.ru.zypo/api/V2/UniLyrics.php`
- Move/Modify: `php-v2-api/pulse-lyrics.ancial/ytm.php` → `php-v2-api/backend.ru.zypo/api/V2/ytm.php`
- Create: `php-v2-api/tests/pulse/lyrics_contract_test.php`

**Interfaces:**
- Preserves: `GET /api/V2/UniLyrics.php?a=&t=&d=&type=alternative` text/LRC response.
- Produces: `GET /api/V2/ytm.php?artist=&title=` JSON response.

- [ ] **Step 1: Write failing lyrics tests**

Test that a missing Memcached extension uses an in-memory/no-op cache adapter
instead of type-loading `Memcached` unconditionally. Source-contract assertions
must reject `var_dump`, default artist/title values, and the legacy
`pulse-lyrics.ancial` path.

- [ ] **Step 2: Verify RED**

Run:

```bash
php php-v2-api/tests/pulse/lyrics_contract_test.php
```

Expected: failure because endpoints have not moved and `MemcachedCache`
unconditionally instantiates the extension.

- [ ] **Step 3: Move and adjust `UniLyrics.php`**

Introduce a small cache interface. Use Memcached when
`class_exists('Memcached')` and the server is reachable; otherwise use a
request-local array cache. Preserve query parameters, Musixmatch/LRCLIB fallback,
CORS, and text output. Return `400` for missing parameters, `404` when no lyrics
exist, and `502` for provider failures without exposing provider tokens.

- [ ] **Step 4: Move and clean `ytm.php`**

Remove `var_dump`, placeholder defaults, and the sample-execution behavior.
Require non-empty `artist` and `title`; return `400` for invalid input, `404` for
no lyrics, and `502` for upstream failures.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
php php-v2-api/tests/pulse/lyrics_contract_test.php
php -l php-v2-api/backend.ru.zypo/api/V2/UniLyrics.php
php -l php-v2-api/backend.ru.zypo/api/V2/ytm.php
```

---

### Task 6: Update the client endpoint

**Files:**
- Modify: `app/config.ts`
- Verify only: `app/pulse/player/lyrics-service.ts`

**Interfaces:**
- Produces: `PULSE_LYRICS_BASE = 'https://backend.ru.zypo.cc/api/V2'`
- Preserves: `${PULSE_LYRICS_BASE}/UniLyrics.php?...`

- [ ] **Step 1: Write a failing configuration assertion**

Run:

```bash
node -e "const fs=require('fs'); const s=fs.readFileSync('app/config.ts','utf8'); if(!s.includes(\"PULSE_LYRICS_BASE = 'https://backend.ru.zypo.cc/api/V2'\")) process.exit(1)"
```

Expected: exit 1 because the old lyrics host is configured.

- [ ] **Step 2: Change the central config**

Change only the `PULSE_LYRICS_BASE` value and its comment. Do not modify
`lyrics-service.ts` unless its constructed path differs from
`/api/V2/UniLyrics.php`.

- [ ] **Step 3: Verify GREEN and tracked diff**

Run:

```bash
node -e "const fs=require('fs'); const s=fs.readFileSync('app/config.ts','utf8'); if(!s.includes(\"PULSE_LYRICS_BASE = 'https://backend.ru.zypo.cc/api/V2'\")) process.exit(1)"
npx eslint app/config.ts app/pulse/player/lyrics-service.ts
git diff --check -- app/config.ts
git diff -- app/config.ts
```

Expected: assertion and ESLint pass; diff contains only the endpoint/comment
change and does not include `pulse-player-full.tsx`.

- [ ] **Step 4: Commit the tracked client change**

```bash
git add app/config.ts
git commit -m "fix: point Pulse lyrics to unified backend"
```

---

### Task 7: Remove legacy source trees and complete repository-wide verification

**Files:**
- Delete remaining: `php-v2-api/pulse.ancial/`
- Delete remaining: `php-v2-api/pulse-lyrics.ancial/`
- Verify: all files created or modified in Tasks 1–6

**Interfaces:**
- Consumes: every prior task deliverable.
- Produces: one consolidated backend tree with no runtime dependency on the old subdomains.

- [ ] **Step 1: Confirm all required artifacts exist before deletion**

Run:

```bash
test -e php-v2-api/backend.ru.zypo/track.php
test -e php-v2-api/backend.ru.zypo/modules/aws/aws-autoloader.php
test -e php-v2-api/backend.ru.zypo/api/V2/UniLyrics.php
test -e php-v2-api/backend.ru.zypo/api/V2/ytm.php
test "$(find php-v2-api/backend.ru.zypo/music -maxdepth 1 -type f -name '*.mp3' | wc -l | tr -d ' ')" = "24"
```

- [ ] **Step 2: Delete only the two resolved legacy directories**

Remove exactly:

```text
php-v2-api/pulse.ancial/
php-v2-api/pulse-lyrics.ancial/
```

Do not delete or recreate `php-v2-api`, `backend.ru.zypo`, or any broader path.

- [ ] **Step 3: Run all PHP tests and syntax checks**

Run:

```bash
for test_file in php-v2-api/tests/pulse/*_test.php; do php "$test_file" || exit 1; done
find php-v2-api/backend.ru.zypo -type f -name '*.php' -print0 | xargs -0 -n1 php -l
```

Expected: all tests and syntax checks pass.

- [ ] **Step 4: Scan for forbidden legacy hosts**

Run:

```bash
rg -n -g '!node_modules/**' -g '!docs/**' -g '!*.mp3' -g '!modules/aws/**' \
  'pulse\\.ancial|pulse-lyrics\\.ancial|lyrics\\.pulse\\.zypo\\.cc' \
  app php-v2-api/backend.ru.zypo
```

Expected: no matches. S3 host strings may remain only in
`modules/pulse/config.php`, `modules/pulse/helpers.php`, and tests.

- [ ] **Step 5: Run client verification**

Run:

```bash
npx eslint app/config.ts app/pulse/player/lyrics-service.ts
npm run build
```

Expected: both commands pass. If the full build fails from an unrelated
pre-existing issue, capture the exact output and prove the scoped ESLint and
configuration assertion still pass.

- [ ] **Step 6: Check file inventory and unrelated user changes**

Run:

```bash
find php-v2-api/backend.ru.zypo/music -maxdepth 1 -type f -name '*.mp3' | sort
du -sh php-v2-api/backend.ru.zypo/modules/aws php-v2-api/backend.ru.zypo/music
git status --short
```

Expected: 24 MP3 files, the SDK under `modules/aws`, no legacy directories, and
the user's `app/pulse/player/pulse-player-full.tsx` modification remains
untouched.

- [ ] **Step 7: Summarize deployment requirements**

Report that deployment must copy the ignored `php-v2-api/backend.ru.zypo`
filesystem tree, ensure PHP can write `backend.ru.zypo/runtime/pulse-audio-cache`,
and provide the existing Memcached service only as an optional cache. Do not
claim live S3/DB success without a deployed integration test.
