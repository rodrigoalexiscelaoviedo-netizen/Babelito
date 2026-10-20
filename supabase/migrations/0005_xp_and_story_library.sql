-- 0005 · Experiencia (XP) y biblioteca de historias en inglés.
-- Idempotente. Ejecutar a mano en el SQL editor de Supabase.

-- ── 1. Registro de XP ──────────────────────────────────────────────────────────
-- Un evento por actividad. ref_key es única por usuario: si la misma actividad
-- se registra dos veces (doble clic, reintento de red), solo cuenta una.
create table if not exists public.xp_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  ref_key    text not null,
  source     text not null check (source in ('conversation','roleplay','story','review','daily_lesson')),
  amount     integer not null check (amount > 0 and amount <= 200),
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, ref_key)
);
create index if not exists xp_events_user_idx on public.xp_events(user_id, created_at desc);

alter table public.xp_events enable row level security;

drop policy if exists "own xp events" on public.xp_events;
create policy "own xp events" on public.xp_events
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── 2. Biblioteca de historias (originales, en inglés) ────────────────────────
-- Historias nuevas con temática de fantasía, misterio, neurociencia e historia.
-- Son textos originales escritos para Babelito; no reproducen libros con copyright.

insert into public.stories (id, title, level, topic, content, source, user_id, questions) values

('7f1c2a10-0001-4000-8000-000000000001', 'The Lantern Keeper of Hollow Pass', 'B1', 'fantasy / adventure',
$t$High in the mountains, where the clouds rest on the peaks like wool, there is a narrow road called Hollow Pass. For three hundred years, a lantern has burned at its highest point. The keeper of that lantern is Maren, a quiet woman with ink-stained fingers and a habit of humming when she is nervous.

One autumn night, the lantern flickered and went out. Travelers who crossed the pass in the dark were never seen again. Maren knew she had only one choice: she had to climb to the old shrine and relight the flame herself, before the first snow closed the road.

The climb took all night. Her boots slipped on the ice, and the wind tried to push her back down the mountain. At one point she sat on a rock and wanted to give up. But then she remembered her grandmother's saying: a light does not need to be large, it only needs to be kept.

At dawn she reached the shrine. The old flame was cold, but beneath the ashes she found a single ember still glowing. She blew on it gently, fed it dry moss, and watched it grow. When the sun rose, the lantern burned again, and a caravan of merchants, far below, saw the light and turned toward the pass safely.$t$,
'preloaded', null,
$q$[
  {"question":"Why did the lantern go out?","options":["The wind blew it out","It was never lit","The keeper forgot to refill it","Snow covered it"],"correct_index":0},
  {"question":"What did Maren remember that gave her strength?","options":["A map of the mountain","Her grandmother's saying","A song for travelers","The name of the shrine"],"correct_index":1},
  {"question":"How was the lantern relit?","options":["With a match from a merchant","With a single ember under the ashes","With magic from the shrine","It was never really out"],"correct_index":1}
]$q$::jsonb),

('7f1c2a10-0002-4000-8000-000000000002', 'The Dragon Who Collected Clocks', 'A2', 'fantasy / humor',
$t$Far away, in a valley full of pine trees, there lived a dragon named Ember. Ember was not like other dragons. He did not guard gold or jewels. He collected clocks.

He had clocks on every wall of his cave. Some were tall and loud, some were tiny and silent, and one was shaped like a fish. Ember loved them all, but he had a problem: he never knew what time it was. Every clock showed a different hour.

One day a girl named Pia climbed the mountain to find him. She carried a small wooden watch. "Your clocks are wrong," she said. "They all tick at different speeds."

Ember was offended at first. Then he looked closely and saw that she was right. "Then help me fix them," he said.

They worked together all afternoon. Pia taught him how to set each clock by the sun. By evening, the cave was quiet, and every clock showed the same time.

Ember smiled, and a little smoke came out of his nose. "Now I know when it is time to sleep," he said. And Pia went home happy, knowing that a dragon could learn something new, too.$t$,
'preloaded', null,
$q$[
  {"question":"What did Ember collect?","options":["Gold","Jewels","Clocks","Books"],"correct_index":2},
  {"question":"What was Ember's problem?","options":["He could not fly","All his clocks showed different times","He was afraid of girls","His cave was too cold"],"correct_index":1},
  {"question":"How did they fix the clocks?","options":["They threw the clocks away","They set them by the sun","Ember bought new ones","Pia repaired them with magic"],"correct_index":1}
]$q$::jsonb),

