var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path2 = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_os = __toESM(require("os"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_uuid2 = require("uuid");

// src/lib/storage.ts
var import_promises = __toESM(require("fs/promises"), 1);
var import_path = __toESM(require("path"), 1);
var DATA_DIR = import_path.default.resolve(process.cwd(), "data");
console.log(`[Storage] Base directory: ${DATA_DIR}`);
async function ensureDataDir() {
  try {
    await import_promises.default.access(DATA_DIR);
  } catch {
    console.log(`[Storage] Creating data directory: ${DATA_DIR}`);
    await import_promises.default.mkdir(DATA_DIR, { recursive: true });
  }
}
function sanitizeCollectionName(name) {
  if (!name || typeof name !== "string") {
    throw new Error("Nome de cola\xE7\xE3o inv\xE1lido.");
  }
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!sanitized || sanitized !== name) {
    throw new Error("Tentativa de inje\xE7\xE3o ou caracteres inv\xE1lidos detectados na cole\xE7\xE3o.");
  }
  return sanitized;
}
async function readCollection(collectionName) {
  const safeCollectionName = sanitizeCollectionName(collectionName);
  const filePath = import_path.default.join(DATA_DIR, `${safeCollectionName}.json`);
  try {
    const data = await import_promises.default.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    if (safeCollectionName === "config") {
      return [{ id: "tithes", message: "Tudo o que tenho vem de Ti, e o que das Tuas m\xE3os recebemos, Ti damos.", pixKey: "igrejarenovar@pix.com", churchName: "Igreja Renovar" }];
    }
    return [];
  }
}
async function writeCollection(collectionName, data) {
  const safeCollectionName = sanitizeCollectionName(collectionName);
  await ensureDataDir();
  const filePath = import_path.default.join(DATA_DIR, `${safeCollectionName}.json`);
  await import_promises.default.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}
async function findById(collectionName, id) {
  const collection = await readCollection(collectionName);
  return collection.find((item) => item.id === id);
}
async function insert(collectionName, item) {
  const collection = await readCollection(collectionName);
  collection.push(item);
  await writeCollection(collectionName, collection);
  return item;
}
async function update(collectionName, id, updates) {
  const collection = await readCollection(collectionName);
  const index = collection.findIndex((item) => item.id === id);
  if (index === -1) return void 0;
  collection[index] = { ...collection[index], ...updates };
  await writeCollection(collectionName, collection);
  return collection[index];
}
async function remove(collectionName, id) {
  const collection = await readCollection(collectionName);
  const filtered = collection.filter((item) => item.id !== id);
  if (filtered.length === collection.length) return false;
  await writeCollection(collectionName, filtered);
  return true;
}

// src/lib/seedVerses.ts
var import_uuid = require("uuid");
var INITIAL_VERSES = [
  { ref: "Jo\xE3o 3:16", text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unig\xEAnito, para que todo aquele que nele cr\xEA n\xE3o pere\xE7a, mas tenha a vida eterna." },
  { ref: "Salmos 23:1", text: "O Senhor \xE9 o meu pastor, nada me faltar\xE1." },
  { ref: "Filipenses 4:13", text: "Posso todas as coisas naquele que me fortalece." },
  { ref: "Salmos 27:1", text: "O Senhor \xE9 a minha luz e a minha salva\xE7\xE3o; a quem temerei?" },
  { ref: "Mateus 6:33", text: "Buscai primeiro o Reino de Deus e a sua justi\xE7a, e todas estas coisas vos ser\xE3o acrescentadas." },
  { ref: "Josu\xE9 1:9", text: "N\xE3o fui eu que lhe ordenei? Seja forte e corajoso! N\xE3o se apavore nem desanime, pois o Senhor, o seu Deus, estar\xE1 com voc\xEA por onde voc\xEA andar." },
  { ref: "Prov\xE9rbios 3:5", text: "Confie no Senhor de todo o seu cora\xE7\xE3o e n\xE3o se apoie em seu pr\xF3prio entendimento." },
  { ref: "Filipenses 4:4", text: "Alegrem-se sempre no Senhor. Novamente direi: Alegrem-se!" },
  { ref: "Filipenses 4:19", text: "O meu Deus suprir\xE1 todas as necessidades de voc\xEAs, de acordo com as suas gloriosas riquezas em Cristo Jesus." },
  { ref: "Colossenses 3:23", text: "Tudo o que fizerem, fa\xE7am de todo o cora\xE7\xE3o, como para o Senhor, e n\xE3o para os homens." },
  { ref: "Salmos 119:105", text: "L\xE2mpada para os meus p\xE9s \xE9 tua palavra, e luz para o meu caminho." },
  { ref: "Salmos 37:4", text: "Deleita-te tamb\xE9m no Senhor, e te conceder\xE1 os desejos do teu cora\xE7\xE3o." },
  { ref: "Salmos 121:2", text: "O meu socorro vem do Senhor, que fez o c\xE9u e a terra." },
  { ref: "Salmos 91:7", text: "Mil poder\xE3o cair ao seu lado, e dez mil \xE0 sua direita, mas nada o atingir\xE1." },
  { ref: "Salmos 91:1", text: "Aquele que habita no esconderijo do Alt\xEDssimo, \xE0 sombra do Onipotente descansar\xE1." },
  { ref: "1 Cor\xEDntios 13:4", text: "O amor \xE9 paciente, o amor \xE9 bondoso. N\xE3o inveja, n\xE3o se vangloria, n\xE3o se orgulha." },
  { ref: "Isa\xEDas 40:31", text: "Mas os que esperam no Senhor renovar\xE3o as suas for\xE7as; subir\xE3o com asas como \xE1guias." },
  { ref: "1 Pedro 5:7", text: "Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de voc\xEAs." },
  { ref: "Mateus 11:28", text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei." },
  { ref: "Romanos 8:28", text: "E sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus." },
  { ref: "Jeremias 29:11", text: "Pois eu bem sei os planos que tenho para voc\xEAs, diz o Senhor, planos de faz\xEA-los prosperar." },
  { ref: "Salmos 46:1", text: "Deus \xE9 o nosso ref\xFAgio e fortaleza, socorro bem presente na ang\xFAstia." },
  { ref: "Mateus 5:8", text: "Bem-aventurados os limpos de cora\xE7\xE3o, porque eles ver\xE3o a Deus." },
  { ref: "Salmos 139:14", text: "Eu te louvarei, porque de um modo terr\xEDvel e t\xE3o maravilhoso fui formado." },
  { ref: "Prov\xE9rbios 18:24", text: "O homem que tem muitos amigos pode cair em ru\xEDna, mas h\xE1 amigo mais chegado do que um irm\xE3o." },
  { ref: "Salmos 103:1", text: "Bendize, \xF3 minha alma, ao Senhor, e tudo o que h\xE1 em mim bendiga o seu santo nome." },
  { ref: "Ef\xE9sios 2:8", text: "Porque pela gra\xE7a sois salvos, por meio da f\xE9; e isso n\xE3o vem de v\xF3s, \xE9 dom de Deus." },
  { ref: "G\xE1latas 5:22", text: "Mas o fruto do Esp\xEDrito \xE9: amor, gozo, paz, longanimidade, benignidade, bondade, f\xE9, mansid\xE3o, temperan\xE7a." },
  { ref: "Salmos 34:8", text: "Provai, e vede que o Senhor \xE9 bom; bem-aventurado o homem que nele confia." },
  { ref: "Mateus 28:20", text: "Eis que eu estou convosco todos os dias, at\xE9 a consuma\xE7\xE3o dos s\xE9culos. Am\xE9m." },
  { ref: "Romanos 12:2", text: "E n\xE3o sede conformados com este mundo, mas sede transformados pela renova\xE7\xE3o do vosso entendimento." },
  { ref: "Hebreus 11:1", text: "Ora, a f\xE9 \xE9 o firme fundamento das coisas que se esperam, e a prova das coisas que se n\xE3o v\xEAm." },
  { ref: "Tiago 1:5", text: "E, se algum de v\xF3s tem falta de sabedoria, pe\xE7a-a a Deus, que a todos d\xE1 liberalmente." }
];
async function seedVerses() {
  const configs = await readCollection("config");
  if (configs.find((c) => c.id === "verses_seeded")) {
    const existing2 = await readCollection("verses");
    return { count: existing2.length, status: "already_seeded" };
  }
  const existing = await readCollection("verses");
  if (existing.length === 0) {
    for (let i = 0; i < INITIAL_VERSES.length; i++) {
      await insert("verses", {
        id: (0, import_uuid.v4)(),
        ...INITIAL_VERSES[i],
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  await insert("config", { id: "verses_seeded", seeded: true });
  const finalExisting = await readCollection("verses");
  return { count: finalExisting.length, status: "success" };
}

// src/lib/bible.ts
var BIBLE_TRANSLATIONS = [
  { id: "naa", name: "NAA (Nova Almeida Atualizada)", api: "bolls", bollsId: 60, bollsStr: "NAA", translation: "almeida" },
  { id: "nvi", name: "NVI (Nova Vers\xE3o Internacional)", api: "bolls", bollsId: 23, bollsStr: "NVIPT", translation: "nvi" },
  { id: "acf", name: "Almeida Corrigida Fiel", api: "bolls", bollsId: 24, bollsStr: "ACF", translation: "almeida" },
  { id: "kja", name: "King James Atualizada (KJA)", api: "bolls", bollsId: 62, bollsStr: "KJA", translation: "almeida" },
  { id: "ara", name: "Almeida ARA (Geral)", api: "bolls", bollsId: 21, bollsStr: "ARA", translation: "almeida" },
  { id: "arc", name: "Almeida RC (Tradicional)", api: "bolls", bollsId: 22, bollsStr: "ARC", translation: "almeida" }
];
var BIBLE_BOOKS_MAP = {
  "G\xEAnesis": 1,
  "\xCAxodo": 2,
  "Lev\xEDtico": 3,
  "N\xFAmeros": 4,
  "Deuteron\xF4mio": 5,
  "Josu\xE9": 6,
  "Ju\xEDzes": 7,
  "Rute": 8,
  "1 Samuel": 9,
  "2 Samuel": 10,
  "1 Reis": 11,
  "2 Reis": 12,
  "1 Cr\xF4nicas": 13,
  "2 Cr\xF4nicas": 14,
  "Esdras": 15,
  "Neemias": 16,
  "Ester": 17,
  "J\xF3": 18,
  "Salmos": 19,
  "Prov\xE9rbios": 20,
  "Eclesiastes": 21,
  "Cantares": 22,
  "Isa\xEDas": 23,
  "Jeremias": 24,
  "Lamenta\xE7\xF5es": 25,
  "Ezequiel": 26,
  "Daniel": 27,
  "Oseias": 28,
  "Joel": 29,
  "Am\xF3s": 30,
  "Obadias": 31,
  "Jonas": 32,
  "Miqueias": 33,
  "Naum": 34,
  "Habacuque": 35,
  "Sofonias": 36,
  "Ageu": 37,
  "Zacarias": 38,
  "Malaquias": 39,
  "Mateus": 40,
  "Marcos": 41,
  "Lucas": 42,
  "Jo\xE3o": 43,
  "Atos": 44,
  "Romanos": 45,
  "1 Cor\xEDntios": 46,
  "2 Cor\xEDntios": 47,
  "G\xE1latas": 48,
  "Ef\xE9sios": 49,
  "Filipenses": 50,
  "Colossenses": 51,
  "1 Tessalonicenses": 52,
  "2 Tessalonicenses": 53,
  "1 Tim\xF3teo": 54,
  "2 Tim\xF3teo": 55,
  "Tito": 56,
  "Filemom": 57,
  "Hebreus": 58,
  "Tiago": 59,
  "1 Pedro": 60,
  "2 Pedro": 61,
  "1 Jo\xE3o": 62,
  "2 Jo\xE3o": 63,
  "3 Jo\xE3o": 64,
  "Judas": 65,
  "Apocalipse": 66
};
function stripHtml(text) {
  if (!text) return "";
  return text.replace(/<br\s*[\/]?>/gi, " ").replace(/<\/br>/gi, " ").replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").trim();
}
async function fetchVerseText(reference, translationId = "naa") {
  try {
    const t = BIBLE_TRANSLATIONS.find((tr) => tr.id === translationId) || BIBLE_TRANSLATIONS[0];
    const refMatch = reference.match(/^((?:\d\s)?[^0-9:]+?)\s+(\d+)[:\s]+(\d+(?:-\d+)?)$/i);
    if (!refMatch) {
      const cleanRef = reference.replace(/\s+/g, " ");
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(cleanRef)}?translation=almeida`);
      if (res.ok) {
        const data = await res.json();
        return stripHtml(data.text);
      }
      return null;
    }
    const [, bookName, chapter, verseStr] = refMatch;
    if (t.api === "bolls") {
      const bookId = BIBLE_BOOKS_MAP[bookName] || BIBLE_BOOKS_MAP[bookName.trim()];
      if (bookId) {
        if (verseStr.includes("-")) {
          const [startV, endV] = verseStr.split("-").map(Number);
          const response2 = await fetch(`https://bolls.life/get-chapter/${t.bollsStr}/${bookId}/${chapter}/`);
          if (response2.ok) {
            const data = await response2.json();
            if (Array.isArray(data) && data.length > 0) {
              const verses = data.filter((v) => v.verse >= startV && v.verse <= endV);
              if (verses.length > 0) return stripHtml(verses.map((v) => v.text).join(" "));
            }
          }
        } else {
          const response2 = await fetch(`https://bolls.life/get-verse/${t.bollsStr}/${bookId}/${chapter}/${verseStr}/`);
          if (response2.ok) {
            const data = await response2.json();
            if (data.text) return stripHtml(data.text);
          }
        }
      }
    }
    const url = `https://bible-api.com/${encodeURIComponent(bookName)}+${chapter}:${verseStr}?translation=${t.translation || "almeida"}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return stripHtml(data.text);
    }
    return null;
  } catch (e) {
    console.error("Bible API error:", e);
    return null;
  }
}

// server.ts
var import_whatsapp_web = __toESM(require("whatsapp-web.js"), 1);
var import_qrcode = __toESM(require("qrcode"), 1);
var import_qrcode_terminal = __toESM(require("qrcode-terminal"), 1);
var import_node_cron = __toESM(require("node-cron"), 1);
var import_adm_zip = __toESM(require("adm-zip"), 1);
var import_multer = __toESM(require("multer"), 1);
var import_web_push = __toESM(require("web-push"), 1);
var { Client, LocalAuth, MessageMedia, Poll } = import_whatsapp_web.default;
var storageConfig = import_multer.default.diskStorage({
  destination: (req, file, cb) => {
    const dir = import_path2.default.join(process.cwd(), "uploads");
    if (!import_fs.default.existsSync(dir)) {
      import_fs.default.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = import_path2.default.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});
var upload = (0, import_multer.default)({
  storage: storageConfig,
  limits: { fileSize: 200 * 1024 * 1024 }
  // Aumentado para 200MB para suportar imagens de altíssima resolução
});
var JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
var whatsappClient = null;
var lastQr = null;
var whatsappStatus = "DISCONNECTED";
var whatsappError = null;
var START_TIME = Date.now();
var vapidKeys = null;
async function initWebPush() {
  try {
    const configs = await readCollection("config");
    let vapidConfig = configs.find((c) => c.id === "vapid");
    if (!vapidConfig) {
      const keys = import_web_push.default.generateVAPIDKeys();
      vapidConfig = { id: "vapid", ...keys };
      await insert("config", vapidConfig);
      console.log("VAPID keys generated and stored.");
    }
    vapidKeys = { publicKey: vapidConfig.publicKey, privateKey: vapidConfig.privateKey };
    import_web_push.default.setVapidDetails(
      "mailto:gustavoacacio0711@gmail.com",
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
  } catch (e) {
    console.error("Error initializing Web Push:", e);
  }
}
initWebPush();
async function sendPushNotification(title, body, url = "/", targetUserIds) {
  try {
    let subscriptions = await readCollection("push_subscriptions");
    if (targetUserIds) {
      const allowedUsers = new Set(targetUserIds);
      subscriptions = subscriptions.filter((s) => allowedUsers.has(s.userId));
    }
    console.log(`Sending push to ${subscriptions.length} subscribers: ${title}`);
    const payload = JSON.stringify({ title, body, url });
    const promises = subscriptions.map(
      (sub) => import_web_push.default.sendNotification(sub, payload).catch((err) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log("Push subscription expired/unsubscribed:", sub.endpoint);
          return remove("push_subscriptions", sub.id);
        }
        console.error("Error sending push:", err);
      })
    );
    await Promise.all(promises);
  } catch (e) {
    console.error("Failed to send push notifications:", e);
  }
}
async function getWhatsAppChatId(phone) {
  if (!whatsappClient) return null;
  let clean = phone.replace(/\D/g, "");
  if (!clean.startsWith("55")) {
    clean = "55" + clean;
  }
  try {
    let numberId = await whatsappClient.getNumberId(clean);
    if (!numberId && clean.length === 12) {
      const with9 = clean.substring(0, 4) + "9" + clean.substring(4);
      numberId = await whatsappClient.getNumberId(with9);
    } else if (!numberId && clean.length === 13) {
      const without9 = clean.substring(0, 4) + clean.substring(5);
      numberId = await whatsappClient.getNumberId(without9);
    }
    return numberId ? numberId._serialized : `${clean}@c.us`;
  } catch (e) {
    console.error("Error getting number id", e);
    return `${clean}@c.us`;
  }
}
async function getTodayBirthdaysMessage() {
  try {
    const users = await readCollection("users");
    const today = /* @__PURE__ */ new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const todayBirthdays = users.filter((u) => {
      if (!u.birthDate) return false;
      const parts = u.birthDate.split("-");
      if (parts.length !== 3) return false;
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      return month === currentMonth && day === currentDay;
    });
    if (todayBirthdays.length === 0) return "";
    let msg = "\u{1F382} *Aniversariantes de Hoje:*\n\n";
    todayBirthdays.forEach((u) => {
      const parts = u.birthDate.split("-");
      const birthYear = parseInt(parts[0], 10);
      const age = today.getFullYear() - birthYear;
      msg += `\u2022 *${u.name}*
  \u{1F4F1} Contato: ${u.phone || "Desconhecido"}
  \u{1F388} Completando: ${age} anos

`;
    });
    return msg;
  } catch (e) {
    console.error("Error getting birthdays for notification", e);
    return "";
  }
}
async function sendWhatsAppNotifications(message) {
  try {
    if (!whatsappClient || whatsappStatus !== "READY") {
      console.log("WhatsApp notification skipped: Client not ready");
      return;
    }
    const configs = await readCollection("config");
    const whatsappConfig = configs.find((c) => c.id === "whatsapp");
    const phones = whatsappConfig?.adminPhones || [];
    if (!phones || phones.length === 0) {
      throw new Error("Nenhum telefone de administrador configurado.");
    }
    if (Array.isArray(phones)) {
      for (const phone of phones) {
        const chatId = await getWhatsAppChatId(phone);
        if (!chatId) continue;
        console.log(`Enviando mensagem WhatsApp para: ${chatId}`);
        await whatsappClient.sendMessage(chatId, message);
      }
    }
  } catch (err) {
    console.error("Failed to notify admins via WhatsApp:", err);
    throw err;
  }
}
async function initWhatsApp() {
  if (whatsappClient) return;
  console.log("Initializing WhatsApp Client...");
  whatsappStatus = "INITIALIZING";
  whatsappError = null;
  const authPath = import_path2.default.join(process.cwd(), ".wwebjs_auth");
  const sessionName = "session";
  const sessionPath = import_path2.default.join(authPath, `session-${sessionName}`);
  try {
    const lockFiles = [
      import_path2.default.join(sessionPath, "SingletonLock"),
      import_path2.default.join(sessionPath, "SingletonCookie"),
      import_path2.default.join(sessionPath, "SingletonSocket"),
      import_path2.default.join(sessionPath, "Default", "SingletonLock"),
      import_path2.default.join(sessionPath, "Default", "SingletonCookie"),
      import_path2.default.join(sessionPath, "Default", "SingletonSocket")
    ];
    lockFiles.forEach((file) => {
      if (import_fs.default.existsSync(file)) {
        console.log(`Limpando arquivo de trava: ${file}`);
        try {
          import_fs.default.unlinkSync(file);
        } catch (err) {
          console.error(`Erro ao remover trava ${file}:`, err);
        }
      }
    });
  } catch (e) {
    console.error("Falha ao limpar arquivos de trava do Puppeteer:", e);
  }
  whatsappClient = new Client({
    authStrategy: new LocalAuth({ dataPath: authPath }),
    authTimeoutMs: 12e4,
    webVersionCache: {
      type: "remote",
      remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html"
    },
    puppeteer: {
      headless: true,
      handleSIGINT: false,
      handleSIGTERM: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
        "--disable-extensions",
        "--no-first-run"
      ]
    }
  });
  whatsappClient.on("qr", async (qr) => {
    console.log("--- NOVO QR CODE GERADO ---");
    console.log("Escaneie o c\xF3digo abaixo no seu WhatsApp:");
    import_qrcode_terminal.default.generate(qr, { small: true });
    try {
      lastQr = await import_qrcode.default.toDataURL(qr);
      console.log("QR Code formatado para exibi\xE7\xE3o no Painel Web!");
    } catch (err) {
      console.error("Erro ao converter QR para DataURL:", err);
    }
    whatsappStatus = "DISCONNECTED";
  });
  whatsappClient.on("ready", () => {
    console.log("WhatsApp Client STATUS: PRONTO!");
    whatsappStatus = "READY";
    lastQr = null;
    whatsappError = null;
  });
  whatsappClient.on("authenticated", () => {
    console.log("WhatsApp STATUS: AUTENTICADO (carregando sess\xE3o)");
    whatsappStatus = "AUTHENTRICATING";
  });
  whatsappClient.on("auth_failure", (msg) => {
    console.error("WhatsApp STATUS: FALHA NA AUTENTICA\xC7\xC3O:", msg);
    whatsappStatus = "DISCONNECTED";
    whatsappError = "Falha na autentica\xE7\xE3o: " + msg;
  });
  whatsappClient.on("disconnected", (reason) => {
    console.log("WhatsApp STATUS: DESCONECTADO:", reason);
    whatsappStatus = "DISCONNECTED";
    lastQr = null;
    whatsappClient = null;
    setTimeout(initWhatsApp, 1e4);
  });
  whatsappClient.on("message", async (msg) => {
    try {
      if (msg.from.includes("@g.us")) return;
      if (msg.from === "status@broadcast") return;
      const contact = await msg.getContact();
      const ticketId = msg.from;
      let text = msg.body;
      if (msg.type === "poll_creation") {
        text = `[Enquete] ${msg.pollName}
` + msg.pollOptions.map((o) => `- ${o.name}`).join("\n");
      }
      let tickets = await readCollection("crmTickets");
      let ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) {
        ticket = {
          id: ticketId,
          phoneNumber: contact.number,
          contactName: contact.name || contact.pushname || contact.number,
          status: "open",
          assignedTo: null,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          unreadCount: 1,
          lastMessage: text
        };
        await insert("crmTickets", ticket);
      } else {
        ticket.status = "open";
        ticket.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        ticket.unreadCount = (ticket.unreadCount || 0) + 1;
        ticket.lastMessage = text;
        ticket.contactName = contact.name || contact.pushname || contact.number || ticket.contactName;
        await update("crmTickets", ticket.id, ticket);
      }
      const newMsg = {
        id: msg.id.id || require("crypto").randomUUID(),
        ticketId,
        text,
        fromMe: false,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      await insert("crmMessages", newMsg);
    } catch (e) {
      console.error("Error handling incoming WA message:", e);
    }
  });
  try {
    await whatsappClient.initialize();
  } catch (err) {
    console.error("ERRO CR\xCDTICO NA INICIALIZA\xC7\xC3O DO WHATSAPP:", err);
    whatsappError = err.message || String(err);
    if (whatsappError.includes("Code: 127")) {
      whatsappError = "Erro 127: Faltam bibliotecas do Chrome no seu Linux (Ubuntu). Execute os comandos de 'Hospedagem' no admin.";
    }
    whatsappStatus = "DISCONNECTED";
    if (whatsappClient) {
      try {
        await whatsappClient.destroy();
      } catch (e) {
      }
    }
    whatsappClient = null;
  }
}
async function cleanupAndExit() {
  if (whatsappClient) {
    try {
      console.log("Destroying WhatsApp client...");
      await whatsappClient.destroy();
    } catch (e) {
      console.error("Error destroying WhatsApp client:", e);
    }
  }
  process.exit(0);
}
var versesCache = null;
var lastCacheRefresh = 0;
var CACHE_TTL_MS = 60 * 60 * 1e3;
async function getDailyVerse(specificDate) {
  const now = Date.now();
  if (!versesCache || now - lastCacheRefresh > CACHE_TTL_MS) {
    versesCache = await readCollection("verses");
    lastCacheRefresh = now;
  }
  const verses = versesCache;
  if (!verses || verses.length === 0) return null;
  const history = await readCollection("verseHistory") || [];
  const targetDate = specificDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let selectedVerse;
  const dateEntry = history.find((entry) => entry.date === targetDate);
  if (dateEntry) {
    selectedVerse = verses.find((v) => v.id === dateEntry.verseId);
  } else {
    const history180DaysAgo = /* @__PURE__ */ new Date();
    history180DaysAgo.setDate(history180DaysAgo.getDate() - 180);
    const history180DaysAgoStr = history180DaysAgo.toISOString().split("T")[0];
    const recentVerseUsedIds = new Set(history.filter((entry) => entry.date >= history180DaysAgoStr).map((entry) => entry.verseId));
    const candidateVerses = verses.filter((v) => !recentVerseUsedIds.has(v.id));
    if (candidateVerses.length > 0) {
      selectedVerse = candidateVerses[Math.floor(Math.random() * candidateVerses.length)];
    } else {
      selectedVerse = verses[Math.floor(Math.random() * verses.length)];
    }
    await insert("verseHistory", { id: (0, import_uuid2.v4)(), verseId: selectedVerse.id, date: targetDate });
  }
  if (selectedVerse && (!selectedVerse.text || selectedVerse.text.startsWith("Texto") || selectedVerse.text.startsWith("Carregando"))) {
    try {
      const fetchedText = await fetchVerseText(selectedVerse.ref, "acf");
      if (fetchedText) {
        selectedVerse = { ...selectedVerse, text: fetchedText };
        await update("verses", selectedVerse.id, { text: fetchedText });
        const verseInCache = verses.find((v) => v.id === selectedVerse.id);
        if (verseInCache) {
          verseInCache.text = fetchedText;
        }
      }
    } catch (err) {
      console.error("Failed to fetch verse text in server:", err);
    }
  }
  return selectedVerse;
}
process.on("SIGINT", cleanupAndExit);
process.on("SIGTERM", cleanupAndExit);
process.on("SIGUSR2", cleanupAndExit);
initWhatsApp();
import_node_cron.default.schedule("0 0 * * *", async () => {
  console.log("Running daily birthday check...");
  try {
    const message = await getTodayBirthdaysMessage();
    if (message) {
      await sendWhatsAppNotifications(message);
      console.log("Daily birthday notification sent.");
    } else {
      console.log("No birthdays today.");
    }
  } catch (e) {
    console.error("Failed to send scheduled birthday notification:", e);
  }
}, {
  timezone: "America/Sao_Paulo"
});
import_node_cron.default.schedule("30 8 * * *", async () => {
  console.log("Running ministry schedule reminder check...");
  try {
    const schedules = await readCollection("ministrySchedules");
    const users = await readCollection("users");
    const today = /* @__PURE__ */ new Date();
    const targetDate = /* @__PURE__ */ new Date();
    targetDate.setDate(today.getDate() + 3);
    const targetDateStr = targetDate.toISOString().split("T")[0];
    const upcomingSchedules = schedules.filter((s) => s.date === targetDateStr);
    for (const schedule of upcomingSchedules) {
      for (const userId of schedule.assignedUserIds) {
        const user = users.find((u) => u.id === userId);
        if (user && user.phone) {
          const chatId = await getWhatsAppChatId(user.phone);
          if (chatId) {
            const message = `\u{1F4E2} *Lembrete de Escala*

Ol\xE1 *${user.name}*, voc\xEA est\xE1 escalado para o minist\xE9rio no dia *${new Date(schedule.date).toLocaleDateString("pt-BR")}* \xE0s *${schedule.time}*.

\u{1F4CD} Local: ${schedule.location}
\u{1F4DD} Evento: ${schedule.title}

*Por favor, confirme sua presen\xE7a no aplicativo ou responda aqui.*`;
            await whatsappClient.sendMessage(chatId, message);
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to run ministry reminders:", e);
  }
}, {
  timezone: "America/Sao_Paulo"
});
import_node_cron.default.schedule("0 23 * * *", async () => {
  console.log("Iniciando backup autom\xE1tico di\xE1rio...");
  try {
    const dataDir = import_path2.default.join(process.cwd(), "data");
    const backupDir = import_path2.default.join(process.cwd(), "backups");
    if (!import_fs.default.existsSync(backupDir)) import_fs.default.mkdirSync(backupDir, { recursive: true });
    const now = /* @__PURE__ */ new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const filename = `backup-dia${day}-as-${hour}hrs.zip`;
    const filePath = import_path2.default.join(backupDir, filename);
    const zip = new import_adm_zip.default();
    zip.addLocalFolder(dataDir, "data");
    const uDir = import_path2.default.join(process.cwd(), "uploads");
    if (import_fs.default.existsSync(uDir)) {
      zip.addLocalFolder(uDir, "uploads");
    }
    zip.writeZip(filePath);
    console.log(`Backup autom\xE1tico conclu\xEDdo localmente: ${filename}`);
    const configs = await readCollection("config");
    const cloudConfig = configs.find((c) => c.id === "cloudBackup");
    if (cloudConfig?.telegramEnabled && cloudConfig.telegramToken && cloudConfig.telegramChatId) {
      console.log("Enviando backup para Telegram...");
      const form = new FormData();
      form.append("chat_id", cloudConfig.telegramChatId);
      form.append("caption", `\u{1F4E6} *Backup Autom\xE1tico Di\xE1rio*
\u{1F4C5} ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR")}`);
      const fileBuffer = import_fs.default.readFileSync(filePath);
      form.append("document", new File([fileBuffer], "backup-automatico.zip", { type: "application/zip" }));
      const telegramToken = cloudConfig.telegramToken.replace(/^bot/i, "");
      const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, {
        method: "POST",
        body: form
      });
      if (response.ok) {
        console.log("Backup enviado com sucesso para o Telegram!");
      } else {
        const errData = await response.json();
        console.error("Erro ao enviar para Telegram:", errData);
      }
    }
  } catch (e) {
    console.error("Falha no backup autom\xE1tico:", e);
  }
}, {
  timezone: "America/Sao_Paulo"
});
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT || 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express.default.json({ limit: "200mb" }));
  app.use(import_express.default.urlencoded({ limit: "200mb", extended: true }));
  const uploadsDir = import_path2.default.join(process.cwd(), "uploads");
  if (!import_fs.default.existsSync(uploadsDir)) {
    import_fs.default.mkdirSync(uploadsDir);
  }
  app.use("/uploads", import_express.default.static(uploadsDir));
  const ensureSuperAdmin = async () => {
    try {
      const users = await readCollection("users");
      const hasSuperAdmin = users.find((u) => u.role === "superadmin" || u.email === "admin");
      if (!hasSuperAdmin) {
        console.log("Criando Super Admin padr\xE3o...");
        const hashedPassword = await import_bcryptjs.default.hash("admin", 10);
        const superAdmin = {
          id: (0, import_uuid2.v4)(),
          name: "Super Administrador",
          email: "admin",
          password: hashedPassword,
          role: "superadmin",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await insert("users", superAdmin);
        console.log("Super Admin criado com sucesso (login: admin / senha: admin)");
      }
    } catch (e) {
      console.error("Erro ao garantir Super Admin:", e);
    }
  };
  await ensureSuperAdmin();
  const ensureMinistries = async () => {
    try {
      const ministries = await readCollection("ministries");
      if (ministries.length === 0) {
        console.log("Criando minist\xE9rios padr\xE3o...");
        const defaultMinistries = [
          {
            id: (0, import_uuid2.v4)(),
            name: "Louvor e Adora\xE7\xE3o",
            description: "Minist\xE9rio respons\xE1vel pela m\xFAsica e dire\xE7\xE3o do louvor nos cultos.",
            category: "Celebra\xE7\xE3o",
            leaderIds: [],
            memberIds: [],
            pendingRequestIds: [],
            imageUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1000",
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            id: (0, import_uuid2.v4)(),
            name: "M\xEDdia e Tecnologia",
            description: "Respons\xE1vel pela transmiss\xE3o ao vivo, proje\xE7\xE3o, redes sociais e site.",
            category: "Suporte",
            leaderIds: [],
            memberIds: [],
            pendingRequestIds: [],
            imageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000",
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            id: (0, import_uuid2.v4)(),
            name: "Intercess\xE3o",
            description: "Grupo dedicado \xE0 ora\xE7\xE3o e cobertura espiritual da igreja e membros.",
            category: "Espiritual",
            leaderIds: [],
            memberIds: [],
            pendingRequestIds: [],
            imageUrl: "https://images.unsplash.com/photo-1499209974431-9014009774a7?q=80&w=1000",
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        ];
        for (const m of defaultMinistries) {
          await insert("ministries", m);
        }
      }
    } catch (e) {
      console.error("Erro ao garantir minist\xE9rios:", e);
    }
  };
  await ensureMinistries();
  const ensureVerses = async () => {
    try {
      const result = await seedVerses();
      if (result.status === "success") {
        console.log(`Seeding de vers\xEDculos conclu\xEDdo: ${result.count} vers\xEDculos cadastrados.`);
      }
    } catch (e) {
      console.error("Erro ao garantir vers\xEDculos:", e);
    }
  };
  await ensureVerses();
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "N\xE3o autorizado" });
    import_jsonwebtoken.default.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: "Sess\xE3o expirada ou token inv\xE1lido" });
      req.user = user;
      next();
    });
  };
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/public-config", async (req, res) => {
    try {
      const config = await readCollection("config");
      const appearance = config.find((c) => c.id === "appearance");
      res.json({
        loginLogoLight: appearance?.loginLogoLight || null,
        loginLogoDark: appearance?.loginLogoDark || null,
        colorPrimary: appearance?.colorPrimary || null,
        colorSecondary: appearance?.colorSecondary || null,
        colorPrimaryLight: appearance?.colorPrimaryLight || null,
        colorAccent: appearance?.colorAccent || null,
        colorPrimaryDark: appearance?.colorPrimaryDark || null,
        colorSecondaryDark: appearance?.colorSecondaryDark || null,
        colorPrimaryLightDark: appearance?.colorPrimaryLightDark || null,
        colorAccentDark: appearance?.colorAccentDark || null,
        defaultTheme: appearance?.defaultTheme || null,
        churchName: appearance?.churchName || null,
        churchInstagram: appearance?.churchInstagram || null
      });
    } catch (e) {
      res.status(500).json({ error: "Erro ao carregar configura\xE7\xF5es p\xFAblicas" });
    }
  });
  app.get("/api/proxy-image", async (req, res) => {
    try {
      const imageUrl = req.query.url;
      if (!imageUrl) return res.status(400).send("URL is required");
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/png";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(Buffer.from(buffer));
    } catch (err) {
      console.error("Image proxy error:", err);
      res.status(500).send(`Error proxying image: ${err?.message || err}`);
    }
  });
  app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      const users = await readCollection("users");
      const user = users.find((u) => u.id === userId);
      if (!user) return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado" });
      if (currentPassword) {
        if (!await import_bcryptjs.default.compare(currentPassword, user.password)) {
          return res.status(400).json({ error: "Senha atual incorreta" });
        }
      } else if (!user.mustChangePassword) {
        return res.status(400).json({ error: "A senha atual \xE9 obrigat\xF3ria para esta opera\xE7\xE3o." });
      }
      const hashedPassword = await import_bcryptjs.default.hash(newPassword, 10);
      await update("users", userId, {
        password: hashedPassword,
        mustChangePassword: false
      });
      res.json({ success: true, message: "Senha alterada com sucesso." });
    } catch (error) {
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  });
  app.get("/api/users/:userId/export", authenticateToken, async (req, res) => {
    if (req.user.role !== "superadmin") return res.status(403).json({ error: "Acesso n\xE3o autorizado" });
    const { userId } = req.params;
    try {
      const dataDir = import_path2.default.join(process.cwd(), "data");
      const files = await import_fs.default.promises.readdir(dataDir);
      const collections = files.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
      const exportData = {};
      for (const coll of collections) {
        const data = await readCollection(coll);
        exportData[coll] = data.filter((item) => item.userId === userId || item.memberIds?.includes(userId) || item.id === userId);
      }
      res.json(exportData);
    } catch (e) {
      res.status(500).json({ error: "Erro ao exportar dados" });
    }
  });
  app.delete("/api/users/:userId/delete", authenticateToken, async (req, res) => {
    if (req.user.role !== "superadmin") return res.status(403).json({ error: "Acesso n\xE3o autorizado" });
    const { userId } = req.params;
    try {
      const dataDir = import_path2.default.join(process.cwd(), "data");
      const files = await import_fs.default.promises.readdir(dataDir);
      const collections = files.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
      for (const coll of collections) {
        const data = await readCollection(coll);
        const filteredData = data.filter((item) => !(item.userId === userId || item.memberIds?.includes(userId) || item.id === userId));
        await writeCollection(coll, filteredData);
      }
      res.json({ message: "Dados do usu\xE1rio exclu\xEDdos com sucesso" });
    } catch (e) {
      res.status(500).json({ error: "Erro ao excluir dados" });
    }
  });
  app.get("/api/verses/fix-placeholders", authenticateToken, async (req, res) => {
    if (req.user.role !== "superadmin") return res.status(403).end();
    const verses = await readCollection("verses");
    let fixedCount = 0;
    for (const v of verses) {
      if (v.text === "Texto ser\xE1 buscado na B\xEDblia no momento da visualiza\xE7\xE3o.") {
      }
    }
    res.json({ fixedCount });
  });
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, birthDate, address, phone } = req.body;
      const normalizedEmail = email.toLowerCase();
      const users = await readCollection("users");
      const existingUser = users.find(
        (u) => u.email && u.email.toLowerCase() === normalizedEmail || phone && u.phone && u.phone.replace(/\D/g, "") === phone.replace(/\D/g, "")
      );
      if (existingUser) {
        if (existingUser.isPreRegistered && !existingUser.password) {
          const hashedPassword2 = await import_bcryptjs.default.hash(password, 10);
          const conversionNote = {
            id: (0, import_uuid2.v4)(),
            text: "Cadastro completado pelo usu\xE1rio via aplicativo.",
            date: (/* @__PURE__ */ new Date()).toISOString(),
            authorName: "Sistema",
            type: "status_change"
          };
          const updatedUser = {
            ...existingUser,
            name: name || existingUser.name,
            email: normalizedEmail,
            password: hashedPassword2,
            birthDate: birthDate || existingUser.birthDate || "",
            address: address || existingUser.address || "",
            phone: phone || existingUser.phone || "",
            memberStatus: "new_member",
            integrationNotes: [...existingUser.integrationNotes || [], conversionNote],
            joinedAt: existingUser.joinedAt || (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            isPreRegistered: false
          };
          await update("users", existingUser.id, updatedUser);
          const { password: _2, ...userWithoutPassword2 } = updatedUser;
          const token2 = import_jsonwebtoken.default.sign({ id: updatedUser.id, role: updatedUser.role, name: updatedUser.name }, JWT_SECRET, { expiresIn: "30d" });
          return res.json({ user: userWithoutPassword2, token: token2 });
        } else if (normalizedEmail === "admin") {
          return res.status(400).json({ error: "E-mail reservado" });
        } else {
          return res.status(400).json({ error: "E-mail ou telefone j\xE1 cadastrado" });
        }
      }
      const hashedPassword = await import_bcryptjs.default.hash(password, 10);
      const newUser = {
        id: (0, import_uuid2.v4)(),
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "member",
        birthDate: birthDate || "",
        address: address || "",
        phone: phone || "",
        memberStatus: "new_member",
        joinedAt: (/* @__PURE__ */ new Date()).toISOString(),
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await insert("users", newUser);
      const { password: _, ...userWithoutPassword } = newUser;
      const token = import_jsonwebtoken.default.sign({ id: newUser.id, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: "30d" });
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Erro ao registrar" });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = email.toLowerCase();
      const users = await readCollection("users");
      const user = users.find((u) => u.email && u.email.toLowerCase() === normalizedEmail);
      if (!user || !await import_bcryptjs.default.compare(password, user.password)) {
        return res.status(401).json({ error: "Credenciais inv\xE1lidas" });
      }
      const { password: _, ...userWithoutPassword } = user;
      const token = import_jsonwebtoken.default.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "30d" });
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      res.status(500).json({ error: "Erro ao entrar" });
    }
  });
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email } = req.body;
      const normalizedEmail = email.toLowerCase();
      const users = await readCollection("users");
      const user = users.find((u) => u.email && u.email.toLowerCase() === normalizedEmail);
      if (!user) {
        return res.status(404).json({ error: "E-mail n\xE3o encontrado no sistema" });
      }
      if (!user.phone) {
        return res.status(400).json({ error: "O usu\xE1rio n\xE3o possui telefone cadastrado para recuperar a senha." });
      }
      if (!whatsappClient || whatsappStatus !== "READY") {
        return res.status(500).json({ error: "O sistema de WhatsApp da igreja n\xE3o est\xE1 conectado no momento. Tente novamente mais tarde ou contate um administrador." });
      }
      const tempPassword = Math.floor(1e5 + Math.random() * 9e5).toString();
      const hashedPassword = await import_bcryptjs.default.hash(tempPassword, 10);
      await update("users", user.id, {
        password: hashedPassword,
        mustChangePassword: true
      });
      const message1 = `Ol\xE1 *${user.name}*, \u{1F44B}

Sua senha tempor\xE1ria para acessar o aplicativo da igreja \xE9 a seguinte:

\u{1F447} Copie o c\xF3digo abaixo e cole no aplicativo. Recomendamos que voc\xEA altere sua senha no menu "Perfil" ap\xF3s acessar o sistema.`;
      const message2 = `${tempPassword}`;
      const chatId = await getWhatsAppChatId(user.phone);
      if (chatId) {
        await whatsappClient.sendMessage(chatId, message1);
        await whatsappClient.sendMessage(chatId, message2);
        res.json({ success: true, message: "Nova senha enviada para seu WhatsApp cadastrado com sucesso!" });
      } else {
        return res.status(500).json({ error: "N\xE3o foi poss\xEDvel enviar mensagem para este n\xFAmero do WhatsApp. Verifique se o n\xFAmero est\xE1 correto." });
      }
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Erro interno ao redefinir a senha" });
    }
  });
  app.get("/api/sysinfo", authenticateToken, (req, res) => {
    try {
      const freeMemory = import_os.default.freemem();
      const totalMemory = import_os.default.totalmem();
      const memoryUsage = ((totalMemory - freeMemory) / totalMemory * 100).toFixed(2);
      const loadAvg = import_os.default.loadavg();
      res.json({
        memoryUsage: Number(memoryUsage),
        freeMemory,
        totalMemory,
        loadAvg,
        uptime: Math.floor(process.uptime()),
        paths: {
          data: import_path2.default.resolve(process.cwd(), "data"),
          uploads: import_path2.default.resolve(process.cwd(), "uploads"),
          cwd: process.cwd()
        }
      });
    } catch (e) {
      res.status(500).json({ error: "Erro ao ler statos do sistema" });
    }
  });
  app.post("/api/whatsapp/reset", authenticateToken, async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== "superadmin" && userRole !== "admin") return res.status(403).send("Acesso negado");
    console.log("Reiniciando WhatsApp via Painel Admin...");
    if (whatsappClient) {
      try {
        await whatsappClient.destroy();
      } catch (e) {
      }
      whatsappClient = null;
    }
    whatsappStatus = "DISCONNECTED";
    initWhatsApp();
    res.json({ ok: true });
  });
  app.get("/api/docs/:filename", authenticateToken, (req, res) => {
    const { filename } = req.params;
    const safeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, "");
    const filePath = import_path2.default.join(process.cwd(), "docs", safeFilename);
    if (import_fs.default.existsSync(filePath)) {
      const content = import_fs.default.readFileSync(filePath, "utf-8");
      res.json({ content });
    } else {
      res.status(404).json({ error: "Documento n\xE3o encontrado" });
    }
  });
  app.post("/api/system/update", authenticateToken, async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== "superadmin") return res.status(403).send("Acesso negado");
    const { exec } = await import("child_process");
    try {
      const configs = await readCollection("config");
      const cloudConfig = configs.find((c) => c.id === "cloudBackup");
      if (cloudConfig?.telegramEnabled && cloudConfig.telegramToken && cloudConfig.telegramChatId) {
        console.log("Enviando backup via Telegram antes de atualizar...");
        const zipTele = new import_adm_zip.default();
        const localDataDir = import_path2.default.join(process.cwd(), "data");
        const uDir = import_path2.default.join(process.cwd(), "uploads");
        if (import_fs.default.existsSync(localDataDir)) zipTele.addLocalFolder(localDataDir, "data");
        if (import_fs.default.existsSync(uDir)) zipTele.addLocalFolder(uDir, "uploads");
        const tempPreUpdatePath = import_path2.default.join(process.cwd(), `backup-pre-update-${(/* @__PURE__ */ new Date()).getTime()}.zip`);
        zipTele.writeZip(tempPreUpdatePath);
        const formTele = new FormData();
        formTele.append("chat_id", cloudConfig.telegramChatId);
        formTele.append("caption", `\u{1F4E6} *Backup de Seguran\xE7a Pr\xE9-Atualiza\xE7\xE3o*
\u{1F4C5} ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR")}`);
        const fileBuffer = import_fs.default.readFileSync(tempPreUpdatePath);
        formTele.append("document", new File([fileBuffer], "backup-pre-update.zip", { type: "application/zip" }));
        const telegramToken = cloudConfig.telegramToken.replace(/^bot/i, "");
        const responseTele = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, {
          method: "POST",
          body: formTele
        });
        if (!responseTele.ok) {
          console.error("Falha ao enviar backup Telegram pr\xE9-update:", await responseTele.text());
        } else {
          console.log("Backup do Telegram enviado com sucesso!");
        }
        try {
          import_fs.default.unlinkSync(tempPreUpdatePath);
        } catch (e) {
        }
      }
    } catch (teleErr) {
      console.error("Erro na rotina de backup do Telegram:", teleErr);
    }
    const backupDir = import_path2.default.join(process.cwd(), "backups/system_snapshots");
    if (!import_fs.default.existsSync(backupDir)) import_fs.default.mkdirSync(backupDir, { recursive: true });
    const snapshotName = `safety-snapshot-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.zip`;
    const snapshotPath = import_path2.default.join(backupDir, snapshotName);
    try {
      console.log("Criando snapshot de seguran\xE7a...");
      const zip = new import_adm_zip.default();
      const files = import_fs.default.readdirSync(process.cwd());
      for (const file of files) {
        const fullPath = import_path2.default.join(process.cwd(), file);
        const stats = import_fs.default.statSync(fullPath);
        if (stats.isDirectory()) {
          if (["node_modules", ".git", "dist", "backups", "uploads", ".next"].includes(file)) continue;
          zip.addLocalFolder(fullPath, file);
        } else {
          zip.addLocalFile(fullPath);
        }
      }
      zip.writeZip(snapshotPath);
      console.log(`Snapshot criado: ${snapshotName}`);
    } catch (e) {
      console.error("Falha ao criar snapshot de seguran\xE7a, mas prosseguindo com update:", e);
    }
    const command = "git fetch origin main && git reset --hard origin/main && npm install --include=dev && npm run build && (pm2 save || true)";
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro na Atualiza\xE7\xE3o: ${error.message}`);
        try {
          import_fs.default.appendFileSync("update_error.log", `${(/* @__PURE__ */ new Date()).toISOString()}: ${error.message}
