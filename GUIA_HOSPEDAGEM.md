# Guia de Hospedagem e Sincronização (Web, Servidor e Celular)

O erro que você recebeu ao abrir o APK (`Unexpected token '<', "<!doctype "... is not valid JSON`) ocorreu porque o aplicativo do celular (APK) tentou falar com o servidor, mas como não estava configurado um servidor real na internet, ele tentou procurar dentro do próprio celular e retornou um erro de tela branca de HTML (por isso o `<!doctype>`).

Para que seu app funcione no Android (e no iOS via navegador) e todos recebam as atualizações, dízimos e mensagens em tempo real, **o cérebro do aplicativo (o seu "Servidor Backend") precisa morar na internet, 24 horas por dia.**

Muitos projetos usam o Firebase (que pode ter custos no futuro). Como você **não quer o Firebase**, a solução gratuita/barata é hospedar o próprio código do seu servidor.

Siga este passo a passo para colocar tudo no ar:

---

## *Onde eu coloco portas e como inicio as coisas? (Guia Para Leigos)*

Como você está usando seu celular para testar (APK) ou o computador para visualizar:

### 1. Testando no seu próprio Computador e no seu WiFi (Sem Hospedagem)

Você não precisa enviar para a internet para testar, você consegue rodar o "Servidor Backend" diretamente no seu computador do seu quarto, usando sua internet local (WiFi).

**Como Iniciar o Servidor no PC:**
1. Abra o arquivo que você baixou.
2. Abra a pasta do projeto no **VS Code** (ou terminal).
3. Abra o terminal do VS Code e digite `npm install` (dê Enter e espere, caso nunca tenha feito).
4. Digite **`npm run dev`** (e dê Enter) para iniciar o servidor. 
5. O console vai mostrar `Server running on http://localhost:3000`. **Deixe a tela preta (terminal) aberta. Se fechar, o app morre.**

**No Navegador (Teste Web):**
- Apenas digite `http://localhost:3000` no seu Google Chrome do computador. Funciona automaticamente. E você *não* precisa mudar a `apiUrl` do `themeConfig.ts` para isso. A versão do navegador sabe como se encontrar com o servidor sozinha.

**Testando o APK do Celular no mesmo WiFi do PC:**
- O seu celular não sabe o que é `localhost` (para o celular, `localhost` significa "o próprio celular", e o servidor não está no celular, está no seu PC).
- Você tem que descobrir o **IP da sua máquina**.
  - Se for **Windows**, abra o Iniciar, digite `cmd`, abra-o e digite `ipconfig`. Procure o "Endereço IPv4" (vai ser algo como `192.168.1.5` ou `10.0.0.10`).
- Vá no arquivo `src/themeConfig.ts` e mude o link para:
  `apiUrl: "http://192.168.1.5:3000"` (usando o SEU número, e **manter o :3000 no final**).
- Agora gere de novo o APK (usando `npm run build && npx cap copy` e depois indo pro Android Studio e criando o App).
- Instale no celular (ele tem que estar no mesmo Wi-Fi). Pronto!

### 2. E quando eu for colocar Oficialmente na Nuvem (Render / Cloudflare)?

A nuvem não usa portas visíveis porque trabalha numa internet profissional. Portanto, a regra de ouro é: **A nuvem padrão esconde a porta.**

- O seu código internamente continua usando a porta `3000`. Mas o Render ou a Cloudflare transformam isso no HTTPS padrão (porta 443 escondida).
- O seu arquivo `src/themeConfig.ts` vai ficar APENAS com a URL bonita, sem porta nenhuma.
  Exemplo CORRETO: `apiUrl: "https://app.suaigreja.com.br"` (Você nunca deve por `:3000` aqui).

---

## 1. Hospedar o Servidor (Backend) 🌐

O servidor atual do seu aplicativo (o arquivo `server.ts`) gerencia o banco de dados (que no momento salva os dados em um arquivo local `.json`) e a API. Você precisa hospedar isso em plataformas gratuitas ou muito baratas.

**Recomendação de Plataformas (Escolha uma):**
- **Render.com** (Tem plano gratuito, perfeito para rodar o backend Node.js)
- **Railway.app** (Uso muito barato, cerca de $5/mês, não "dorme" igual o Render)
- **Um Servidor VPS próprio** (Google Cloud Cloud Run, Hostinger, DigitalOcean, a partir de $5 a $10/mês).

