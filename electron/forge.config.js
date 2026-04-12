const { version } = require('./package.json');

module.exports = {
  packagerConfig: {
    icon: './icon.ico',
    asar: false,
    productName: 'KakaoSender',
    ignore: ['main-dev.js'],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        setupIcon: './icon.ico',
        createDesktopShortcut: true,
        name: 'KakaoSender',
        exe: 'KakaoSender.exe',
        setupExe: `KakaoSender-Setup-${version}.exe`,
        noMsi: true,
        shortcutName: '카카오톡 자동 발송기',
        productName: 'KakaoSender',
      },
    },
  ],
};
