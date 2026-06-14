"use strict";
/* ================= Pocket Life v2 — world data ================= */

const T = 34;                 // tile px
const VIEW_COLS = 12, VIEW_ROWS = 14;   // camera viewport in tiles

const SKINS  = ['#8d5524','#c68642','#e0ac69','#f1c27d','#ffdbac'];
const SHIRTS = ['#e74c3c','#3498db','#2ecc71','#9b59b6','#f39c12','#16a085','#e84393','#2d3436'];
const HAIRC  = ['#1a1a1a','#3b2b20','#7b4a12','#b8860b','#d63031','#6c5ce7','#e84393','#fab1a0'];
const HAIRSTYLES = ['Short','Long','Spiky','Bob','Ponytail','Buns','Bald'];
const GENDERS = [
  { id:'f', label:'Woman',     icon:'♀' },
  { id:'m', label:'Man',       icon:'♂' },
  { id:'nb', label:'Nonbinary', icon:'⚧' },
];

/* ---------------- homes ----------------
   map legend: '#' wall, '.' floor
   furn: {t:type, c, r}
   rooms: floor palettes {x,y,w,h, floor, wallpaper}                      */
const HOME_TIERS = [
{
  id:0, name:'Cozy Studio', icon:'🏠', price:0,
  desc:'A snug starter home.',
  map:[
    "############",
    "#....#.....#",
    "#....#.....#",
    "#....#.....#",
    "#....#.....#",
    "##.#####.###",
    "#....#.....#",
    "#..........#",
    "#....#.....#",
    "##.#####.###",
    "#..........#",
    "#..........#",
    "#..........#",
    "#####..#####",
  ],
  rooms:[
    {x:1,y:1,w:4,h:4, floor:'#c9b3dd', wp:'#9b7fc0'},   // bedroom
    {x:6,y:1,w:5,h:4, floor:'#a8d4e2', wp:'#6fa7bd'},   // bath
    {x:1,y:6,w:4,h:3, floor:'#eedaa6', wp:'#c2a268'},   // kitchen
    {x:6,y:6,w:5,h:3, floor:'#bcd9c0', wp:'#7fae8a'},   // study
    {x:1,y:10,w:10,h:3, floor:'#e2c2a4', wp:'#b08968'}, // living
  ],
  furn:[
    {t:'bed2',c:1,r:1},{t:'nightstand',c:4,r:1},
    {t:'shower',c:6,r:1},{t:'sink',c:8,r:1},{t:'toilet',c:10,r:1},
    {t:'fridge',c:1,r:6},{t:'stove',c:3,r:6},{t:'counter',c:4,r:6},
    {t:'bookshelf',c:6,r:6},{t:'computer',c:9,r:6},
    {t:'lamp',c:1,r:10},{t:'tv2',c:3,r:10},{t:'sofa2',c:3,r:12},
    {t:'phone',c:10,r:11},{t:'plant',c:1,r:12},
  ],
  exit:[[5,13],[6,13]], spawn:[5,12],
  partnerZone:{x:6,y:10,w:4,h:3}, kidZone:{x:6,y:10,w:4,h:3},
},
{
  id:1, name:'Family House', icon:'🏡', price:2500,
  desc:'Two bedrooms — room for kids!',
  map:[
    "################",
    "#......#.......#",
    "#......#.......#",
    "#......#.......#",
    "#......#.......#",
    "###.######.#####",
    "#......#.......#",
    "#......#.......#",
    "#......#.......#",
    "###.#####.######",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#######..#######",
  ],
  rooms:[
    {x:1,y:1,w:6,h:4, floor:'#c9b3dd', wp:'#9b7fc0'},    // master
    {x:8,y:1,w:7,h:4, floor:'#a8d4e2', wp:'#6fa7bd'},    // bath
    {x:1,y:6,w:6,h:3, floor:'#f3cdd6', wp:'#cf93a4'},    // kids
    {x:8,y:6,w:7,h:3, floor:'#eedaa6', wp:'#c2a268'},    // kitchen
    {x:1,y:10,w:14,h:4, floor:'#e2c2a4', wp:'#b08968'},  // living
  ],
  furn:[
    {t:'bed2',c:1,r:1},{t:'nightstand',c:3,r:1},{t:'dresser',c:5,r:1},{t:'plant',c:6,r:4},
    {t:'shower',c:8,r:1},{t:'tub',c:10,r:1},{t:'sink',c:13,r:1},{t:'toilet',c:14,r:1},
    {t:'crib',c:1,r:6},{t:'kidbed',c:4,r:6},{t:'toybox',c:1,r:8},{t:'bookshelf1',c:6,r:6},
    {t:'fridge',c:8,r:6},{t:'stove',c:9,r:6},{t:'counter',c:11,r:6},{t:'counter',c:12,r:6},{t:'table2',c:13,r:7},
    {t:'lamp',c:1,r:10},{t:'tv3',c:4,r:10},{t:'sofa3',c:4,r:12},
    {t:'computer',c:12,r:10},{t:'phone',c:13,r:12},{t:'plant',c:1,r:13},{t:'plant',c:14,r:10},
  ],
  exit:[[7,14],[8,14]], spawn:[7,13],
  partnerZone:{x:9,y:10,w:5,h:4}, kidZone:{x:1,y:6,w:6,h:3},
},
{
  id:2, name:'Grand Villa', icon:'🏰', price:8000,
  desc:'Luxury living: gym corner, tub & espresso bar.',
  map:[
    "####################",
    "#........#.........#",
    "#........#.........#",
    "#........#.........#",
    "#........#.........#",
    "####.#######.#######",
    "#........#.........#",
    "#........#.........#",
    "#........#.........#",
    "###.#########.######",
    "#..................#",
    "#..................#",
    "#..................#",
    "#..................#",
    "#..................#",
    "#########..#########",
  ],
  rooms:[
    {x:1,y:1,w:8,h:4, floor:'#c9b3dd', wp:'#9b7fc0'},
    {x:10,y:1,w:9,h:4, floor:'#a8d4e2', wp:'#6fa7bd'},
    {x:1,y:6,w:8,h:3, floor:'#f3cdd6', wp:'#cf93a4'},
    {x:10,y:6,w:9,h:3, floor:'#eedaa6', wp:'#c2a268'},
    {x:1,y:10,w:18,h:5, floor:'#e2c2a4', wp:'#b08968'},
  ],
  furn:[
    {t:'bed2',c:1,r:1},{t:'nightstand',c:3,r:1},{t:'dresser',c:5,r:1},{t:'lamp',c:8,r:1},{t:'plant',c:8,r:4},
    {t:'tub',c:10,r:1},{t:'sink',c:14,r:1},{t:'shower',c:16,r:1},{t:'toilet',c:18,r:1},
    {t:'crib',c:1,r:6},{t:'kidbed',c:3,r:6},{t:'kidbed',c:5,r:6},{t:'toybox',c:1,r:8},{t:'bookshelf1',c:8,r:6},
    {t:'fridge',c:10,r:6},{t:'stove',c:11,r:6},{t:'counter',c:13,r:6},{t:'espresso',c:14,r:6},{t:'table2',c:16,r:6},
    {t:'treadmill',c:1,r:10},{t:'bookshelf1',c:1,r:13},
    {t:'tv3',c:6,r:10},{t:'sofa3',c:6,r:12},
    {t:'computer',c:15,r:10},{t:'lamp',c:18,r:10},{t:'phone',c:18,r:12},{t:'plant',c:1,r:14},{t:'plant',c:18,r:14},
  ],
  exit:[[9,15],[10,15]], spawn:[9,14],
  partnerZone:{x:10,y:11,w:7,h:4}, kidZone:{x:1,y:6,w:8,h:3},
},
];

