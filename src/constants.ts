export const BIBLE_BOOKS = [
  { name: 'Gênesis', chapters: 50, category: 'Antigo Testamento' },
  { name: 'Êxodo', chapters: 40, category: 'Antigo Testamento' },
  { name: 'Levítico', chapters: 27, category: 'Antigo Testamento' },
  { name: 'Números', chapters: 36, category: 'Antigo Testamento' },
  { name: 'Deuteronômio', chapters: 34, category: 'Antigo Testamento' },
  { name: 'Josué', chapters: 24, category: 'Antigo Testamento' },
  { name: 'Juízes', chapters: 21, category: 'Antigo Testamento' },
  { name: 'Rute', chapters: 4, category: 'Antigo Testamento' },
  { name: '1 Samuel', chapters: 31, category: 'Antigo Testamento' },
  { name: '2 Samuel', chapters: 24, category: 'Antigo Testamento' },
  { name: '1 Reis', chapters: 22, category: 'Antigo Testamento' },
  { name: '2 Reis', chapters: 25, category: 'Antigo Testamento' },
  { name: '1 Crônicas', chapters: 29, category: 'Antigo Testamento' },
  { name: '2 Crônicas', chapters: 36, category: 'Antigo Testamento' },
  { name: 'Esdras', chapters: 10, category: 'Antigo Testamento' },
  { name: 'Neemias', chapters: 13, category: 'Antigo Testamento' },
  { name: 'Ester', chapters: 10, category: 'Antigo Testamento' },
  { name: 'Jó', chapters: 42, category: 'Antigo Testamento' },
  { name: 'Salmos', chapters: 150, category: 'Antigo Testamento' },
  { name: 'Provérbios', chapters: 31, category: 'Antigo Testamento' },
  { name: 'Eclesiastes', chapters: 12, category: 'Antigo Testamento' },
  { name: 'Cânticos', chapters: 8, category: 'Antigo Testamento' },
  { name: 'Isaías', chapters: 66, category: 'Antigo Testamento' },
  { name: 'Jeremias', chapters: 52, category: 'Antigo Testamento' },
  { name: 'Lamentações', chapters: 5, category: 'Antigo Testamento' },
  { name: 'Ezequiel', chapters: 48, category: 'Antigo Testamento' },
  { name: 'Daniel', chapters: 12, category: 'Antigo Testamento' },
  { name: 'Oseias', chapters: 14, category: 'Antigo Testamento' },
  { name: 'Joel', chapters: 3, category: 'Antigo Testamento' },
  { name: 'Amós', chapters: 9, category: 'Antigo Testamento' },
  { name: 'Obadias', chapters: 1, category: 'Antigo Testamento' },
  { name: 'Jonas', chapters: 4, category: 'Antigo Testamento' },
  { name: 'Miqueias', chapters: 7, category: 'Antigo Testamento' },
  { name: 'Naum', chapters: 3, category: 'Antigo Testamento' },
  { name: 'Habacuque', chapters: 3, category: 'Antigo Testamento' },
  { name: 'Sofonias', chapters: 3, category: 'Antigo Testamento' },
  { name: 'Ageu', chapters: 2, category: 'Antigo Testamento' },
  { name: 'Zacarias', chapters: 14, category: 'Antigo Testamento' },
  { name: 'Malaquias', chapters: 4, category: 'Antigo Testamento' },
  { name: 'Mateus', chapters: 28, category: 'Novo Testamento' },
  { name: 'Marcos', chapters: 16, category: 'Novo Testamento' },
  { name: 'Lucas', chapters: 24, category: 'Novo Testamento' },
  { name: 'João', chapters: 21, category: 'Novo Testamento' },
  { name: 'Atos', chapters: 28, category: 'Novo Testamento' },
  { name: 'Romanos', chapters: 16, category: 'Novo Testamento' },
  { name: '1 Coríntios', chapters: 16, category: 'Novo Testamento' },
  { name: '2 Coríntios', chapters: 13, category: 'Novo Testamento' },
  { name: 'Gálatas', chapters: 6, category: 'Novo Testamento' },
  { name: 'Efésios', chapters: 6, category: 'Novo Testamento' },
  { name: 'Filipenses', chapters: 4, category: 'Novo Testamento' },
  { name: 'Colossenses', chapters: 4, category: 'Novo Testamento' },
  { name: '1 Tessalonicenses', chapters: 5, category: 'Novo Testamento' },
  { name: '2 Tessalonicenses', chapters: 3, category: 'Novo Testamento' },
  { name: '1 Timóteo', chapters: 6, category: 'Novo Testamento' },
  { name: '2 Timóteo', chapters: 4, category: 'Novo Testamento' },
  { name: 'Tito', chapters: 3, category: 'Novo Testamento' },
  { name: 'Filemom', chapters: 1, category: 'Novo Testamento' },
  { name: 'Hebreus', chapters: 13, category: 'Novo Testamento' },
  { name: 'Tiago', chapters: 5, category: 'Novo Testamento' },
  { name: '1 Pedro', chapters: 5, category: 'Novo Testamento' },
  { name: '2 Pedro', chapters: 3, category: 'Novo Testamento' },
  { name: '1 João', chapters: 5, category: 'Novo Testamento' },
  { name: '2 João', chapters: 1, category: 'Novo Testamento' },
  { name: '3 João', chapters: 1, category: 'Novo Testamento' },
  { name: 'Judas', chapters: 1, category: 'Novo Testamento' },
  { name: 'Apocalipse', chapters: 22, category: 'Novo Testamento' },
];