('7f1c2a10-0003-4000-8000-000000000003', 'The Missing Violin', 'B1', 'mystery',
$t$On a grey Monday morning, Inspector Lena Hart received a call from the Hollis Concert Hall. The famous violin of the orchestra's soloist, a 200-year-old instrument, had vanished from its locked case overnight.

The hall had three keys. The director had one, the caretaker had one, and the soloist, Daniel Ruiz, kept the third around his neck. The doors were locked, and there were no signs of forced entry.

Lena noticed three things. First, the case was closed, but the velvet inside was still folded in the shape of the violin, which meant it had been put back and then taken out again. Second, the caretaker's shoes were wet, although it had not rained. Third, Daniel was the only person who knew that the violin needed to be repaired the next day.

She went back to the hall and checked the old maintenance corridor. Behind a row of stored chairs she found a small trapdoor. Under it was the violin, wrapped in a blanket, and a repair receipt with the caretaker's name on it.

It turned out that the caretaker had taken the violin to a repair shop early, because the soloist had asked him to. The soloist had been worried about a crack, and he had wanted it fixed quietly, before anyone found out. Lena closed the case and smiled. Sometimes the truth is simpler than a mystery.$t$,
'preloaded', null,
$q$[
  {"question":"How many keys were there to the hall?","options":["One","Two","Three","Four"],"correct_index":2},
  {"question":"What clue showed the violin had been moved twice?","options":["Footprints in the hall","The velvet folded in the violin's shape","A broken window","A note from the director"],"correct_index":1},
  {"question":"Why had the soloist asked for the violin to be taken away?","options":["He wanted to sell it","He wanted a crack repaired quietly","He was angry at the orchestra","He lost his keys"],"correct_index":1}
]$q$::jsonb),

('7f1c2a10-0004-4000-8000-000000000004', 'A Letter Without a Stamp', 'B2', 'mystery',
$t$Every morning for six months, a letter appeared under the door of the Bellamy bakery. It had no stamp and no return address. Inside was always the same single line, written in careful blue ink: "The bread is good, but the oven is too hot."

Clara Bellamy, who ran the bakery with her brother, found the letters funny at first. Then they became unsettling. The writer seemed to know the exact temperature of the oven, the hour when the flour was delivered, and the name of the cat that slept by the door.

Clara decided to find out who was writing. She started waking up before dawn. On the seventh morning, she saw a figure standing in the rain across the street, holding an umbrella that did not quite cover him. He was an old man, thin and very still, watching the bakery window.

She ran outside, but he had already turned the corner. Later that day, she visited the post office and asked about the blue ink. The clerk told her that an elderly man had been collecting old recipes from the neighborhood for a book. He had been a baker himself, once, in the same building, decades before.

The letters were not threats after all. They were advice, written by someone who missed the place and could not stop caring about it. Clara left a reply on the doorstep the next morning: "Come in for breakfast. The oven is hot, but the door is open."$t$,
'preloaded', null,
$q$[
  {"question":"What did the letters always say?","options":["Thank you for the bread","The bread is good, but the oven is too hot","Close the shop earlier","Who are you?"],"correct_index":1},
  {"question":"Why did the letters seem unsettling at first?","options":["They were written in red ink","They knew private details about the bakery","They threatened to close the shop","They arrived by post"],"correct_index":1},
  {"question":"Who was the writer, in the end?","options":["A rival baker who wanted the shop","A thief looking for money","An old man who had once been a baker there","A journalist writing a story"],"correct_index":2}
]$q$::jsonb),