/* ---------------- town ----------------
   legend: T tree, . grass, , tall grass, p path, f flowers, w water     */
const TOWN_MAP = [
"TTTTTTTTTTTTTTTTTTTTTTTTTT",
"T,......................fT",
"T........................T",
"T........................T",
"T........................T",
"T..........p....p........T",
"T...p......p....p.....p..T",
"T.pppppppppppppppppppppp.T",
"T...f......p......,......T",
"T..........p.............T",
"T..........p.............T",
"T..........p.............T",
"T..p.......p......p......T",
"T.pppppppppppppppppppppp.T",
"T..f..............,...f..T",
"T........................T",
"T........................T",
"T..www...................T",
"T..www.........,,........T",
"T..www...................T",
"T...f.......f.......f....T",
"T,...............,.......T",
"T....,.........f.........T",
"TTTTTTTTTTTTTTTTTTTTTTTTTT",
"TTTTTTTTTTTTTTTTTTTTTTTTTT",
];

const BUILDINGS = [
  { id:'house',  label:'Your Home', sign:'🏠', x:2,  y:2, w:5, h:4, wall:'#c98c5a', roof:'#b3445a', door:[4,5] },
  { id:'nb1',    label:"Ava's House", sign:'🪴', x:9,  y:2, w:4, h:3, wall:'#8fa3c8', roof:'#51608a', door:[11,4] },
  { id:'nb2',    label:"Noah's House", sign:'🐱', x:14, y:2, w:4, h:3, wall:'#c8b18f', roof:'#7a6a4f', door:[16,4] },
  { id:'office', label:'Office', sign:'💼', x:20, y:2, w:4, h:4, wall:'#9aa3ad', roof:'#4b5563', door:[22,5] },
  { id:'diner',  label:'Sunny Diner', sign:'🍔', x:9,  y:8, w:5, h:3, wall:'#e0a85e', roof:'#c0563f', door:[11,10] },
  { id:'mall',   label:'Maple Mall', sign:'🛍️', x:16, y:8, w:6, h:4, wall:'#b59ad0', roof:'#6c4f93', door:[18,11] },
  { id:'gym',    label:'Flex Gym', sign:'🏋️', x:2,  y:9, w:4, h:3, wall:'#88c6a5', roof:'#3a7d5d', door:[3,11] },
  { id:'hospital', label:'Town Hospital', sign:'🏥', x:14, y:15, w:5, h:4, wall:'#e8ecf2', roof:'#d6604f', door:[16,18] },
];
const TOWN_FURN = [
  {t:'bench',c:6,r:16},{t:'bench',c:11,r:18},{t:'bench',c:20,r:16},
  {t:'fountain',c:8,r:15},
];
const TOWN_SPAWN = [4,6];   // outside your front door
const PARKED_SPOT = [7,5];  // where your vehicle waits

