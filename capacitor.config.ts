import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

/**
 * CONFIGURAÇÃO DO APLICATIVO NATIVO (Android / iOS)
 *
 * IMPORTANTE: o `appId` é a identidade do app nas lojas. Depois do primeiro
 * envio ele NÃO pode mais ser alterado — mudar significa publicar outro app
 * e perder todos os usuários. Confira antes de rodar `npx cap add`.
 */
const config: CapacitorConfig = {
  appId: 'com.igrejarenovar.app',
  appName: 'Igreja Renovar',
  webDir: 'dist',

  server: {
    // Serve os arquivos locais em https://localhost em vez de http://.
    // Necessário para que localStorage, câmera e geolocalização funcionem.
    androidScheme: 'https',

    // >>> TESTE NO WIFI LOCAL (opcional)
    // Descomente as duas linhas abaixo para o app do celular carregar a
    // interface direto do seu PC, com recarregamento automático a cada
    // alteração no código. Troque pelo IP da sua máquina (`ipconfig`).
    // Lembre de comentar de novo antes de gerar o APK de produção.
    //
    // url: 'http://192.168.0.15:3000',
    // cleartext: true,
  },

  android: {
    // Bloqueia carregamento de conteúdo http:// dentro de páginas https://
    allowMixedContent: false,
  },

  ios: {
    // Evita que o conteúdo fique escondido atrás da barra de status
    contentInset: 'always',
  },

  plugins: {
    SplashScreen: {
      // Escondemos a splash por código (em src/lib/native.ts), quando o app
      // realmente terminou de carregar. Evita o flash de tela branca.
      launchAutoHide: false,
      backgroundColor: '#064e3b',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },

    StatusBar: {
      overlaysWebView: false,
      style: 'DARK', // texto claro, para fundo escuro
      backgroundColor: '#064e3b',
    },

    Keyboard: {
      // Redimensiona a tela quando o teclado abre, para não cobrir os campos
      resize: KeyboardResize.Native,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