('7f1c2a10-0005-4000-8000-000000000005', 'The Habit Loop', 'A2', 'brain / habits',
$t$Marta wanted to read more, but every evening she picked up her phone instead of a book. She felt bad about it, but she did not know how to change.

One day her friend Tomas told her about a simple idea. Most habits have three parts. First, there is a cue, something that tells your brain to start. Then comes the routine, the action you repeat. Finally, there is a reward, which makes your brain want to do it again.

Marta looked at her evening carefully. The cue was sitting down on the sofa. The routine was opening the phone. The reward was a few minutes of funny videos. So she made one small change. Every evening, when she sat on the sofa, she put her book on the cushion next to her. The cue stayed the same. The routine was now reading one page. And for the reward, she allowed herself a cup of tea.

The first week was hard. She often forgot. But the book was always there, waiting, and the tea was always ready. After three weeks, something had changed. Sitting on the sofa now made her reach for the book without thinking.

Marta did not become a different person. She simply built a path that was easier to follow. Her brain learned the new route, one page at a time.$t$,
'preloaded', null,
$q$[
  {"question":"What are the three parts of a habit in this story?","options":["Goal, plan, and rest","Cue, routine, and reward","Start, stop, and repeat","Phone, sofa, and tea"],"correct_index":1},
  {"question":"What was Marta's cue?","options":["Opening the phone","Reading one page","Sitting down on the sofa","Drinking tea"],"correct_index":2},
  {"question":"What did Marta change to build the new habit?","options":["The cue, by leaving the sofa","The routine, by reading one page","The reward, by removing the tea","Nothing at all"],"correct_index":1}
]$q$::jsonb),

('7f1c2a10-0006-4000-8000-000000000006', 'Rewiring a Mind', 'B2', 'neuroscience / learning',
$t$For decades, scientists believed that the adult brain was fixed, like a building that could no longer change its rooms. Today we know this is not true. The brain is plastic: its connections between neurons can strengthen, weaken, and reorganize throughout life.

Dr. Ines Keller had spent fifteen years studying this process. Her laboratory was not glamorous. It had old microscopes, a coffee machine that worked only when it wanted to, and a wall of notebooks filled with careful measurements.

Her most important finding was simple to describe and hard to prove. When a person repeats a new skill, the neural pathways involved become faster and more efficient. The first attempts feel awkward, because the signal travels along a weak, unfamiliar route. With repetition, the signal finds a stronger path. The skill starts to feel automatic.

Keller often told her students that attention is the key. Practice that is distracted or passive builds weaker pathways than practice that is focused and effortful. This is also why making mistakes, and then correcting them, can be useful: the correction is a signal that tells the brain where to strengthen the route.

At the end of her career, Keller wrote a short sentence on the first page of her most famous book: "The brain does not wait for permission to change. It only needs repetition, and the patience to repeat." She knew that this was not a promise of instant results. It was an invitation to keep practicing.$t$,
'preloaded', null,
$q$[
  {"question":"What did scientists once believe about the adult brain?","options":["It changes every day","It is fixed and cannot change much","It only grows in childhood, then shrinks","It works only with a computer"],"correct_index":1},
  {"question":"According to Keller, what makes a pathway stronger?","options":["Passive listening","Repetition and focused effort","Sleeping more","Avoiding all mistakes"],"correct_index":1},
  {"question":"Why can correcting mistakes help learning?","options":["It makes the lesson shorter","It signals the brain where to strengthen the route","It removes the need for practice","It is required by law"],"correct_index":1}
]$q$::jsonb),

('7f1c2a10-0007-4000-8000-000000000007', 'The Night London Burned', 'B1', 'history',
$t$On the night of 2 September 1666, a fire started in a bakery on Pudding Lane, in the heart of London. The city was built mostly of wood, and that summer had been very dry. A strong wind carried sparks from roof to roof.

Samuel Pepys, a government official, watched from a boat on the river. He wrote in his diary that the fire seemed to spread faster than people could run. Families carried their belongings to the river, and the sky glowed orange all night.

The firefighting was slow and confused. Many houses were pulled down with hooks and ropes to create gaps that the flames could not cross. This method worked, but it took time and courage. King Charles II, who had been worried for days, came to help people carry buckets of water and furniture.

When the fire finally stopped, four days later, much of the city lay in ruins. Thousands of houses were destroyed, and St Paul's Cathedral, the great church at the centre of London, was badly damaged. Yet surprisingly few people were killed, perhaps only a handful, compared with the size of the disaster.

The rebuilding changed London forever. New houses were built with brick and stone, and new rules limited the use of wood. Architect Christopher Wren designed many new churches, and a tall column, the Monument, was raised near the place where the fire had begun.$t$,
'preloaded', null,
$q$[
  {"question":"Where did the Great Fire of London start?","options":["In a church","In a bakery on Pudding Lane","On the river","In the royal palace"],"correct_index":1},
  {"question":"Why did the fire spread so quickly?","options":["There was snow on the roofs","The city was mostly wood and very dry","People used too much water","The river was frozen"],"correct_index":1},
  {"question":"What changed in London after the fire?","options":["Houses were built with more wood","New buildings used brick and stone","The river was closed","The city moved to another place"],"correct_index":1}
]$q$::jsonb),

