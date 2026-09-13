/**
 * catechismData.ts — Historic Christian Catechisms & Confessional Statements
 * Built-in offline dataset — no API required.
 *
 * Includes major historical traditions:
 *   1. Westminster Shorter Catechism (1647 — Reformed / Presbyterian)
 *   2. Heidelberg Catechism (1563 — Reformed / Continental)
 *   3. Luther's Small Catechism (1529 — Lutheran)
 *   4. Keach's Baptist Catechism (1689/1693 — Baptist)
 *   5. Thirty-Nine Articles of Religion (1571 — Anglican)
 *   6. Assemblies of God 16 Fundamental Truths (1916 — Pentecostal / Evangelical)
 */

export interface CatechismQuestion {
  id: string;
  number: number;
  question: string;
  answer: string;
  proofTexts: string[];
  category: string;
}

export interface Catechism {
  id: string;
  name: string;
  shortName: string;
  year: string;
  tradition: string;
  description: string;
  questions: CatechismQuestion[];
}

export const WESTMINSTER_SHORTER: Catechism = {
  id: 'wsc',
  name: 'Westminster Shorter Catechism',
  shortName: 'WSC',
  year: '1647',
  tradition: 'Reformed / Presbyterian',
  description: 'Composed by the Westminster Assembly, this 107-question catechism remains one of the most precise summaries of Reformed doctrine and Christian living.',
  questions: [
    { id: 'wsc-1', number: 1, category: 'Purpose', question: "What is the chief end of man?", answer: "Man's chief end is to glorify God, and to enjoy him forever.", proofTexts: ['1 Corinthians 10:31', 'Psalm 73:25-28'] },
    { id: 'wsc-2', number: 2, category: 'Scripture', question: "What rule has God given to direct us how we may glorify and enjoy him?", answer: "The Word of God, which is contained in the Scriptures of the Old and New Testaments, is the only rule to direct us how we may glorify and enjoy him.", proofTexts: ['2 Timothy 3:16', 'Ephesians 2:20'] },
    { id: 'wsc-3', number: 3, category: 'Scripture', question: "What do the Scriptures principally teach?", answer: "The Scriptures principally teach what man is to believe concerning God, and what duty God requires of man.", proofTexts: ['2 Timothy 1:13', 'Deuteronomy 10:12-13'] },
    { id: 'wsc-4', number: 4, category: 'God', question: "What is God?", answer: "God is a Spirit, infinite, eternal, and unchangeable in his being, wisdom, power, holiness, justice, goodness, and truth.", proofTexts: ['John 4:24', 'Psalm 90:2', 'James 1:17', 'Revelation 4:8'] },
    { id: 'wsc-5', number: 5, category: 'God', question: "Are there more Gods than one?", answer: "There is but one only, the living and true God.", proofTexts: ['Deuteronomy 6:4', '1 Corinthians 8:4', 'Jeremiah 10:10'] },
    { id: 'wsc-6', number: 6, category: 'Trinity', question: "How many persons are there in the Godhead?", answer: "There are three persons in the Godhead: the Father, the Son, and the Holy Ghost; and these three are one God, the same in substance, equal in power and glory.", proofTexts: ['Matthew 28:19', '2 Corinthians 13:14', 'John 10:30'] },
    { id: 'wsc-7', number: 7, category: 'Decrees', question: "What are the decrees of God?", answer: "The decrees of God are his eternal purpose, according to the counsel of his will, whereby, for his own glory, he has foreordained whatsoever comes to pass.", proofTexts: ['Ephesians 1:4', 'Romans 9:22-23', 'Isaiah 46:10'] },
    { id: 'wsc-8', number: 8, category: 'Creation', question: "How does God execute his decrees?", answer: "God executes his decrees in the works of creation and providence.", proofTexts: ['Revelation 4:11', 'Daniel 4:35'] },
    { id: 'wsc-9', number: 9, category: 'Creation', question: "What is the work of creation?", answer: "The work of creation is God's making all things of nothing, by the word of his power, in the space of six days, and all very good.", proofTexts: ['Genesis 1:1', 'Hebrews 11:3', 'Colossians 1:16'] },
    { id: 'wsc-10', number: 10, category: 'Creation', question: "How did God create man?", answer: "God created man male and female, after his own image, in knowledge, righteousness, and holiness, with dominion over the creatures.", proofTexts: ['Genesis 1:27', 'Colossians 3:10', 'Ephesians 4:24'] },
    { id: 'wsc-11', number: 11, category: 'Providence', question: "What are God's works of providence?", answer: "God's works of providence are his most holy, wise, and powerful preserving and governing all his creatures, and all their actions.", proofTexts: ['Psalm 145:17', 'Isaiah 28:29', 'Hebrews 1:3'] },
    { id: 'wsc-14', number: 14, category: 'Sin', question: "What is sin?", answer: "Sin is any want of conformity unto, or transgression of, the law of God.", proofTexts: ['1 John 3:4', 'James 4:17'] },
    { id: 'wsc-20', number: 20, category: 'Redemption', question: "Did God leave all mankind to perish in the estate of sin and misery?", answer: "God, having out of his mere good pleasure, from all eternity, elected some to everlasting life, did enter into a covenant of grace, to deliver them out of the estate of sin and misery, and to bring them into an estate of salvation by a Redeemer.", proofTexts: ['Ephesians 1:4', 'Romans 3:20-22', 'Galatians 3:21-22'] },
    { id: 'wsc-21', number: 21, category: 'Christ', question: "Who is the Redeemer of God's elect?", answer: "The only Redeemer of God's elect is the Lord Jesus Christ, who, being the eternal Son of God, became man, and so was, and continueth to be, God and man in two distinct natures, and one person, forever.", proofTexts: ['1 Timothy 2:5', 'John 1:14', 'Hebrews 7:24-25'] },
    { id: 'wsc-23', number: 23, category: 'Christ', question: "What offices does Christ execute as our Redeemer?", answer: "Christ, as our Redeemer, executes the offices of a prophet, of a priest, and of a king, both in his estate of humiliation and exaltation.", proofTexts: ['Acts 3:22', 'Hebrews 5:6', 'Psalm 2:6'] },
    { id: 'wsc-33', number: 33, category: 'Salvation', question: "What is justification?", answer: "Justification is an act of God's free grace, wherein he pardons all our sins, and accepts us as righteous in his sight, only for the righteousness of Christ imputed to us, and received by faith alone.", proofTexts: ['Romans 3:24', '2 Corinthians 5:19', 'Romans 4:6-8', 'Philippians 3:9'] },
    { id: 'wsc-34', number: 34, category: 'Salvation', question: "What is adoption?", answer: "Adoption is an act of God's free grace, whereby we are received into the number, and have a right to all the privileges of, the sons of God.", proofTexts: ['1 John 3:1', 'John 1:12', 'Romans 8:17'] },
    { id: 'wsc-35', number: 35, category: 'Salvation', question: "What is sanctification?", answer: "Sanctification is the work of God's free grace, whereby we are renewed in the whole man after the image of God, and are enabled more and more to die unto sin, and live unto righteousness.", proofTexts: ['2 Thessalonians 2:13', 'Ephesians 4:23-24', 'Romans 6:4', 'Romans 8:1'] },
    { id: 'wsc-86', number: 86, category: 'Law', question: "What is faith in Jesus Christ?", answer: "Faith in Jesus Christ is a saving grace, whereby we receive and rest upon him alone for salvation, as he is offered to us in the gospel.", proofTexts: ['Hebrews 10:39', 'John 1:12', 'Philippians 3:9'] },
    { id: 'wsc-98', number: 98, category: 'Prayer', question: "What is prayer?", answer: "Prayer is an offering up of our desires unto God, for things agreeable to his will, in the name of Christ, with confession of our sins, and thankful acknowledgement of his mercies.", proofTexts: ['Psalm 62:8', '1 John 5:14', 'John 16:23', 'Philippians 4:6'] },
  ],
};

