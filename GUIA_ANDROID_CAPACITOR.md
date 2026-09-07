# Guia do Aplicativo Android (Capacitor)

Como sair do repositório limpo até um APK ou AAB assinável.

Escrito a partir da configuração que já está no projeto. Os comandos aqui foram
todos executados e verificados, e as armadilhas no fim são as que apareceram de
verdade — não são hipóteses.

| | |
|---|---|
| Capacitor | 8.5.0 |
| targetSdk | 36 |
| appId | `com.renovar` |
| Plugins nativos | 10 |

---

## Antes de começar

| Ferramenta | Versão | Observação |
|---|---|---|
| **Node.js** | 20+ | Só para o build web e os comandos `cap`. |
| **JDK** | **21** | Não use 24+. Veja a armadilha nº 1. |
| **Android Studio** | Atual | Traz o SDK e o próprio JDK 21 embutido. |

> **Armadilha nº 1 — versão do Java**
>
> O Gradle 8.14.3 usado aqui suporta até o JDK 24. Se a máquina tiver um JDK
> mais novo, o `./gradlew` quebra na linha de comando com erro de versão de
> classe.
>
> **Pelo Android Studio funciona mesmo assim**, porque ele usa o JDK 21 que vem
> junto. O problema só aparece no terminal. Para compilar por linha de comando,
> instale um JDK 21 e aponte o `JAVA_HOME` para ele.

---

## A sequência

Os passos 1 a 3 são uma vez só. Do 4 em diante é a rotina de sempre.

### 1. Instalar as dependências

```bash
npm install
```

Confira que o Capacitor veio na mesma versão nos quatro pacotes principais
(`cli`, `core`, `android`, `ios`). Versões misturadas dão erro no sync com
mensagem que não ajuda.

```bash
npx cap --version
```

### 2. Conferir o `capacitor.config.ts`

O arquivo já vem configurado. O campo que exige atenção é o `appId`:

```ts
appId:   'com.renovar'
appName: 'Igreja Renovar'
webDir:  'dist'
```

> **Sem volta**
>
> O `appId` é a identidade do app na Play Store. Depois do primeiro envio ele
> **não pode mais mudar** — trocar significa publicar um app diferente e perder
> todos os usuários instalados. Confira antes do primeiro `cap add`.

### 3. Apontar o app para o servidor

Esta é a diferença entre o app funcionar e abrir em branco.

No navegador o app usa a origem da própria página. **Dentro do APK ele usa o
valor fixo** de `src/themeConfig.ts`:

```ts
apiUrl: "https://app.igrejarenovar.com"  // sem porta, sem barra final
```

Para testar no celular com o servidor rodando no PC, troque pelo IP local da
máquina (`ipconfig`) — por exemplo `http://192.168.0.15:3000`. Lembre de voltar
para o domínio antes de gerar o APK de produção.

### 4. Compilar a parte web

```bash
npm run build
```

Gera o `dist/`, que é exatamente o que vai ser empacotado dentro do APK.

**Todo `cap sync` copia o `dist/` como ele está no momento.** Se você esquecer
de rodar o build, o app sai com o código antigo e não avisa nada.

### 5. Criar a plataforma Android

Só na primeira vez, ou se você apagar a pasta `android/`:

```bash
npx cap add android
```

A pasta `android/` **deve ser versionada no git**. É nela que ficam o manifesto
editado, os ícones e as configurações de build — tirar do repositório faz um
clone novo perder tudo isso. O `.gitignore` já ignora só o que é gerado
(`android/build/`, `.gradle/`, `local.properties`).

### 6. Gerar ícones e splash

As imagens-fonte ficam em `resources/`. O comando lê essa pasta e escreve as
136 variações que o Android pede:

```bash
npm run assets
```

| Arquivo fonte | Tamanho | Vira o quê |
|---|---|---|
| `icon.png` | 1024×1024 | Ícone do app, todas as densidades |
| `icon-foreground.png` | 1024×1024 | Camada da frente do ícone adaptativo |
| `icon-background.png` | 1024×1024 | Camada de fundo (verde sólido) |
| `splash.png` | 2732×2732 | Tela de abertura, retrato e paisagem |
| `splash-dark.png` | 2732×2732 | Idem, tema escuro |

> **O que este comando faz**
>
> Além dos ícones e da splash, ele gera o ícone monocromático da barra de
> status e reaplica a correção do ícone adaptativo (armadilhas nº 3 e 4).
> É seguro rodar quantas vezes quiser — o resultado é sempre o mesmo.

### 7. Sincronizar

```bash
npx cap sync android
```

Copia o `dist/` para dentro do projeto Android e registra os plugins nativos.

A saída lista os plugins encontrados. **Confira que o número bate** com o que
você espera — um plugin que some da lista é sinal de instalação incompleta.

### 8. Abrir e gerar o instalador

```bash
npx cap open android
```

Ou direto pela linha de comando, se você tiver o JDK 21:

```bash
# APK — instalação manual, testes
cd android && ./gradlew assembleRelease
```

```bash
# AAB — o formato exigido pela Play Store
cd android && ./gradlew bundleRelease
```

As saídas ficam em `android/app/build/outputs/`. Para publicar é preciso
assinar com uma chave própria.

> **Guarde a chave**
>
> Perder o `.jks` de assinatura significa **nunca mais conseguir atualizar o
> app** na Play Store — só publicar outro do zero. Faça backup fora do
> computador. O `.gitignore` já bloqueia `*.jks`, `*.keystore` e
> `key.properties`, e é para continuar assim.

