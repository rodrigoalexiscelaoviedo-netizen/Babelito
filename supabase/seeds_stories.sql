-- seed_stories.sql
-- Correlo manualmente en Supabase: Dashboard > SQL Editor > New query > pegar > Run
-- Inserta las 12 historias preloaded de Babelito.
-- NO modifica ninguna tabla de usuarios ni progress.

INSERT INTO stories (id, title, level, topic, content, source, user_id, questions, created_at) VALUES

(gen_random_uuid(), 'The Weekend DJ', 'B1', 'music / DJ',
'Tom had always been passionate about music. Since he was a teenager, he had spent hours listening to records in his bedroom, carefully studying the way tracks flowed from one to another. Now, at twenty-eight, he worked as an accountant during the week but transformed into DJ Tom every Saturday night at a small club in Camden.

The preparation was as important as the performance itself. On Thursday evenings, Tom would sit at his laptop, listening to new releases and old classics, organising his playlist for the weekend. He paid particular attention to the energy of each track and how it could connect with the crowd.

His favourite moment was always around midnight, when the dance floor was packed and the music seemed to flow effortlessly. He would read the room carefully, noticing when people were getting tired and needed an uplifting tune, or when they were ready for something more intense. It was a skill that had taken years to develop.

Last weekend, something unexpected happened. A record label manager happened to be in the club and was impressed by Tom''s set. After the show, she approached him with a business card and suggested they meet for coffee. Tom was so surprised that he could barely speak.

He knew that this kind of opportunity rarely came twice. That Sunday morning, he sat in his small flat, staring at the business card. Perhaps it was time to consider whether music could become more than just a weekend hobby. The idea both excited and frightened him enormously.',
'preloaded', null,
'[{"question":"What does Tom do during the week?","options":["He works as a musician","He works as an accountant","He works at a club","He studies at university"],"correct_index":1},{"question":"When does Tom usually prepare his playlist?","options":["On Saturday afternoons","On Friday mornings","On Thursday evenings","On Sunday nights"],"correct_index":2},{"question":"What unexpected event happened last weekend?","options":["A friend joined him behind the decks","The sound system broke down","A record label manager approached him","The club owner offered him a contract"],"correct_index":2},{"question":"How did Tom feel after the record label manager spoke to him?","options":["Angry and defensive","So surprised he could barely speak","Immediately confident","Disappointed by the offer"],"correct_index":1}]'::jsonb,
now()),

(gen_random_uuid(), 'My First Investment', 'B1', 'investments',
'Sarah had always been careful with her money, but she had never invested any of it. She kept her savings in a standard bank account, earning almost no interest. One afternoon, a colleague mentioned that she had started investing in index funds, and Sarah became curious.

She spent the following week reading articles and watching videos online. She learnt that an index fund simply tracks the performance of a group of companies, such as the largest five hundred companies in the United States. Instead of picking individual shares, investors spread their money across many different businesses, which reduces the risk considerably.

What surprised her most was how little money she needed to start. She had assumed that investing was only for wealthy people, but she discovered that she could begin with as little as fifty pounds a month. The key was to invest regularly and to be patient, allowing the money to grow over many years.

After two weeks of research, Sarah opened an account with an online investment platform. She decided to put aside one hundred pounds each month into a global index fund. She set up an automatic payment so that the money would be transferred without her having to think about it.

Three months later, she checked her account and noticed that her investment had grown slightly. It was not a dramatic sum, but it was more than her savings account would have produced. More importantly, she felt that she was finally making her money work for her, rather than letting it sit idle.',
'preloaded', null,
'[{"question":"Why did Sarah become interested in investing?","options":["She read a book about finance","A colleague mentioned index funds","Her bank manager advised her","She saw an advertisement"],"correct_index":1},{"question":"What is an index fund?","options":["A savings account with high interest","A fund that tracks a group of companies","A type of individual company share","A government bond"],"correct_index":1},{"question":"How much did Sarah decide to invest each month?","options":["Fifty pounds","Two hundred pounds","One hundred pounds","Five hundred pounds"],"correct_index":2},{"question":"What did Sarah notice three months later?","options":["Her investment had lost money","Her investment had grown slightly","Her account had been closed","She had become wealthy"],"correct_index":1}]'::jsonb,
now()),