export const HEIDELBERG: Catechism = {
  id: 'hc',
  name: 'Heidelberg Catechism',
  shortName: 'HC',
  year: '1563',
  tradition: 'Reformed / Continental',
  description: 'Written in Heidelberg under Elector Frederick III, this catechism is beloved for its warm, pastoral tone organized around comfort, guilt, and grace.',
  questions: [
    { id: 'hc-1', number: 1, category: 'Comfort', question: "What is your only comfort in life and death?", answer: "That I am not my own, but belong—body and soul, in life and in death—to my faithful Savior, Jesus Christ. He has fully paid for all my sins with his precious blood, and has set me free from the tyranny of the devil. He also watches over me in such a way that not a hair can fall from my head without the will of my Father in heaven; in fact, all things must work together for my salvation. Because I belong to him, Christ, by his Holy Spirit, assures me of eternal life and makes me wholeheartedly willing and ready from now on to live for him.", proofTexts: ['1 Corinthians 6:19-20', 'Romans 8:28', 'John 10:27-30', 'Romans 8:38-39'] },
    { id: 'hc-2', number: 2, category: 'Comfort', question: "What must you know to live and die in the joy of this comfort?", answer: "Three things: first, how great my sin and misery are; second, how I am set free from all my sins and their misery; third, how I am to thank God for such deliverance.", proofTexts: ['Romans 3:10', 'John 17:3', 'Ephesians 5:20', 'Matthew 5:16'] },
    { id: 'hc-3', number: 3, category: 'Sin', question: "How do you come to know your misery?", answer: "The law of God tells me.", proofTexts: ['Romans 3:20', 'Romans 7:7-25'] },
    { id: 'hc-26', number: 26, category: 'God', question: "What do you believe when you say: 'I believe in God, the Father almighty, creator of heaven and earth'?", answer: "That the eternal Father of our Lord Jesus Christ, who out of nothing created heaven and earth and everything in them, who still upholds and rules them by his eternal counsel and providence, is my God and Father because of Christ the Son.", proofTexts: ['Genesis 1:1', 'John 1:3', 'Hebrews 1:3', 'Romans 8:15-16'] },
    { id: 'hc-60', number: 60, category: 'Salvation', question: "How are you right with God?", answer: "Only by true faith in Jesus Christ. Even though my conscience accuses me of having grievously sinned against all God's commandments, nevertheless, without my deserving it at all, out of sheer grace, God grants and credits to me the perfect satisfaction, righteousness, and holiness of Christ.", proofTexts: ['Romans 3:21-25', 'Galatians 2:16', '2 Corinthians 5:17-19', 'Romans 4:4-5'] },
    { id: 'hc-86', number: 86, category: 'Obedience', question: "Since we have been delivered from our misery by grace through Christ without any merit of our own, why then should we do good works?", answer: "Because Christ, having redeemed and delivered us by his blood, is also restoring us by his Spirit into his image; so that with our whole lives we may show that we are thankful to God for his benefits, so that he may be praised through us.", proofTexts: ['Romans 6:13', 'Matthew 5:16', '2 Peter 1:10', '1 Peter 2:12'] },
    { id: 'hc-116', number: 116, category: 'Prayer', question: "Why do Christians need to pray?", answer: "Because prayer is the most important part of the thankfulness God requires of us. And also because God gives his grace and Holy Spirit only to those who pray continually and groan inwardly, asking God for these gifts and thanking him for them.", proofTexts: ['Psalm 50:14-15', 'Matthew 7:7-8', 'Luke 11:9-13'] },
  ],
};

