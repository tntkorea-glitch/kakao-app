/**
 * 카카오톡 자동 발송기 - Electron 메인 프로세스
 *
 * 역할:
 * 1. 웹 서버 URL을 BrowserWindow에 로드
 * 2. preload.js를 통해 네이티브 API를 웹에 노출
 * 3. IPC로 카카오톡 제어 명령 처리
 * 4. 버전 체크 + 자동 업데이트
 */

const { app, BrowserWindow, ipcMain, clipboard, shell } = require('electron');
const remoteMain = require('@electron/remote/main');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { machineIdSync } = require('node-machine-id');
const { exec, execSync } = require('child_process');

// Squirrel 설치/업데이트 이벤트 처리
if (require('electron-squirrel-startup')) app.quit();

remoteMain.initialize();

// ============================================================
// 설정
// ============================================================
const isDev = process.argv.includes('--dev');
const DEV_URL = 'http://localhost:3200';
const PROD_URL = 'https://kakao-app.vercel.app'; // 배포 후 변경
const SERVER_URL = isDev ? DEV_URL : PROD_URL;

let mainWindow;

// ============================================================
// 로그
// ============================================================
const logDir = app.getPath('userData');
const logStream = fs.createWriteStream(path.join(logDir, 'app.log'), { flags: 'a' });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  logStream.write(line + '\n');
  if (isDev) console.log(line);
}

// ============================================================
// 윈도우 생성
// ============================================================
async function createWindow() {
  log('Creating main window');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // 원격 URL에서 preload 브릿지 허용
    },
  });

  remoteMain.enable(mainWindow.webContents);
  mainWindow.setMenuBarVisibility(false);

  // 버전 체크
  try {
    const currentVersion = require('./package.json').version;
    log(`Current version: ${currentVersion}`);

    const res = await axios.get(`${SERVER_URL}/api/version`, { timeout: 5000 });
    const latestVersion = res.data.version;
    log(`Latest version: ${latestVersion}`);

    if (currentVersion !== latestVersion && res.data.downloadUrl) {
      log('Update available, loading update page');
      mainWindow.loadURL(`${SERVER_URL}/update?v=${latestVersion}`);
      return;
    }
  } catch (err) {
    log(`Version check failed: ${err.message}`);
  }

  // 메인 페이지 로드
  log(`Loading: ${SERVER_URL}`);
  mainWindow.loadURL(SERVER_URL);

  // DevTools는 Ctrl+Shift+I로 수동으로 열 수 있음
  // if (isDev) mainWindow.webContents.openDevTools();
}

// ============================================================
// IPC 핸들러 - 카카오톡 제어
// ============================================================

// PC 고유 ID (라이선스용)
ipcMain.handle('get-machine-id', async () => {
  return machineIdSync({ original: true });
});

// 카카오톡 창 찾기
ipcMain.handle('kakao:find-window', async () => {
  try {
    const result = execSync(
      'powershell -Command "Get-Process KakaoTalk -ErrorAction SilentlyContinue | Select-Object -First 1 | ForEach-Object { $_.MainWindowHandle }"',
      { encoding: 'utf8', timeout: 5000 }
    ).trim();
    return { found: result !== '' && result !== '0', handle: result };
  } catch {
    return { found: false, handle: null };
  }
});

