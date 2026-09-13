// BibleDesk — Canonical Biblical Knowledge Graph
// Grounded semantic network linking:
//   8 Systematic Theological Loci <-> Key Scripture Anchors <->
//   Strong's Greek & Hebrew Lemmas <-> Historic Catechisms/Creeds <->
//   Words of Encouragement Topics.

import type { GraphNode, GraphEdge } from './graph';

export interface CanonicalNode extends GraphNode {
  scripture_ref?: string;
  strongs_num?: string;
  catechism_ref?: string;
  encourage_category?: string;
}

export const CANONICAL_NODES: CanonicalNode[] = [
  // ── 1. Systematic Theological Loci ─────────────────────────────────────────
  {
    id: 'node-theology-proper',
    node_key: 'theology-proper',
    label: 'Theology Proper (God & Trinity)',
    category: 'doctrine',
    source_type: 'canonical',
    description: 'The eternal self-existence, holy nature, and triune mystery of God: Father, Son, and Holy Spirit.',
    scripture_ref: 'Genesis 1:1',
    dimension: 'Theological',
  },
  {
    id: 'node-bibliology',
    node_key: 'bibliology',
    label: 'Bibliology (Scripture & Canon)',
    category: 'doctrine',
    source_type: 'canonical',
    description: 'The divine inspiration, inerrancy, authority, and organic sufficiency of the Holy Scriptures.',
    scripture_ref: '2 Timothy 3:16',
    dimension: 'Theological',
  },
  {
    id: 'node-christology',
    node_key: 'christology',
    label: 'Christology (Person & Work of Christ)',
    category: 'doctrine',
    source_type: 'canonical',
    description: 'The eternal deity, virgin birth, sinless life, substitutionary atonement, and bodily resurrection of Jesus Christ.',
    scripture_ref: 'John 1:1',
    dimension: 'Theological',
  },
  {
    id: 'node-pneumatology',
    node_key: 'pneumatology',
    label: 'Pneumatology (The Holy Spirit)',
    category: 'doctrine',
    source_type: 'canonical',
    description: 'The deity, indwelling, sanctifying work, spiritual gifts, and sealing power of the Holy Spirit.',
    scripture_ref: 'John 14:26',
    dimension: 'Theological',
  },
  {
    id: 'node-soteriology',
    node_key: 'soteriology',
    label: 'Soteriology (Salvation by Grace)',
    category: 'doctrine',
    source_type: 'canonical',
    description: 'God’s rescue of fallen humanity by grace alone through faith in Christ alone, resulting in regeneration and adoption.',
    scripture_ref: 'Ephesians 2:8-9',
    dimension: 'Theological',
  },
  {
    id: 'node-ecclesiology',
    node_key: 'ecclesiology',
    label: 'Ecclesiology (The Church & Sacraments)',
    category: 'doctrine',
    source_type: 'canonical',
    description: 'The universal body and local expression of Christ, called to worship, administer ordinances, and make disciples.',
    scripture_ref: 'Matthew 28:19',
    dimension: 'Theological',
  },
  {
    id: 'node-eschatology',
    node_key: 'eschatology',
    label: 'Eschatology (The Last Things & Hope)',
    category: 'doctrine',
    source_type: 'canonical',
    description: 'The personal return of Christ, resurrection of the dead, final judgment, and new creation.',
    scripture_ref: 'Revelation 21:1-5',
    dimension: 'Theological',
  },
  {
    id: 'node-christian-ethics',
    node_key: 'christian-ethics',
    label: 'Christian Ethics & Holy Living',
    category: 'doctrine',
    source_type: 'canonical',
    description: 'The moral law, the fruits of the Spirit, kingdom justice, love for neighbor, and discipleship in daily life.',
    scripture_ref: 'Micah 6:8',
    dimension: 'Practical',
  },

  // ── 2. Primary Scripture Anchors ───────────────────────────────────────────
  {
    id: 'node-john-1-1',
    node_key: 'john-1-1',
    label: 'John 1:1 — The Incarnate Word',
    category: 'verse',
    source_type: 'canonical',
    description: '"In the beginning was the Word, and the Word was with God, and the Word was God."',
    scripture_ref: 'John 1:1',
  },
  {
    id: 'node-john-3-16',
    node_key: 'john-3-16',
    label: 'John 3:16 — The Gospel Sum',
    category: 'verse',
    source_type: 'canonical',
    description: '"For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life."',
    scripture_ref: 'John 3:16',
  },
  {
    id: 'node-ephesians-2-8',
    node_key: 'ephesians-2-8',
    label: 'Ephesians 2:8-9 — Saved by Grace',
    category: 'verse',
    source_type: 'canonical',
    description: '"For by grace you have been saved through faith. And this is not your own doing; it is the gift of God, not a result of works."',
    scripture_ref: 'Ephesians 2:8-9',
  },
  {
    id: 'node-romans-8-1',
    node_key: 'romans-8-1',
    label: 'Romans 8:1 — No Condemnation',
    category: 'verse',
    source_type: 'canonical',
    description: '"There is therefore now no condemnation for those who are in Christ Jesus."',
    scripture_ref: 'Romans 8:1',
  },
  {
    id: 'node-romans-8-28',
    node_key: 'romans-8-28',
    label: 'Romans 8:28 — Sovereign Providence',
    category: 'verse',
    source_type: 'canonical',
    description: '"And we know that for those who love God all things work together for good, for those who are called according to his purpose."',
    scripture_ref: 'Romans 8:28',
  },
  {
    id: 'node-genesis-1-1',
    node_key: 'genesis-1-1',
    label: 'Genesis 1:1 — Creation Ex Nihilo',
    category: 'verse',
    source_type: 'canonical',
    description: '"In the beginning, God created the heavens and the earth."',
    scripture_ref: 'Genesis 1:1',
  },
  {
    id: 'node-psalm-23',
    node_key: 'psalm-23',
    label: 'Psalm 23:1 — The Lord Our Shepherd',
    category: 'verse',
    source_type: 'canonical',
    description: '"The Lord is my shepherd; I shall not want. He makes me lie down in green pastures."',
    scripture_ref: 'Psalm 23:1',
  },
  {
    id: 'node-isaiah-53-5',
    node_key: 'isaiah-53-5',
    label: 'Isaiah 53:5 — The Pierced Servant',
    category: 'verse',
    source_type: 'canonical',
    description: '"He was pierced for our transgressions; he was crushed for our iniquities; upon him was the chastisement that brought us peace."',
    scripture_ref: 'Isaiah 53:5',
  },
  {
    id: 'node-matthew-28-19',
    node_key: 'matthew-28-19',
    label: 'Matthew 28:19 — The Great Commission',
    category: 'verse',
    source_type: 'canonical',
    description: '"Go therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit."',
    scripture_ref: 'Matthew 28:19',
  },
  {
    id: 'node-philippians-4-6',
    node_key: 'philippians-4-6',
    label: 'Philippians 4:6-7 — Peace in Prayer',
    category: 'verse',
    source_type: 'canonical',
    description: '"Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God."',
    scripture_ref: 'Philippians 4:6',
  },

  // ── 3. Strong's Greek & Hebrew Lexical Roots ───────────────────────────────
  {
    id: 'node-g5485-charis',
    node_key: 'G5485',
    label: 'G5485 — Charis (χάρις)',
    category: 'concept',
    source_type: 'canonical',
    description: 'Grace, divine favor, unmerited gift, merciful lovingkindness of God toward sinners.',
    strongs_num: 'G5485',
  },
  {
    id: 'node-g26-agape',
    node_key: 'G26',
    label: 'G26 — Agape (ἀγάπη)',
    category: 'concept',
    source_type: 'canonical',
    description: 'Self-sacrificial, unconditional divine love that seeks the highest good of the beloved.',
    strongs_num: 'G26',
  },
  {
    id: 'node-g2889-kosmos',
    node_key: 'G2889',
    label: 'G2889 — Kosmos (κόσμος)',
    category: 'concept',
    source_type: 'canonical',
    description: 'The world, humanity, orderly universe; also the fallen worldly system in rebellion against God.',
    strongs_num: 'G2889',
  },
  {
    id: 'node-g4151-pneuma',
    node_key: 'G4151',
    label: 'G4151 — Pneuma (πνεῦμα)',
    category: 'concept',
    source_type: 'canonical',
    description: 'Spirit, wind, breath, the Holy Spirit of God, the immaterial life-giving essence.',
    strongs_num: 'G4151',
  },
  {
    id: 'node-g4102-pistis',
    node_key: 'G4102',
    label: 'G4102 — Pistis (πίστις)',
    category: 'concept',
    source_type: 'canonical',
    description: 'Faith, active trust, reliance upon Christ, firm conviction in God’s revelation.',
    strongs_num: 'G4102',
  },
  {
    id: 'node-h7225-bereshit',
    node_key: 'H7225',
    label: 'H7225 — Bereshit (בְּרֵאשִׁית)',
    category: 'concept',
    source_type: 'canonical',
    description: 'In the beginning, chief, first-fruits, commencement of space-time creation.',
    strongs_num: 'H7225',
  },
  {
    id: 'node-h2617-chesed',
    node_key: 'H2617',
    label: 'H2617 — Chesed (חֶסֶד)',
    category: 'concept',
    source_type: 'canonical',
    description: 'Covenant lovingkindness, faithful mercy, steadfast loyalty that never fails.',
    strongs_num: 'H2617',
  },
  {
    id: 'node-h1254-bara',
    node_key: 'H1254',
    label: 'H1254 — Bara (בָּרָא)',
    category: 'concept',
    source_type: 'canonical',
    description: 'To create (used uniquely of divine creation ex nihilo, without pre-existing materials).',
    strongs_num: 'H1254',
  },
  {
    id: 'node-h7965-shalom',
    node_key: 'H7965',
    label: 'H7965 — Shalom (שָׁלוֹם)',
    category: 'concept',
    source_type: 'canonical',
    description: 'Complete peace, wholeness, welfare, health, reconciliation with God and neighbor.',
    strongs_num: 'H7965',
  },

  // ── 4. Historic Confessions & Creeds ───────────────────────────────────────
  {
    id: 'node-nicene-creed',
    node_key: 'nicene-creed',
    label: 'The Nicene Creed (325 / 381 AD)',
    category: 'doctrine',
    source_type: 'canonical',
    description: 'The universal ecumenical confession of the Holy Trinity and True Deity of Christ (Homoousios).',
    catechism_ref: 'creeds',
  },
  {
    id: 'node-apostles-creed',
    node_key: 'apostles-creed',
    label: 'The Apostles’ Creed',
    category: 'doctrine',
    source_type: 'canonical',
    description: 'Ancient baptismal rule of faith summarizing God the Father, the Incarnation, Resurrection, and Holy Church.',
    catechism_ref: 'creeds',
  },
  {
    id: 'node-westminster-shorter',
    node_key: 'westminster-shorter',
    label: 'Westminster Shorter Catechism (1647)',
    category: 'doctrine',
    source_type: 'canonical',
    description: '"Man’s chief end is to glorify God, and to enjoy him forever."',
    catechism_ref: 'westminster-shorter',
  },
  {
    id: 'node-heidelberg-catechism',
    node_key: 'heidelberg-catechism',
    label: 'Heidelberg Catechism (1563)',
    category: 'doctrine',
    source_type: 'canonical',
    description: '"My only comfort in life and in death is that I am not my own, but belong body and soul to my faithful Savior Jesus Christ."',
    catechism_ref: 'heidelberg',
  },
  {
    id: 'node-luther-small-catechism',
    node_key: 'luther-small-catechism',
    label: 'Luther’s Small Catechism (1529)',
    category: 'doctrine',
    source_type: 'canonical',
    description: 'The Ten Commandments, Creed, Lord’s Prayer, and Sacraments taught for plain households.',
    catechism_ref: 'luther-small',
  },
  {
    id: 'node-1689-baptist',
    node_key: '1689-baptist',
    label: '1689 Baptist Catechism',
    category: 'doctrine',
    source_type: 'canonical',
    description: 'Keach’s Baptist exposition of sovereign grace, believer’s baptism, and covenant theology.',
    catechism_ref: 'keach-baptist',
  },

  // ── 5. Words of Encouragement Topics ───────────────────────────────────────
  {
    id: 'node-encourage-anxiety',
    node_key: 'peace-over-anxiety',
    label: 'Peace Over Anxiety',
    category: 'theme',
    source_type: 'canonical',
    description: 'Biblical promises for calming fear, quieting restlessness, and walking in the supernatural peace of Christ.',
    encourage_category: 'peace',
  },
  {
    id: 'node-encourage-healing',
    node_key: 'healing-and-restoration',
    label: 'Healing & Restoration',
    category: 'theme',
    source_type: 'canonical',
    description: 'Scriptural promises for physical restoration, brokenhearted comfort, and spiritual wholeness.',
    encourage_category: 'healing',
  },
  {
    id: 'node-encourage-strength',
    node_key: 'strength-in-trials',
    label: 'Strength in Trials',
    category: 'theme',
    source_type: 'canonical',
    description: 'Promises of courage, endurance, and divine fortification when walking through seasons of suffering.',
    encourage_category: 'strength',
  },
  {
    id: 'node-encourage-creativity',
    node_key: 'kingdom-creativity',
    label: 'Kingdom Creativity & Worship',
    category: 'theme',
    source_type: 'canonical',
    description: 'Meditations for worship artists, poets, and musicians stewarding divine creative inspiration.',
    encourage_category: 'creativity',
  },
];