export const LUTHERS_SMALL: Catechism = {
  id: 'lsc',
  name: "Luther's Small Catechism",
  shortName: 'LSC',
  year: '1529',
  tradition: 'Lutheran',
  description: 'Written by Martin Luther for pastors and parents to instruct the household in the basics of the Christian faith: The Ten Commandments, The Creed, The Lord’s Prayer, and the Sacraments.',
  questions: [
    {
      id: 'lsc-1',
      number: 1,
      category: 'Ten Commandments',
      question: "What is the First Commandment, and what does it mean?",
      answer: "You shall have no other gods. What does this mean? We should fear, love, and trust in God above all things.",
      proofTexts: ['Exodus 20:3', 'Matthew 22:37-38', 'Psalm 73:25'],
    },
    {
      id: 'lsc-2',
      number: 2,
      category: 'Creed',
      question: "What does the Second Article of the Creed ('On Redemption') mean?",
      answer: "I believe that Jesus Christ, true God, begotten of the Father from eternity, and also true man, born of the Virgin Mary, is my Lord, who has redeemed me, a lost and condemned creature, purchased and won me from all sins, from death, and from the power of the devil; not with gold or silver, but with His holy, precious blood and with His innocent suffering and death, that I may be His own and live under Him in His kingdom.",
      proofTexts: ['1 Peter 1:18-19', '1 John 1:7', 'Galatians 2:20'],
    },
    {
      id: 'lsc-3',
      number: 3,
      category: 'Creed',
      question: "What does the Third Article of the Creed ('On Sanctification') mean?",
      answer: "I believe that I cannot by my own reason or strength believe in Jesus Christ, my Lord, or come to Him; but the Holy Spirit has called me by the Gospel, enlightened me with His gifts, sanctified and kept me in the true faith.",
      proofTexts: ['1 Corinthians 12:3', 'Ephesians 2:8-9', 'Romans 10:17'],
    },
    {
      id: 'lsc-4',
      number: 4,
      category: 'Lord’s Prayer',
      question: "What does it mean to pray 'Forgive us our trespasses as we forgive those who trespass against us'?",
      answer: "We pray in this petition that our Father in heaven would not look at our sins, or deny our prayer because of them; for we are worthy of none of the things for which we pray, neither have we deserved them; but that He would grant them all to us by grace, for we daily sin much and surely deserve nothing but punishment. So we too will sincerely forgive and gladly do good to those who sin against us.",
      proofTexts: ['Matthew 6:12', 'Luke 11:4', 'Ephesians 4:32'],
    },
    {
      id: 'lsc-5',
      number: 5,
      category: 'Sacraments',
      question: "What is the Sacrament of the Altar (The Lord's Supper)?",
      answer: "It is the true body and blood of our Lord Jesus Christ under the bread and wine, instituted by Christ Himself for us Christians to eat and to drink. What is the benefit of this eating and drinking? These words, 'Given and shed for you for the forgiveness of sins,' show us that in the Sacrament forgiveness of sins, life, and salvation are given us through these words.",
      proofTexts: ['Matthew 26:26-28', '1 Corinthians 10:16', '1 Corinthians 11:23-26'],
    },
  ],
};

