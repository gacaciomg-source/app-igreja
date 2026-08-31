/**
 * INTEGRAÇÃO COM O APLICATIVO NATIVO (Capacitor)
 *
 * Todas as funções daqui são seguras de chamar no navegador: quando o app
 * não está rodando como aplicativo nativo elas simplesmente não fazem nada.
 * Assim o mesmo código serve para a versão web e para Android/iOS.
 */
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export const IS_NATIVE = Capacitor.isNativePlatform();
export const PLATFORM = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

/** Evento disparado quando o usuário aperta "voltar" no Android.
 *  A tela atual pode chamar `event.preventDefault()` para tratar por conta
 *  própria (fechar um modal, por exemplo) e impedir a navegação padrão. */
export const NATIVE_BACK_EVENT = 'nativeBack';

/** Evento com uma mensagem curta para exibir ao usuário (detail: string). */
export const NATIVE_TOAST_EVENT = 'nativeToast';

let lastBackPress = 0;

/**
 * Ajusta a barra de status para combinar com o tema atual do app.
 * Chamada de novo sempre que o usuário alterna claro/escuro.
 */
export async function syncStatusBar(darkMode: boolean) {
  if (!IS_NATIVE) return;
  try {
    // Style.Dark = texto claro (para fundos escuros)
    await StatusBar.setStyle({ style: Style.Dark });
    if (PLATFORM === 'android') {
      await StatusBar.setBackgroundColor({ color: darkMode ? '#050a05' : '#064e3b' });
    }
  } catch (e) {
    console.warn('[Native] Não foi possível ajustar a barra de status:', e);
  }
}

/**
 * Botão físico "voltar" do Android.
 *
 * Sem isso, apertar voltar fecha o aplicativo direto — um dos motivos mais
 * comuns de avaliação ruim na Play Store.
 */
function registerBackButton() {
  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    // 1. Deixa a tela atual tratar primeiro (fechar modal, cancelar edição...)
    const event = new CustomEvent(NATIVE_BACK_EVENT, { cancelable: true });
    const handledByScreen = !window.dispatchEvent(event);
    if (handledByScreen) return;

    // 2. Navega para trás, se houver para onde voltar
    if (canGoBack) {
      window.history.back();
      return;
    }

    // 3. Na raiz: exige dois toques para sair, evitando saída acidental
    const now = Date.now();
    if (now - lastBackPress < 2000) {
      CapacitorApp.exitApp();
    } else {
      lastBackPress = now;
      window.dispatchEvent(
        new CustomEvent(NATIVE_TOAST_EVENT, {
          detail: 'Toque em voltar novamente para sair',
        })
      );
    }
  });
}

/**
 * Esconde a tela de abertura (splash).
 *
 * ATENÇÃO: `launchAutoHide` está DESLIGADO no capacitor.config.ts, de propósito,
 * para não haver flash branco antes do app montar. A consequência é que, se esta
 * função não rodar, o aplicativo fica congelado na splash para sempre — e o
 * usuário não tem barra de endereço para se salvar.
 *
 * Por isso ela é segura de chamar quantas vezes for, nunca lança exceção, e o
 * `initNative` agenda uma chamada de segurança por tempo.
 */
export async function hideSplash() {
  if (!IS_NATIVE) return;
  try {
    await SplashScreen.hide();
  } catch (e) {
    console.warn('[Native] Não foi possível esconder a splash:', e);
  }
}

/**
 * Inicializa tudo que é específico do app nativo.
 * Chamada uma única vez, em src/main.tsx.
 */
export async function initNative() {
  if (!IS_NATIVE) return;

  console.log(`[Native] Iniciando em ${PLATFORM}`);

  // Rede de segurança: aconteça o que acontecer abaixo, a splash sai.
  const failsafe = setTimeout(hideSplash, 4000);

  try {
    const isDark = document.documentElement.classList.contains('dark');
    await syncStatusBar(isDark);
    registerBackButton();
  } catch (e) {
    // Um plugin ausente ou com erro não pode impedir o app de abrir
    console.error('[Native] Falha na inicialização nativa:', e);
  } finally {
    clearTimeout(failsafe);
    await hideSplash();
  }
}