/* ---------------- NPCs ---------------- */
const NPCS = [
  { id:'liam',  name:'Liam',  skin:'#e0ac69', shirt:'#e67e22', hair:'#2c1b10', style:2, anchor:[7,18],  bio:'Park regular, frisbee legend' },
  { id:'sofia', name:'Sofia', skin:'#c68642', shirt:'#e84393', hair:'#1a1a1a', style:1, anchor:[11,16], bio:'Painter who loves the fountain' },
  { id:'marco', name:'Marco', skin:'#f1c27d', shirt:'#16a085', hair:'#3d2314', style:0, anchor:[13,11], bio:'Knows every diner special' },
  { id:'yuki',  name:'Yuki',  skin:'#ffdbac', shirt:'#8e44ad', hair:'#101820', style:1, anchor:[19,13], bio:'Mall enthusiast, great taste' },
  { id:'ava',   name:'Ava',   skin:'#8d5524', shirt:'#d63031', hair:'#0d0d0d', style:1, anchor:[10,5],  bio:'Your green-thumbed neighbor' },
  { id:'noah',  name:'Noah',  skin:'#e0ac69', shirt:'#0984e3', hair:'#4a2f1b', style:2, anchor:[17,6],  bio:'Cat person. Big time.' },
];
const CHAT_LINES = [
  'talked about the weather ☀️','swapped diner gossip 🍔','laughed about cats 🐈',
  'debated pizza toppings 🍕','shared town news 📰','complained about Mondays 😅',
  'planned a park picnic 🧺','traded gardening tips 🌱',
];
const KIDNAMES = ['Mia','Leo','Zoe','Kai','Ivy','Max','Lily','Theo'];