export const READING_PLAN_TEMPLATES = [
  {
    title: 'Bíblia em 365 Dias',
    description: 'Leia toda a Bíblia em um ano, percorrendo do Gênesis ao Apocalipse.',
    duration: '365 dias',
    imageUrl: 'https://picsum.photos/seed/bible365/400/200',
    chapters: BIBLE_BOOKS.flatMap(book => 
      Array.from({ length: book.chapters }, (_, i) => `${book.name} ${i + 1}`)
    )
  },
  {
    title: 'Novo Testamento em 90 Dias',
    description: 'Uma jornada completa por todos os livros do Novo Testamento.',
    duration: '90 dias',
    imageUrl: 'https://picsum.photos/seed/nt90/400/200',
    chapters: BIBLE_BOOKS
      .filter(b => b.category === 'Novo Testamento')
      .flatMap(book => 
        Array.from({ length: book.chapters }, (_, i) => `${book.name} ${i + 1}`)
      )
  },
  {
    title: 'Provérbios em 31 Dias',
    description: 'Um capítulo de sabedoria por dia para transformar sua vida.',
    duration: '31 dias',
    imageUrl: 'https://picsum.photos/seed/proverbs/400/200',
    chapters: Array.from({ length: 31 }, (_, i) => `Provérbios ${i + 1}`)
  },
  {
    title: 'Salmos em 150 Dias',
    description: 'Um momento de louvor e adoração diário através dos Salmos.',
    duration: '150 dias',
    imageUrl: 'https://picsum.photos/seed/psalms/400/200',
    chapters: Array.from({ length: 150 }, (_, i) => `Salmos ${i + 1}`)
  },
  {
    title: 'Os Evangelhos em 30 Dias',
    description: 'Conheça a vida e os ensinamentos de Jesus através dos quatro evangelhos.',
    duration: '30 dias',
    imageUrl: 'https://picsum.photos/seed/gospels/400/200',
    chapters: BIBLE_BOOKS
      .filter(b => ['Mateus', 'Marcos', 'Lucas', 'João'].includes(b.name))
      .flatMap(book => 
        Array.from({ length: book.chapters }, (_, i) => `${book.name} ${i + 1}`)
      )
  },
  {
    title: 'Cartas de Paulo em 45 Dias',
    description: 'Estude as epístolas paulinas e as bases da doutrina cristã.',
    duration: '45 dias',
    imageUrl: 'https://picsum.photos/seed/paulo/400/200',
    chapters: BIBLE_BOOKS
      .filter(b => [
        'Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios', 
        'Filipenses', 'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses', 
        '1 Timóteo', '2 Timóteo', 'Tito', 'Filemom'
      ].includes(b.name))
      .flatMap(book => 
        Array.from({ length: book.chapters }, (_, i) => `${book.name} ${i + 1}`)
      )
  },
  {
    title: 'Pentateuco em 60 Dias',
    description: 'Os cinco primeiros livros da Bíblia, a base da Lei e da história da criação.',
    duration: '60 dias',
    imageUrl: 'https://picsum.photos/seed/pentateuco/400/200',
    chapters: BIBLE_BOOKS
      .filter(b => ['Gênesis', 'Êxodo', 'Levítico', 'Números', 'Deuteronômio'].includes(b.name))
      .flatMap(book => 
        Array.from({ length: book.chapters }, (_, i) => `${book.name} ${i + 1}`)
      )
  }
];
