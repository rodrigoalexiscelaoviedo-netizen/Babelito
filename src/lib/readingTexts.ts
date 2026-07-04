export interface ReadingText {
  id: string;
  title: string;
  author: string;
  level: "A2" | "B1" | "B2";
  content: string;
}

export const READING_TEXTS: ReadingText[] = [
  {
    id: "happy-prince-1",
    title: "The Happy Prince",
    author: "Oscar Wilde",
    level: "A2",
    content: `High above the city, on a tall column, stood the statue of the Happy Prince. He was covered all over with thin leaves of fine gold, his eyes were made of two bright sapphires, and a great red ruby glowed on his sword-handle.

He was very much admired indeed. "He is as beautiful as a weathercock," said one of the Town Councillors who wished to gain a reputation for having artistic tastes. "Only not quite so useful," he added, afraid that people would think him unpractical, which he really was not.

"Why can't you be like the Happy Prince?" asked a sensible mother of her little boy who was crying for the moon. "The Happy Prince never dreams of crying for anything," she said.

One night there flew over the city a little Swallow. His friends had gone away to Egypt six weeks before, but he had stayed behind. He was in love with the most beautiful Reed. He had met her early in the spring as he was flying down the river after a big yellow moth.`,
  },
  {
    id: "selfish-giant",
    title: "The Selfish Giant",
    author: "Oscar Wilde",
    level: "A2",
    content: `Every afternoon, as they were coming from school, the children used to go and play in the Giant's garden. It was a large lovely garden, with soft green grass. Here and there over the grass stood beautiful flowers like stars, and there were twelve peach-trees that in the spring-time broke out into delicate blossoms of pink and pearl.

The Giant had been away for seven years. He had gone to visit his friend the Cornish ogre, and had stayed with him. When he returned, he saw the children playing in the garden. "What are you doing here?" he cried in a very gruff voice, and the children ran away.

"My own garden is my own garden," said the Giant, "anyone can understand that, and I will allow nobody to play in it but myself." So he built a high wall all round it, and put up a notice-board: TRESPASSERS WILL BE PROSECUTED.`,
  },
  {
    id: "gift-of-magi",
    title: "The Gift of the Magi",
    author: "O. Henry",
    level: "B1",
    content: `One dollar and eighty-seven cents. That was all. And sixty cents of it was in pennies. Pennies saved one and two at a time by negotiating with the grocery store owner and the vegetable seller until one's cheeks burned with silent humiliation.

Della counted three times. One dollar and eighty-seven cents. And the next day would be Christmas.

There was clearly nothing to do but sit on the old couch and cry. So Della did it.

While the mistress of the home is slowly becoming less upset, let's look at the home. A furnished flat at eight dollars a week. It did not exactly beggar description, but it certainly had that word on the lookout for the mendicancy squad.

In the lobby below was a letter-box into which no letter would go, and an electric button from which no mortal finger could coax a ring. Also there was a card bearing the name "Mr. James Dillingham Young."

Della finished her cry and went to work on her cheeks with the powder rag. She stood by the window and looked out at a grey cat walking along a grey fence in a grey backyard. Tomorrow would be Christmas Day, and she had only one dollar and eighty-seven cents to buy Jim a present.`,
  },
  {
    id: "necklace",
    title: "The Necklace",
    author: "Guy de Maupassant",
    level: "B1",
    content: `She was one of those pretty and charming girls, born into a family of clerks, with no money and no prospects. She had no means of meeting some rich and distinguished man, so she let herself be married to a minor official at the Ministry of Education.

She suffered endlessly, feeling that she was made for luxury and comfort. She suffered from the poverty of her apartment, from the shabby walls, the worn chairs, and the faded curtains. All these things, which another woman of her class would not even have noticed, tormented and insulted her.

When she sat down to dinner, opposite her husband, who uncovered the soup tureen and declared enthusiastically, "Ah, good old beef stew! I don't know anything better than that," she dreamed of elegant dinners, of gleaming silverware, of tapestries depicting ancient figures and exotic birds in an enchanted forest.

She had no dresses, no jewels, nothing. And she loved nothing but these things; she felt made for them. She burned with the desire to please, to be attractive, to be sought after.`,
  },
  {
    id: "tell-tale-heart",
    title: "The Tell-Tale Heart",
    author: "Edgar Allan Poe",
    level: "B2",
    content: `True! Nervous, very, very dreadfully nervous I had been and am; but why will you say that I am mad? The disease had sharpened my senses, not destroyed, not dulled them. Above all was the sense of hearing acute. I heard all things in the heaven and in the earth. I heard many things in hell. How, then, am I mad? Hearken! and observe how healthily, how calmly I can tell you the whole story.

It is impossible to say how first the idea entered my brain; but once conceived, it haunted me day and night. Object there was none. Passion there was none. I loved the old man. He had never wronged me. He had never given me insult. For his gold I had no desire. I think it was his eye! Yes, it was this! One of his eyes resembled that of a vulture — a pale blue eye, with a film over it. Whenever it fell upon me, my blood ran cold; and so by degrees, very gradually, I made up my mind to take the life of the old man, and thus rid myself of the eye forever.`,
  },
  {
    id: "sherlock-study",
    title: "A Study in Scarlet",
    author: "Arthur Conan Doyle",
    level: "B2",
    content: `In the year 1878 I took my degree of Doctor of Medicine of the University of London, and proceeded to Netley to go through the course prescribed for surgeons in the army. Having completed my studies there, I was duly attached to the Fifth Northumberland Fusiliers as Assistant Surgeon.

We proceeded to India by the troopship Orontes, where I underwent a series of adventures which left me with a constitution much shaken. I was struck on the shoulder by a Jezail bullet, which shattered the bone and grazed the subclavian artery. Had it not been for the promptitude and skill of my orderly, James Murray, who half carried, half supported me under fire to a place of safety, I should certainly have died.

I was removed from the regiment and conveyed back to England. For months my life was despaired of, and when at last I came to myself and became convalescent, I was so weak and emaciated that a medical board determined that not a day should be lost in sending me back to England. I came to London with the weak remnant of a once robust constitution.`,
  },
];
