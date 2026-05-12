
export const BIBLE_TRANSLATIONS = [
  { id: 'naa', name: 'NAA (Nova Almeida Atualizada)', api: 'bolls', bollsId: 60, bollsStr: 'NAA', translation: 'almeida' },
  { id: 'nvi', name: 'NVI (Nova Versão Internacional)', api: 'bolls', bollsId: 23, bollsStr: 'NVIPT', translation: 'nvi' },
  { id: 'acf', name: 'Almeida Corrigida Fiel', api: 'bible-api', bollsId: 24, bollsStr: 'ACF', translation: 'almeida' },
  { id: 'kja', name: 'King James Atualizada (KJA)', api: 'bolls', bollsId: 62, bollsStr: 'KJA', translation: 'almeida' },
  { id: 'ara', name: 'Almeida ARA (Geral)', api: 'bolls', bollsId: 21, bollsStr: 'ARA', translation: 'almeida' },
  { id: 'arc', name: 'Almeida RC (Tradicional)', api: 'bible-api', bollsId: 22, bollsStr: 'ARC', translation: 'almeida' },
];

const BIBLE_BOOKS_MAP: Record<string, number> = {
  'Gênesis': 1, 'Êxodo': 2, 'Levítico': 3, 'Números': 4, 'Deuteronômio': 5,
  'Josué': 6, 'Juízes': 7, 'Rute': 8, '1 Samuel': 9, '2 Samuel': 10,
  '1 Reis': 11, '2 Reis': 12, '1 Crônicas': 13, '2 Crônicas': 14, 'Esdras': 15,
  'Neemias': 16, 'Ester': 17, 'Jó': 18, 'Salmos': 19, 'Provérbios': 20,
  'Eclesiastes': 21, 'Cantares': 22, 'Isaías': 23, 'Jeremias': 24, 'Lamentações': 25,
  'Ezequiel': 26, 'Daniel': 27, 'Oseias': 28, 'Joel': 29, 'Amós': 30,
  'Obadias': 31, 'Jonas': 32, 'Miqueias': 33, 'Naum': 34, 'Habacuque': 35,
  'Sofonias': 36, 'Ageu': 37, 'Zacarias': 38, 'Malaquias': 39,
  'Mateus': 40, 'Marcos': 41, 'Lucas': 42, 'João': 43, 'Atos': 44,
  'Romanos': 45, '1 Coríntios': 46, '2 Coríntios': 47, 'Gálatas': 48, 'Efésios': 49,
  'Filipenses': 50, 'Colossenses': 51, '1 Tessalonicenses': 52, '2 Tessalonicenses': 53, '1 Timóteo': 54,
  '2 Timóteo': 55, 'Tito': 56, 'Filemom': 57, 'Hebreus': 58, 'Tiago': 59,
  '1 Pedro': 60, '2 Pedro': 61, '1 João': 62, '2 João': 63, '3 João': 64,
  'Judas': 65, 'Apocalipse': 66
};

// Help strip HTML tags from bolls.life
function stripHtml(text: string) {
  if (!text) return "";
  return text
    .replace(/<br\s*[\/]?>/gi, ' ')
    .replace(/<\/br>/gi, ' ')
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export async function fetchVerseText(reference: string, translationId: string = 'naa') {
  try {
    const t = BIBLE_TRANSLATIONS.find(tr => tr.id === translationId) || BIBLE_TRANSLATIONS[0];
    
    // Parse reference: "John 3:16" or "João 3:16" or "1 João 1:9"
    const refMatch = reference.match(/^((?:\d\s)?[^0-9:]+)\s(\d+):(\d+)$/i);
    if (!refMatch) {
       // Fallback to simple bible-api for unstructured strings
       const res = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=almeida`);
       if (res.ok) {
         const data = await res.json();
         return stripHtml(data.text);
       }
       return null;
    }

    const [, bookName, chapter, verse] = refMatch;
    
    if (t.api === 'bolls') {
      const bookId = BIBLE_BOOKS_MAP[bookName] || BIBLE_BOOKS_MAP[bookName.trim()];
      if (bookId) {
        // bolls.life get-verse: /get-verse/{translation}/{book}/{chapter}/{verse}/
        const response = await fetch(`https://bolls.life/get-verse/${t.bollsStr}/${bookId}/${chapter}/${verse}/`);
        if (response.ok) {
          const data = await response.json();
          return stripHtml(data.text);
        }
      }
    }

    // Fallback or explicit bible-api
    const response = await fetch(`https://bible-api.com/${encodeURIComponent(bookName)}+${chapter}:${verse}?translation=${t.translation || 'almeida'}`);
    if (response.ok) {
        const data = await response.json();
        return stripHtml(data.text);
    }
    
    return null;
  } catch (e) {
    console.error('Bible API error:', e);
    return null;
  }
}
