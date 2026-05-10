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

## Solução de Erros Comuns:

### 1. Aplicativo "Não Compatível" (Xiaomi e outros)
Se a Google Play ou o celular dizem que o app não é compatível:

1. **Atualize o Target SDK:** A Google Play exige que novos apps usem a versão mais recente.
   - Abra `android/variables.gradle` e altere:
     ```gradle
     targetSdkVersion = 34 // Ou a mais recente solicitada pela Google
     compileSdkVersion = 34
     ```
2. **Arquitetura de Processador:** Garanta que você está gerando o App Bundle (.aab) que já inclui todas as arquiteturas (arm64, v7a, etc).
3. **Versão Mínima:** Verifique se o seu `minSdkVersion` não está alto demais (o padrão 22 do Capacitor atende quase 100% dos aparelhos).

### 2. Erro de API no Celular (Não faz Login)
O seu aplicativo já está configurado para usar **HTTPS** (`https://app.igrejarenovar.com`). Isso resolve automaticamente o bloqueio do Android para conexões sem segurança.

**Importante:**
1. Certifique-se de que o seu servidor (VPS/Dedicado) tem um certificado SSL ativo para este domínio.
2. Se você precisar voltar para um IP (ex: `http://2.24.86.197:3000`), lembre-se de que o Android bloqueará a conexão a menos que você adicione `android:usesCleartextTraffic="true"` no arquivo `AndroidManifest.xml`.

### 3. Problemas de CORS (Acesso Negado)
O servidor foi configurado para aceitar conexões a partir de aplicativos móveis. Se o erro persistir:
- Certifique-se que o DNS do domínio `app.igrejarenovar.com` está apontando para o IP do seu servidor (`2.24.86.197`).
- No console do servidor, verifique se as requisições estão chegando.
Atualmente o app usa um servidor Express básico. Se você planeja ter milhares de usuários simultâneos:
1. Recomendamos ativar o **Firebase**.
2. Peça ao assistente do AI Studio: "Configure o Firebase para sincronização em tempo real".
3. Isso garantirá que quando você enviar um aviso em um celular, ele apareça instantaneamente em todos os outros sem precisar atualizar a tela.