/* ---------------- food menus ---------------- */
const FOODS_HOME = [
  { id:'snack',  icon:'🍎', name:'Snack',        cost:0,  hunger:12, fun:0,  dur:8  },
  { id:'left',   icon:'🥡', name:'Leftovers',    cost:5,  hunger:26, fun:0,  dur:15 },
  { id:'salad',  icon:'🥗', name:'Fresh Salad',  cost:12, hunger:38, fun:2,  dur:20 },
  { id:'pasta',  icon:'🍝', name:'Pasta Night',  cost:20, hunger:52, fun:5,  dur:25 },
  { id:'pizza',  icon:'🍕', name:'Homemade Pizza', cost:30, hunger:64, fun:8, dur:30 },
  { id:'sushi',  icon:'🍣', name:'Sushi Feast',  cost:55, hunger:88, fun:12, dur:35 },
];
const FOODS_DINER = [
  { id:'coffee', icon:'☕', name:'Coffee',       cost:8,  hunger:4,  fun:2,  energy:18, social:0,  dur:6  },
  { id:'burger', icon:'🍔', name:'Sunny Burger', cost:25, hunger:55, fun:8,  energy:0,  social:5,  dur:20 },
  { id:'ramen',  icon:'🍜', name:'Miso Ramen',   cost:35, hunger:70, fun:10, energy:0,  social:8,  dur:25 },
  { id:'lobster',icon:'🦞', name:'Fancy Feast',  cost:80, hunger:95, fun:18, energy:0,  social:15, dur:35 },
];

/* ---------------- shopping ---------------- */
const VEHICLES = [
  { id:'bike', icon:'🚲', name:'Bike',      price:300,  speed:1.6, commute:30, desc:'Zip around town 60% faster' },
  { id:'car',  icon:'🚗', name:'Car',       price:1500, speed:2.2, commute:10, desc:'Cruise in comfort, short commute' },
  { id:'limo', icon:'🚘', name:'Limousine', price:5000, speed:2.6, commute:0,  desc:'Chauffeured. +10% work pay' },
];
const GIFTS = [
  { id:'flowers', icon:'💐', name:'Flowers',   price:15,  rel:10, desc:'A lovely little bouquet' },
  { id:'choc',    icon:'🍫', name:'Chocolate', price:35,  rel:18, desc:'Sweets for the sweet' },
  { id:'ring',    icon:'💍', name:'Ring',      price:600, rel:0,  desc:'Pop the question (needs 75❤)' },
];

/* ---------------- quests ---------------- */
const QUEST_POOL = [
  { id:'eat3',     icon:'🍽️', txt:'Eat 3 meals',               ev:'eat',      n:3, coin:60,  xp:40 },
  { id:'wash1',    icon:'🚿', txt:'Freshen up',                 ev:'clean',    n:1, coin:40,  xp:25 },
  { id:'work1',    icon:'💼', txt:'Work a shift',               ev:'work',     n:1, coin:90,  xp:50 },
  { id:'tv1',      icon:'📺', txt:'Watch some TV',              ev:'tv',       n:1, coin:40,  xp:25 },
  { id:'chat2',    icon:'💬', txt:'Chat with 2 townsfolk',      ev:'social',   n:2, coin:60,  xp:35 },
  { id:'gift1',    icon:'🎁', txt:'Give someone a gift',        ev:'gift',     n:1, coin:70,  xp:40 },
  { id:'gig1',     icon:'💻', txt:'Finish a computer gig',      ev:'gig',      n:1, coin:60,  xp:35 },
  { id:'sleep1',   icon:'😴', txt:"Get a night's sleep",        ev:'sleep',    n:1, coin:50,  xp:30 },
  { id:'fount1',   icon:'⛲', txt:'Toss a coin in the fountain',ev:'fountain', n:1, coin:30,  xp:20 },
  { id:'gym1',     icon:'🏋️', txt:'Get a workout in',           ev:'fit',      n:1, coin:50,  xp:30 },
  { id:'coffee1',  icon:'☕', txt:'Grab a coffee or espresso',  ev:'coffee',   n:1, coin:35,  xp:20 },
  { id:'friend40', icon:'🤝', txt:'Make a good friend (40❤)',   ev:'rel40',    n:1, coin:100, xp:60 },
  { id:'partner1', icon:'💞', txt:'Find a partner',             ev:'partner',  n:1, coin:150, xp:80, cond:'noPartner' },
  { id:'kid1',     icon:'🧸', txt:'Play with your child',       ev:'kidplay',  n:1, coin:80,  xp:50, cond:'hasKid' },
  { id:'ride1',    icon:'🚲', txt:'Own a ride',                 ev:'vehicle',  n:1, coin:80,  xp:50, cond:'noVehicle' },
  { id:'career1',  icon:'📋', txt:'Pick a career at the Office',ev:'career',   n:1, coin:80,  xp:40, cond:'noCareer' },
  { id:'style1',   icon:'👕', txt:'Buy a new outfit',           ev:'outfit',   n:1, coin:60,  xp:35, cond:'noOutfit' },
  { id:'woo1',     icon:'🌹', txt:'Quality time with your partner', ev:'woohoo', n:1, coin:80, xp:50, cond:'hasPartner' },
];

