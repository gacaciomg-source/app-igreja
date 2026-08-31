import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import {initNative, hideSplash} from './lib/native';
import './index.css';

// Configura barra de status e botão voltar quando rodando como app nativo.
// No navegador não faz nada.
initNative();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

// Esconde a splash somente depois do primeiro quadro desenhado, para não haver
// piscada branca entre a tela de abertura e a interface. É idempotente e o
// initNative também chama por conta própria — assim nenhum caminho de erro
// deixa o app preso na splash.
requestAnimationFrame(() => requestAnimationFrame(hideSplash));
