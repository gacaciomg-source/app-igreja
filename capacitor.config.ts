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
  appId: 'com.renovar',
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
      backgroundColor: '#0f2616',
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

    LocalNotifications: {
      // Ícone monocromático da barra de status. Sem isso o Android desenha um
      // quadrado branco no lugar do ícone (ele exige silhueta, não a logo
      // colorida). Gerado a partir da própria logo em res/drawable.
      smallIcon: 'ic_stat_igreja',
      iconColor: '#0f2616',
    },

    BackgroundRunner: {
      // Verifica notificações novas com o aplicativo fechado, sem Firebase.
      // Ver public/background-runner.js e src/lib/nativeNotifications.ts.
      label: 'com.renovar.notifications',
      src: 'background-runner.js',
      event: 'checkNotifications',
      repeat: true,
      // 15 minutos é o PISO do WorkManager do Android. Pedir menos não acelera:
      // o sistema arredonda para cima e pode atrasar bem mais em Doze mode.
      interval: 15,
      autoStart: true,
    },
  },
};

export default config;
