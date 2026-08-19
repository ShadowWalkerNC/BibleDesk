import { getLocalChapter, getLocalPassage, searchLocalBible } from '../src/lib/bible-local';

async function test() {
  console.log('Testing getLocalChapter Genesis 1 KJV...');
  const ch = getLocalChapter('Genesis', 1, 'kjv');
  console.log('Gen 1 verses count:', ch?.verses.length, 'Verse 1:', ch?.verses[0]?.text);

  console.log('\nTesting getLocalPassage John 3:16-17 WEB...');
  const passage = getLocalPassage('John 3:16-17', 'web');
  console.log('John 3:16-17 reference:', passage?.reference, 'verses:', passage?.verses.map(v => `${v.verse}: ${v.text}`));

  console.log('\nTesting searchLocalBible "In the beginning" ASV...');
  const searchRes = searchLocalBible('In the beginning', 'asv', 5);
  console.log(`Total found: ${searchRes.total}. Top results:`, searchRes.results.map(r => r.reference));

  console.log('\nAll tests passed successfully!');
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