export const BAPTIST_1689: Catechism = {
  id: 'bc',
  name: "Keach's Baptist Catechism",
  shortName: 'BC',
  year: '1689 / 1693',
  tradition: 'Baptist',
  description: 'Adopted by the General Assembly of Particular Baptists in London, this catechism adapts the Westminster Shorter Catechism to reflect historic Baptist views on baptism, church order, and the covenants.',
  questions: [
    {
      id: 'bc-1',
      number: 1,
      category: 'Purpose',
      question: "Who is the first and chiefest being?",
      answer: "God is the first and chiefest being, the creator and preserver of all things.",
      proofTexts: ['Psalm 90:2', 'Revelation 4:11', 'Acts 17:28'],
    },
    {
      id: 'bc-2',
      number: 2,
      category: 'Purpose',
      question: "What is the chief end of man?",
      answer: "Man's chief end is to glorify God, and to enjoy Him forever.",
      proofTexts: ['1 Corinthians 10:31', 'Psalm 73:25-26'],
    },
    {
      id: 'bc-20',
      number: 20,
      category: 'Salvation',
      question: "What is justification?",
      answer: "Justification is an act of God's free grace, wherein He pardoneth all our sins, and accepteth us as righteous in His sight, only for the righteousness of Christ imputed to us, and received by faith alone.",
      proofTexts: ['Romans 3:24-25', 'Romans 4:6-8', '2 Corinthians 5:19-21'],
    },
    {
      id: 'bc-93',
      number: 93,
      category: 'Ordinances',
      question: "What is baptism?",
      answer: "Baptism is an ordinance of the New Testament, instituted by Jesus Christ, to be unto the party baptized, a sign of his fellowship with Him, in His death, burial, and resurrection; of his being engrafted into Him; of remission of sins; and of giving up himself unto the Lord, to walk in newness of life.",
      proofTexts: ['Romans 6:3-5', 'Colossians 2:12', 'Galatians 3:27', 'Acts 2:38'],
    },
    {
      id: 'bc-94',
      number: 94,
      category: 'Ordinances',
      question: "To whom is baptism to be administered?",
      answer: "Baptism is to be administered to all those who actually profess repentance towards God, and faith in, and obedience to our Lord Jesus Christ, and to none other.",
      proofTexts: ['Acts 2:41', 'Acts 8:12', 'Acts 8:36-37', 'Matthew 28:19'],
    },
    {
      id: 'bc-95',
      number: 95,
      category: 'Ordinances',
      question: "Are the infants of such as are professing believers to be baptized?",
      answer: "The infants of such as are professing believers are not to be baptized, because there is neither command nor example in the Scripture, or certain consequence from them, to baptize such.",
      proofTexts: ['Exodus 23:13', 'Proverbs 30:6', 'Colossians 2:8'],
    },
    {
      id: 'bc-96',
      number: 96,
      category: 'Ordinances',
      question: "How is baptism rightly administered?",
      answer: "Baptism is rightly administered by immersion, or dipping the whole body of the party in water, into the name of the Father, and of the Son, and of the Holy Spirit, according to Christ's institution.",
      proofTexts: ['Matthew 3:16', 'John 3:23', 'Acts 8:38-39'],
    },
  ],
};