// 카카오톡 활성화
ipcMain.handle('kakao:activate', async () => {
  try {
    execSync(
      'powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $kakao = Get-Process KakaoTalk -ErrorAction SilentlyContinue | Select-Object -First 1; if ($kakao) { [void][System.Reflection.Assembly]::LoadWithPartialName(\'Microsoft.VisualBasic\'); [Microsoft.VisualBasic.Interaction]::AppActivate($kakao.Id) }"',
      { encoding: 'utf8', timeout: 5000 }
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 키 입력 시뮬레이션
ipcMain.handle('kakao:send-keys', async (_, keys) => {
  try {
    execSync(
      `powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys('${keys}')"`,
      { encoding: 'utf8', timeout: 5000 }
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 클립보드에 텍스트 복사 + 붙여넣기
ipcMain.handle('kakao:paste-text', async (_, text) => {
  try {
    clipboard.writeText(text);
    await sleep(100);
    execSync(
      'powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys(\'^v\')"',
      { encoding: 'utf8', timeout: 5000 }
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 클립보드에 이미지 복사 + 붙여넣기
ipcMain.handle('kakao:paste-image', async (_, imagePath) => {
  try {
    // PowerShell로 이미지를 클립보드에 복사
    execSync(
      `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $img = [System.Drawing.Image]::FromFile('${imagePath.replace(/'/g, "''")}'); [System.Windows.Forms.Clipboard]::SetImage($img); $img.Dispose()"`,
      { encoding: 'utf8', timeout: 10000 }
    );
    await sleep(300);
    execSync(
      'powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys(\'^v\')"',
      { encoding: 'utf8', timeout: 5000 }
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Enter 키 전송
ipcMain.handle('kakao:press-enter', async () => {
  try {
    execSync(
      'powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys(\'{ENTER}\')"',
      { encoding: 'utf8', timeout: 5000 }
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ESC 키 전송
ipcMain.handle('kakao:press-escape', async () => {
  try {
    execSync(
      'powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $wshell.SendKeys(\'{ESC}\')"',
      { encoding: 'utf8', timeout: 5000 }
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 채팅방 검색 → 진입 → 메시지 전송 → 나가기 (통합)
// fileFirst: true면 파일→텍스트 순서, false(기본)면 텍스트→파일이 아닌 기존 로직(이미지→텍스트) 유지
ipcMain.handle('kakao:send-to-room', async (_, { roomName, message, imagePath, fileFirst }) => {
  try {
    // 1. 카카오톡 활성화
    execSync(
      'powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $kakao = Get-Process KakaoTalk -ErrorAction SilentlyContinue | Select-Object -First 1; if ($kakao) { [void][System.Reflection.Assembly]::LoadWithPartialName(\'Microsoft.VisualBasic\'); [Microsoft.VisualBasic.Interaction]::AppActivate($kakao.Id) }"',
      { encoding: 'utf8', timeout: 5000 }
    );
    await sleep(300);

    const wshell = '$wshell = New-Object -ComObject WScript.Shell;';

    // 2. 채팅탭으로 이동
    execSync(`powershell -Command "${wshell} $wshell.SendKeys('^1'); Start-Sleep -Milliseconds 200; $wshell.SendKeys('^2')"`, { encoding: 'utf8', timeout: 5000 });
    await sleep(500);

    // 3. 채팅방 검색 열기 (Ctrl+F)
    execSync(`powershell -Command "${wshell} $wshell.SendKeys('^f')"`, { encoding: 'utf8', timeout: 5000 });
    await sleep(500);

    // 4. 검색창 초기화 + 채팅방 이름 입력
    clipboard.writeText(roomName);
    await sleep(100);
    execSync(`powershell -Command "${wshell} $wshell.SendKeys('^a'); Start-Sleep -Milliseconds 100; $wshell.SendKeys('{DELETE}'); Start-Sleep -Milliseconds 100; $wshell.SendKeys('^v')"`, { encoding: 'utf8', timeout: 5000 });
    await sleep(1000);

    // 5. 첫 번째 결과로 진입 (Enter)
    execSync(`powershell -Command "${wshell} $wshell.SendKeys('{ENTER}')"`, { encoding: 'utf8', timeout: 5000 });
    await sleep(1000);

    // 파일 전송 헬퍼
    const sendFile = async () => {
      if (!imagePath) return;
      execSync(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $img = [System.Drawing.Image]::FromFile('${imagePath.replace(/'/g, "''")}'); [System.Windows.Forms.Clipboard]::SetImage($img); $img.Dispose()"`,
        { encoding: 'utf8', timeout: 10000 }
      );
      await sleep(300);
      execSync(`powershell -Command "${wshell} $wshell.SendKeys('^v')"`, { encoding: 'utf8', timeout: 5000 });
      await sleep(1000);
      execSync(`powershell -Command "${wshell} $wshell.SendKeys('{ENTER}')"`, { encoding: 'utf8', timeout: 5000 });
      await sleep(500);
    };

    // 텍스트 전송 헬퍼
    const sendText = async () => {
      if (!message || !message.trim()) return;
      clipboard.writeText(message);
      await sleep(100);
      execSync(`powershell -Command "${wshell} $wshell.SendKeys('^v')"`, { encoding: 'utf8', timeout: 5000 });
      await sleep(200);
      execSync(`powershell -Command "${wshell} $wshell.SendKeys('{ENTER}')"`, { encoding: 'utf8', timeout: 5000 });
      await sleep(300);
    };

    // 6-7. fileFirst 옵션에 따라 순서 변경
    if (fileFirst) {
      await sendFile();
      await sendText();
    } else {
      // 기본: 텍스트 먼저, 파일 나중
      await sendText();
      await sendFile();
    }

    // 8. 채팅방 닫기 (ESC)
    await sleep(500);
    execSync(`powershell -Command "${wshell} $wshell.SendKeys('{ESC}')"`, { encoding: 'utf8', timeout: 5000 });
    await sleep(500);

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 파일 선택 다이얼로그
ipcMain.handle('dialog:open-file', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '이미지', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] },
      { name: '모든 파일', extensions: ['*'] },
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});

// 폴더 선택 다이얼로그
ipcMain.handle('dialog:open-folder', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

// 폴더 내 이미지 목록
ipcMain.handle('folder:list-images', async (_, folderPath) => {
  try {
    const files = fs.readdirSync(folderPath);
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
    return files
      .filter((f) => imageExts.includes(path.extname(f).toLowerCase()))
      .map((f) => path.join(folderPath, f))
      .sort();
  } catch {
    return [];
  }
});

// 앱 정보
ipcMain.handle('app:info', async () => {
  return {
    version: require('./package.json').version,
    machineId: machineIdSync({ original: true }),
    platform: process.platform,
    isDev,
  };
});

// ============================================================
// 유틸
// ============================================================
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// 앱 라이프사이클
// ============================================================
app.whenReady().then(() => {
  log('App ready');
  createWindow();
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  log('Quitting');
  logStream.end();
});
