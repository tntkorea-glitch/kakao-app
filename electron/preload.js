/**
 * Preload 스크립트 - 웹 페이지에 네이티브 API를 안전하게 노출
 *
 * 웹 페이지에서 window.electronAPI.xxx() 로 호출 가능
 */

const { contextBridge, ipcRenderer } = require('electron');

console.log('[preload] electronAPI 브릿지 로딩 중...');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── 앱 정보 ──
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),

  // ── 카카오톡 제어 ──
  kakao: {
    findWindow: () => ipcRenderer.invoke('kakao:find-window'),
    activate: () => ipcRenderer.invoke('kakao:activate'),
    sendKeys: (keys) => ipcRenderer.invoke('kakao:send-keys', keys),
    pasteText: (text) => ipcRenderer.invoke('kakao:paste-text', text),
    pasteImage: (imagePath) => ipcRenderer.invoke('kakao:paste-image', imagePath),
    pressEnter: () => ipcRenderer.invoke('kakao:press-enter'),
    pressEscape: () => ipcRenderer.invoke('kakao:press-escape'),
    sendToRoom: (data) => ipcRenderer.invoke('kakao:send-to-room', data),
  },

  // ── 파일 다이얼로그 ──
  openFileDialog: () => ipcRenderer.invoke('dialog:open-file'),
});