(gen_random_uuid(), 'Working From Home', 'A2', 'technology / work',
'James started working from home last year. At first, he was very happy. He did not have to travel to the office every morning. He could wake up later and have breakfast at home. He saved a lot of time and money on transport.

But after a few weeks, James had some problems. He felt very lonely because he did not see his colleagues every day. He also found it difficult to stop working in the evening. His laptop was always on the table in the living room, and he kept checking his emails.

His manager noticed that James seemed tired and suggested some changes. She told him to create a special space for work in his flat. James moved his desk to a small corner and added a plant and a good lamp. He also decided to finish work at six o''clock every day and to close his laptop completely.

James also started to join online video calls with his team every morning. They talked about their work and sometimes about their weekends. This helped James feel more connected to his colleagues.

Now, six months later, James enjoys working from home. He has a good routine and he feels healthy and happy. He still misses some things about the office, like the free coffee and the birthday cakes, but overall he thinks working from home is a great way to work.',
'preloaded', null,
'[{"question":"Why was James happy at first?","options":["He got a pay rise","He did not have to travel to work","He had a new laptop","His colleagues visited him"],"correct_index":1},{"question":"What was James''s main problem after a few weeks?","options":["His internet connection was slow","He felt lonely and could not stop working","His flat was too small","He did not like his manager"],"correct_index":1},{"question":"What did James do to improve his situation?","options":["He returned to the office","He moved his desk and set a finish time","He changed his job","He bought a new flat"],"correct_index":1},{"question":"What does James still miss about the office?","options":["His manager","The noise and activity","Free coffee and birthday cakes","His old desk"],"correct_index":2}]'::jsonb,
now()),

(gen_random_uuid(), 'A Trip to Edinburgh', 'A2', 'travel',
'Last summer, Maria visited Edinburgh for the first time. She travelled by train from London. The journey took about four and a half hours. Maria read a book and listened to music on the way. She arrived at Edinburgh Waverley station in the afternoon.

Her hotel was near the city centre. It was small but very clean and comfortable. The receptionist was friendly and gave her a map of the city. She told Maria about the best places to visit.

The next morning, Maria walked up to Edinburgh Castle. The castle is very old and sits on a high rock in the middle of the city. From the top, she could see the whole city and the sea in the distance. It was a beautiful view. Inside the castle, she learnt about Scottish history and saw the Scottish Crown Jewels.

In the afternoon, she walked down the Royal Mile. This is a long street full of shops, restaurants, and street musicians. Maria bought some Scottish shortbread for her family and tried haggis in a local restaurant. She was not sure she liked haggis at first, but the second bite was much better.

On her last day, she visited the Scottish National Museum. The museum was free and had interesting things about Scottish culture, science, and history. Maria was very tired at the end of her trip, but she was also very happy. She decided that she would definitely come back to Scotland one day.',
'preloaded', null,
'[{"question":"How did Maria travel to Edinburgh?","options":["By plane","By car","By train","By bus"],"correct_index":2},{"question":"Where did Maria go on the first morning?","options":["The Royal Mile","Edinburgh Castle","The Scottish National Museum","A restaurant"],"correct_index":1},{"question":"What did Maria buy for her family?","options":["A postcard","Scottish shortbread","A Scottish flag","A bottle of whisky"],"correct_index":1},{"question":"How much did the Scottish National Museum cost?","options":["Ten pounds","Twenty pounds","Five pounds","Nothing — it was free"],"correct_index":3}]'::jsonb,
now()),