/* ---------------- furniture footprints & meta ---------------- */
const OBJTYPES = {
  bed2:      { name:'Double Bed',  icon:'🛏️', desc:'Soft pillows, warm blanket.', fp:[[0,0],[1,0],[0,1],[1,1]] },
  kidbed:    { name:'Kid Bed',     icon:'🛌', desc:'Race-car dreams happen here.', fp:[[0,0],[0,1]] },
  crib:      { name:'Crib',        icon:'👶', desc:'Tiny bed for a tiny person.', fp:[[0,0]] },
  toilet:    { name:'Toilet',      icon:'🚽', desc:'The porcelain throne.', fp:[[0,0]] },
  shower:    { name:'Shower',      icon:'🚿', desc:'Steamy and refreshing.', fp:[[0,0]] },
  tub:       { name:'Bathtub',     icon:'🛁', desc:'Bubbles optional. (Recommended.)', fp:[[0,0],[1,0]] },
  sink:      { name:'Sink',        icon:'🫧', desc:'Splash splash.', fp:[[0,0]] },
  fridge:    { name:'Fridge',      icon:'🧊', desc:'Stocked with possibilities.', fp:[[0,0]] },
  stove:     { name:'Stove',       icon:'🍳', desc:'Where the magic happens.', fp:[[0,0]] },
  counter:   { name:'Counter',     icon:'🔪', desc:'Chop chop.', fp:[[0,0]] },
  espresso:  { name:'Espresso Bar',icon:'☕', desc:'Liquid motivation, 5💰 a shot.', fp:[[0,0]] },
  table2:    { name:'Dining Table',icon:'🍽️', desc:'Family meals happen here.', fp:[[0,0],[1,0],[0,1],[1,1]] },
  tv2:       { name:'TV',          icon:'📺', desc:'120 channels of fun.', fp:[[0,0],[1,0]] },
  tv3:       { name:'Cinema TV',   icon:'📺', desc:'Big screen, big feelings.', fp:[[0,0],[1,0],[2,0]] },
  sofa2:     { name:'Sofa',        icon:'🛋️', desc:'Prime lounging real estate.', fp:[[0,0],[1,0]] },
  sofa3:     { name:'Grand Sofa',  icon:'🛋️', desc:'Seats the whole family.', fp:[[0,0],[1,0],[2,0]] },
  computer:  { name:'Computer',    icon:'💻', desc:'Browse, chat, or earn.', fp:[[0,0],[1,0]] },
  phone:     { name:'Phone',       icon:'📞', desc:'Ring ring.', fp:[[0,0]] },
  bookshelf: { name:'Bookshelf',   icon:'📚', desc:'Stories and snoozers.', fp:[[0,0],[1,0]] },
  bookshelf1:{ name:'Bookshelf',   icon:'📚', desc:'Stories and snoozers.', fp:[[0,0]] },
  toybox:    { name:'Toy Box',     icon:'🧸', desc:'Chaos in a box.', fp:[[0,0]] },
  treadmill: { name:'Treadmill',   icon:'🏃', desc:'Run to nowhere, gloriously.', fp:[[0,0],[0,1]] },
  plant:     { name:'Plant',       icon:'🪴', desc:'Photosynthesizing happily.', fp:[[0,0]] },
  lamp:      { name:'Lamp',        icon:'💡', desc:'Mood lighting.', fp:[[0,0]] },
  dresser:   { name:'Dresser',     icon:'🗄️', desc:'Sock central.', fp:[[0,0]] },
  nightstand:{ name:'Nightstand',  icon:'🛋️', desc:'Holds the lamp. Heroic.', fp:[[0,0]] },
  bench:     { name:'Park Bench',  icon:'🪑', desc:'Best people-watching seat.', fp:[[0,0],[1,0]] },
  fountain:  { name:'Fountain',    icon:'⛲', desc:'Make a wish — 1💰 a toss.', fp:[[0,0],[1,0],[0,1],[1,1]] },
};