export const CANONICAL_EDGES: GraphEdge[] = [
  // ── Theology Proper Connections ───────────────────────────────────────────
  { source_id: 'node-theology-proper', target_id: 'node-genesis-1-1', relation: 'supports', confidence: 'EXTRACTED', label: 'reveals God as Creator' },
  { source_id: 'node-theology-proper', target_id: 'node-h7225-bereshit', relation: 'references', confidence: 'EXTRACTED', label: 'eternal origin' },
  { source_id: 'node-theology-proper', target_id: 'node-h1254-bara', relation: 'uses', confidence: 'EXTRACTED', label: 'creative action' },
  { source_id: 'node-theology-proper', target_id: 'node-nicene-creed', relation: 'supports', confidence: 'EXTRACTED', label: 'triune definition' },
  { source_id: 'node-theology-proper', target_id: 'node-westminster-shorter', relation: 'supports', confidence: 'EXTRACTED', label: 'chief end of man' },
  { source_id: 'node-theology-proper', target_id: 'node-h2617-chesed', relation: 'references', confidence: 'EXTRACTED', label: 'covenant mercy' },

  // ── Christology Connections ───────────────────────────────────────────────
  { source_id: 'node-christology', target_id: 'node-john-1-1', relation: 'supports', confidence: 'EXTRACTED', label: 'eternal Word made flesh' },
  { source_id: 'node-christology', target_id: 'node-john-3-16', relation: 'quotes', confidence: 'EXTRACTED', label: 'gift of the Son' },
  { source_id: 'node-christology', target_id: 'node-isaiah-53-5', relation: 'fulfills', confidence: 'EXTRACTED', label: 'prophesied atonement' },
  { source_id: 'node-christology', target_id: 'node-apostles-creed', relation: 'supports', confidence: 'EXTRACTED', label: 'incarnation & cross' },
  { source_id: 'node-christology', target_id: 'node-g26-agape', relation: 'references', confidence: 'EXTRACTED', label: 'sacrificial love' },
  { source_id: 'node-christology', target_id: 'node-heidelberg-catechism', relation: 'supports', confidence: 'EXTRACTED', label: 'only comfort' },

  // ── Soteriology Connections ───────────────────────────────────────────────
  { source_id: 'node-soteriology', target_id: 'node-ephesians-2-8', relation: 'quotes', confidence: 'EXTRACTED', label: 'salvation by grace' },
  { source_id: 'node-soteriology', target_id: 'node-romans-8-1', relation: 'supports', confidence: 'EXTRACTED', label: 'no condemnation' },
  { source_id: 'node-soteriology', target_id: 'node-g5485-charis', relation: 'references', confidence: 'EXTRACTED', label: 'unmerited favor' },
  { source_id: 'node-soteriology', target_id: 'node-g4102-pistis', relation: 'references', confidence: 'EXTRACTED', label: 'justifying faith' },
  { source_id: 'node-soteriology', target_id: 'node-luther-small-catechism', relation: 'supports', confidence: 'EXTRACTED', label: 'justification alone' },
  { source_id: 'node-soteriology', target_id: 'node-1689-baptist', relation: 'supports', confidence: 'EXTRACTED', label: 'covenant of redemption' },

  // ── Pneumatology Connections ──────────────────────────────────────────────
  { source_id: 'node-pneumatology', target_id: 'node-g4151-pneuma', relation: 'references', confidence: 'EXTRACTED', label: 'breath & Spirit' },
  { source_id: 'node-pneumatology', target_id: 'node-theology-proper', relation: 'part_of', confidence: 'EXTRACTED', label: 'Third Person of Trinity' },
  { source_id: 'node-pneumatology', target_id: 'node-romans-8-1', relation: 'supports', confidence: 'EXTRACTED', label: 'law of the Spirit of life' },
  { source_id: 'node-pneumatology', target_id: 'node-christian-ethics', relation: 'leads_to', confidence: 'EXTRACTED', label: 'fruit of the Spirit' },

  // ── Bibliology Connections ────────────────────────────────────────────────
  { source_id: 'node-bibliology', target_id: 'node-john-1-1', relation: 'supports', confidence: 'EXTRACTED', label: 'inscribed Word of God' },
  { source_id: 'node-bibliology', target_id: 'node-theology-proper', relation: 'supports', confidence: 'EXTRACTED', label: 'special revelation' },

  // ── Ecclesiology Connections ──────────────────────────────────────────────
  { source_id: 'node-ecclesiology', target_id: 'node-matthew-28-19', relation: 'quotes', confidence: 'EXTRACTED', label: 'discipleship & baptism' },
  { source_id: 'node-ecclesiology', target_id: 'node-1689-baptist', relation: 'supports', confidence: 'EXTRACTED', label: 'believer baptism' },
  { source_id: 'node-ecclesiology', target_id: 'node-christian-ethics', relation: 'leads_to', confidence: 'EXTRACTED', label: 'body life & care' },

  // ── Eschatology Connections ───────────────────────────────────────────────
  { source_id: 'node-eschatology', target_id: 'node-romans-8-28', relation: 'supports', confidence: 'EXTRACTED', label: 'eternal restoration' },
  { source_id: 'node-eschatology', target_id: 'node-christology', relation: 'leads_to', confidence: 'EXTRACTED', label: 'second coming of Christ' },
  { source_id: 'node-eschatology', target_id: 'node-nicene-creed', relation: 'supports', confidence: 'EXTRACTED', label: 'world to come' },

  // ── Encouragement & Application Connections ───────────────────────────────
  { source_id: 'node-encourage-anxiety', target_id: 'node-philippians-4-6', relation: 'quotes', confidence: 'EXTRACTED', label: 'prayer brings peace' },
  { source_id: 'node-encourage-anxiety', target_id: 'node-h7965-shalom', relation: 'references', confidence: 'EXTRACTED', label: 'divine shalom' },
  { source_id: 'node-encourage-anxiety', target_id: 'node-psalm-23', relation: 'supports', confidence: 'EXTRACTED', label: 'quiet waters' },

  { source_id: 'node-encourage-strength', target_id: 'node-romans-8-28', relation: 'quotes', confidence: 'EXTRACTED', label: 'all things work for good' },
  { source_id: 'node-encourage-strength', target_id: 'node-isaiah-53-5', relation: 'supports', confidence: 'EXTRACTED', label: 'chastisement brings peace' },

  { source_id: 'node-encourage-healing', target_id: 'node-h2617-chesed', relation: 'references', confidence: 'EXTRACTED', label: 'steadfast love' },
  { source_id: 'node-encourage-healing', target_id: 'node-psalm-23', relation: 'quotes', confidence: 'EXTRACTED', label: 'restores my soul' },

  { source_id: 'node-encourage-creativity', target_id: 'node-genesis-1-1', relation: 'supports', confidence: 'EXTRACTED', label: 'made in Creator’s image' },
  { source_id: 'node-encourage-creativity', target_id: 'node-g2889-kosmos', relation: 'references', confidence: 'EXTRACTED', label: 'order & beauty' },
];

export function getCanonicalGraph(): { nodes: CanonicalNode[]; edges: GraphEdge[] } {
  return {
    nodes: CANONICAL_NODES,
    edges: CANONICAL_EDGES,
  };
}

export function getCanonicalSubgraph(nodeKey: string): { nodes: CanonicalNode[]; edges: GraphEdge[] } {
  const normKey = nodeKey.toLowerCase().trim();
  const centerNode = CANONICAL_NODES.find(
    n => n.node_key.toLowerCase() === normKey || n.id === normKey || n.label.toLowerCase().includes(normKey)
  );

  if (!centerNode) {
    return getCanonicalGraph();
  }

  // Find 1-hop edges
  const matchedEdges = CANONICAL_EDGES.filter(
    e => e.source_id === centerNode.id || e.target_id === centerNode.id
  );

  // Find 1-hop connected node IDs
  const connectedIds = new Set<string>([centerNode.id!]);
  for (const edge of matchedEdges) {
    connectedIds.add(edge.source_id);
    connectedIds.add(edge.target_id);
  }

  const matchedNodes = CANONICAL_NODES.filter(n => connectedIds.has(n.id!));

  return {
    nodes: matchedNodes,
    edges: matchedEdges,
  };
}
