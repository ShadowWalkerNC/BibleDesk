/**
 * doctrinesData.ts — Core Christian Doctrines & Multi-Denominational Perspectives
 *
 * Grounded theological corpus for BibleDesk AI RAG and study tools.
 * Covers the 8 classical loci of Christian theology:
 *   1. Theology Proper (God & The Holy Trinity)
 *   2. Bibliology (Scripture & Divine Revelation)
 *   3. Christology (Person & Work of Jesus Christ)
 *   4. Pneumatology (The Holy Spirit & Spiritual Gifts)
 *   5. Soteriology (Salvation, Grace, Faith, Justification)
 *   6. Ecclesiology (The Church, Sacraments, Ordinances)
 *   7. Eschatology (The Second Coming, Resurrection, Final Judgment)
 *   8. Christian Ethics & Discipleship (Prayer, Obedience, Love)
 *
 * Adheres to Rule 5 (5-dimension grounding) and Rule 8 (Fair representation across traditions).
 * Built-in dataset — offline, no API required.
 */

export interface DenominationalPerspective {
  tradition: string; // e.g. 'Reformed', 'Lutheran', 'Baptist', 'Anglican', 'Wesleyan / Arminian', 'Eastern Orthodox', 'Catholic', 'Pentecostal'
  summary: string;
  confessionalBasis: string; // e.g. 'Westminster Confession ch. 11', 'Augsburg Confession art. IV', '1689 LBCF ch. 11'
}

export interface TheologicalLocus {
  id: string;
  locus: string;
  title: string;
  summary: string;
  scriptureProofs: string[];
  historicalConsensus: string;
  traditions: DenominationalPerspective[];
  tags: string[];
}