/* needs config */
const NEEDS = [
  { k:'hunger',  ic:'🍗', lbl:'Food',    decay:3.4 },
  { k:'energy',  ic:'⚡', lbl:'Energy',  decay:2.2 },
  { k:'hygiene', ic:'🛁', lbl:'Hygiene', decay:2.0 },
  { k:'bladder', ic:'🚽', lbl:'Bladder', decay:4.5 },
  { k:'fun',     ic:'🎉', lbl:'Fun',     decay:3.6 },
  { k:'social',  ic:'💬', lbl:'Social',  decay:2.8 },
];
const JOBS = ['Intern','Barista','Designer','Manager','Director','CEO']; // legacy (v2 saves)

/* ---------------- careers ----------------
   each career changes how the rest of the game plays                     */
const RANKS = ['Trainee','Junior','Senior','Lead','Legend'];
const CAREERS = [
  { id:'barista', icon:'☕', name:'Barista',    pay:170, perk:'Coffee & espresso give 2× energy',       games:['pour','rush'] },
  { id:'chef',    icon:'🍳', name:'Chef',       pay:200, perk:'Home meals are +30% tastier',            games:['plate','recipe'] },
  { id:'trainer', icon:'🏋️', name:'Trainer',    pay:190, perk:'Workouts: 2× fun & XP, energy drains slower', games:['reps','form'] },
  { id:'techie',  icon:'💻', name:'Programmer', pay:240, perk:'Computer gigs pay 2×',                   games:['debug','ship'] },
  { id:'artist',  icon:'🎨', name:'Artist',     pay:160, perk:'Fun drains 30% slower · +25% XP',        games:['stroke','palette'] },
  { id:'doctor',  icon:'🩺', name:'Doctor',     pay:280, perk:'All needs drain 15% slower',             games:['diagnose','steady'] },
];

/* ---------------- clothing store ---------------- */
const OUTFITS = [
  { id:'sunny',  icon:'🌼', name:'Sunny Tee',    col:'#fdcb6e', price:120, perk:'Pure sunshine' },
  { id:'mint',   icon:'🍃', name:'Mint Polo',    col:'#55efc4', price:120, perk:'Fresh look' },
  { id:'hoodie', icon:'🧥', name:'Cozy Hoodie',  col:'#6c5ce7', price:250, perk:'Fun drains 10% slower' },
  { id:'sporty', icon:'🎽', name:'Track Kit',    col:'#00b894', price:280, perk:'Walk 15% faster' },
  { id:'dress',  icon:'👗', name:'Sunset Dress', col:'#ff7675', price:300, perk:'+2❤ from socializing', dress:true },
  { id:'suit',   icon:'🤵', name:'Sharp Suit',   col:'#2d3436', price:400, perk:'+5% work pay' },
  // feminine / dressy options
  { id:'blouse', icon:'👚', name:'Silk Blouse',   col:'#ff9ff3', price:150, perk:'+1❤ from socializing' },
  { id:'skirt',  icon:'🩱', name:'A-Line Skirt',  col:'#a29bfe', price:180, perk:'Walk 10% faster', dress:true },
  { id:'floral', icon:'🌸', name:'Floral Dress',  col:'#fd79a8', price:320, perk:'Fun drains 12% slower', dress:true },
  { id:'romper', icon:'🩳', name:'Summer Romper', col:'#fab1a0', price:200, perk:'Walk 5% faster' },
  { id:'gown',   icon:'👰', name:'Evening Gown',  col:'#e84393', price:520, perk:'+8% work pay & +2❤', dress:true },
];
const SALON_HAIR_PRICE = 50, SALON_STYLE_PRICE = 75;