export const ANGLICAN_39_ARTICLES: Catechism = {
  id: '39art',
  name: 'Thirty-Nine Articles of Religion',
  shortName: '39 Art',
  year: '1571',
  tradition: 'Anglican',
  description: 'The historic defining statements of Anglican doctrine established by the Church of England, balancing catholic apostolic creeds with Reformation recovery of Scripture and grace.',
  questions: [
    {
      id: 'art-1',
      number: 1,
      category: 'God',
      question: "Article I: Of Faith in the Holy Trinity",
      answer: "There is but one living and true God, everlasting, without body, parts, or passions; of infinite power, wisdom, and goodness; the Maker, and Preserver of all things both visible and invisible. And in unity of this Godhead there be three Persons, of one substance, power, and eternity; the Father, the Son, and the Holy Ghost.",
      proofTexts: ['Deuteronomy 6:4', '1 John 5:7', 'Matthew 28:19'],
    },
    {
      id: 'art-6',
      number: 6,
      category: 'Scripture',
      question: "Article VI: Of the Sufficiency of the Holy Scriptures for Salvation",
      answer: "Holy Scripture containeth all things necessary to salvation: so that whatsoever is not read therein, nor may be proved thereby, is not to be required of any man, that it should be believed as an article of the Faith, or be thought requisite or necessary to salvation.",
      proofTexts: ['2 Timothy 3:15-17', 'Galatians 1:8-9', 'Revelation 22:18-19'],
    },
    {
      id: 'art-11',
      number: 11,
      category: 'Salvation',
      question: "Article XI: Of the Justification of Man",
      answer: "We are accounted righteous before God, only for the merit of our Lord and Saviour Jesus Christ by Faith, and not for our own works or deservings: Wherefore, that we are justified by Faith only is a most wholesome Doctrine, and very full of comfort.",
      proofTexts: ['Romans 3:28', 'Romans 5:1', 'Ephesians 2:8-9'],
    },
    {
      id: 'art-19',
      number: 19,
      category: 'Church',
      question: "Article XIX: Of the Church",
      answer: "The visible Church of Christ is a congregation of faithful men, in which the pure Word of God is preached, and the Sacraments be duly ministered according to Christ's ordinance in all those things that of necessity are requisite to the same.",
      proofTexts: ['Acts 2:42', '1 Corinthians 1:2', 'Ephesians 2:19-22'],
    },
    {
      id: 'art-25',
      number: 25,
      category: 'Sacraments',
      question: "Article XXV: Of the Sacraments",
      answer: "Sacraments ordained of Christ be not only badges or tokens of Christian men's profession, but rather they be certain sure witnesses, and effectual signs of grace, and God's good will towards us. There are two Sacraments ordained of Christ our Lord in the Gospel, that is to say, Baptism, and the Supper of the Lord.",
      proofTexts: ['Matthew 28:19', '1 Corinthians 11:23-26', 'Romans 4:11'],
    },
  ],
};