(gen_random_uuid(), 'The Streaming Revolution', 'B2', 'music / technology',
'The music industry has undergone a profound transformation over the past two decades. The shift from physical formats — vinyl, cassettes, and compact discs — to digital streaming has fundamentally altered how artists create, distribute, and profit from their work. Platforms such as Spotify, Apple Music, and Tidal now account for the majority of global music consumption, yet the financial implications for musicians remain deeply controversial.

Critics argue that streaming royalties are notoriously low. An artist typically receives between three and five thousandths of a penny per stream, meaning that even a moderately successful song requires millions of plays before generating meaningful income. Independent musicians, who lack the marketing budgets of major labels, often find themselves trapped in a cycle of constant content creation simply to remain visible on algorithmic playlists.

Conversely, proponents of streaming emphasise its democratising effect on the industry. Any aspiring artist can upload music to these platforms without the need for a record deal, instantly reaching a global audience. Genres that were previously considered too niche for mainstream distribution now thrive in dedicated digital communities.

What is undeniable is that the live performance market has grown substantially in response. Since recording revenue has diminished, touring and merchandise have become the primary income streams for most artists. This has led to a renaissance of live music culture, with festivals expanding across the globe and intimate venues experiencing a remarkable revival.

The debate is far from settled. As artificial intelligence begins to generate music autonomously, questions about authorship, royalties, and the very definition of artistic creativity are becoming increasingly urgent.',
'preloaded', null,
'[{"question":"What is the main argument of critics regarding streaming?","options":["Streaming is too complicated for older artists","Royalties are too low to generate meaningful income","Streaming platforms have poor sound quality","Physical formats are still more popular"],"correct_index":1},{"question":"What advantage of streaming do its supporters highlight?","options":["It pays artists very well","It makes music more expensive for listeners","It allows any artist to reach a global audience","It reduces the need for live performances"],"correct_index":2},{"question":"How have artists compensated for lower recording revenue?","options":["By raising the price of albums","By focusing on touring and merchandise","By signing with major labels exclusively","By leaving the music industry"],"correct_index":1},{"question":"What new challenge is mentioned at the end of the text?","options":["The decline of live music","The return of vinyl records","AI generating music autonomously","Streaming platforms going bankrupt"],"correct_index":2}]'::jsonb,
now()),

(gen_random_uuid(), 'Passive Income and Financial Freedom', 'B2', 'investments',
'The concept of passive income has captured the imagination of a generation raised on the promise of financial independence. The idea is straightforward: build assets that generate money with minimal ongoing effort, eventually reaching a point where investment returns cover living expenses — a state commonly referred to as financial freedom or, in investment circles, FIRE (Financial Independence, Retire Early).

In practice, achieving this goal requires considerable discipline and a long time horizon. The most accessible route for most people involves consistent contributions to diversified investment portfolios, typically combining equity index funds with bond holdings in proportions that reflect individual risk tolerance. The mathematics underpinning this strategy rely on compound growth — the process by which returns generate further returns over time.

Property investment represents another popular pathway, though one fraught with complexity. Rental income can provide a reliable monthly cash flow, but landlords must contend with maintenance costs, periods of vacancy, and increasingly stringent regulation in many markets. The initial capital requirement also remains prohibitive for many prospective investors.

Dividend-paying shares offer a middle ground. By holding stakes in established companies with strong balance sheets, investors receive regular payments without needing to sell their holdings. The risk, however, is that dividends are never guaranteed and can be cut during economic downturns.

What financial advisers consistently emphasise is that no passive income strategy eliminates risk entirely. The goal is not to eliminate uncertainty but to manage it intelligently, building a diversified portfolio resilient enough to weather inevitable storms whilst growing steadily over the long term.',
'preloaded', null,
'[{"question":"What does FIRE stand for in the context of this text?","options":["Fixed Income Regular Earnings","Financial Independence, Retire Early","Funds, Investments, Returns, Equity","Free Income, Reliable Earnings"],"correct_index":1},{"question":"What does compound growth mean?","options":["Investing in many different countries","Saving money in a bank account","Returns generating further returns over time","Buying and selling shares quickly"],"correct_index":2},{"question":"What is one disadvantage of property investment mentioned in the text?","options":["It never produces rental income","It requires no initial capital","It involves maintenance costs and vacancies","Dividends are never guaranteed"],"correct_index":2},{"question":"What do financial advisers emphasise about passive income strategies?","options":["They always guarantee profit","No strategy eliminates risk entirely","Property is always the best option","Investors should never sell their holdings"],"correct_index":1}]'::jsonb,
now()),

