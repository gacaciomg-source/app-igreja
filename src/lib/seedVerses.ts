import { v4 as uuidv4 } from 'uuid';
import * as storage from './storage';

const INITIAL_VERSES = [
  { ref: "João 3:16", text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna." },
  { ref: "Salmos 23:1", text: "O Senhor é o meu pastor, nada me faltará." },
  { ref: "Filipenses 4:13", text: "Posso todas as coisas naquele que me fortalece." },
  { ref: "Salmos 27:1", text: "O Senhor é a minha luz e a minha salvação; a quem temerei?" },
  { ref: "Mateus 6:33", text: "Buscai primeiro o Reino de Deus e a sua justiça, e todas estas coisas vos serão acrescentadas." },
  { ref: "Josué 1:9", text: "Não fui eu que lhe ordenei? Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar." },
  { ref: "Provérbios 3:5", text: "Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento." },
  { ref: "Filipenses 4:4", text: "Alegrem-se sempre no Senhor. Novamente direi: Alegrem-se!" },
  { ref: "Filipenses 4:19", text: "O meu Deus suprirá todas as necessidades de vocês, de acordo com as suas gloriosas riquezas em Cristo Jesus." },
  { ref: "Colossenses 3:23", text: "Tudo o que fizerem, façam de todo o coração, como para o Senhor, e não para os homens." },
  { ref: "Salmos 119:105", text: "Lâmpada para os meus pés é tua palavra, e luz para o meu caminho." },
  { ref: "Salmos 37:4", text: "Deleita-te também no Senhor, e te concederá os desejos do teu coração." },
  { ref: "Salmos 121:2", text: "O meu socorro vem do Senhor, que fez o céu e a terra." },
  { ref: "Salmos 91:7", text: "Mil poderão cair ao seu lado, e dez mil à sua direita, mas nada o atingirá." },
  { ref: "Salmos 91:1", text: "Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará." },
  { ref: "1 Coríntios 13:4", text: "O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha." },
  { ref: "Isaías 40:31", text: "Mas os que esperam no Senhor renovarão as suas forças; subirão com asas como águias." },
  { ref: "1 Pedro 5:7", text: "Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de vocês." },
  { ref: "Mateus 11:28", text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei." },
  { ref: "Romanos 8:28", text: "E sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus." },
  { ref: "Jeremias 29:11", text: "Pois eu bem sei os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar." },
  { ref: "Salmos 46:1", text: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia." },
  { ref: "Mateus 5:8", text: "Bem-aventurados os limpos de coração, porque eles verão a Deus." },
  { ref: "Salmos 139:14", text: "Eu te louvarei, porque de um modo terrível e tão maravilhoso fui formado." },
  { ref: "Provérbios 18:24", text: "O homem que tem muitos amigos pode cair em ruína, mas há amigo mais chegado do que um irmão." },
  { ref: "Salmos 103:1", text: "Bendize, ó minha alma, ao Senhor, e tudo o que há em mim bendiga o seu santo nome." },
  { ref: "Efésios 2:8", text: "Porque pela graça sois salvos, por meio da fé; e isso não vem de vós, é dom de Deus." },
  { ref: "Gálatas 5:22", text: "Mas o fruto do Espírito é: amor, gozo, paz, longanimidade, benignidade, bondade, fé, mansidão, temperança." },
  { ref: "Salmos 34:8", text: "Provai, e vede que o Senhor é bom; bem-aventurado o homem que nele confia." },
  { ref: "Mateus 28:20", text: "Eis que eu estou convosco todos os dias, até a consumação dos séculos. Amém." },
  { ref: "Romanos 12:2", text: "E não sede conformados com este mundo, mas sede transformados pela renovação do vosso entendimento." },
  { ref: "Hebreus 11:1", text: "Ora, a fé é o firme fundamento das coisas que se esperam, e a prova das coisas que se não vêm." },
  { ref: "Tiago 1:5", text: "E, se algum de vós tem falta de sabedoria, peça-a a Deus, que a todos dá liberalmente." }
];

const BIBLE_BOOKS = [
  "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute", "1 Samuel", "2 Samuel", 
  "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester", "Jó", "Salmos", "Provérbios", 
  "Eclesiastes", "Cantares", "Isaías", "Jeremias", "Lamentações", "Ezequiel", "Daniel", "Oséias", "Joel", "Amós", 
  "Obadias", "Jonas", "Miquéias", "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias", "Malaquias", "Mateus", 
  "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios", "Filipenses", 
  "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", "2 Timóteo", "Tito", "Filemom", "Hebreus", 
  "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João", "3 João", "Judas", "Apocalipse"
];

export async function seedVerses() {
  const configs = await storage.readCollection<any>("config");
  if (configs.find((c: any) => c.id === "verses_seeded")) {
    const existing = await storage.readCollection('verses');
    return { count: existing.length, status: 'already_seeded' };
  }

  const existing = await storage.readCollection('verses');
  
  if (existing.length === 0) {
    for (let i = 0; i < INITIAL_VERSES.length; i++) {
      await storage.insert('verses', {
        id: uuidv4(),
        ...INITIAL_VERSES[i],
        createdAt: new Date().toISOString()
      });
    }
  }

  await storage.insert('config', { id: "verses_seeded", seeded: true });

  const finalExisting = await storage.readCollection('verses');
  return { count: finalExisting.length, status: 'success' };
}
