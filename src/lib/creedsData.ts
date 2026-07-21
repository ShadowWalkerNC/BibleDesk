/**
 * creedsData.ts — Historic Christian Creeds & Confessions Dataset
 * Built-in dataset — offline, no API required.
 */

export interface Creed {
  id: string;
  name: string;
  year: string;
  origin: string;
  summary: string;
  sections: Array<{
    title: string;
    text: string;
    scriptureRefs: string[];
  }>;
}

export const CREEDS: Creed[] = [
  {
    id: 'apostles',
    name: "Apostles' Creed",
    year: 'c. 2nd Century AD',
    origin: 'Early Church (Rome)',
    summary: 'The earliest summary of apostolic Christian doctrine, organized around faith in God the Father, Jesus Christ the Son, and the Holy Spirit.',
    sections: [
      {
        title: 'God the Father Almighty',
        text: 'I believe in God, the Father Almighty, Creator of heaven and earth.',
        scriptureRefs: ['Genesis 1:1', 'Matthew 6:9', 'Revelation 4:11'],
      },
      {
        title: 'Jesus Christ His Only Son',
        text: 'I believe in Jesus Christ, his only Son, our Lord, who was conceived by the Holy Spirit and born of the virgin Mary. He suffered under Pontius Pilate, was crucified, died, and was buried; he descended to hell. The third day he rose again from the dead. He ascended to heaven and is seated at the right hand of God the Father Almighty. From there he will come to judge the living and the dead.',
        scriptureRefs: ['John 3:16', 'Luke 1:35', '1 Corinthians 15:3-4', 'Acts 1:9-11', '2 Timothy 4:1'],
      },
      {
        title: 'The Holy Spirit and the Church',
        text: 'I believe in the Holy Spirit, the holy catholic church, the communion of saints, the forgiveness of sins, the resurrection of the body, and the life everlasting. Amen.',
        scriptureRefs: ['Acts 2:4', 'Ephesians 4:4-6', '1 John 1:9', '1 Corinthians 15:52', 'John 10:28'],
      },
    ],
  },
  {
    id: 'nicene',
    name: 'Nicene Creed',
    year: '325 / 381 AD',
    origin: 'Council of Nicaea & Constantinople',
    summary: 'Formulated to defend the full deity of Jesus Christ and the Holy Spirit against Arianism, affirming that Christ is "of one substance" (homoousios) with the Father.',
    sections: [
      {
        title: 'One God, Father Almighty',
        text: 'We believe in one God, the Father Almighty, Maker of heaven and earth, of all things visible and invisible.',
        scriptureRefs: ['Deuteronomy 6:4', '1 Corinthians 8:6', 'Colossians 1:16'],
      },
      {
        title: 'One Lord Jesus Christ',
        text: 'And in one Lord Jesus Christ, the only-begotten Son of God, begotten of the Father before all worlds; God of God, Light of Light, very God of very God; begotten, not made, being of one substance with the Father, by whom all things were made. Who, for us men and for our salvation, came down from heaven, and was incarnate by the Holy Spirit of the virgin Mary, and was made man; and was crucified also for us under Pontius Pilate; he suffered and was buried; and the third day he rose again, according to the Scriptures; and ascended into heaven, and sits on the right hand of the Father; and he shall come again, with glory, to judge both the quick and the dead; whose kingdom shall have no end.',
        scriptureRefs: ['John 1:1-3', 'Hebrews 1:3', 'John 10:30', 'Philippians 2:6-8', 'Luke 1:33'],
      },
      {
        title: 'The Holy Spirit, Lord & Giver of Life',
        text: 'And we believe in the Holy Spirit, the Lord and Giver of Life, who proceeds from the Father and the Son; who with the Father and the Son together is worshiped and glorified; who spoke by the prophets. And we believe in one holy catholic and apostolic Church; we acknowledge one baptism for the remission of sins; and we look for the resurrection of the dead, and the life of the world to come. Amen.',
        scriptureRefs: ['2 Corinthians 3:17-18', 'John 15:26', 'Ephesians 4:4-5', 'Revelation 21:1-4'],
      },
    ],
  },
  {
    id: 'chalcedonian',
    name: 'Chalcedonian Definition',
    year: '451 AD',
    origin: 'Council of Chalcedon',
    summary: 'Defined the orthodox doctrine of the Hypostatic Union: Jesus Christ has two distinct natures (fully God and fully man) united in one divine Person.',
    sections: [
      {
        title: 'Two Natures, One Person',
        text: 'We confess one and the same Son, our Lord Jesus Christ, the same perfect in Godhead and also perfect in manhood; truly God and truly man, of a reasonable soul and body; consubstantial with the Father according to the Godhead, and consubstantial with us according to the Manhood; in all things like unto us, without sin.',
        scriptureRefs: ['John 1:14', 'Hebrews 2:14', 'Hebrews 4:15', 'Colossians 2:9'],
      },
      {
        title: 'Without Confusion, Change, Division, or Separation',
        text: 'Begotten before all ages of the Father according to the Godhead, and in these latter days, for us and for our salvation, born of the Virgin Mary, the Mother of God, according to the Manhood; one and the same Christ, Son, Lord, Only-begotten, to be acknowledged in two natures, inconfusedly, unchangeably, indivisibly, inseparably; the distinction of natures being by no means taken away by the union, but rather the property of each nature being preserved, and concurring in one Person and one Subsistence.',
        scriptureRefs: ['Romans 1:3-4', '1 Timothy 3:16', 'Galatians 4:4'],
      },
    ],
  },
  {
    id: 'athanasian',
    name: 'Athanasian Creed',
    year: 'c. 5th Century AD',
    origin: 'Western Church (Gaul)',
    summary: 'Focuses explicitly on the doctrine of the Holy Trinity and the Incarnation, providing rigorous theological definitions for orthodox belief.',
    sections: [
      {
        title: 'The Catholic Faith & Trinity',
        text: 'The Catholic Faith is this: That we worship one God in Trinity, and Trinity in Unity; neither confounding the Persons, nor dividing the Substance. For there is one Person of the Father, another of the Son, and another of the Holy Spirit. But the Godhead of the Father, of the Son, and of the Holy Spirit, is all one: the Glory equal, the Majesty co-eternal.',
        scriptureRefs: ['Matthew 28:19', '2 Corinthians 13:14', '1 Peter 1:2'],
      },
      {
        title: 'Equal Glory and Co-Eternal Majesty',
        text: 'Such as the Father is, such is the Son, and such is the Holy Spirit. The Father uncreate, the Son uncreate, and the Holy Spirit uncreate. The Father incomprehensible, the Son incomprehensible, and the Holy Spirit incomprehensible. The Father eternal, the Son eternal, and the Holy Spirit eternal. And yet they are not three eternals, but one eternal.',
        scriptureRefs: ['Psalm 90:2', 'Hebrews 9:14', 'John 8:58'],
      },
    ],
  },
];
