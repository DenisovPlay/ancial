import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_LOGO = path.join(ROOT, 'public/img/zypo/logo.webp');
const SRC_ROUND = path.join(ROOT, 'public/img/zypo/logo-rounded.webp');

const TMP_PNG = '/tmp/zypo_icon_master.png';
const TMP_ROUND_PNG = '/tmp/zypo_icon_round_master.png';

console.log('🔄 Converting source webp to master PNG...');
execSync(`sips -s format png "${SRC_LOGO}" --out "${TMP_PNG}"`, { stdio: 'inherit' });
execSync(`sips -s format png "${SRC_ROUND}" --out "${TMP_ROUND_PNG}"`, { stdio: 'inherit' });

// Android mipmap configurations
const ANDROID_DENSITIES = [
  { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
];

const RES_DIR = path.join(ROOT, 'android/app/src/main/res');

for (const d of ANDROID_DENSITIES) {
  const targetDir = path.join(RES_DIR, d.dir);
  fs.mkdirSync(targetDir, { recursive: true });

  const icLauncher = path.join(targetDir, 'ic_launcher.png');
  const icLauncherRound = path.join(targetDir, 'ic_launcher_round.png');
  const icLauncherFg = path.join(targetDir, 'ic_launcher_foreground.png');

  // ic_launcher.png (square/legacy)
  execSync(`sips -z ${d.size} ${d.size} "${TMP_PNG}" --out "${icLauncher}"`, { stdio: 'ignore' });
  // ic_launcher_round.png (round)
  execSync(`sips -z ${d.size} ${d.size} "${TMP_ROUND_PNG}" --out "${icLauncherRound}"`, { stdio: 'ignore' });
  // ic_launcher_foreground.png (for adaptive icon)
  execSync(`sips -z ${d.fgSize} ${d.fgSize} "${TMP_ROUND_PNG}" --out "${icLauncherFg}"`, { stdio: 'ignore' });

  console.log(`✅ Generated Android icons for ${d.dir} (${d.size}x${d.size}, fg ${d.fgSize}x${d.fgSize})`);
}

// iOS AppIcon
const IOS_ICON_DIR = path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
if (fs.existsSync(IOS_ICON_DIR)) {
  const iosIcon = path.join(IOS_ICON_DIR, 'AppIcon-512@2x.png');
  execSync(`sips -z 1024 1024 "${TMP_PNG}" --out "${iosIcon}"`, { stdio: 'ignore' });
  console.log(`✅ Generated iOS AppIcon-512@2x.png (1024x1024)`);
}

console.log('🎉 All mobile app icons generated successfully!');