('7f1c2a10-0008-4000-8000-000000000008', 'One Small Step, 1969', 'A2', 'history / space',
$t$On 16 July 1969, a huge rocket lifted off from Florida. Inside the top part of the spacecraft were three astronauts: Neil Armstrong, Buzz Aldrin, and Michael Collins. Their mission was called Apollo 11, and its goal was to land humans on the Moon.

Four days later, the lunar module, called Eagle, separated from the main ship. Armstrong and Aldrin flew it down toward the surface. Collins stayed above, in orbit, alone with the big command module.

The landing was almost a disaster. The computer warned of alarms, and Armstrong saw that the planned area was full of large rocks. He took manual control and flew the ship to a flatter place. Only a few seconds of fuel were left when Eagle touched down.

On 20 July 1969, Armstrong climbed down the ladder. He stepped onto the surface and said his famous words: "That's one small step for man, one giant leap for mankind." Aldrin joined him soon after.

They spent about two and a half hours outside. They planted a flag, collected rocks, and took photographs. Then they returned to Eagle and rejoined Collins. Around the world, hundreds of millions of people watched on television, and many of them remember the moment still.$t$,
'preloaded', null,
$q$[
  {"question":"What was the name of the mission?","options":["Apollo 13","Apollo 11","Eagle 1","Columbus"],"correct_index":1},
  {"question":"Who stayed in orbit while the others landed?","options":["Neil Armstrong","Buzz Aldrin","Michael Collins","Mission control"],"correct_index":2},
  {"question":"Why did Armstrong fly the ship to a different place?","options":["He wanted to see the Earth","The planned area was full of large rocks","The fuel was too strong","He was asked by the television crew"],"correct_index":1}
]$q$::jsonb),

('7f1c2a10-0009-4000-8000-000000000009', 'Two Faces in One Mirror', 'B2', 'classic retelling / psychology',
$t$Dr. Henry Hale was respected by everyone in his city. He was kind to his patients, generous with his time, and careful in his work. But he had a secret worry. He sometimes felt that another part of him was waiting in the shadows, a part that wanted to do whatever it pleased, without thinking of consequences.

He began to study this feeling in his laboratory. He mixed a pale liquid that he believed could separate the good from the bad inside a person. For a while, the experiments seemed to work. When he drank the liquid, his body changed, and a second person appeared, smaller, younger, and much more reckless.

The second man called himself Edward Hyde. At first Henry enjoyed the freedom. Then the freedom became a habit, and the habit became a danger. Hyde did things that Henry would never have chosen, and each time Henry woke up, he found the consequences waiting for him.

Henry tried to stop. He threw away the liquid and promised himself he would never touch it again. But the desire to be free from his responsibilities grew stronger each day, and one evening he could not resist.

The story is often read as a warning about hidden anger and the cost of pretending to be perfect. Hale's lesson, if he had learned it, is simple: trying to split yourself into two people does not remove the difficult parts. It only hides them until they grow.$t$,
'preloaded', null,
$q$[
  {"question":"What was Henry Hale's secret worry?","options":["He was losing his money","Another part of him wanted to act without consequences","He was afraid of hospitals","He did not like his city"],"correct_index":1},
  {"question":"What did the liquid seem to do?","options":["Heal his patients","Create a second, reckless personality","Make him sleep for days","Turn him into a bird"],"correct_index":1},
  {"question":"What is the main lesson of the story?","options":["Liquids can cure any illness","Hiding the hard parts of yourself makes them grow","Doctors should not experiment","Freedom is always dangerous"],"correct_index":1}
]$q$::jsonb)

on conflict (id) do nothing;
