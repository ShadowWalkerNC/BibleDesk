/**
 * plansData.ts — Bible Reading Plans Dataset
 * Built-in dataset — offline, no API required.
 */

export interface ReadingDay {
  day: number;
  title: string;
  passages: string[];
}

export interface ReadingPlan {
  id: string;
  name: string;
  durationDays: number;
  category: string;
  description: string;
  days: ReadingDay[];
}

export const READING_PLANS: ReadingPlan[] = [
  {
    id: 'gospels-30',
    name: 'Gospels in 30 Days',
    durationDays: 30,
    category: 'Gospels & Life of Christ',
    description: 'Walk through the life, teachings, death, and resurrection of Jesus Christ across Matthew, Mark, Luke, and John.',
    days: [
      { day: 1, title: 'Matthew 1-4', passages: ['Matthew 1', 'Matthew 2', 'Matthew 3', 'Matthew 4'] },
      { day: 2, title: 'Matthew 5-7 (Sermon on the Mount)', passages: ['Matthew 5', 'Matthew 6', 'Matthew 7'] },
      { day: 3, title: 'Matthew 8-10', passages: ['Matthew 8', 'Matthew 9', 'Matthew 10'] },
      { day: 4, title: 'Matthew 11-13', passages: ['Matthew 11', 'Matthew 12', 'Matthew 13'] },
      { day: 5, title: 'Matthew 14-17', passages: ['Matthew 14', 'Matthew 15', 'Matthew 16', 'Matthew 17'] },
      { day: 6, title: 'Matthew 18-21', passages: ['Matthew 18', 'Matthew 19', 'Matthew 20', 'Matthew 21'] },
      { day: 7, title: 'Matthew 22-25', passages: ['Matthew 22', 'Matthew 23', 'Matthew 24', 'Matthew 25'] },
      { day: 8, title: 'Matthew 26-28', passages: ['Matthew 26', 'Matthew 27', 'Matthew 28'] },
      { day: 9, title: 'Mark 1-4', passages: ['Mark 1', 'Mark 2', 'Mark 3', 'Mark 4'] },
      { day: 10, title: 'Mark 5-8', passages: ['Mark 5', 'Mark 6', 'Mark 7', 'Mark 8'] },
      { day: 11, title: 'Mark 9-12', passages: ['Mark 9', 'Mark 10', 'Mark 11', 'Mark 12'] },
      { day: 12, title: 'Mark 13-16', passages: ['Mark 13', 'Mark 14', 'Mark 15', 'Mark 16'] },
      { day: 13, title: 'Luke 1-3', passages: ['Luke 1', 'Luke 2', 'Luke 3'] },
      { day: 14, title: 'Luke 4-6', passages: ['Luke 4', 'Luke 5', 'Luke 6'] },
      { day: 15, title: 'Luke 7-9', passages: ['Luke 7', 'Luke 8', 'Luke 9'] },
      { day: 16, title: 'Luke 10-12', passages: ['Luke 10', 'Luke 11', 'Luke 12'] },
      { day: 17, title: 'Luke 13-16', passages: ['Luke 13', 'Luke 14', 'Luke 15', 'Luke 16'] },
      { day: 18, title: 'Luke 17-20', passages: ['Luke 17', 'Luke 18', 'Luke 19', 'Luke 20'] },
      { day: 19, title: 'Luke 21-24', passages: ['Luke 21', 'Luke 22', 'Luke 23', 'Luke 24'] },
      { day: 20, title: 'John 1-3', passages: ['John 1', 'John 2', 'John 3'] },
      { day: 21, title: 'John 4-6', passages: ['John 4', 'John 5', 'John 6'] },
      { day: 22, title: 'John 7-9', passages: ['John 7', 'John 8', 'John 9'] },
      { day: 23, title: 'John 10-12', passages: ['John 10', 'John 11', 'John 12'] },
      { day: 24, title: 'John 13-15 (Upper Room)', passages: ['John 13', 'John 14', 'John 15'] },
      { day: 25, title: 'John 16-18', passages: ['John 16', 'John 17', 'John 18'] },
      { day: 26, title: 'John 19-21', passages: ['John 19', 'John 20', 'John 21'] },
      { day: 27, title: 'Acts 1-3', passages: ['Acts 1', 'Acts 2', 'Acts 3'] },
      { day: 28, title: 'Acts 4-6', passages: ['Acts 4', 'Acts 5', 'Acts 6'] },
      { day: 29, title: 'Acts 7-9', passages: ['Acts 7', 'Acts 8', 'Acts 9'] },
      { day: 30, title: 'Acts 10-12', passages: ['Acts 10', 'Acts 11', 'Acts 12'] },
    ],
  },
  {
    id: 'psalms-proverbs-30',
    name: 'Psalms & Proverbs Daily',
    durationDays: 30,
    category: 'Wisdom & Worship',
    description: 'Read 5 Psalms and 1 chapter of Proverbs every day for wisdom, comfort, and worship in daily living.',
    days: Array.from({ length: 30 }, (_, i) => {
      const dayNum = i + 1;
      const startPsalm = i * 5 + 1;
      const endPsalm = (i + 1) * 5;
      return {
        day: dayNum,
        title: `Psalms ${startPsalm}-${endPsalm} & Proverbs ${dayNum}`,
        passages: [`Psalm ${startPsalm}`, `Proverbs ${dayNum}`],
      };
    }),
  },
  {
    id: 'nt-90',
    name: 'New Testament in 90 Days',
    durationDays: 90,
    category: 'Full New Testament',
    description: 'Read approximately 3 chapters a day to cover all 260 chapters of the New Testament in 3 months.',
    days: [
      { day: 1, title: 'Matthew 1-3', passages: ['Matthew 1', 'Matthew 2', 'Matthew 3'] },
      { day: 2, title: 'Matthew 4-6', passages: ['Matthew 4', 'Matthew 5', 'Matthew 6'] },
      { day: 3, title: 'Matthew 7-9', passages: ['Matthew 7', 'Matthew 8', 'Matthew 9'] },
      { day: 4, title: 'Matthew 10-12', passages: ['Matthew 10', 'Matthew 11', 'Matthew 12'] },
      { day: 5, title: 'Matthew 13-15', passages: ['Matthew 13', 'Matthew 14', 'Matthew 15'] },
      { day: 6, title: 'Romans 1-3', passages: ['Romans 1', 'Romans 2', 'Romans 3'] },
      { day: 7, title: 'Romans 4-6', passages: ['Romans 4', 'Romans 5', 'Romans 6'] },
      { day: 8, title: 'Romans 7-9', passages: ['Romans 7', 'Romans 8', 'Romans 9'] },
      { day: 9, title: 'Romans 10-12', passages: ['Romans 10', 'Romans 11', 'Romans 12'] },
      { day: 10, title: 'Romans 13-16', passages: ['Romans 13', 'Romans 14', 'Romans 15', 'Romans 16'] },
    ],
  },
];
