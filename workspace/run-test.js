const { BIBLE_TRANSLATIONS, fetchVerseText } = require('./test-bible.js');
fetchVerseText('Joel 2:13', 'acf').then(console.log).catch(console.error);
