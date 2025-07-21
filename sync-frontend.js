const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const sourcePath = './frontend-rn';
const targetPath = './expo-app';

// 제외할 폴더/파일 패턴
const excludePatterns = [
  '**/node_modules/**',
  '**/android/**',
  '**/ios/**',
  '**/build/**',
  '**/.expo/**',
  '**/package-lock.json',
  '**/package.json',
  '**/app.json',
  '**/tsconfig.json'
];

// 복사할 파일 패턴 (주로 소스코드)
const includePatterns = [
  '**/*.tsx',
  '**/*.ts',
  '**/*.js',
  '**/*.jsx',
  '**/assets/**',
  '**/*.json'
];

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  try {
    fs.copyFileSync(src, dest);
    console.log(`✅ Copied: ${src} -> ${dest}`);
  } catch (error) {
    console.error(`❌ Error copying ${src}:`, error.message);
  }
}

function getTargetPath(filePath) {
  const relativePath = path.relative(sourcePath, filePath);
  
  // App.tsx를 App.tsx로 유지
  if (relativePath === 'App.tsx') {
    return path.join(targetPath, 'App.tsx');
  }
  
  return path.join(targetPath, relativePath);
}

// 파일 감시 시작
console.log('🔍 Starting file watcher...');
console.log(`📁 Source: ${path.resolve(sourcePath)}`);
console.log(`📁 Target: ${path.resolve(targetPath)}`);

const watcher = chokidar.watch(sourcePath, {
  ignored: excludePatterns,
  persistent: true,
  ignoreInitial: false
});

watcher
  .on('add', filePath => {
    const targetFilePath = getTargetPath(filePath);
    copyFile(filePath, targetFilePath);
  })
  .on('change', filePath => {
    const targetFilePath = getTargetPath(filePath);
    copyFile(filePath, targetFilePath);
  })
  .on('unlink', filePath => {
    const targetFilePath = getTargetPath(filePath);
    if (fs.existsSync(targetFilePath)) {
      fs.unlinkSync(targetFilePath);
      console.log(`🗑️ Deleted: ${targetFilePath}`);
    }
  })
  .on('ready', () => {
    console.log('✨ Initial scan complete. Ready for changes!');
  })
  .on('error', error => {
    console.error('❌ Watcher error:', error);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping file watcher...');
  watcher.close();
  process.exit(0);
});