${stderr}
`);
        } catch (e) {
        }
        return res.status(500).json({ error: error.message, details: stderr });
      }
      console.log(`Sistema Atualizado e Buildado: ${stdout}`);
      res.json({
        ok: true,
        output: stdout,
        message: "O servidor foi atualizado, as depend\xEAncias instaladas e o build conclu\xEDdo. Reiniciando em 3 segundos..."
      });
      setTimeout(() => {
        console.log("Reiniciando processo para aplica\xE7\xE3o de atualiza\xE7\xF5es...");
        process.exit(0);
      }, 3e3);
    });
  });
  app.get("/api/backup", authenticateToken, async (req, res) => {
    try {
      const collections = [
        "users",
        "events",
        "prayers",
        "announcements",
        "cells",
        "readingPlans",
        "pastoralVisits",
        "titheTransactions",
        "attendances",
        "config",
        "ministries",
        "ministrySchedules",
        "adminRoles",
        "eventRegistrations"
      ];
      const backup = {};
      for (const c of collections) {
        backup[c] = await readCollection(c);
      }
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=igreja_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`);
      res.send(JSON.stringify(backup, null, 2));
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar backup" });
    }
  });
  app.get("/api/backup/zip", authenticateToken, async (req, res) => {
    try {
      const dataDir = import_path2.default.join(process.cwd(), "data");
      const uDir = import_path2.default.join(process.cwd(), "uploads");
      const zip = new import_adm_zip.default();
      zip.addLocalFolder(dataDir, "data");
      if (import_fs.default.existsSync(uDir)) {
        zip.addLocalFolder(uDir, "uploads");
      }
      const buffer = zip.toBuffer();
      const now = /* @__PURE__ */ new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const hour = String(now.getHours()).padStart(2, "0");
      const filename = `backup-dia${day}-as-${hour}hrs.zip`;
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      res.send(buffer);
    } catch (error) {
      console.error("Erro ao gerar ZIP de backup:", error);
      res.status(500).json({ error: "Erro ao gerar backup ZIP" });
    }
  });
  app.post("/api/backup/test-cloud", authenticateToken, async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== "superadmin" && userRole !== "admin") return res.status(403).send("Acesso negado");
    try {
      const configs = await readCollection("config");
      const cloudConfig = configs.find((c) => c.id === "cloudBackup");
      if (!cloudConfig?.telegramToken || !cloudConfig.telegramChatId) {
        return res.status(400).json({ error: "Configura\xE7\xE3o do Telegram incompleta ou n\xE3o encontrada" });
      }
      const zip = new import_adm_zip.default();
      const localDataDir = import_path2.default.join(process.cwd(), "data");
      zip.addLocalFolder(localDataDir, "data");
      const uDir = import_path2.default.join(process.cwd(), "uploads");
      if (import_fs.default.existsSync(uDir)) {
        zip.addLocalFolder(uDir, "uploads");
      }
      const tempTestePath = import_path2.default.join(process.cwd(), `teste-backup-${(/* @__PURE__ */ new Date()).getTime()}.zip`);
      zip.writeZip(tempTestePath);
      const form = new FormData();
      form.append("chat_id", cloudConfig.telegramChatId);
      form.append("caption", `\u{1F9EA} *Teste de Backup*
\u{1F4C5} ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR")}`);
      const fileBuffer = import_fs.default.readFileSync(tempTestePath);
      form.append("document", new File([fileBuffer], "teste-backup.zip", { type: "application/zip" }));
      const telegramToken = cloudConfig.telegramToken.replace(/^bot/i, "");
      const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, {
        method: "POST",
        body: form
      });
      try {
        import_fs.default.unlinkSync(tempTestePath);
      } catch (e) {
      }
      if (response.ok) {
        res.json({ ok: true });
      } else {
        const errData = await response.json();
        res.status(500).json({ error: "Falha ao enviar para Telegram", details: errData });
      }
    } catch (error) {
      console.error("Erro no teste de backup:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/backup/import-chunk", authenticateToken, upload.single("chunk"), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== "superadmin" && userRole !== "admin") return res.status(403).send("Acesso negado");
    const file = req.file;
    if (!file) return res.status(400).send("Chunk n\xE3o enviado");
    try {
      const { chunkIndex, totalChunks, uploadId } = req.body;
      const tempDir = import_path2.default.join(process.cwd(), "temp_uploads");
      if (!import_fs.default.existsSync(tempDir)) import_fs.default.mkdirSync(tempDir);
      const finalZipPath = import_path2.default.join(tempDir, `${uploadId}.zip`);
      const chunkBuffer = import_fs.default.readFileSync(file.path);
      import_fs.default.appendFileSync(finalZipPath, chunkBuffer);
      try {
        import_fs.default.unlinkSync(file.path);
      } catch (e) {
      }
      console.log(`Receiving chunk ${parseInt(chunkIndex) + 1} of ${totalChunks}...`);
      if (parseInt(chunkIndex) === parseInt(totalChunks) - 1) {
        console.log(`All chunks received! Extracting file...`);
        const zip = new import_adm_zip.default(finalZipPath);
        const cwd = process.cwd();
        let existingPushSubscriptions = null;
        let existingUsers = null;
        try {
          const pushPath = import_path2.default.join(cwd, "data", "push_subscriptions.json");
          if (import_fs.default.existsSync(pushPath)) {
            existingPushSubscriptions = import_fs.default.readFileSync(pushPath, "utf-8");
          }
          const usersPath = import_path2.default.join(cwd, "data", "users.json");
          if (import_fs.default.existsSync(usersPath)) {
            existingUsers = JSON.parse(import_fs.default.readFileSync(usersPath, "utf-8"));
          }
        } catch (e) {
          console.error("Erro lendo config previa", e);
        }
        const entries = zip.getEntries();
        let extractedCount = 0;
        for (const entry of entries) {
          try {
            if (!entry.isDirectory) {
              zip.extractEntryTo(entry, cwd, true, true);
              extractedCount++;
            }
          } catch (innerErr) {
            console.error(`Erro ao extrair ${entry.entryName}:`, innerErr);
          }
        }
        try {
          if (existingPushSubscriptions) {
            import_fs.default.writeFileSync(import_path2.default.join(cwd, "data", "push_subscriptions.json"), existingPushSubscriptions);
          }
          if (existingUsers && Array.isArray(existingUsers)) {
            const newUsersPath = import_path2.default.join(cwd, "data", "users.json");
            if (import_fs.default.existsSync(newUsersPath)) {
              const newUsers = JSON.parse(import_fs.default.readFileSync(newUsersPath, "utf-8"));
              const mergedUsers = newUsers.map((nu) => {
                const oldUser = existingUsers.find((ou) => ou.id === nu.id || ou.email === nu.email);
                if (oldUser && oldUser.notificationSettings) {
                  nu.notificationSettings = oldUser.notificationSettings;
                }
                return nu;
              });
              import_fs.default.writeFileSync(newUsersPath, JSON.stringify(mergedUsers, null, 2));
            }
          }
        } catch (e) {
          console.error("Erro restaurando notfs", e);
        }
        try {
          import_fs.default.unlinkSync(finalZipPath);
        } catch (e) {
        }
        console.log(`Backup (dados e imagens) importado com sucesso! ${extractedCount} arquivos extraidos.`);
        return res.json({ ok: true, complete: true });
      }
      res.json({ ok: true, complete: false });
    } catch (error) {
      console.error("Erro no chunk do backup:", error);
      res.status(500).json({ error: "Erro no chunk: " + (error.message || error) });
    }
  });
  app.post("/api/backup/import", authenticateToken, upload.single("file"), async (req, res) => {
    const userRole = req.user?.role;
    if (userRole !== "superadmin" && userRole !== "admin") return res.status(403).send("Acesso negado");
    const file = req.file;
    if (!file) return res.status(400).send("Arquivo n\xE3o enviado");
    try {
      console.log("Importing backup from:", file.path, "size:", file.size, "type:", file.mimetype);
      const zip = new import_adm_zip.default(file.path);
      const cwd = process.cwd();
      let existingPushSubscriptions = null;
      let existingUsers = null;
      try {
        const pushPath = import_path2.default.join(cwd, "data", "push_subscriptions.json");
        if (import_fs.default.existsSync(pushPath)) {
          existingPushSubscriptions = import_fs.default.readFileSync(pushPath, "utf-8");
        }
        const usersPath = import_path2.default.join(cwd, "data", "users.json");
        if (import_fs.default.existsSync(usersPath)) {
          existingUsers = JSON.parse(import_fs.default.readFileSync(usersPath, "utf-8"));
        }
      } catch (e) {
        console.error("Erro lendo config previa", e);
      }
      const entries = zip.getEntries();
      let extractedCount = 0;
      for (const entry of entries) {
        try {
          if (!entry.isDirectory) {
            zip.extractEntryTo(entry, cwd, true, true);
            extractedCount++;
          }
        } catch (innerErr) {
          console.error(`Erro ao extrair ${entry.entryName}:`, innerErr);
        }
      }
      try {
        if (existingPushSubscriptions) {
          import_fs.default.writeFileSync(import_path2.default.join(cwd, "data", "push_subscriptions.json"), existingPushSubscriptions);
        }
        if (existingUsers && Array.isArray(existingUsers)) {
          const newUsersPath = import_path2.default.join(cwd, "data", "users.json");
          if (import_fs.default.existsSync(newUsersPath)) {
            const newUsers = JSON.parse(import_fs.default.readFileSync(newUsersPath, "utf-8"));
            const mergedUsers = newUsers.map((nu) => {
              const oldUser = existingUsers.find((ou) => ou.id === nu.id || ou.email === nu.email);
              if (oldUser && oldUser.notificationSettings) {
                nu.notificationSettings = oldUser.notificationSettings;
              }
              return nu;
            });
            import_fs.default.writeFileSync(newUsersPath, JSON.stringify(mergedUsers, null, 2));
          }
        }
      } catch (e) {
        console.error("Erro restaurando notfs", e);
      }
      try {
        import_fs.default.unlinkSync(file.path);
      } catch (e) {
      }
      console.log(`Backup (dados e imagens) importado com sucesso! ${extractedCount} arquivos extraidos.`);
      res.json({ ok: true });
    } catch (error) {
      console.error("Erro ao processar backup:", error);
      res.status(500).json({ error: "Erro ao processar arquivo de backup: " + (error.message || error), details: error.stack });
    }
  });
  app.get("/api/verses/today", async (req, res) => {
    try {
      const verse = await getDailyVerse();
      if (!verse) return res.status(404).json({ error: "Nenhum vers\xEDculo cadastrado" });
      res.json(verse);
    } catch (e) {
      res.status(500).json({ error: "Erro ao buscar vers\xEDculo do dia" });
    }
  });
  app.post("/api/verses/refresh", authenticateToken, async (req, res) => {
    try {
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const tomorrowDate = /* @__PURE__ */ new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = tomorrowDate.toISOString().split("T")[0];
      let history = await readCollection("verseHistory") || [];
      for (const entry of history) {
        if (entry.date === todayStr || entry.date === tomorrowStr) {
          await remove("verseHistory", entry.id);
        }
      }
      const todayVerse = await getDailyVerse(todayStr);
      const tomorrowVerse = await getDailyVerse(tomorrowStr);
      res.json({ success: true, today: todayVerse, tomorrow: tomorrowVerse });
    } catch (e) {
      res.status(500).json({ error: "Erro ao atualizar vers\xEDculos" });
    }
  });
  app.get("/api/verses/stats", authenticateToken, async (req, res) => {
    try {
      const verses = await readCollection("verses");
      if (verses.length === 0) {
        return res.json({ total: 0, today: null, tomorrow: null });
      }
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const tomorrowDate = /* @__PURE__ */ new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = tomorrowDate.toISOString().split("T")[0];
      const todayVerse = await getDailyVerse(todayStr);
      const tomorrowVerse = await getDailyVerse(tomorrowStr);
      res.json({
        total: verses.length,
        today: todayVerse,
        tomorrow: tomorrowVerse
      });
    } catch (e) {
      res.status(500).json({ error: "Erro ao buscar estat\xEDsticas de vers\xEDculos" });
    }
  });
  app.get("/api/collections/:name", authenticateToken, async (req, res) => {
    try {
      let data = await readCollection(req.params.name);
      if (req.params.name === "users") {
        data = data.map((user) => {
          const { password, ...safeUser } = user;
          return safeUser;
        });
      }
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar dados" });
    }
  });
  app.post("/api/ministries/:id/notes", authenticateToken, async (req, res) => {
    try {
      const { content, type, attachments } = req.body;
      const ministryId = req.params.id;
      const ministry = await findById("ministries", ministryId);
      const users = await readCollection("users");
      if (!ministry) return res.status(404).json({ error: "Minist\xE9rio n\xE3o encontrado" });
      const newNote = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        content,
        type: type || "text",
        attachments,
        authorId: req.user.id,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const currentNotes = ministry.notes || [];
      ministry.notes = [...currentNotes, newNote];
      await update("ministries", ministryId, ministry);
      const allTargetIds = /* @__PURE__ */ new Set([...ministry.memberIds || [], ...ministry.leaderIds || []]);
      allTargetIds.delete(req.user.id);
      const targetUserIds = Array.from(allTargetIds);
      const pushTitle = `\u{1F5D2}\uFE0F Nota: ${ministry.name}`;
      const pushBody = content.length > 50 ? content.substring(0, 50) + "..." : content;
      sendPushNotification(pushTitle, pushBody, "/", targetUserIds).catch((err) => console.error("Push failed:", err));
      if (whatsappClient && whatsappStatus === "READY") {
        const author = users.find((u) => u.id === req.user.id);
        const authorName = author ? author.name : "L\xEDder";
        const waMessage = `\u{1F4E2} *Novo aviso do minist\xE9rio ${ministry.name}*

${content}

_Enviado por: ${authorName}_`;
        for (const uid of targetUserIds) {
          const u = users.find((u2) => u2.id === uid);
          if (u && u.phone && String(u.phone).trim()) {
            const chatId = await getWhatsAppChatId(u.phone);
            if (chatId) {
              await whatsappClient.sendMessage(chatId, waMessage).catch(() => {
              });
              await new Promise((r) => setTimeout(r, 100));
            }
          }
        }
      }
      res.json(newNote);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao adicionar anota\xE7\xE3o" });
    }
  });
  app.post("/api/collections/:name/batch", authenticateToken, async (req, res) => {
    try {
      const requester = req.user;
      if (req.params.name === "users" && requester.role !== "admin" && requester.role !== "superadmin") {
        return res.status(403).json({ error: "Acesso negado" });
      }
      const items = req.body.items;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "O atributo 'items' deve ser um array." });
      }
      const newItems = items.map((item) => ({
        ...item,
        id: item.id || (0, import_uuid2.v4)(),
        createdAt: item.createdAt || (/* @__PURE__ */ new Date()).toISOString()
      }));
      const existing = await readCollection(req.params.name) || [];
      const updated = [...existing, ...newItems];
      await writeCollection(req.params.name, updated);
      res.json({ success: true, count: newItems.length });
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar em massa" });
    }
  });
  app.post("/api/collections/:name", authenticateToken, async (req, res) => {
    try {
      const requester = req.user;
      const restrictedCollections = ["users", "ministries", "announcements", "readingPlans", "sermons", "transactions", "funds", "financialRules", "cells", "config", "adminRoles"];
      if (restrictedCollections.includes(req.params.name) && requester.role !== "admin" && requester.role !== "superadmin") {
        return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para adicionar nesta cole\xE7\xE3o." });
      }
      const newItem = {
        ...req.body,
        id: req.body.id || (0, import_uuid2.v4)(),
        createdAt: req.body.createdAt || (/* @__PURE__ */ new Date()).toISOString()
      };
      if (["prayers", "eventRegistrations", "pastoralVisits", "userProgress", "verseHighlights"].includes(req.params.name)) {
        if (newItem.uid && newItem.uid !== requester.id) {
          if (requester.role !== "admin" && requester.role !== "superadmin") {
            newItem.uid = requester.id;
          }
        }
      }
      await insert(req.params.name, newItem);
      console.log(`Successfully inserted into ${req.params.name}:`, newItem.id);
      if (req.params.name === "prayers") {
        const privacy = newItem.privacy === "private" ? "Privado" : "P\xFAblico";
        const msg = `\u{1F64F} *Novo Pedido de Ora\xE7\xE3o*

*Membro:* ${req.user.name || "Desconhecido"}
*Privacidade:* ${privacy}
*Mensagem:* ${newItem.content}`;
        sendWhatsAppNotifications(msg).catch((e) => console.error("WhatsApp notification failed:", e));
        sendPushNotification("Novo Pedido de Ora\xE7\xE3o", `${req.user.name || "Algu\xE9m"} pediu ora\xE7\xE3o: ${newItem.content.substring(0, 50)}...`, "/").catch((e) => console.error("Push failed:", e));
      } else if (req.params.name === "pastoralVisits") {
        const msg = `\u{1F3E1} *Nova Visita Pastoral*

*Solicitante:* ${req.user.name || "Desconhecido"}
*Motivo:* ${newItem.reason || "N\xE3o informado"}`;
        sendWhatsAppNotifications(msg).catch((e) => console.error("WhatsApp notification failed:", e));
      } else if (req.params.name === "events") {
        sendPushNotification("\u{1F4C5} Novo Evento!", `Participe: ${newItem.title}`, "/").catch((e) => console.error("Push failed:", e));
      } else if (req.params.name === "announcements") {
        sendPushNotification("\u{1F4E2} Comunicado", newItem.title, "/").catch((e) => console.error("Push failed:", e));
      } else if (req.params.name === "eventRegistrations") {
        const event = await findById("events", newItem.eventId);
        const msg = `\u{1F39F}\uFE0F *Nova Inscri\xE7\xE3o em Evento*

*Evento:* ${event?.title || "Desconhecido"}
*Membro:* ${newItem.userName}
*Contato:* ${newItem.userPhone || newItem.userEmail}
*Status:* Pendente`;
        sendWhatsAppNotifications(msg).catch((e) => console.error("WhatsApp notification failed:", e));
      }
      res.json(newItem);
    } catch (error) {
      console.error(`Error saving to ${req.params.name}:`, error);
      res.status(500).json({ error: "Erro ao salvar: " + (error instanceof Error ? error.message : String(error)) });
    }
  });
  app.patch("/api/collections/:name/:id", authenticateToken, async (req, res) => {
    try {
      if (req.params.name === "users") {
        const targetId = req.params.id;
        const requester = req.user;
        const updates = req.body;
        if ("password" in updates) {
          delete updates.password;
        }
        if (targetId !== requester.id && requester.role !== "admin" && requester.role !== "superadmin") {
          return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para atualizar o perfil de outro usu\xE1rio" });
        }
        if (updates.role) {
          if (updates.role === "admin" && requester.role !== "superadmin") {
            return res.status(403).json({ error: "Apenas o Super Admin pode promover usu\xE1rios a Administrador" });
          }
          if (requester.role !== "superadmin" && requester.role !== "admin") {
            return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para alterar fun\xE7\xF5es" });
          }
          if (targetId === requester.id && updates.role !== requester.role) {
            return res.status(403).json({ error: "Voc\xEA n\xE3o pode alterar sua pr\xF3pria fun\xE7\xE3o" });
          }
        }
      } else {
        const requester = req.user;
        const restrictedCollections = ["ministries", "announcements", "readingPlans", "sermons", "transactions", "funds", "financialRules", "cells", "config", "adminRoles"];
        if (restrictedCollections.includes(req.params.name) && requester.role !== "admin" && requester.role !== "superadmin") {
          if (req.params.name === "ministries" && (req.method === "PATCH" || req.method === "PUT")) {
            const updates = Object.keys(req.body);
            const ministry = await findById("ministries", req.params.id);
            const isLeader = ministry && ministry.leaderIds && ministry.leaderIds.includes(requester.id);
            if (updates.length === 1 && updates[0] === "pendingRequestIds") {
            } else if (isLeader) {
              const allowed = ["memberIds", "pendingRequestIds", "notes"];
              const isDisallowed = updates.some((k) => !allowed.includes(k));
              if (isDisallowed) {
                return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para editar estes campos." });
              }
            } else {
              return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para editar itens desta cole\xE7\xE3o." });
            }
          } else {
            return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para editar itens desta cole\xE7\xE3o." });
          }
        }
        if (["prayers", "eventRegistrations", "pastoralVisits", "userProgress", "verseHighlights"].includes(req.params.name)) {
          if (requester.role !== "admin" && requester.role !== "superadmin") {
            const item = await findById(req.params.name, req.params.id);
            if (item && item.uid && item.uid !== requester.id) {
              return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para editar este item." });
            }
          }
        }
      }
      const updated = await update(req.params.name, req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "N\xE3o encontrado" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar" });
    }
  });
  app.delete("/api/collections/:name/:id", authenticateToken, async (req, res) => {
    try {
      const requester = req.user;
      const restrictedCollections = ["users", "ministries", "announcements", "readingPlans", "sermons", "transactions", "funds", "financialRules", "cells", "config", "adminRoles"];
      if (restrictedCollections.includes(req.params.name) && requester.role !== "admin" && requester.role !== "superadmin") {
        return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para excluir itens desta cole\xE7\xE3o." });
      }
      if (["prayers", "eventRegistrations", "pastoralVisits", "userProgress", "verseHighlights"].includes(req.params.name)) {
        if (requester.role !== "admin" && requester.role !== "superadmin") {
          const item = await findById(req.params.name, req.params.id);
          if (item && item.uid !== requester.id) {
            return res.status(403).json({ error: "Voc\xEA n\xE3o tem permiss\xE3o para excluir este item." });
          }
        }
      }
      const deleted = await remove(req.params.name, req.params.id);
      if (!deleted) return res.status(404).json({ error: "N\xE3o encontrado" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar" });
    }
  });
  app.get("/api/whatsapp/status", authenticateToken, (req, res) => {
    res.json({
      status: whatsappStatus,
      hasQr: !!lastQr,
      qr: lastQr,
      error: whatsappError
    });
  });
  app.post("/api/whatsapp/reconnect", authenticateToken, async (req, res) => {
    await initWhatsApp();
    res.json({ status: "Initiated" });
  });
  let activeUploads = {};
  app.post("/api/upload-chunk", authenticateToken, upload.single("chunk"), (req, res) => {
    try {
      const { chunkIndex, totalChunks, uploadId, fileName } = req.body;
      if (!req.file) return res.status(400).json({ error: "Chunk n\xE3o enviado" });
      const tempDir = import_path2.default.join(process.cwd(), "temp_uploads");
      if (!import_fs.default.existsSync(tempDir)) import_fs.default.mkdirSync(tempDir);
      const chunkFile = import_path2.default.join(tempDir, `${uploadId}`);
      const chunkBuffer = import_fs.default.readFileSync(req.file.path);
      import_fs.default.appendFileSync(chunkFile, chunkBuffer);
      try {
        import_fs.default.unlinkSync(req.file.path);
      } catch (e) {
      }
      if (parseInt(chunkIndex) === parseInt(totalChunks) - 1) {
        const ext = import_path2.default.extname(fileName) || "";
        const finalName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const finalPath = import_path2.default.join(process.cwd(), "uploads", finalName);
        import_fs.default.renameSync(chunkFile, finalPath);
        return res.json({ complete: true, url: `/uploads/${finalName}` });
      }
      res.json({ complete: false });
    } catch (error) {
      console.error("Erro no chunk do upload:", error);
      res.status(500).json({ error: "Erro no chunk" });
    }
  });
  app.post("/api/upload", authenticateToken, upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }
      res.json({ url: `/uploads/${req.file.filename}` });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Erro no upload" });
    }
  });
  app.post("/api/whatsapp/logout", authenticateToken, async (req, res) => {
    if (whatsappClient) {
      try {
        await whatsappClient.logout();
        whatsappStatus = "DISCONNECTED";
        lastQr = null;
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: "Erro ao deslogar" });
      }
    } else {
      res.status(400).json({ error: "Cliente n\xE3o iniciado" });
    }
  });
  app.post("/api/whatsapp/send", authenticateToken, async (req, res) => {
    try {
      const { to, message } = req.body;
      if (!to || !message) return res.status(400).json({ error: "Telefone e mensagem s\xE3o obrigat\xF3rios" });
      const chatId = await getWhatsAppChatId(to);
      if (!whatsappClient || whatsappStatus !== "READY") {
        return res.status(503).json({ error: "WhatsApp n\xE3o est\xE1 conectado" });
      }
      if (!chatId) return res.status(400).json({ error: "Telefone inv\xE1lido" });
      await whatsappClient.sendMessage(chatId, message);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao enviar: " + (error instanceof Error ? error.message : "Erro desconhecido") });
    }
  });
  app.post("/api/whatsapp/test", authenticateToken, async (req, res) => {
    try {
      await sendWhatsAppNotifications("\u2705 *Teste de Conex\xE3o WhatsApp*\nSeu sistema de notifica\xE7\xF5es est\xE1 funcionando perfeitamente!");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao enviar teste: " + (error instanceof Error ? error.message : "Erro desconhecido") });
    }
  });
  app.get("/api/whatsapp/crm/tickets", authenticateToken, async (req, res) => {
    try {
      const tickets = await readCollection("crmTickets");
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar tickets" });
    }
  });
  app.get("/api/whatsapp/crm/tickets/:id/messages", authenticateToken, async (req, res) => {
    try {
      const messages = await readCollection("crmMessages");
      const ticketMessages = messages.filter((m) => m.ticketId === req.params.id);
      res.json(ticketMessages);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar mensagens" });
    }
  });
  app.post("/api/whatsapp/crm/tickets/:id/send", authenticateToken, async (req, res) => {
    try {
      const ticketId = req.params.id;
      const { text, isPoll, pollOptions } = req.body;
      const authorId = req.user?.id;
      if (!whatsappClient || whatsappStatus !== "READY") return res.status(503).json({ error: "WhatsApp offline" });
      let msgRes;
      if (isPoll && pollOptions) {
        const poll = new Poll(text, pollOptions, { allowMultipleAnswers: false });
        msgRes = await whatsappClient.sendMessage(ticketId, poll);
      } else {
        msgRes = await whatsappClient.sendMessage(ticketId, text);
      }
      let tickets = await readCollection("crmTickets");
      let ticket = tickets.find((t) => t.id === ticketId);
      if (ticket) {
        ticket.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        ticket.lastMessage = isPoll ? `[Enquete] ${text}` : text;
        ticket.status = "open";
        await update("crmTickets", ticket.id, ticket);
      }
      const newMsg = {
        id: msgRes.id?.id || require("crypto").randomUUID(),
        ticketId,
        text: isPoll ? `[Enquete] ${text}
` + pollOptions.map((o) => `- ${o}`).join("\n") : text,
        fromMe: true,
        authorId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      await insert("crmMessages", newMsg);
      res.json(newMsg);
    } catch (error) {
      console.error("Error sending CRM message:", error);
      res.status(500).json({ error: "Erro ao enviar mensagem: " + (error instanceof Error ? error.message : "Desconhecido") });
    }
  });
  app.put("/api/whatsapp/crm/tickets/:id", authenticateToken, async (req, res) => {
    try {
      const ticketId = req.params.id;
      const updates = req.body;
      let tickets = await readCollection("crmTickets");
      let ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) return res.status(404).json({ error: "Ticket n\xE3o encontrado" });
      const updatedTicket = { ...ticket, ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await update("crmTickets", ticket.id, updatedTicket);
      res.json(updatedTicket);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar ticket" });
    }
  });
  app.get("/api/push/public-key", (req, res) => {
    if (!vapidKeys) return res.status(503).json({ error: "VAPID keys not initialized" });
    res.json({ publicKey: vapidKeys.publicKey });
  });
  app.post("/api/push/subscribe", authenticateToken, async (req, res) => {
    try {
      const subscription = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: "Subscription object is required" });
      }
      const subscriptions = await readCollection("push_subscriptions");
      const exists = subscriptions.find((s) => s.endpoint === subscription.endpoint);
      if (!exists) {
        const sub = {
          id: (0, import_uuid2.v4)(),
          userId: req.user.id,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          ...subscription
        };
        await insert("push_subscriptions", sub);
      }
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error subscribing:", error);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });
  app.post("/api/ministries/confirm", authenticateToken, async (req, res) => {
    try {
      const { scheduleId, status } = req.body;
      const userId = req.user.id;
      const schedules = await readCollection("ministrySchedules");
      const schedule = schedules.find((s) => s.id === scheduleId);
      if (!schedule) return res.status(404).json({ error: "Escala n\xE3o encontrada" });
      const confirmations = schedule.confirmations || {};
      confirmations[userId] = status;
      await update("ministrySchedules", scheduleId, { confirmations });
      const ministries = await readCollection("ministries");
      const ministry = ministries.find((m) => m.id === schedule.ministryId);
      const users = await readCollection("users");
      const user = users.find((u) => u.id === userId);
      if (ministry && ministry.leaderIds && ministry.leaderIds.length > 0) {
        const leaders = users.filter((u) => ministry.leaderIds.includes(u.id));
        const statusText = status === "confirmed" ? "CONFIRMOU" : "DESMARCOU";
        const message = `\u{1F514} *Notifica\xE7\xE3o de Escala*

O membro *${user?.name || "Desconhecido"}* ${statusText} a presen\xE7a para a escala:

\u{1F4C5} Data: ${new Date(schedule.date).toLocaleDateString("pt-BR")}
\u23F0 Hora: ${schedule.time}
\u{1F4DD} Evento: ${schedule.title}`;
        for (const leader of leaders) {
          if (leader.phone) {
            const chatId = await getWhatsAppChatId(leader.phone);
            if (chatId) {
              await whatsappClient.sendMessage(chatId, message);
            }
          }
        }
      }
      res.json({ success: true, scheduleId, status });
    } catch (e) {
      console.error("Error confirming ministry schedule:", e);
      res.status(500).json({ error: "Erro ao processar confirma\xE7\xE3o" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => res.sendFile(import_path2.default.join(distPath, "index.html")));
  }
  await ensureMinistries();
  import_node_cron.default.schedule("0 * * * *", async () => {
    try {
      const now = new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const currentHour = now.getHours().toString().padStart(2, "0");
      const currentTimeStr = `${currentHour}:00`;
      const users = await readCollection("users");
      let targetUsers = users.filter(
        (u) => u.notificationSettings && u.notificationSettings.wordOfDayEnabled && !u.notificationSettings.allMuted && u.notificationSettings.wordOfDayTime === currentTimeStr
      );
      if (currentTimeStr === "09:00") {
        const defaultUsers = users.filter(
          (u) => !u.notificationSettings || typeof u.notificationSettings.wordOfDayEnabled === "undefined"
        );
        targetUsers = [...targetUsers, ...defaultUsers];
      }
      if (targetUsers.length > 0) {
        console.log(`Running daily verse notification for ${targetUsers.length} users at ${currentTimeStr}...`);
        const verse = await getDailyVerse();
        if (!verse) return;
        const targetIds = targetUsers.map((u) => u.id);
        await sendPushNotification("\u{1F4D6} Vers\xEDculo do Dia", `"${verse.text}" - ${verse.ref}`, "/bible", targetIds);
      }
    } catch (e) {
      console.error("Failed to send daily verse notification:", e);
    }
  }, {
    timezone: "America/Sao_Paulo"
  });
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("CRITICAL ERROR STARTING SERVER:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