(gen_random_uuid(), 'The Digital Nomad', 'B1', 'travel / technology',
'Emma had been working as a graphic designer for the same company for three years. She enjoyed her job, but the daily commute to the office was exhausting. When her company announced that employees could work remotely full time, she saw an opportunity she had always dreamed about.

She began researching countries that were popular with digital nomads — people who work online while travelling. She discovered that Portugal, Mexico, and Thailand offered good internet connections, reasonable costs of living, and special visas designed specifically for remote workers. After careful consideration, she chose Lisbon as her first destination.

The first month was challenging. Emma had to adapt to a new time zone, a different culture, and the experience of working alone without colleagues nearby. She found a co-working space in the city centre, where she met other remote workers from various countries. Within a few weeks, she had a small group of friends who shared similar lifestyles.

She quickly discovered that being a digital nomad required more organisation than she had expected. She needed reliable internet everywhere she went, so she always carried a portable wi-fi device as a backup. She also learnt to separate her working hours from her exploring hours, otherwise she would feel guilty enjoying the city while messages arrived from her team.

After six months in Lisbon, Emma moved to Barcelona. She was no longer nervous about setting up her life in a new place. She had learnt to pack efficiently, to research neighbourhoods before arriving, and most importantly, to enjoy the remarkable privilege of working from some of the world''s most beautiful cities.',
'preloaded', null,
'[{"question":"Why did Emma see an opportunity when her company allowed remote work?","options":["She wanted to earn more money","She had always dreamed of travelling while working","She needed to visit a family member abroad","She disliked her job"],"correct_index":1},{"question":"Where did Emma go first?","options":["Bangkok","Mexico City","Barcelona","Lisbon"],"correct_index":3},{"question":"What did Emma carry as a backup for internet access?","options":["A laptop with extra storage","A portable wi-fi device","A second mobile phone","A list of local cafés"],"correct_index":1},{"question":"What important lesson did Emma learn about being a nomad?","options":["She should always stay in the same place","She needed to separate working hours from exploring hours","Remote work is too difficult to manage","She should return to the office"],"correct_index":1}]'::jsonb,
now()),

(gen_random_uuid(), 'Learning to Cook', 'A2', 'general / lifestyle',
'When David moved into his own flat for the first time, he did not know how to cook anything. He only knew how to make toast and pour cereal. Every evening, he ordered takeaway food or went to a cheap restaurant near his home. After one month, he realised that this was very expensive and also unhealthy.

His mother gave him a simple recipe book for his birthday. It had easy recipes with pictures and step-by-step instructions. David started with the easiest recipe in the book: pasta with tomato sauce. He bought the ingredients and followed the instructions carefully. The result was surprisingly good.

He made the same pasta dish every day for two weeks until he was confident. Then he tried something new: chicken with vegetables. This was more difficult because he had to use the oven and watch the temperature carefully. He burnt the chicken the first time, but the second time it was perfect.

David bought some kitchen equipment: a good knife, a large frying pan, and a baking tray. He also watched cooking videos on his phone. He learnt small but important things, like how to cut an onion without crying and how to check if a potato is ready.

After three months, David could make ten different dishes. His friends were impressed when he invited them to dinner. He spent much less money on food and felt healthier. He also discovered that he really enjoyed cooking. It was creative and relaxing after a long day at work.',
'preloaded', null,
'[{"question":"Why did David decide to learn to cook?","options":["His friends asked him to","Eating out was too expensive and unhealthy","He wanted a new hobby","His doctor told him to"],"correct_index":1},{"question":"What was the first recipe David tried?","options":["Chicken with vegetables","Pasta with tomato sauce","A birthday cake","Rice and beans"],"correct_index":1},{"question":"What happened the first time David cooked chicken?","options":["It was perfect","It was too salty","He burnt it","It was undercooked"],"correct_index":2},{"question":"How did David feel about cooking after three months?","options":["He found it boring","He gave up and ordered takeaway again","He really enjoyed it","He was still not very good"],"correct_index":2}]'::jsonb,
now()),

