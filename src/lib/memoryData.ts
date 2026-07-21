/**
 * memoryData.ts — Top Scripture Memory Verses Dataset
 * Built-in dataset — offline, no API required.
 */

export interface MemoryVerse {
  id: string;
  reference: string;
  category: string;
  text: string;
}

export const MEMORY_VERSES: MemoryVerse[] = [
  {
    id: 'john-3-16',
    reference: 'John 3:16',
    category: 'Salvation & Love',
    text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
  },
  {
    id: 'romans-8-28',
    reference: 'Romans 8:28',
    category: 'God’s Sovereignty',
    text: 'We know that all things work together for good for those who love God, for those who are called according to his purpose.',
  },
  {
    id: 'philippians-4-6',
    reference: 'Philippians 4:6-7',
    category: 'Peace & Anxiety',
    text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.',
  },
  {
    id: 'proverbs-3-5',
    reference: 'Proverbs 3:5-6',
    category: 'Wisdom & Trust',
    text: 'Trust in the Lord with all your heart, and don’t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.',
  },
  {
    id: 'ephesians-2-8',
    reference: 'Ephesians 2:8-9',
    category: 'Grace',
    text: 'For by grace you have been saved through faith, and that not of yourselves; it is the gift of God, not of works, that no one would boast.',
  },
  {
    id: 'isaiah-40-31',
    reference: 'Isaiah 40:31',
    category: 'Hope & Endurance',
    text: 'But those who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.',
  },
  {
    id: '2-timothy-3-16',
    reference: '2 Timothy 3:16-17',
    category: 'Scripture',
    text: 'Every Scripture is God-breathed and profitable for teaching, for reproof, for correction, and for instruction in righteousness, that the man of God may be complete, thoroughly equipped for every good work.',
  },
  {
    id: 'psalm-23-1',
    reference: 'Psalm 23:1',
    category: 'Comfort & Trust',
    text: 'The Lord is my shepherd; I shall not want.',
  },
];