export const ASSEMBLIES_OF_GOD: Catechism = {
  id: 'aog',
  name: 'Assemblies of God 16 Fundamental Truths',
  shortName: 'AG16',
  year: '1916',
  tradition: 'Pentecostal / Evangelical',
  description: 'The foundational statement of faith of the Assemblies of God, expressing classical evangelical orthodoxy alongside distinctive Pentecostal doctrines of Spirit baptism and divine healing.',
  questions: [
    {
      id: 'ag-1',
      number: 1,
      category: 'Scripture',
      question: "Truth #1: The Scriptures Inspired",
      answer: "The Scriptures, both the Old and New Testaments, are verbally inspired of God and are the revelation of God to man, the infallible, authoritative rule of faith and conduct.",
      proofTexts: ['2 Timothy 3:15-17', '1 Thessalonians 2:13', '2 Peter 1:21'],
    },
    {
      id: 'ag-5',
      number: 5,
      category: 'Salvation',
      question: "Truth #5: The Salvation of Man",
      answer: "Man's only hope of redemption is through the shed blood of Jesus Christ the Son of God. Salvation is received through repentance toward God and faith toward the Lord Jesus Christ. By the washing of regeneration and renewing of the Holy Spirit, being justified by grace through faith, man becomes an heir of God according to the hope of eternal life.",
      proofTexts: ['Luke 24:47', 'John 3:3', 'Romans 10:13-15', 'Ephesians 2:8', 'Titus 2:11', 'Titus 3:5-7'],
    },
    {
      id: 'ag-7',
      number: 7,
      category: 'Holy Spirit',
      question: "Truth #7: The Baptism in the Holy Spirit",
      answer: "All believers are entitled to and should ardently expect and earnestly seek the promise of the Father, the baptism in the Holy Spirit and fire, according to the command of our Lord Jesus Christ. This was the normal experience of all in the early Christian Church. With it comes the enduement of power for life and service, the bestowment of the gifts and their uses in the work of the ministry.",
      proofTexts: ['Luke 24:49', 'Acts 1:4', 'Acts 1:8', '1 Corinthians 12:1-31'],
    },
    {
      id: 'ag-8',
      number: 8,
      category: 'Holy Spirit',
      question: "Truth #8: The Initial Physical Evidence of the Baptism in the Holy Spirit",
      answer: "The baptism of believers in the Holy Spirit is witnessed by the initial physical sign of speaking with other tongues as the Spirit of God gives them utterance (Acts 2:4). The speaking in tongues in this instance is the same in essence as the gift of tongues (1 Cor. 12:4-10, 28), but different in purpose and use.",
      proofTexts: ['Acts 2:4', '1 Corinthians 12:4-10', '1 Corinthians 12:28'],
    },
    {
      id: 'ag-12',
      number: 12,
      category: 'Healing',
      question: "Truth #12: Divine Healing",
      answer: "Divine healing is an integral part of the gospel. Deliverance from sickness is provided for in the atonement, and is the privilege of all believers.",
      proofTexts: ['Isaiah 53:4-5', 'Matthew 8:16-17', 'James 5:14-16'],
    },
    {
      id: 'ag-13',
      number: 13,
      category: 'Eschatology',
      question: "Truth #13: The Blessed Hope",
      answer: "The resurrection of those who have fallen asleep in Christ and their translation together with those who are alive and remain unto the coming of the Lord is the imminent and blessed hope of the church.",
      proofTexts: ['1 Thessalonians 4:16-17', 'Romans 8:23', 'Titus 2:13', '1 Corinthians 15:51-52'],
    },
  ],
};

export const ALL_CATECHISMS: Catechism[] = [
  WESTMINSTER_SHORTER,
  HEIDELBERG,
  LUTHERS_SMALL,
  BAPTIST_1689,
  ANGLICAN_39_ARTICLES,
  ASSEMBLIES_OF_GOD,
];

export const CATEGORIES = (catechism: Catechism): string[] =>
  [...new Set(catechism.questions.map(q => q.category))];

/**
 * Search across all historic catechisms for relevant questions and answers.
 */
export function searchCatechisms(query: string): Array<{ catechism: string; tradition: string; question: CatechismQuestion }> {
  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/\s+/).filter(w => w.length > 2);

  const results: Array<{ catechism: string; tradition: string; question: CatechismQuestion }> = [];

  for (const cat of ALL_CATECHISMS) {
    for (const q of cat.questions) {
      const qText = q.question.toLowerCase();
      const aText = q.answer.toLowerCase();
      const catText = q.category.toLowerCase();

      const matched = words.some(w => qText.includes(w) || aText.includes(w) || catText.includes(w));
      if (matched || qText.includes(normalized) || aText.includes(normalized)) {
        results.push({
          catechism: cat.name,
          tradition: cat.tradition,
          question: q,
        });
      }
    }
  }

  return results.slice(0, 5);
}
