-- 0006 · Historias A1 (principiantes) en inglés.
-- La biblioteca no tenía ninguna historia A1. Idempotente (ids fijos).
-- Ejecutar a mano en el SQL editor de Supabase.

insert into public.stories (id, title, level, topic, content, source, user_id, questions) values

('7f1c2a10-0010-4000-8000-000000000010', 'My Day', 'A1', 'daily life',
$t$My name is Leo. I live in a small flat. Every day I wake up at seven. I eat bread and drink coffee. Then I go to work by bus. I work in a shop. I like my job.

At six I go home. I cook dinner. After dinner, I listen to music. I like music very much. At night, I sleep. It is a good day.$t$,
'preloaded', null,
$q$[
  {"question":"What time does Leo wake up?","options":["At six","At seven","At eight","At nine"],"correct_index":1},
  {"question":"How does Leo go to work?","options":["By car","By bike","By bus","On foot"],"correct_index":2},
  {"question":"What does Leo do after dinner?","options":["He watches TV","He listens to music","He reads a book","He plays football"],"correct_index":1}
]$q$::jsonb),

('7f1c2a10-0011-4000-8000-000000000011', 'The Little Dragon', 'A1', 'fantasy',
$t$Mo is a little dragon. Mo is green. Mo lives in a big cave. The cave is cold and dark. Mo does not like it.

One day, Mo sees a girl. Her name is Ana. Ana has a small light. "Hello!" says Ana. "Do you want a friend?"

Mo is happy. "Yes!" says Mo. Ana and Mo play in the sun. Now the cave is not dark. Mo has a friend.$t$,
'preloaded', null,
$q$[
  {"question":"What colour is Mo?","options":["Red","Blue","Green","Yellow"],"correct_index":2},
  {"question":"Why does Mo not like the cave?","options":["It is small","It is cold and dark","It is far","It is noisy"],"correct_index":1},
  {"question":"What does Ana ask Mo?","options":["Do you want a friend?","Do you want food?","Do you want a house?","Do you want a song?"],"correct_index":0}
]$q$::jsonb),

('7f1c2a10-0012-4000-8000-000000000012', 'Football with Friends', 'A1', 'friends / football',
$t$Today is Saturday. Tom and his friends play football in the park. There are ten people. It is sunny and warm.

Tom is fast. He runs and shoots. Goal! His friends are happy.

After the game, they are tired and hungry. They go to a café. They eat pizza and drink water. They talk and laugh. Tom loves Saturdays.$t$,
'preloaded', null,
$q$[
  {"question":"Where do they play football?","options":["At school","In the park","At the beach","In a gym"],"correct_index":1},
  {"question":"How is the weather?","options":["Cold and rainy","Sunny and warm","Windy","Snowy"],"correct_index":1},
  {"question":"What do they eat after the game?","options":["Pasta","Sandwiches","Pizza","Fish"],"correct_index":2}
]$q$::jsonb),

('7f1c2a10-0013-4000-8000-000000000013', 'A Day in Barcelona', 'A1', 'travel / Barcelona',
$t$Sara is in Barcelona. It is her first day. The city is big and beautiful.

In the morning, she walks to the beach. The sea is blue. Then she visits a big church. It is very tall.

For lunch, she eats paella. It is delicious! In the evening, she sits in a square and listens to a street musician. Sara is very happy. She loves Barcelona.$t$,
'preloaded', null,
$q$[
  {"question":"Is this Sara's first day in Barcelona?","options":["Yes","No","It is her last day","We do not know"],"correct_index":0},
  {"question":"What does Sara eat for lunch?","options":["Tapas","Paella","Soup","Salad"],"correct_index":1},
  {"question":"What does she listen to in the evening?","options":["A street musician","The radio","A teacher","Nothing"],"correct_index":0}
]$q$::jsonb)

on conflict (id) do nothing;