### Como fazer o Deploy no Render.com (Grátis):
1. Suba o código deste aplicativo (o zip que você baixou) para uma conta no **GitHub**.
2. Crie uma conta no [Render.com](https://render.com).
3. Clique em **New** > **Web Service**.
4. Conecte com o seu GitHub e selecione o repositório do aplicativo.
5. Em **Build Command**, coloque:
   `npm install && npm run build`
6. Em **Start Command**, coloque:
   `npm start`
7. Clique em **Create Web Service**.
8. O Render vai gerar um link como: `https://seu-app-igreja.onrender.com`. Copie este link.

---

## 2. Configurar o seu App (Celular e Web) 📱

Agora que o cérebro está na internet, você precisa avisar o aplicativo onde ele vive.

1. No seu código baixado na sua máquina, abra o arquivo `src/themeConfig.ts`.
2. Encontre a linha:
   ```typescript
   apiUrl: "https://ais-dev-...", // Altere para sua URL de produção
   ```
3. Troque esse link para a URL final do seu servidor (ex: do Render):
   ```typescript
   apiUrl: "https://seu-app-igreja.onrender.com", 
   ```

---

## 3. Web App / iOS Dinâmico (Sem pagar a Apple) 🍎

Como a Apple cobra $99 por ano para contas de desenvolvedor:
1. O servidor que você hospedou no Render.com servirá também a versão web. Se você acessar o link `https://seu-app-igreja.onrender.com` pelo navegador, vai ver o aplicativo completo.
2. Peça para os irmãos que usam iPhone (iOS) abrirem esse link no Safari.
3. No Safari, eles devem tocar em **Compartilhar** ➔ **Adicionar à Tela de Início**.
4. O ícone da igreja aparecerá na tela do iPhone igual a um aplicativo verdadeiro, e funcionará normalmente! Isso se chama **PWA (Progressive Web App)**, é gratuito e instantâneo.

---

## 4. Atualizar o APK (Android) 🤖

Para os usuários de Android que gostam do app na Play Store ou via download direto (APK):
1. No seu computador, abra o terminal na pasta do app.
2. Certifique-se de que mudou a `apiUrl` antes disso.
3. Rode:
   `npm run build`
   `npx cap sync android`
   `npx cap open android`
4. Isso abrirá o Android Studio. Vá no menu `Build` -> `Build Bundle / APK` -> `Build APK(s)`.
5. Envie este arquivo `.apk` novo para o seu celular. Ele vai funcionar e se comunicar com a nuvem, mantendo todos os usuários sincronizados.

---

## 5. Configurar Domínio Personalizado (Cloudflare) 🔗

Se você quer que seu app seja acessado via `app.suaigreja.com.br` de forma profissional (e esconder a URL do servidor Render/Railway):

1. Compre um domínio (no Registro.br, Hostinger, ou onde preferir).
2. Crie uma conta gratuita na [Cloudflare](https://dash.cloudflare.com).
3. Adicione o seu domínio na Cloudflare.
4. Vá em **DNS** na Cloudflare.
5. Crie um registro **CNAME**:
   - **Nome / Host:** `@` ou `app` (para ser app.suaigreja.com.br)
   - **Destino:** A URL do servidor no Render (ex: `seu-app-igreja.onrender.com`)
   - **Status do Proxy (Nuvem laranja):** Deixe ATIVADO.
6. **Para o Android/iOS funcionar com a Cloudflare**: Vá na Cloudflare > **SSL/TLS** > **Visão Geral** e marque a opção **"Completo (Rigoroso)"** ou **"Full"** (Isso previne erros de comunicação).

*Nota:* Após configurar o domínio, altere o `apiUrl` no `src/themeConfig.ts` para o novo domínio (ex: `https://app.suaigreja.com.br`), rode `npm run build` e gere o APK novamente.

---

## 6. WhatsApp não funciona ou desconectando sozinho? 💬

Se o WhatsApp não aparece o QR Code na "Gestão do WhatsApp" ou desconecta todo dia na nuvem (ex: no Render.com):

O problema é a "Memória Volátil" dos servidores gratuitos. Ferramentas grátis apagam todos os arquivos que o seu servidor gera (incluindo o login do seu WhatsApp na pasta oculta `.wwebjs_auth`) toda vez que ele hiberna.

**Como corrigir no Render.com:**
1. Vá no seu painel do Render, no seu Web Service.
2. Vá no menu lateral na opção **Disks** (Discos).
3. Crie um novo Disco:
   - **Name:** `dados-igreja`
   - **Mount Path:** `/opt/render/project/src`
   - **Size:** `1 GB` (que é grátis)
4. Salve e deixe o Render reiniciar. Isso vai tornar o seu banco de dados `data.json` e o Login do WhatsApp **PERMANENTES**.

Outra solução é usar plataformas como o `Railway.app` com um volume permanente ou migrar para uma VPS mais robusta.

---

## Dica Importante sobre a "Memória Local"
O seu sistema atual usa "Bancos de Dados baseados em arquivos".
Toda vez que você fecha o servidor ou faz deploy no sistema gratuíto do Render, os servidores gratuitos sofrem "restart" diário/semanal, o que pode apagar o `data.json`.
Se for levar a sério com pessoas pagando os dízimos, no futuro solicite ao AI Studio a mudança para um banco externo como **PostgreSQL** ou **MongoDB**, que é independente e muito seguro (e também possui opções totalmente gratuitas na Supabase, Render ou Mongo Atlas). 

---

## 7. Como Alterar o Nome da Versão (Aba de Servidor) 🏷️

Se você fez atualizações no projeto e quer alterar o nome/número da versão que aparece na página de "Servidor" dentro do aplicativo:

1. Acesse o projeto no seu computador ou diretamente no **GitHub**.
2. Abra o arquivo **`src/constants.ts`**.
3. Bem na primeira linha do arquivo, você encontrará o código:
   ```typescript
   export const SYSTEM_VERSION = "1.2 (Beta)";
   ```
4. Altere o texto entre aspas para a nova versão que desejar (Exemplo: `"2.0 Oficial"` ou `"1.3"`).
5. Salve o arquivo (caso esteja no GitHub, faça o *commit*). Quando seu servidor na nuvem for atualizado (ou quando você compilar o novo APK), o nome da versão nova aparecerá automaticamente para todos os usuários na aba de Servidor!
