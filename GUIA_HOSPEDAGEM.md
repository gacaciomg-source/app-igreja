# Guia de Hospedagem e Sincronização (Web, Servidor e Celular)

O erro que você recebeu ao abrir o APK (`Unexpected token '<', "<!doctype "... is not valid JSON`) ocorreu porque o aplicativo do celular (APK) tentou falar com o servidor, mas como não estava configurado um servidor real na internet, ele tentou procurar dentro do próprio celular e retornou um erro de tela branca de HTML (por isso o `<!doctype>`).

Para que seu app funcione no Android (e no iOS via navegador) e todos recebam as atualizações, dízimos e mensagens em tempo real, **o cérebro do aplicativo (o seu "Servidor Backend") precisa morar na internet, 24 horas por dia.**

Muitos projetos usam o Firebase (que pode ter custos no futuro). Como você **não quer o Firebase**, a solução gratuita/barata é hospedar o próprio código do seu servidor.

Siga este passo a passo para colocar tudo no ar:

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
3. Adicione o seu domínio na Cloudflare. Eles te darão os "Nameservers" (ex: *ns1.cloudflare.com*, *ns2.cloudflare.com*) para você colocar onde comprou o domínio.
4. Vá em **DNS** na Cloudflare.
5. Crie um registro **CNAME**:
   - **Nome / Host:** `@` ou `app` (para ser app.suaigreja.com.br)
   - **Destino:** A URL do servidor no Render (ex: `seu-app-igreja.onrender.com`)
   - **Status do Proxy (Nuvem laranja):** Deixe ATIVADO. Isso oculta a origem do seu servidor e melhora a segurança e velocidade, garantindo o HTTPS gratuito.
6. A porta da versão web será sempre a porta padrão da internet **(443 via HTTPS ou 80 via HTTP)**, mas internamente seu servidor usa a porta `3000`. Você NÃO precisa digitar a porta :3000 na URL ao usar domínio + Cloudflare ou link do Render/Railway.

*Nota:* Ao configurar seu próprio domínio, você precisará também alterar o `apiUrl` no `src/themeConfig.ts` para o novo domínio, compilar, e refazer os passos do APK.

---

## Dica Importante sobre a "Memória Local"
O seu sistema atual usa "Bancos de Dados baseados em arquivos".
Toda vez que você fecha o servidor ou faz deploy no sistema gratuíto do Render, os servidores gratuitos sofrem "restart" diário/semanal, o que pode apagar o `data.json`.
Se for levar a sério com pessoas pagando os dízimos, no futuro solicite ao AI Studio a mudança para um banco externo como **PostgreSQL** ou **MongoDB**, que é independente e muito seguro (e também possui opções totalmente gratuitas na Supabase, Render ou Mongo Atlas). 
