const { version } = require('./package.json');

module.exports = {
  packagerConfig: {
    icon: './icon',
    asar: false,
    name: 'kakao-sender',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        setupIcon: './icon.ico',
        createDesktopShortcut: true,
        name: 'kakao-sender',
        setupExe: `KakaoSender-Setup-${version}.exe`,
        noMsi: true,
        shortcutName: '카카오톡 자동 발송기',
      },
    },
  ],
};
