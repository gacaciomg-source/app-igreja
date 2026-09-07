# Guia de Publicação na Google Play

Da chave de assinatura até o app no ar.

A parte técnica é a menor. O que reprova app é a papelada — e este guia foi
montado olhando os dados que o Igreja Renovar realmente coleta.

| | |
|---|---|
| Conta de desenvolvedor | US$ 25, uma vez |
| Tempo de revisão | 1 a 7 dias |
| Pacote | `com.renovar` |
| Formato de envio | AAB (não APK) |

> **Boa notícia sobre o prazo**
>
> A regra que obriga **12 testadores por 14 dias** antes da produção vale só
> para contas de desenvolvedor **pessoais** criadas depois de novembro de 2023.
> Contas de **organização** estão dispensadas.
>
> A Igreja Renovar tem **CNPJ 52.966.563/0001-32**, natureza jurídica
> Organização Religiosa — dá para abrir a conta como organização e **pular as
> duas semanas de teste obrigatório**. Exige comprovar a entidade, mas sai
> muito mais rápido.
>
> Se abrir como pessoa física, some pelo menos duas semanas ao cronograma e
> comece a juntar os 12 testadores agora.

---

## Parte 1 — A chave de assinatura

O passo mais perigoso do processo inteiro.

### 1. Gerar a chave

Na raiz do projeto. Troque a senha e responda com os dados da igreja:

```bash
keytool -genkey -v -keystore renovar-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias renovar
```

Os 10000 dias (27 anos) não são exagero: o Google exige validade até pelo menos
2033, e chave vencida não assina atualização.

> **Não existe recuperação**
>
> Perder este arquivo ou esquecer a senha significa **nunca mais conseguir
> atualizar o app**. Não é burocracia contornável, é criptografia. O caminho
> seria publicar um app novo, com outro pacote, e pedir para toda a igreja
> reinstalar.
>
> Guarde o `.jks` e as senhas em **dois lugares fora deste computador**.

### 2. Guardar as senhas fora do código

Crie `android/key.properties` — o `.gitignore` já bloqueia:

```properties
storePassword=SUA_SENHA
keyPassword=SUA_SENHA
keyAlias=renovar
storeFile=../renovar-release.jks
```

### 3. Ligar a assinatura no Gradle

Em `android/app/build.gradle`, antes do bloco `android {`:

```groovy
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.withReader('UTF-8') { keystoreProperties.load(it) }
}
```

E dentro de `android { }`:

```groovy
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
        storePassword keystoreProperties['storePassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

Alternativa sem mexer no Gradle: Android Studio → **Build → Generate Signed
Bundle / APK**.

---

## Parte 2 — Versão e pacote

| Campo | Hoje | Regra |
|---|---|---|
| `versionCode` | 1 | Inteiro. **Sobe em toda publicação**, sem exceção. O Google recusa envio com código igual ou menor que um já enviado. |
| `versionName` | "1.0" | O que o usuário lê. Livre. |

Gerar o pacote:

```bash
npm run build && npx cap sync android
```

```bash
cd android && ./gradlew bundleRelease
```

Saída em `android/app/build/outputs/bundle/release/app-release.aab`.

**A Play Store aceita AAB, não APK.** O APK serve só para instalar à mão e
testar.

---

## Parte 3 — Os formulários

É aqui que os apps são reprovados.

### Acesso ao app — obrigatório no seu caso

> **Motivo nº 1 de reprovação**
>
> O Igreja Renovar **exige login para fazer qualquer coisa**. O revisor abre o
> app, vê a tela de entrada, não consegue passar dela e **reprova por conteúdo
> inacessível**.
>
> Em **Política do app → Acesso ao app**, forneça um usuário e senha de teste
> que funcionem. Crie uma conta de membro comum só para isso — não use a conta
> de administrador nem a sua.

### Segurança dos dados

O que você declarar tem que bater com o que o app faz. Levantei o que o
Igreja Renovar coleta de verdade:

| Tipo de dado | Onde no app | Declarar |
|---|---|---|
| Nome, e-mail, telefone | Cadastro do membro | Coletado, vinculado ao usuário |
| Endereço | Cadastro do membro | Coletado, vinculado ao usuário |
| Data de nascimento | Aniversariantes | Coletado, vinculado ao usuário |
| Foto | Avatar do perfil | Coletado, vinculado ao usuário |
| Informação financeira | Dízimos e ofertas | Coletado, vinculado ao usuário |
| Mensagens | Pedidos de oração | Coletado, vinculado ao usuário |
| Outros dados pessoais | Visitas pastorais, presença em células | Coletado, vinculado ao usuário |

Nas três perguntas gerais: dados **criptografados em trânsito** (servidor
HTTPS), **não compartilhados com terceiros**, e **o usuário pode pedir
exclusão**.

> **Não subdeclare**
>
> Dízimo é **informação financeira** e pedido de oração é **mensagem**.
> Declarar menos do que o app coleta é motivo de suspensão quando o Google
> cruza a declaração com o comportamento do app — e costuma aparecer meses
> depois, com o app já em uso pela igreja.

### Exclusão de conta

**Metade já está pronta.** O app tem exclusão funcionando: o botão em
Configurações chama `POST /api/auth/delete-account`, que apaga cadastro, foto,
pedidos de oração, visitas, presenças e inscrições.

**A outra metade também.** A política de privacidade já traz, na seção 8, o
caminho para quem não tem o app instalado: e-mail para
`igrejarenovaroficial@gmail.com` com assunto *Exclusão de conta*, processado
em até 15 dias. A âncora `#exclusao` existe no HTML.

