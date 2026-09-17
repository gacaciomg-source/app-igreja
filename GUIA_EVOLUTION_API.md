# WhatsApp pela Evolution API — instalação e integração

## Qual versão usar

**Evolution API v2** (a "normal", em Node.js). É a mais usada, com documentação
e comunidade maiores. A **Evolution Go** é uma reescrita mais nova, ainda com
menos recursos e menos material — não use por enquanto.

- Site e documentação oficiais: <https://doc.evolution-api.com>
- Código: <https://github.com/EvolutionAPI/evolution-api>

**Custo:** o programa é gratuito (código aberto). Roda na sua máquina, junto
com um PostgreSQL e um Redis, também gratuitos. O que se paga é só a máquina.

**Por que trocar:** hoje cada igreja abre um Chrome escondido para manter o
WhatsApp (300–500 MB cada). A Evolution fala direto com o WhatsApp, sem
navegador (30–80 MB por número), e uma instalação atende todas as igrejas:
cada uma é uma *instância* com seu próprio número.

> Não é a API oficial da Meta. O risco de bloqueio por envio em massa continua
> o mesmo de hoje. Use os intervalos do envio em massa e evite listas frias.

---

## 1. Instalar na máquina (Ubuntu, com Docker)

### 1.1 Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # saia e entre de novo no SSH depois disso
```

### 1.2 Pasta e arquivos

```bash
mkdir -p ~/evolution && cd ~/evolution
```

Gere uma chave forte (é a senha da API — guarde num lugar seguro):

```bash
openssl rand -hex 32
```

Crie o arquivo `.env` (troque os valores entre `< >`):

```
SERVER_URL=https://evolution.<seu-dominio>
AUTHENTICATION_API_KEY=<a chave gerada acima>

DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:<senha-do-banco>@postgres:5432/evolution?schema=public
DATABASE_CONNECTION_CLIENT_NAME=evolution

CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://redis:6379/6
CACHE_REDIS_PREFIX_KEY=evolution
CACHE_LOCAL_ENABLED=false

LOG_LEVEL=ERROR,WARN
DEL_INSTANCE=false
```

Crie o `docker-compose.yml`:

```yaml
services:
  evolution:
    image: evoapicloud/evolution-api:latest
    container_name: evolution_api
    restart: always
    env_file: .env
    ports:
      - "127.0.0.1:8080:8080"   # só a própria máquina acessa; o Nginx expõe com HTTPS
    volumes:
      - evolution_instances:/evolution/instances
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    container_name: evolution_postgres
    restart: always
    environment:
      POSTGRES_USER: evolution
      POSTGRES_PASSWORD: <senha-do-banco>
      POSTGRES_DB: evolution
    volumes:
      - evolution_postgres:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: evolution_redis
    restart: always
    volumes:
      - evolution_redis:/data

volumes:
  evolution_instances:
  evolution_postgres:
  evolution_redis:
```

> Depois de testar, troque `latest` pela versão exata que subiu
> (`docker image inspect evoapicloud/evolution-api:latest`), para uma
> atualização da Evolution não mudar nada sem você decidir.
> Confira os nomes das variáveis na documentação oficial se algo não subir:
> eles mudam entre versões.

Suba:

```bash
docker compose up -d
docker compose logs -f evolution   # Ctrl+C para sair dos logs
```

### 1.3 Endereço com HTTPS (Nginx)

Aponte um subdomínio (ex.: `evolution.seu-dominio`) para o IP da máquina e crie
`/etc/nginx/sites-available/evolution`:

```nginx
server {
    server_name evolution.<seu-dominio>;
    client_max_body_size 50m;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/evolution /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d evolution.<seu-dominio>
```

Teste no navegador: `https://evolution.<seu-dominio>` deve responder uma
mensagem de boas-vindas da Evolution.

---

## 2. Ligar no painel da igreja

Tudo pelo painel, nada no aplicativo (o WhatsApp é usado só pelo servidor).

1. Painel → **Telas → Integrações**.
2. Preencha:
   - **Endereço da Evolution API:** `https://evolution.<seu-dominio>`
   - **Chave da API:** o `AUTHENTICATION_API_KEY`
   - **Nome da instância:** um por igreja, ex.: `igreja-renovar`
3. **Salvar e ligar.** O sistema confere o acesso, cria a instância se não
   existir e configura sozinho o endereço de mensagens recebidas (webhook).
   Nesse momento o WhatsApp antigo (Chrome) é desligado.
4. **Conectar (QR Code)** e leia com o celular da igreja:
   WhatsApp → Aparelhos conectados → Conectar um aparelho.
5. Quando aparecer **Conectado**, use **Testar** para mandar uma mensagem.

Para voltar ao jeito antigo: **Desligar e voltar ao WhatsApp antigo**.

### Outras igrejas na mesma máquina

Use a **mesma** Evolution. Em cada painel, o mesmo endereço e a mesma chave,
mas um **nome de instância diferente** (`igreja-exemplo`, `igreja-paz`...).

---

## 3. O que funciona pela Evolution

| Recurso | Situação |
|---|---|
| Envio de texto e imagem (avisos, lembretes, envio em massa, senha) | Funciona |
| Atendimento: mensagens recebidas viram tickets | Funciona (pelo webhook) |
| Responder "1" / "2" para sair ou voltar a receber convites | Funciona |
| Enquetes enviadas | Enviadas normalmente |
| **Votos em enquete** | **Ainda não são lidos** — use as respostas "1" e "2" |

## Problemas comuns

- **"Sem acesso à Evolution API"** — endereço errado, HTTPS não configurado ou
  chave diferente do `AUTHENTICATION_API_KEY`.
- **Mensagens recebidas não aparecem no Atendimento** — a Evolution precisa
  alcançar o endereço do webhook mostrado na tela Integrações. Se o site da
  igreja e a Evolution estão na mesma máquina, tudo bem; confira se o domínio
  do site responde por HTTPS.
- **QR Code não aparece** — espere alguns segundos e clique de novo em
  Conectar; veja `docker compose logs -f evolution`.
