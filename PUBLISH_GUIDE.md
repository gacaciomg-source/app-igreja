# Guia de Publicação - App Store & Google Play

Este aplicativo foi preparado usando **Capacitor**, o que permite que ele seja publicado como um app nativo.

## Passos para Publicar:

### 1. Exportar o projeto
Para levar o código para o seu computador e gerar o instalador (IPA para Apple, APK para Android):
- Vá no menu de configurações do AI Studio e clique em **Export to ZIP**.

### 2. Configurar o ambiente localmente
No seu computador, você precisará ter instalado:
- **Node.js**
- **Xcode** (para iPhone - requer um Mac)
- **Android Studio** (para Android)

### 3. Gerar os builds nativos
Abra o terminal na pasta do projeto e execute:
```bash
npm install
npm run build
npx cap add ios
npx cap add android
npx cap copy
```

### 4. Abrir nas ferramentas nativas
- Para iPhone: `npx cap open ios`
- Para Android: `npx cap open android`

### 5. Personalizar Logos localmente
Os ícones e a tela de abertura (Splash Screen) são gerados em:
- `/ios/App/App/Assets.xcassets` (Xcode)
- `/android/app/src/main/res` (Android Studio)

Você pode usar o comando `npx cordova-res` para gerar todos os tamanhos automaticamente a partir de um arquivo `icon.png` e `splash.png`.

---

## Sincronização em Tempo Real (Avançado)
Atualmente o app usa um servidor Express básico. Se você planeja ter milhares de usuários simultâneos:
1. Recomendamos ativar o **Firebase**.
2. Peça ao assistente do AI Studio: "Configure o Firebase para sincronização em tempo real".
3. Isso garantirá que quando você enviar um aviso em um celular, ele apareça instantaneamente em todos os outros sem precisar atualizar a tela.