(gen_random_uuid(), 'The Social Media Detox', 'B2', 'technology / wellbeing',
'When Laura''s therapist suggested that she take a month-long break from social media, Laura''s initial reaction was something close to panic. She was a content creator with nearly eighty thousand followers across three platforms, and the idea of disappearing from her feeds felt professionally reckless, if not personally terrifying.

She posted a brief farewell message explaining her absence and deleted the apps from her phone. The first three days were genuinely uncomfortable. She found herself reflexively reaching for her phone during moments of idleness — waiting for the kettle to boil, sitting on the tube, eating lunch alone. The absence of that familiar scroll felt like a small but persistent itch she could not scratch.

By the end of the first week, however, something unexpected occurred. She began noticing details in her environment that had previously escaped her attention: the particular quality of autumn light in the late afternoon, the overheard fragments of conversations in coffee shops, the satisfying weight of a physical book. Her concentration improved markedly.

The social dimension was more complicated. She had assumed she would feel isolated, but instead discovered that her friendships had become more intentional. Without the passive surveillance of social media updates, she was compelled to actually contact people she cared about — a phone call, an invitation to meet.

When the month concluded and she reinstalled the apps, she felt no particular urgency to scroll. She reduced her posting frequency by half, set strict time limits, and began treating social media as a tool rather than a habitat. Her follower count, she noted with some amusement, had actually increased during her absence.',
'preloaded', null,
'[{"question":"Why did Laura initially react with panic to the suggestion?","options":["She was addicted to gaming","She felt it was professionally reckless as a content creator","She did not trust her therapist","She had important news to share"],"correct_index":1},{"question":"What did Laura notice during the first week of her detox?","options":["She lost all her followers","She became very productive immediately","She began noticing details she had previously missed","She felt completely fine without social media"],"correct_index":2},{"question":"How did the detox affect her friendships?","options":["She lost contact with most friends","Her friendships became more intentional","She made many new friends online","She became isolated and unhappy"],"correct_index":1},{"question":"What happened to her follower count during her absence?","options":["It fell dramatically","It stayed exactly the same","It actually increased","She never checked"],"correct_index":2}]'::jsonb,
now()),

(gen_random_uuid(), 'Behind the Decks at Glastonbury', 'B1', 'music / festivals',
'Nina had been DJing at small venues for five years, but nothing had prepared her for the scale of Glastonbury. The festival invited her to play a two-hour set at the Park Stage on Friday evening. When the invitation arrived by email, she read it three times before she believed it was real.

The preparation took weeks. She listened to hundreds of tracks, built dozens of potential playlists, and practised mixing for hours each day in her bedroom studio. She spoke to other DJs who had played the festival before. They all gave her the same advice: read the crowd, not the clock.

On the day of her set, the backstage area was simultaneously thrilling and overwhelming. She met artists she had admired for years, all of them relaxed in a way that only experience could produce. A security guard led her to the stage thirty minutes before she was due to start, and the sight of the crowd made her heart race.

Once she started playing, however, the anxiety dissolved. The crowd responded immediately to her opening track, and she felt the particular joy that comes from thousands of people moving together to music you have chosen. She made decisions instinctively, following the energy of the audience rather than her prepared set list.

Afterwards, backstage, she sat quietly with a cup of tea and tried to process what had just happened. A journalist asked her how it felt to play to such a large crowd. She thought for a moment before answering: it felt, she said, like conducting a conversation where everybody understood the language perfectly.',
'preloaded', null,
'[{"question":"What stage did Nina play at Glastonbury?","options":["The Pyramid Stage","The Other Stage","The Park Stage","The Jazz World Stage"],"correct_index":2},{"question":"What advice did experienced DJs give Nina?","options":["Prepare a very strict set list","Read the crowd, not the clock","Always play the most popular songs","Start slowly and build up gradually"],"correct_index":1},{"question":"How did Nina feel once she started playing?","options":["More nervous than before","The anxiety dissolved and she played instinctively","She made many technical mistakes","She regretted coming"],"correct_index":1},{"question":"How did Nina describe the experience of playing to a large crowd?","options":["Terrifying and overwhelming","Like a job interview","Like conducting a conversation everyone understood","Like playing alone in her bedroom"],"correct_index":2}]'::jsonb,
now()),