O campo de URL de exclusão da Play Console já tem resposta pronta:

```
https://app.igrejarenovar.com/privacidade.html#exclusao
```


### Os outros três

| Formulário | O que responder |
|---|---|
| **Classificação de conteúdo** | Questionário IARC. Categoria "Aplicativo · Referência". Sem violência, sexo, drogas ou jogos. Deve sair **Livre**. |
| **Público-alvo** | Marcar faixas abaixo de 13 anos joga o app na política de **Famílias**, bem mais rígida. Para gestão de membros, marque **13+** ou **18+**. |
| **Anúncios** | Não. Conferi: não há AdMob nem qualquer SDK de anúncio. |
| **Política de privacidade** | Já existe: `https://app.igrejarenovar.com/privacidade.html`. Confirme que abre pública, sem login. |

---

## Parte 4 — A ficha da loja

### Nome do app (máx. 30)

```
Igreja Renovar
```

### Descrição curta (máx. 80 — usa 76)

```
Comunhão, agenda, células e Palavra do Dia para os membros da Igreja Renovar.
```

### Descrição completa (máx. 4000)

```
O aplicativo da Igreja Renovar reúne num só lugar tudo o que a vida em comunhão precisa no dia a dia.

Acompanhe a agenda de cultos e eventos, confirme presença e receba lembretes do que está por vir.

Leia a Palavra do Dia, marque seus versículos favoritos e siga os planos de leitura da Bíblia no seu ritmo.

Envie e acompanhe pedidos de oração, e ore junto com os irmãos.

Encontre sua célula, veja os encontros e mantenha contato com o seu líder.

Fique por dentro dos comunicados da liderança e das mensagens dos cultos.

Para líderes e secretaria, o aplicativo também organiza escalas de ministério, chamada de células, visitas pastorais e o cadastro dos membros.

O acesso é exclusivo para membros cadastrados na Igreja Renovar. Fale com a secretaria para receber o seu login.
```

### Imagens

| Imagem | Exigência | Situação |
|---|---|---|
| Ícone | 512×512, PNG, **sem transparência** | Pronto: `resources/play-store/icone-512.png` |
| Feature graphic | 1024×500 | Pronto: `resources/play-store/feature-graphic-1024x500.png` |
| Capturas de tela | **Mínimo 2**, até 8. Lado entre 320 e 3840 px | Você precisa tirar |

Sugestão de quatro capturas que contam a história: **início**, **agenda de
eventos**, **Bíblia ou Palavra do Dia**, **pedidos de oração**.

**Evite dados reais de membros nas imagens** — nome, telefone e foto de gente
de verdade viram print público na loja.

---

## Todos os campos, prontos para colar

Puxados da política de privacidade e do código do projeto. Confira antes de
colar — CNPJ e endereço mudam com o tempo.

### Conta de desenvolvedor

| Campo | Valor |
|---|---|
| Tipo de conta | **Organização** — usando o CNPJ, dispensa os 12 testadores |
| Nome da organização | Igreja Renovar |
| CNPJ | `52.966.563/0001-32` |
| Natureza jurídica | Organização Religiosa (322-0) |
| Endereço | Avenida Coração de Estudante, 10 — Moradas da Lapinha, Lagoa Santa/MG — CEP 33.231-568 |
| E-mail de contato | `igrejarenovaroficial@gmail.com` |

### Ficha da loja

| Campo | Valor |
|---|---|
| Tipo | Aplicativo (não é jogo) |
| Categoria | **Estilo de vida** |
| Gratuito ou pago | Gratuito — **escolha definitiva**, não dá para virar pago depois |
| E-mail de contato | `igrejarenovaroficial@gmail.com` |
| Site | `https://app.igrejarenovar.com` |
| Política de privacidade | `https://app.igrejarenovar.com/privacidade.html` |
| Exclusão de conta | `https://app.igrejarenovar.com/privacidade.html#exclusao` |
| Idioma padrão | Português (Brasil) — pt-BR |

> **Sobre a categoria**
>
> **Estilo de vida** é onde ficam os apps de igreja. **Redes sociais** parece
> encaixar por causa dos pedidos de oração, mas puxa exigências extras de
> moderação de conteúdo e de canal de denúncia que você não vai querer ter que
> atender.

### Classificação de conteúdo — questionário IARC

