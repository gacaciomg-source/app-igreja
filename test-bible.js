var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lib/bible.ts
var bible_exports = {};
__export(bible_exports, {
  BIBLE_TRANSLATIONS: () => BIBLE_TRANSLATIONS,
  fetchVerseText: () => fetchVerseText
});
module.exports = __toCommonJS(bible_exports);
var BIBLE_TRANSLATIONS = [
  { id: "naa", name: "NAA (Nova Almeida Atualizada)", api: "bolls", bollsId: 60, bollsStr: "NAA", translation: "almeida" },
  { id: "nvi", name: "NVI (Nova Vers\xE3o Internacional)", api: "bolls", bollsId: 23, bollsStr: "NVIPT", translation: "nvi" },
  { id: "acf", name: "Almeida Corrigida Fiel", api: "bible-api", bollsId: 24, bollsStr: "ACF", translation: "almeida" },
  { id: "kja", name: "King James Atualizada (KJA)", api: "bolls", bollsId: 62, bollsStr: "KJA", translation: "almeida" },
  { id: "ara", name: "Almeida ARA (Geral)", api: "bolls", bollsId: 21, bollsStr: "ARA", translation: "almeida" },
  { id: "arc", name: "Almeida RC (Tradicional)", api: "bible-api", bollsId: 22, bollsStr: "ARC", translation: "almeida" }
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
    const refMatch = reference.match(/^((?:\d\s)?[^0-9:]+)\s(\d+):(\d+)$/i);
    if (!refMatch) {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=almeida`);
      if (res.ok) {
        const data = await res.json();
        return stripHtml(data.text);
      }
      return null;
    }
    const [, bookName, chapter, verse] = refMatch;
    if (t.api === "bolls") {
      const bookId = BIBLE_BOOKS_MAP[bookName] || BIBLE_BOOKS_MAP[bookName.trim()];
      if (bookId) {
        const response2 = await fetch(`https://bolls.life/get-verse/${t.bollsStr}/${bookId}/${chapter}/${verse}/`);
        if (response2.ok) {
          const data = await response2.json();
          return stripHtml(data.text);
        }
      }
    }
    const response = await fetch(`https://bible-api.com/${encodeURIComponent(bookName)}+${chapter}:${verse}?translation=${t.translation || "almeida"}`);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BIBLE_TRANSLATIONS,
  fetchVerseText
});