(gen_random_uuid(), 'The Emergency Fund', 'A2', 'investments / personal finance',
'Pedro was twenty-five years old and had a good job. He earned enough money to pay his rent, his food, and his bills, but at the end of every month he had almost nothing left. One day, his car broke down and the repair cost five hundred pounds. He did not have this money, so he had to borrow from his parents. He felt embarrassed and stressed.

His colleague Ana told him about emergency funds. An emergency fund is money that you save and keep safe for unexpected problems. Ana said that most financial experts recommend saving between three and six months of living expenses. Pedro thought this sounded like a lot, but Ana explained that it was possible to build it slowly.

Pedro looked at his budget. He found that he was spending money on things he did not really need, like expensive coffees every morning and subscriptions he never used. He cancelled two subscriptions and started making coffee at home. This saved him about sixty pounds every month.

He opened a separate savings account and transferred sixty pounds into it on the first day of every month. He called this account "Emergency Only" so that he would not be tempted to spend it on other things.

After eight months, he had five hundred pounds in his emergency fund. The following year, his washing machine stopped working and he needed to buy a new one. This time, he paid for it himself without any stress. He felt proud and much more secure about his financial situation.',
'preloaded', null,
'[{"question":"Why did Pedro need to borrow money from his parents?","options":["He wanted to go on holiday","His car broke down and he had no savings","He lost his job","He had to pay university fees"],"correct_index":1},{"question":"What is an emergency fund?","options":["A loan from the bank","Money saved for unexpected problems","A type of insurance policy","A government payment"],"correct_index":1},{"question":"How did Pedro save sixty pounds a month?","options":["He stopped eating at restaurants","He got a second job","He cancelled subscriptions and made coffee at home","He moved to a cheaper flat"],"correct_index":2},{"question":"How did Pedro feel when his washing machine broke down the following year?","options":["Embarrassed and stressed again","He was able to pay for it himself without stress","He had to borrow money again","He could not afford a new one"],"correct_index":1}]'::jsonb,
now()),

(gen_random_uuid(), 'Starting Over in Manchester', 'B1', 'general / life changes',
'When Clara accepted a job offer in Manchester, she had exactly three weeks to pack up her life in Madrid and move to a city she had visited only once, briefly, during a rainy November. Her Spanish friends thought she was brave. Her mother thought she was mad.

The first weeks were genuinely difficult. Manchester was greyer and quieter than Madrid, and the pace of social life felt completely different. In Spain, people went out late and stayed out later. Here, restaurants began clearing tables by half past nine. She missed the noise, the warmth, and the particular energy of a Spanish summer evening.

Finding her feet took patience. She joined a running club that met every Tuesday and Thursday morning in Heaton Park. At first, she went purely for the exercise, but she quickly realised that it was also an easy way to meet people who were already in a routine. Her running pace was mediocre, but her willingness to chat was excellent.

She also discovered that Manchester had a music scene of remarkable depth and variety. The city had a proud musical heritage — The Smiths, Oasis, Joy Division — and that legacy had created a culture that took music seriously. She began visiting small venues on weekends and found herself in conversations she had not expected to have.

Six months after arriving, Clara sat in a café near her flat and wrote her mother a long message. She described the running club, her new colleagues, and a gig she had been to the previous night. She ended the message by saying that she was not sure Manchester was quite home yet, but that she was beginning to feel, at last, that it could be.',
'preloaded', null,
'[{"question":"Why did Clara move to Manchester?","options":["She had family there","She accepted a job offer","She wanted to study","She was travelling"],"correct_index":1},{"question":"What was one thing Clara missed about Madrid?","options":["The museums","The noise, warmth, and energy of summer evenings","The food","The public transport"],"correct_index":1},{"question":"How did Clara meet people in Manchester?","options":["Through her workplace only","By joining a running club in Heaton Park","Through social media","At language exchange events"],"correct_index":1},{"question":"How did Clara describe Manchester to her mother after six months?","options":["She hated it and wanted to return","She was not sure it was home yet but felt it could be","She was completely happy","She was planning to move again"],"correct_index":1}]'::jsonb,
now());