| Pergunta | Resposta |
|---|---|
| Categoria do questionário | Utilitário, produtividade, comunicação ou outro |
| Violência, sexo, linguagem imprópria, drogas | Não para todas |
| Os usuários interagem ou trocam conteúdo? | **Sim** — pedidos de oração são visíveis para a congregação |
| Compartilha localização com outros usuários? | Não |
| Permite compra de itens digitais? | Não |
| Resultado esperado | **Livre** / L |

> **Não esconda a interação**
>
> Dá vontade de responder "não" para interação entre usuários porque
> simplifica o questionário. Mas o app **tem** conteúdo criado por membros e
> visível para os outros — os pedidos de oração. Responder errado aqui é
> declaração falsa, e o Google reavalia a classificação quando percebe.

### Segurança dos dados — item por item

Todos **coletados**, todos **vinculados ao usuário**, nenhum **compartilhado**
com terceiros.

| Dado | Categoria na Play | Obrigatório | Finalidade |
|---|---|---|---|
| Nome | Informações pessoais › Nome | Sim | Gerenciamento da conta |
| E-mail | Informações pessoais › E-mail | Sim | Gerenciamento da conta |
| Telefone | Informações pessoais › Telefone | Não | Funcionalidade do app |
| Endereço | Informações pessoais › Endereço | Não | Funcionalidade do app |
| Data de nascimento | Informações pessoais › Outras | Não | Funcionalidade do app |
| Foto de perfil | Fotos e vídeos › Fotos | Não | Funcionalidade do app |
| Dízimos e ofertas | Informações financeiras › Outras | Não | Funcionalidade do app |
| Pedidos de oração | Mensagens › Outras mensagens | Não | Funcionalidade do app |
| Visitas, presença em células | Informações pessoais › Outras | Não | Funcionalidade do app |

Nas três perguntas gerais: **sim**, os dados trafegam criptografados (HTTPS);
**sim**, o usuário pode pedir exclusão; **não**, não são compartilhados com
terceiros.

### As declarações de política

| Declaração | Resposta |
|---|---|
| Contém anúncios? | **Não** — conferi o projeto, não há AdMob nem SDK de anúncio |
| É app de notícias? | Não |
| É app de saúde ou COVID-19? | Não |
| É app do governo? | Não |
| Oferece serviços financeiros? | **Não** — registra dízimos, mas não processa pagamento nem oferece crédito |
| Público-alvo | 13 a 15 · 16 a 17 · 18 e mais. **Não marque abaixo de 13** |
| Acesso ao app | Restrito — todas as telas exigem login. Informe usuário e senha de teste |

> **Cuidado com o "abaixo de 13"**
>
> Marcar qualquer faixa abaixo de 13 anos joga o app no programa **Projetado
> para Famílias**, que exige políticas adicionais, revisão mais dura e
> restrições de conteúdo. Um app que guarda dízimo e endereço de membros não
> tem por que estar nesse programa. Comece em **13 anos**.

---

## Parte 5 — A ordem de envio

Não vá direto para produção.

| Faixa | Para quê | Tempo |
|---|---|---|
| **Teste interno** | Até 100 pessoas por e-mail, instalação quase imediata. É onde você descobre se o app conecta no servidor e se a notificação chega. | Minutos |
| **Teste fechado** | Grupo maior. **Obrigatório** para contas pessoais novas: 12 testadores por 14 dias corridos. | 14 dias+ |
| **Produção** | Público. Revisão humana. | 1 a 7 dias |

> **Teste no aparelho certo**
>
> Antes de ir para produção, verifique a notificação com o app **fechado** num
> Xiaomi, Samsung ou Motorola. São os que mais matam tarefa de fundo, e é o
> ponto fraco conhecido da solução de notificação sem Firebase.

---

## Depois de publicar

Para cada atualização:

1. Subir o `versionCode` em `android/app/build.gradle`
2. `npm run build && npx cap sync android`
3. `cd android && ./gradlew bundleRelease`
4. Enviar o `.aab` na Play Console

Mudanças só de conteúdo (eventos, comunicados, sermões) **não precisam de
atualização nenhuma** — vêm do seu servidor. Só código novo exige publicar de
novo.

---

## Checklist final

- [ ] Chave de assinatura gerada e copiada para dois lugares fora do computador
- [ ] `key.properties` criado e fora do git
- [ ] `apiUrl` em `themeConfig.ts` apontando para produção, não para IP local
- [ ] `versionCode` maior que o do último envio
- [ ] AAB gerado e instalado à mão num celular de verdade, funcionando
- [ ] Conta de teste criada e informada em Acesso ao app
- [ ] Segurança dos dados preenchida, incluindo financeiro e mensagens
- [ ] Política de privacidade abrindo pública, sem login
- [ ] URL de exclusão de conta declarada (já existe: privacidade.html#exclusao)
- [ ] Classificação de conteúdo, público-alvo e anúncios respondidos
- [ ] Ícone 512, feature graphic e no mínimo 2 capturas enviados
- [ ] Capturas sem dados reais de membros
- [ ] Testado em aparelho com economia de bateria agressiva

---

Companheiro do [GUIA_ANDROID_CAPACITOR.md](GUIA_ANDROID_CAPACITOR.md), que
cobre a parte de build.
