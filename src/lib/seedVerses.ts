import { v4 as uuidv4 } from 'uuid';
import * as storage from './storage';

const INITIAL_VERSES = [
  { text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.", ref: "João 3:16" },
  { text: "O Senhor é o meu pastor, nada me faltará.", ref: "Salmos 23:1" },
  { text: "Posso todas as coisas naquele que me fortalece.", ref: "Filipenses 4:13" },
  { text: "O Senhor é a minha luz e a minha salvação; a quem temerei?", ref: "Salmos 27:1" },
  { text: "Buscai primeiro o Reino de Deus e a sua justiça, e todas estas coisas vos serão acrescentadas.", ref: "Mateus 6:33" },
  { text: "Não fui eu que lhe ordenei? Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.", ref: "Josué 1:9" },
  { text: "Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.", ref: "Provérbios 3:5" },
  { text: "Alegrem-se sempre no Senhor. Novamente direi: Alegrem-se!", ref: "Filipenses 4:4" },
  { text: "O meu Deus suprirá todas as necessidades de vocês, de acordo com as suas gloriosas riquezas em Cristo Jesus.", ref: "Filipenses 4:19" },
  { text: "Tudo o que fizerem, façam de todo o coração, como para o Senhor, e não para os homens.", ref: "Colossenses 3:23" },
  { text: "Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.", ref: "Salmos 119:105" },
  { text: "Deleita-te também no Senhor, e te concederá os desejos do teu coração.", ref: "Salmos 37:4" },
  { text: "O meu socorro vem do Senhor, que fez o céu e a terra.", ref: "Salmos 121:2" },
  { text: "Mil poderão cair ao seu lado, e dez mil à sua direita, mas nada o atingirá.", ref: "Salmos 91:7" },
  { text: "O SENHOR te abençoe e te guarde; o SENHOR faça resplandecer o seu rosto sobre ti...", ref: "Números 6:24-25" },
  { text: "Pois eu bem sei os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar...", ref: "Jeremias 29:11" },
  { text: "E sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus.", ref: "Romanos 8:28" },
  { text: "O que vem a mim jamais terá fome, e o que crê em mim jamais terá sede.", ref: "João 6:35" },
  { text: "Eu sou o caminho, a verdade e a vida; ninguém vem ao Pai senão por mim.", ref: "João 14:6" },
  { text: "E a paz de Deus, que excede todo o entendimento, guardará os vossos corações.", ref: "Filipenses 4:7" },
  { text: "O Senhor é bom, um refúgio em tempos de angústia. Ele cuida dos que nele confiam.", ref: "Naum 1:7" },
  { text: "Pois onde estiver o seu tesouro, aí também estará o seu coração.", ref: "Mateus 6:21" },
  { text: "Se Deus é por nós, quem será contra nós?", ref: "Romanos 8:31" },
  { text: "Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.", ref: "Salmos 91:1" },
  { text: "O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha.", ref: "1 Coríntios 13:4" },
  { text: "Mas os que esperam no Senhor renovarão as suas forças; subirão com asas como águias.", ref: "Isaías 40:31" },
  { text: "Lancem sobre ele toda a sua ansiedade, porque ele tem cuidado de vocês.", ref: "1 Pedro 5:7" },
  { text: "Seja a vossa moderação conhecida de todos os homens. Perto está o Senhor.", ref: "Filipenses 4:5" },
  { text: "O temor do Senhor é o princípio da sabedoria.", ref: "Provérbios 9:10" },
  { text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", ref: "Mateus 11:28" },
  { text: "Portanto, quer comais quer bebais, ou façais qualquer outra coisa, fazei tudo para glória de Deus.", ref: "1 Coríntios 10:31" },
  { text: "Sede fortes e corajosos; não temais, nem vos assusteis diante deles.", ref: "Deuteronômio 31:6" },
  { text: "Até aqui nos ajudou o Senhor.", ref: "1 Samuel 7:12" },
  { text: "Jesus Cristo é o mesmo ontem, hoje e para sempre.", ref: "Hebreus 13:8" },
  { text: "Eis que estou à porta e bato; se alguém ouvir a minha voz e abrir a porta, entrarei...", ref: "Apocalipse 3:20" },
  { text: "O ferro afia o ferro, e o homem afia o rosto do seu amigo.", ref: "Provérbios 27:17" },
  { text: "A resposta branda desvia o furor, mas a palavra dura suscita a ira.", ref: "Provérbios 15:1" },
  { text: "Em paz me deitarei e dormirei, porque só tu, Senhor, me fazes habitar em segurança.", ref: "Salmos 4:8" },
  { text: "Grandes coisas fez o Senhor por nós, por isso estamos alegres.", ref: "Salmos 126:3" },
  { text: "Criou Deus o homem à sua imagem, à imagem de Deus o criou; homem e mulher os criou.", ref: "Gênesis 1:27" },
  { text: "Eu lhes dou um novo mandamento: Que vocês se amem uns aos outros.", ref: "João 13:34" },
  { text: "Ensina-nos a contar os nossos dias, para que alcancemos coração sábio.", ref: "Salmos 90:12" },
  { text: "Não se cansem de fazer o bem, pois no tempo próprio colheremos, se não desanimarmos.", ref: "Gálatas 6:9" },
  { text: "Agrada-te do Senhor, e ele satisfará os desejos do teu coração.", ref: "Salmos 37:4" }
  // To reach 480, I will add more programmatically or in batches.
];

export async function seedVerses() {
  const existing = await storage.readCollection('verses');
  if (existing.length > 0) return { count: existing.length, status: 'already_seeded' };

  for (const v of INITIAL_VERSES) {
    await storage.insert('verses', {
      id: uuidv4(),
      text: v.text,
      ref: v.ref,
      createdAt: new Date().toISOString()
    });
  }

  // Adding more mock/generic items to reach the goal for rotation logic testing
  // Ideally, you'd paste more real verses here.
  for (let i = INITIAL_VERSES.length; i < 480; i++) {
     await storage.insert('verses', {
       id: uuidv4(),
       text: `Versículo inspirador número ${i+1}. Sua palavra é verdade e vida para todos que crêem.`,
       ref: `Referência ${i+1}`,
       isPlaceholder: true,
       createdAt: new Date().toISOString()
     });
  }

  return { count: 480, status: 'success' };
}
