# Instalar o sistema para uma nova igreja

Cada igreja é uma **instalação separada**: pasta, banco de dados, WhatsApp,
domínio e processo próprios. Várias podem rodar na mesma máquina sem uma ver
os dados da outra. Todas usam o mesmo código do GitHub e se atualizam pelo
botão do painel.

## O que fica separado (automático)

| Item | Onde fica |
|---|---|
| Membros, eventos, configurações | `data/` da pasta da igreja |
| Imagens enviadas | `uploads/` da pasta da igreja |
| Sessão do WhatsApp | `.wwebjs_auth/` da pasta da igreja |
| Chaves de notificação (web) | `data/config.json` (gerado no primeiro início) |
| Chave do Firebase | `data/firebase-service-account.json` (enviada pelo painel) |
| Login | `JWT_SECRET` no `.env` — **diferente para cada igreja** |

## Passo a passo na máquina

Exemplo para a "Igreja Exemplo", na porta 3001 (a Renovar usa outra).

```bash
cd /caminho/das/igrejas
git clone https://github.com/<usuario>/<repositorio>.git igreja-exemplo
cd igreja-exemplo
cp .env.example .env
```

Edite o `.env`:

```
APP_URL="https://app.igrejaexemplo.com.br"
CHURCH_NAME="Igreja Exemplo"
PORT=3001
NODE_ENV=production
JWT_SECRET=<gere um novo: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
SUPERADMIN_EMAIL="admin"
SUPERADMIN_PASSWORD=
```

> **`CHURCH_NAME` é obrigatório nas igrejas novas.** Sem ele (e sem nome na
> Personalização), a instalação assume o nome e os dados de privacidade da
> Igreja Renovar, que é a instalação original.

Instale, gere e suba com um nome próprio no PM2:

```bash
npm install --include=dev
npm run build
pm2 start npm --name igreja-exemplo -- start
pm2 save
```

Se `SUPERADMIN_PASSWORD` ficou vazia, a senha inicial aparece **uma vez** no
log: `pm2 logs igreja-exemplo`.

Aponte o domínio da igreja para a porta dela no proxy (Nginx, Caddy ou o
painel de hospedagem), com HTTPS.

## Primeiro acesso (no painel da nova igreja)

1. Entrar com o super admin e trocar a senha.
2. **Personalização → Informações Globais**: nome da igreja, nome curto,
   título das notificações, ícone do app, logos e cores.
3. **Personalização → Política de Privacidade**: razão social, CNPJ,
   endereço, e-mail e encarregado. A página fica em
   `https://<domínio>/privacidade.html`.
4. **Dízimos e Ofertas**: chave PIX, banco, titular e QR Code. Começa vazio.
5. **WhatsApp**: ler o QR Code com o celular da igreja.
6. **Versões da Bíblia** e **Palavra do Dia**, se quiser ajustar.

## Cuidados

- **Nunca copie a pasta `data/`** de uma igreja para outra: ela contém os
  membros, senhas e o WhatsApp conectado.
- Cada WhatsApp conectado usa em torno de 300 a 500 MB de memória. Conte isso
  ao decidir quantas igrejas cabem na máquina.
- O **aplicativo da Play Store** é da Igreja Renovar (fica ligado ao servidor
  dela). As outras igrejas usam o site, que pode ser instalado no celular
  pelo navegador. APK próprio por igreja é um projeto à parte.
- A atualização pelo painel vale para cada instalação separadamente: atualize
  uma de cada vez.