---

## A rotina do dia a dia

Depois que a plataforma existe, mudou código é só isto:

```bash
npm run build && npx cap sync android
```

Não precisa rodar `cap add` de novo, e não precisa gerar os ícones de novo a
menos que a logo mude.

---

## Armadilhas

Todas apareceram de verdade neste projeto. Se algo parecer quebrado, comece
por aqui.

### 2. Ícone adaptativo com o desenho pequeno demais

**Sintoma** — A logo aparece encolhida, perdida no meio de um círculo verde
grande.

**Causa** — O gerador já aplica um recuo de 16,7% no primeiro plano, que é a
zona segura exigida pelo Android. Se a imagem-fonte **também** já vier com a
arte reduzida, o encolhimento acontece duas vezes.

**Solução** — O `icon-foreground.png` deve ser a logo **inteira, do canto ao
canto**. Deixe o recuo por conta do gerador.

### 3. Canto transparente no ícone

**Sintoma** — Dependendo do launcher, aparecem cantos vazados em volta do
ícone.

**Causa** — O gerador aplica o mesmo recuo de 16,7% na camada de **fundo**.
Como o fundo é uma cor sólida, ele fica menor que a máscara do launcher e sobra
buraco.

**Solução** — Deixar o fundo sem recuo e manter o recuo só no primeiro plano.
Já está automatizado em `scripts/icone-notificacao.mjs`, que roda junto com
`npm run assets`:

```xml
<!-- fundo cobre os 108dp inteiros -->
<background android:drawable="@mipmap/ic_launcher_background" />
<foreground>
  <inset android:drawable="@mipmap/ic_launcher_foreground"
         android:inset="16.7%" />
</foreground>
```

### 4. Quadrado branco no lugar do ícone de notificação

**Sintoma** — A notificação chega, mas o ícone na barra de status é um quadrado
branco liso.

**Causa** — O Android exige uma **silhueta monocromática** na barra de status.
Se você apontar para a logo colorida, ele achata tudo em branco.

**Solução** — Usar um drawable próprio, só de silhueta branca sobre
transparente, em cinco densidades. Neste projeto é o `ic_stat_igreja`,
declarado no `capacitor.config.ts` em `LocalNotifications.smallIcon`.

### 5. Notificação nunca chega no APK

**Sintoma** — Funciona no navegador e no PWA. No aplicativo, silêncio total e
nenhum erro.

**Causa** — O Web Push depende da `PushManager`, que **a WebView do Android não
implementa**. O código de registro sai logo na primeira linha, calado.

**Solução** — No aplicativo as notificações vêm por consulta periódica ao
servidor (`GET /api/notifications`) transformada em notificação local. Com o
app aberto, até 1 minuto. Com o app fechado, quem executa é o WorkManager do
Android: **15 minutos é o piso, não uma promessa** — em Doze mode ou com
economia de bateria agressiva pode atrasar bem mais ou não rodar.

### 6. Play Store recusando por permissão de localização

**Sintoma** — O app pede permissão de localização sem nunca usar localização, e
a revisão da Play Store trava.

**Causa** — O plugin `@capacitor/background-runner` declara
`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` e `ACCESS_BACKGROUND_LOCATION`
no manifesto dele. O merge do Android joga tudo isso no APK final.

**Solução** — Remover as três no `AndroidManifest.xml` do app, com
`xmlns:tools` declarado na tag `<manifest>`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"
                 tools:node="remove" />
```

### 7. Firebase entrando sem ninguém pedir

**Sintoma** — O APK carrega o `firebase-messaging` mesmo o projeto não usando
Firebase em lugar nenhum.

**Causa** — O `@capacitor/push-notifications` estava instalado sem nunca ser
importado, e ele arrasta o Firebase junto.

**Solução** — Foi removido. Se um dia precisar de push nativo via FCM, é só
`npm install @capacitor/push-notifications` de volta — aí sim junto com o
`google-services.json`.

---

## Onde as coisas ficam

| O quê | Caminho |
|---|---|
| Imagens-fonte dos ícones | `resources/` |
| Ícone do app | `android/app/src/main/res/mipmap-*/` |
| Ícone adaptativo | `android/app/src/main/res/mipmap-anydpi-v26/` |
| Ícone da barra de status | `android/app/src/main/res/drawable-*/ic_stat_igreja.png` |
| Splash | `android/app/src/main/res/drawable-port-*`, `-land-*`, `-night-*` |
| Ícones do PWA e web | `public/icons/` |
| Nome do app | `android/app/src/main/res/values/strings.xml` |
| Permissões | `android/app/src/main/AndroidManifest.xml` |
| Tarefa de fundo | `public/background-runner.js` |
| Notificações no app | `src/lib/nativeNotifications.ts` |
| Gerador do ícone de notificação | `scripts/icone-notificacao.mjs` |
| Saída do build | `android/app/build/outputs/` |

---

## Nunca versionar

O `.gitignore` já cobre tudo isto. Confira antes de qualquer `git add` com
pressa.

- `data/` — nomes, e-mails, telefones e hashes de senha dos membros
- `uploads/` e `backups/` — arquivos enviados pelos membros
- `.env` — chave de assinatura dos tokens de login
- `.wwebjs_auth/` — sessão do WhatsApp, equivale a estar logado na conta da igreja
- `*.zip` — os backups automáticos contêm o `data/` inteiro
- `*.jks`, `*.keystore`, `key.properties` — as chaves de assinatura do app
