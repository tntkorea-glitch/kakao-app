/**
 * Electron API 타입 정의 + 헬퍼
 * 웹 페이지에서 window.electronAPI를 안전하게 사용하기 위한 래퍼
 */

export interface KakaoAPI {
  findWindow: () => Promise<{ found: boolean; handle: string | null }>;
  activate: () => Promise<{ success: boolean; error?: string }>;
  sendKeys: (keys: string) => Promise<{ success: boolean; error?: string }>;
  pasteText: (text: string) => Promise<{ success: boolean; error?: string }>;
  pasteImage: (imagePath: string) => Promise<{ success: boolean; error?: string }>;
  pressEnter: () => Promise<{ success: boolean; error?: string }>;
  pressEscape: () => Promise<{ success: boolean; error?: string }>;
  sendToRoom: (data: {
    roomName: string;
    message: string;
    imagePath?: string;
    fileFirst?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
}

export interface ElectronAPI {
  getAppInfo: () => Promise<{
    version: string;
    machineId: string;
    platform: string;
    isDev: boolean;
  }>;
  getMachineId: () => Promise<string>;
  kakao: KakaoAPI;
  openFileDialog: () => Promise<string | null>;
  openFolderDialog: () => Promise<string | null>;
  listFolderImages: (folderPath: string) => Promise<string[]>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/** Electron 환경인지 확인 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

/** Electron API 가져오기 (없으면 null) */
export function getElectronAPI(): ElectronAPI | null {
  if (isElectron()) return window.electronAPI!;
  return null;
}