/* ---------------- job mini-games ---------------- */
/* type: 'timing' (stop a sweeping marker in the zone, best of 3),
         'mash'   (tap fast to fill a meter before time runs out),
         'sequence' (repeat a shown pattern)                          */
const MINIGAMES = {
  pour:     { name:'Perfect Pour',     icon:'☕', type:'timing',   tip:'Tap when the marker hits the green!' },
  rush:     { name:'Rush Hour',        icon:'🏃', type:'mash',     tip:'Tap fast to fill every order!' },
  plate:    { name:'Plate It',         icon:'🍽️', type:'timing',   tip:'Stop the marker in the green to plate it!' },
  recipe:   { name:'Follow the Recipe',icon:'📖', type:'sequence', tip:'Repeat the recipe steps in order!' },
  reps:     { name:'Pump the Reps',    icon:'💪', type:'mash',     tip:'Tap fast to crush your set!' },
  form:     { name:'Perfect Form',     icon:'🧘', type:'timing',   tip:'Time it right for perfect form!' },
  debug:    { name:'Squash the Bugs',  icon:'🐛', type:'sequence', tip:'Repeat the pattern to fix the code!' },
  ship:     { name:'Ship On Time',     icon:'🚀', type:'timing',   tip:'Hit the green to ship it!' },
  stroke:   { name:'The Brushstroke',  icon:'🖌️', type:'timing',   tip:'Land the stroke in the green!' },
  palette:  { name:'Match the Palette',icon:'🎨', type:'sequence', tip:'Repeat the color order!' },
  diagnose: { name:'Diagnose',         icon:'🩺', type:'sequence', tip:'Recall the symptoms in order!' },
  steady:   { name:'Steady Hands',     icon:'🤲', type:'timing',   tip:'Hold steady — stop in the green!' },
};

/* ---------------- stimulants (energy for happiness) ---------------- */
const STIMULANTS = [
  { id:'coffee', icon:'☕', name:'Coffee To-Go', price:10,  energy:25, fun:-5,  desc:'Quick pick-me-up' },
  { id:'edrink', icon:'🥤', name:'Energy Drink', price:25,  energy:45, fun:-12, desc:'Wings, basically' },
  { id:'focus',  icon:'💊', name:'Focus Pills',  price:55,  energy:70, fun:-22, social:-8, desc:'Grind now, crash later' },
  { id:'allnt',  icon:'🌙', name:'All-Nighter',  price:90,  energy:95, fun:-30, social:-12, desc:'Sleep is for the weak' },
];

/* ---------------- tiered home upgrades ---------------- */
const HOME_UPGRADES = [
  { id:'bed', icon:'🛏️', name:'Bed', tiers:[
    { name:'Standard Bed',    desc:'A fine place to flop' },
    { name:'King Bed',        desc:'Sleep 50% faster', price:450 },
    { name:'Royal Cloud Bed', desc:'Sleep 2× faster — dreamy', price:1200 } ]},
  { id:'tv', icon:'📺', name:'TV', tiers:[
    { name:'Standard TV', desc:'+28 fun' },
    { name:'Cinema TV',   desc:'+44 fun', price:400 },
    { name:'Home Theater',desc:'+62 fun, shorter sessions', price:1100 } ]},
  { id:'kitchen', icon:'🍳', name:'Kitchen', tiers:[
    { name:'Standard Kitchen', desc:'Meals as listed' },
    { name:'Chef Kitchen',     desc:'Home meals +25% tastier', price:350 },
    { name:'Gourmet Kitchen',  desc:'+50% tastier & 20% cheaper', price:1000 } ]},
  { id:'decor', icon:'🪴', name:'Decor', tiers:[
    { name:'Bare Walls',     desc:'Minimalism… or is it?' },
    { name:'Zen Plants',     desc:'Fun & social drain 25% slower', price:250 },
    { name:'Art Collection', desc:'Drain 35% slower, very chic', price:900 } ]},
  { id:'bath', icon:'🚿', name:'Bathroom', tiers:[
    { name:'Standard Bath', desc:'Gets the job done' },
    { name:'Spa Shower',    desc:'Washing also gives +fun', price:300 },
    { name:'Rain Spa',      desc:'Max hygiene & big +fun', price:850 } ]},
];