export const CORE_DOCTRINES: TheologicalLocus[] = [
  // 1. Theology Proper
  {
    id: 'trinity',
    locus: 'Theology Proper',
    title: 'The Holy Trinity (Triune Nature of God)',
    summary: 'There is one living and true God who eternally exists in three distinct persons: the Father, the Son, and the Holy Spirit. These three are equal in power, substance, and eternity, having the same divine essence without division or confusion.',
    scriptureProofs: ['Deuteronomy 6:4', 'Matthew 28:19', '2 Corinthians 13:14', 'John 1:1-3', 'John 10:30', '1 Peter 1:2'],
    historicalConsensus: 'Affirmed unanimously across all historic Christian orthodoxy via the Nicene Creed (325/381 AD) and Athanasian Creed. Rejection of the Trinity is considered outside orthodox Christianity.',
    traditions: [
      {
        tradition: 'Ecumenical Orthodoxy',
        summary: 'God is one divine ousia (essence/substance) in three hypostases (persons). Father is unbegotten, Son is eternally begotten, Spirit eternally proceeds.',
        confessionalBasis: 'Nicene-Constantinopolitan Creed (381 AD), Athanasian Creed',
      },
      {
        tradition: 'Eastern Orthodox',
        summary: 'Affirms monarchia of the Father as the sole source of the Godhead; rejects Western addition of the Filioque clause ("and the Son") in the Creed regarding eternal procession.',
        confessionalBasis: 'Council of Constantinople (381 AD), St. John of Damascus',
      },
      {
        tradition: 'Western (Protestant & Catholic)',
        summary: 'Affirms that the Holy Spirit proceeds eternally from the Father and the Son (Filioque) as the bond of love and unity within the Godhead.',
        confessionalBasis: 'Westminster Confession 2.3, Augsburg Confession Art. 1, 39 Articles Art. 1, Catechism of the Catholic Church 246',
      },
    ],
    tags: ['god', 'trinity', 'father', 'son', 'holy spirit', 'divinity', 'monotheism', 'nature of god'],
  },

  // 2. Bibliology
  {
    id: 'scripture-authority',
    locus: 'Bibliology',
    title: 'Authority, Inspiration, and Sufficiency of Scripture',
    summary: 'The Holy Scriptures of the Old and New Testaments are verbally inspired by God (theopneustos), fully trustworthy, and provide the supreme, authoritative rule for all matters of Christian faith and practice.',
    scriptureProofs: ['2 Timothy 3:16-17', '2 Peter 1:20-21', 'Psalm 119:105', 'Matthew 5:18', 'Isaiah 40:8', 'John 17:17'],
    historicalConsensus: 'All historic Christian bodies affirm Scripture as the inspired Word of God. Traditions differ on the relationship between Scripture, Sacred Tradition, and the Magisterium.',
    traditions: [
      {
        tradition: 'Protestant (Reformed, Lutheran, Baptist, Evangelical)',
        summary: 'Affirms Sola Scriptura: Scripture alone is the infallible rule of faith and life, sufficient in all things necessary for salvation and godliness without requiring supplemental dogma.',
        confessionalBasis: 'Westminster Confession 1.6, Augsburg Confession Art. 28, 1689 LBCF 1.6',
      },
      {
        tradition: 'Anglican',
        summary: 'Scripture contains all things necessary to salvation; interpreted through the guidance of ancient Church Tradition and sanctified Reason (the "three-legged stool").',
        confessionalBasis: 'Thirty-Nine Articles of Religion, Article VI',
      },
      {
        tradition: 'Catholic',
        summary: 'Scripture and Sacred Tradition form one single sacred deposit of the Word of God, committed to and authentically interpreted by the living teaching office (Magisterium).',
        confessionalBasis: 'Dei Verbum (Vatican II), Council of Trent Session IV',
      },
      {
        tradition: 'Eastern Orthodox',
        summary: 'Scripture is the supreme written expression of the Holy Tradition of the Church, produced within and preserved by the apostolic community through the Holy Spirit.',
        confessionalBasis: 'Confession of Dositheus (1672), Synod of Jerusalem',
      },
    ],
    tags: ['bible', 'scripture', 'inspiration', 'inerrancy', 'sola scriptura', 'authority', 'word of god'],
  },

  // 3. Christology
  {
    id: 'christ-incarnation-atonement',
    locus: 'Christology',
    title: 'The Person and Work of Jesus Christ',
    summary: 'Jesus Christ is truly God and truly man—the eternal Son incarnate, conceived by the Holy Spirit and born of the virgin Mary. In two distinct natures united in one divine person, He lived a sinless life, died on the cross as a substitutionary sacrifice for sins, rose bodily from the dead on the third day, ascended to heaven, and ever lives to make intercession for His people.',
    scriptureProofs: ['John 1:1-14', 'Philippians 2:5-11', 'Colossians 1:15-20', '1 Corinthians 15:3-4', 'Hebrews 1:1-3', '1 Peter 2:24', 'Romans 3:24-25'],
    historicalConsensus: 'Formulated at the Council of Chalcedon (451 AD): Christ possesses two natures (divine and human) united "without confusion, without change, without division, without separation."',
    traditions: [
      {
        tradition: 'Reformed & Baptist',
        summary: 'Emphasizes Christ executing the threefold office of Prophet, Priest, and King. Focuses on Penal Substitutionary Atonement as central: Christ bore the penalty of God’s wrath due to sinners.',
        confessionalBasis: 'Westminster Shorter Catechism Q.23-26, 1689 LBCF ch. 8',
      },
      {
        tradition: 'Lutheran',
        summary: 'Affirms the Communicatio Idiomatum (communication of properties): the human nature of Christ genuinely shares in divine attributes, including ubiquitous presence in the Lord’s Supper.',
        confessionalBasis: 'Augsburg Confession Art. III, Formula of Concord Art. VIII',
      },
      {
        tradition: 'Eastern Orthodox',
        summary: 'Emphasizes Christus Victor (triumph over death and the devil) and the Incarnation opening the way to Theosis (deification/union with divine energies by grace).',
        confessionalBasis: 'St. Athanasius ("On the Incarnation"), Council of Chalcedon (451)',
      },
      {
        tradition: 'Wesleyan / Arminian',
        summary: 'Christ died for all humanity without exception (unlimited atonement), making salvation freely available to all who respond to prevenient grace by repentance and faith.',
        confessionalBasis: 'Methodist 25 Articles Art. II, Wesley’s Sermon "Free Grace"',
      },
    ],
    tags: ['jesus', 'christ', 'incarnation', 'atonement', 'cross', 'resurrection', 'chalcedon', 'prophet priest king'],
  },

  // 4. Pneumatology
  {
    id: 'holy-spirit-ministry',
    locus: 'Pneumatology',
    title: 'The Person and Ministry of the Holy Spirit',
    summary: 'The Holy Spirit is the third person of the Trinity, Lord and Giver of Life, who convicts the world of sin, regenerates dead hearts, indwells believers from the moment of faith, seals them for redemption, and imparts spiritual gifts for the edification of the Church.',
    scriptureProofs: ['John 14:16-17', 'John 16:7-14', 'Romans 8:9-16', '1 Corinthians 12:4-11', 'Galatians 5:22-23', 'Ephesians 1:13-14', 'Acts 1:8'],
    historicalConsensus: 'Affirmed at Constantinople (381 AD): the Holy Spirit is worshipped and glorified together with the Father and the Son, speaking through the prophets.',
    traditions: [
      {
        tradition: 'Pentecostal & Charismatic',
        summary: 'Affirms the Baptism in the Holy Spirit as an empowering experience subsequent to or distinct from regeneration, accompanied by spiritual gifts (charismata) including speaking in tongues and healing.',
        confessionalBasis: 'Assemblies of God Statement of Fundamental Truths #7 & #8',
      },
      {
        tradition: 'Reformed & Cessationist',
        summary: 'Every believer receives the Holy Spirit upon regeneration. Sign gifts (tongues, miracles, apostolic signs) fulfilled their foundational purpose in establishing the New Testament canon.',
        confessionalBasis: 'Westminster Confession 1.1, John Calvin (Institutes IV.19)',
      },
      {
        tradition: 'Wesleyan / Holiness',
        summary: 'The Holy Spirit works a second work of grace termed Entire Sanctification (Christian Perfection), purifying the heart from inbred sin and enabling complete love for God and neighbor.',
        confessionalBasis: 'Methodist 25 Articles, Wesley’s "Plain Account of Christian Perfection"',
      },
      {
        tradition: 'Catholic & Orthodox',
        summary: 'The Holy Spirit is communicated sacramentally through Baptism and Chrismation/Confirmation, imparting the indelible seal and the seven gifts of the Spirit.',
        confessionalBasis: 'Catechism of the Catholic Church 1285, Orthodox Catechism of St. Philaret',
      },
    ],
    tags: ['holy spirit', 'pneumatology', 'spiritual gifts', 'baptism in the spirit', 'tongues', 'sanctification', 'comforter'],
  },

  // 5. Soteriology
  {
    id: 'justification-by-faith',
    locus: 'Soteriology',
    title: 'Salvation, Justification, and Grace',
    summary: 'Salvation is the deliverance of sinners from divine wrath and eternal condemnation into reconciliation with God. Sinners are justified not by human merit, works, or ritual, but by God’s unmerited grace through faith alone in Jesus Christ, whose perfect righteousness is imputed to believers.',
    scriptureProofs: ['Romans 3:21-28', 'Romans 5:1-2', 'Ephesians 2:8-10', 'Galatians 2:16', 'Philippians 3:9', 'Titus 3:5-7', '2 Corinthians 5:21'],
    historicalConsensus: 'All Christians agree that salvation is impossible without the grace of God through Jesus Christ. Traditions differ on the mechanics of justification (imputed vs. infused) and human cooperation.',
    traditions: [
      {
        tradition: 'Protestant (Reformed, Lutheran, Baptist)',
        summary: 'Sola Fide & Sola Gratia: Justification is a forensic declaration by God where Christ’s external righteousness is credited (imputed) to the sinner through faith alone. Good works are the inevitable fruit, never the ground, of justification.',
        confessionalBasis: 'Westminster Confession ch. 11, Augsburg Confession Art. IV, 1689 LBCF ch. 11',
      },
      {
        tradition: 'Wesleyan / Arminian',
        summary: 'Justification by faith is universal in scope; prevenient grace restores human moral responsibility to accept or resist the Gospel. Believers must persevere in faith and holiness to final salvation.',
        confessionalBasis: 'Wesley’s Sermon "Justification by Faith", Methodist Articles IX',
      },
      {
        tradition: 'Catholic',
        summary: 'Justification is both the remission of sins and sanctification/renewal of the inner man through the infusion of sanctifying grace (gratia infusa), received in baptism and nurtured by works of love.',
        confessionalBasis: 'Council of Trent, Session VI (Decree on Justification)',
      },
      {
        tradition: 'Eastern Orthodox',
        summary: 'Salvation is understood dynamically as Synergism (human will cooperating with divine grace) leading to Theosis (sharing in the divine nature, 2 Peter 1:4) rather than primarily a legal verdict.',
        confessionalBasis: 'St. John Cassian, Synod of Jerusalem (1672)',
      },
    ],
    tags: ['salvation', 'justification', 'faith alone', 'sola fide', 'grace', 'righteousness', 'imputation', 'works'],
  },

  // 6. Ecclesiology
  {
    id: 'church-and-sacraments',
    locus: 'Ecclesiology',
    title: 'The Church, Ordinances, and Sacraments',
    summary: 'The Church is the body and bride of Christ, composed of all redeemed believers across all ages. Local assemblies gather for the preaching of the Word, fellowship, prayer, and the faithful administration of the sacraments/ordinances instituted by Christ: Baptism and the Lord’s Supper (Communion).',
    scriptureProofs: ['Matthew 16:18', 'Matthew 28:19-20', 'Acts 2:41-47', '1 Corinthians 11:23-26', 'Ephesians 4:11-16', 'Colossians 1:18'],
    historicalConsensus: 'Christ instituted Baptism and the Lord’s Supper for His followers. Traditions differ on sacramental efficacy (sign vs. means of grace) and baptismal subjects (credobaptism vs. paedobaptism).',
    traditions: [
      {
        tradition: 'Baptist',
        summary: 'Credobaptism: Baptism is an ordinance administered solely to professing believers by immersion. The Lord’s Supper is a memorial ordinance proclaiming Christ’s death until He comes. The local church is autonomous.',
        confessionalBasis: '1689 London Baptist Confession ch. 28-30, Baptist Faith & Message Art. VII',
      },
      {
        tradition: 'Reformed / Presbyterian',
        summary: 'Covenant baptism applies to believers and their infant children (paedobaptism). The Lord’s Supper involves a real spiritual presence of Christ received by faith through the Holy Spirit.',
        confessionalBasis: 'Westminster Confession ch. 27-29, Heidelberg Catechism Q.65-82',
      },
      {
        tradition: 'Lutheran',
        summary: 'Sacraments are means of grace (Word and element) that create and strengthen saving faith. In the Eucharist, Christ’s true body and blood are substantially present "in, with, and under" the bread and wine (Sacramental Union).',
        confessionalBasis: 'Augsburg Confession Art. IX-X, Small Catechism',
      },
      {
        tradition: 'Anglican',
        summary: 'Two Gospel sacraments (Baptism and the Supper of the Lord) ordained by Christ as outward visible signs of inward spiritual grace. Episcopacy preserves apostolic pastoral order.',
        confessionalBasis: 'Thirty-Nine Articles, Articles XXV-XXVIII',
      },
      {
        tradition: 'Catholic',
        summary: 'Seven Sacraments (Baptism, Confirmation, Eucharist, Penance, Anointing of the Sick, Holy Orders, Matrimony) acting ex opere operato. In the Mass, transubstantiation changes bread and wine into the real Body and Blood of Christ.',
        confessionalBasis: 'Council of Trent, Session XIII; Catechism of the Catholic Church 1113-1134',
      },
    ],
    tags: ['church', 'ecclesiology', 'baptism', 'communion', 'lords supper', 'eucharist', 'sacraments', 'ordinances'],
  },

  // 7. Eschatology
  {
    id: 'eschatology-resurrection-return',
    locus: 'Eschatology',
    title: 'The Second Coming, Resurrection, and Final State',
    summary: 'Jesus Christ will return visibly and bodily to the earth in glory to judge both the living and the dead. The bodies of all who have died will be raised—the righteous to everlasting life and joy in the new heavens and new earth, and the unrighteous to resurrection judgment and everlasting conscious separation from God.',
    scriptureProofs: ['Acts 1:11', '1 Thessalonians 4:13-18', '1 Corinthians 15:50-58', 'Matthew 25:31-46', 'Revelation 20:11-15', 'Revelation 21:1-4', 'John 5:28-29'],
    historicalConsensus: 'Universally affirmed in all Christian creeds ("He shall come again with glory to judge both the quick and the dead, whose kingdom shall have no end"). Millennial timing structures vary widely across genuine believers.',
    traditions: [
      {
        tradition: 'Historic Amillennialism (Reformed, Lutheran, Catholic, Orthodox)',
        summary: 'The "thousand years" of Revelation 20 symbolizes Christ’s present spiritual reign over the Church from the cross until His single, triumphant Second Coming at the general resurrection and judgment.',
        confessionalBasis: 'Westminster Confession ch. 32-33, Augsburg Confession Art. XVII',
      },
      {
        tradition: 'Premillennialism (Historic & Dispensational / Pentecostal / Baptist)',
        summary: 'Christ will return bodily prior to an earthly millennial reign. Dispensational premillennialism distinguishes between a pre-tribulation rapture of the Church and the glorious return.',
        confessionalBasis: 'Assemblies of God Fundamental Truths #13-14, Historic Early Fathers (Papias, Irenaeus, Justin Martyr)',
      },
      {
        tradition: 'Postmillennialism',
        summary: 'The proclamation of the Gospel and the power of the Holy Spirit will gradually convert the nations, establishing an era of widespread righteousness before Christ returns in glory.',
        confessionalBasis: 'Jonathan Edwards, Puritan Systematic Theologies',
      },
    ],
    tags: ['eschatology', 'second coming', 'resurrection', 'judgment', 'heaven', 'hell', 'new creation', 'millennium', 'rapture'],
  },

  // 8. Christian Ethics & Discipleship
  {
    id: 'christian-ethics-discipleship',
    locus: 'Christian Ethics',
    title: 'The Christian Life, Discipleship, and the Moral Law',
    summary: 'Those redeemed by Christ are called to a life of holiness, continual repentance, and love. The moral law of God—summarized in the Ten Commandments and fulfilled in loving God with all one’s heart and loving neighbor as oneself—serves as the holy standard for Christian conduct, prayer, and kingdom witness.',
    scriptureProofs: ['Exodus 20:1-17', 'Matthew 22:37-40', 'Matthew 5:17-20', 'Romans 12:1-2', 'Galatians 5:13-14', 'James 2:14-17', 'Micah 6:8', '1 John 3:16-18'],
    historicalConsensus: 'Antinomianism (lawlessness) is universally rejected by orthodox Christianity. Faith without works of love and obedience is dead.',
    traditions: [
      {
        tradition: 'Reformed',
        summary: 'Emphasizes the "Third Use of the Law" (tertius usus legis): the law serves as the joyful rule of life and gratitude for the regenerate believer, who is empowered by the Spirit.',
        confessionalBasis: 'Heidelberg Catechism Q.86-115, Westminster Confession ch. 19',
      },
      {
        tradition: 'Lutheran',
        summary: 'Distinguishes sharply between Law and Gospel: the law continuously exposes sin and drives the believer to Christ, while the Gospel freely gives grace, creating spontaneous good works.',
        confessionalBasis: 'Formula of Concord Art. V & VI, Luther’s "Freedom of a Christian"',
      },
      {
        tradition: 'Anabaptist & Wesleyan',
        summary: 'Stresses literal discipleship, the Sermon on the Mount, active peacemaking, simplicity, and active holiness in community as the primary marks of following Christ.',
        confessionalBasis: 'Schleitheim Confession (1527), Wesley’s "Character of a Methodist"',
      },
    ],
    tags: ['ethics', 'discipleship', 'ten commandments', 'moral law', 'prayer', 'holiness', 'good works', 'love'],
  },
];

/**
 * Search the doctrinal loci dataset for matching topics or keywords.
 * Returns the most relevant doctrinal loci formatted for grounding.
 */
export function searchDoctrines(query: string): TheologicalLocus[] {
  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/\s+/).filter(w => w.length > 2);

  return CORE_DOCTRINES.filter(locus => {
    // Exact locus match
    if (locus.id.includes(normalized) || locus.title.toLowerCase().includes(normalized)) {
      return true;
    }

    // Match tags
    if (locus.tags.some(t => normalized.includes(t) || t.includes(normalized))) {
      return true;
    }

    // Word match score
    const matchedWords = words.filter(word =>
      locus.title.toLowerCase().includes(word) ||
      locus.summary.toLowerCase().includes(word) ||
      locus.tags.some(t => t.includes(word))
    );

    return matchedWords.length > 0;
  });
}
