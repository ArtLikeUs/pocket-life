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
function _townHash(c,r){ let h=(c*73856093)^(r*19349663); h=(h^(h>>>13))>>>0; return h/4294967295; }
function _buildTownMap(){
  const W=34, H=30, m=[]; const hp=[6,13,20,26], vp=[8,16,24,30];
  for(let r=0;r<H;r++){ let row='';
    for(let c=0;c<W;c++){ let ch='.';
      if(r===0||c===0||r===H-1||c===W-1) ch='T';            // tree border
      else if(c>=3&&c<=6&&r>=22&&r<=25) ch='w';             // park pond
      else if(hp.indexOf(r)>=0||vp.indexOf(c)>=0) ch='p';   // street grid
      else { const h=_townHash(c,r); if(h>0.93) ch=','; else if(h>0.84) ch='f'; } // grass + scatter (walkable)
      row+=ch; }
    m.push(row); }
  return m;
}
const TOWN_MAP = _buildTownMap();

const BUILDINGS = [
  { id:'house',  label:'Your Home', sign:'🏠', x:2,  y:2, w:5, h:4, wall:'#c98c5a', roof:'#b3445a', door:[4,5] },
  { id:'nb1',    label:"Ava's House", sign:'🪴', x:9,  y:2, w:4, h:3, wall:'#8fa3c8', roof:'#51608a', door:[11,4] },
  { id:'nb2',    label:"Noah's House", sign:'🐱', x:14, y:2, w:4, h:3, wall:'#c8b18f', roof:'#7a6a4f', door:[16,4] },
  { id:'office', label:'Office', sign:'💼', x:20, y:2, w:4, h:4, wall:'#9aa3ad', roof:'#4b5563', door:[22,5] },
  { id:'library',label:'Town Library', sign:'📚', x:26, y:2, w:5, h:3, wall:'#b89b7a', roof:'#5e4632', door:[28,4] },
  { id:'diner',  label:'Sunny Diner', sign:'🍔', x:9,  y:8, w:5, h:3, wall:'#e0a85e', roof:'#c0563f', door:[11,10] },
  { id:'mall',   label:'Maple Mall', sign:'🛍️', x:16, y:8, w:6, h:4, wall:'#b59ad0', roof:'#6c4f93', door:[18,11] },
  { id:'cinema', label:'Starlight Cinema', sign:'🎬', x:25, y:8, w:6, h:4, wall:'#5b4a7a', roof:'#2d2348', door:[27,11] },
  { id:'gym',    label:'Flex Gym', sign:'🏋️', x:2,  y:9, w:4, h:3, wall:'#88c6a5', roof:'#3a7d5d', door:[3,11] },
  { id:'arcade', label:'Pixel Arcade', sign:'🕹️', x:26, y:14, w:5, h:3, wall:'#c84d8f', roof:'#5e2447', door:[28,16] },
  { id:'hospital', label:'Town Hospital', sign:'🏥', x:14, y:15, w:5, h:4, wall:'#e8ecf2', roof:'#d6604f', door:[16,18] },
  { id:'school',     label:'Town School', sign:'🏫', x:2,  y:15, w:5, h:4, wall:'#e6b35a', roof:'#9a4f2f', door:[4,18] },
  { id:'university', label:'Maple University', sign:'🎓', x:20, y:14, w:5, h:4, wall:'#9aa6d0', roof:'#3a3f6e', door:[22,17] },
  { id:'cafe',   label:'Cozy Cafe', sign:'☕', x:9,  y:22, w:4, h:3, wall:'#cf9b6a', roof:'#7a4a2a', door:[10,24] },
  { id:'travel', label:'Travel Agency', sign:'✈️', x:25, y:22, w:5, h:3, wall:'#7fb0d6', roof:'#34618a', door:[27,24] },
];
const TOWN_FURN = [
  {t:'fountain',c:14,r:23},
  {t:'bench',c:9,r:20},{t:'bench',c:19,r:22},{t:'bench',c:31,r:24},
  {t:'picnic',c:16,r:21},{t:'picnic',c:21,r:25},
];
const TOWN_SPAWN = [4,6];   // outside your front door
const PARKED_SPOT = [7,5];  // where your vehicle waits

/* ---------------- NPCs ---------------- */
const NPCS = [
  { id:'liam',  name:'Liam',  skin:'#e0ac69', shirt:'#e67e22', hair:'#2c1b10', style:2, anchor:[7,18],  bio:'Park regular, frisbee legend',  job:'Mechanic', jobIcon:'🔧', perk:'rideDiscount',  perkAt:50, perkDesc:'20% off vehicles at the Mall' },
  { id:'sofia', name:'Sofia', skin:'#c68642', shirt:'#e84393', hair:'#1a1a1a', style:1, anchor:[11,16], bio:'Painter who loves the fountain', job:'Stylist',  jobIcon:'💇', perk:'styleDiscount', perkAt:50, perkDesc:'20% off outfits & the salon' },
  { id:'marco', name:'Marco', skin:'#f1c27d', shirt:'#16a085', hair:'#3d2314', style:0, anchor:[13,11], bio:'Knows every diner special',      job:'Diner Chef',jobIcon:'🍳', perk:'dinerDiscount', perkAt:50, perkDesc:'30% off meals at the diner' },
  { id:'yuki',  name:'Yuki',  skin:'#ffdbac', shirt:'#8e44ad', hair:'#101820', style:1, anchor:[19,13], bio:'Mall enthusiast, great taste',   job:'Shopkeeper',jobIcon:'🛍️', perk:'mallDiscount',  perkAt:50, perkDesc:'15% off gifts & home upgrades' },
  { id:'ava',   name:'Ava',   skin:'#8d5524', shirt:'#d63031', hair:'#0d0d0d', style:1, anchor:[10,5],  bio:'Your green-thumbed neighbor',   job:'Gardener',  jobIcon:'🌱', perk:'homeDiscount',  perkAt:50, perkDesc:'free Zen Plants + cheaper decor' },
  { id:'noah',  name:'Noah',  skin:'#e0ac69', shirt:'#0984e3', hair:'#4a2f1b', style:2, anchor:[17,6],  bio:'Cat person. Big time.',         job:'Nurse',     jobIcon:'🩺', perk:'medicDiscount', perkAt:50, perkDesc:'hospital bills are halved' },
];
const ARRIVAL_NAMES = [
  { id:'rosa',  name:'Rosa',  skin:'#c68642', shirt:'#00b894', hair:'#3d2314', style:3 },
  { id:'kenji', name:'Kenji', skin:'#f1c27d', shirt:'#0984e3', hair:'#1a1a1a', style:0 },
  { id:'tariq', name:'Tariq', skin:'#8d5524', shirt:'#fdcb6e', hair:'#0d0d0d', style:2 },
  { id:'elena', name:'Elena', skin:'#ffdbac', shirt:'#e84393', hair:'#7b4a12', style:4 },
];
const MOVE_REASONS = ['for a new job 💼','to be closer to family 👪','chasing a dream 🌟','for love 💕','for a fresh start 🌱','to travel the world ✈️'];

/* ---------------- town activities ---------------- */
const CINEMA_FILMS = [
  { icon:'🍿', name:'Comedy Night',   cost:20, fun:42, social:10 },
  { icon:'👻', name:'Horror Flick',   cost:20, fun:48, social:6, energy:-6 },
  { icon:'💞', name:'Rom-Com',        cost:25, fun:40, social:16 },
  { icon:'🚀', name:'Sci-Fi Epic',    cost:30, fun:55, social:8 },
];
const ARCADE_GAMES = [
  { icon:'👾', name:'Space Blasters', cost:10, fun:26 },
  { icon:'🏎️', name:'Turbo Racer',    cost:12, fun:30 },
  { icon:'🕺', name:'Dance Off',      cost:12, fun:28, energy:-8, social:8 },
  { icon:'🎯', name:'Skee-Ball',      cost:8,  fun:22 },
];
const LIBRARY_BOOKS = [
  { icon:'📖', name:'A Good Novel',     cost:0, fun:20, energy:4 },
  { icon:'📜', name:'History Tome',     cost:0, fun:14, xp:18 },
  { icon:'🧠', name:'Self-Help Guide',  cost:0, fun:10, xp:12, social:6 },
];
const CAFE_MENU = [
  { icon:'☕', name:'Latte',        cost:8,  energy:20, fun:6,  social:6 },
  { icon:'🍰', name:'Slice of Cake',cost:14, hunger:30, fun:14 },
  { icon:'🥪', name:'Panini',       cost:18, hunger:48, fun:6,  social:6 },
  { icon:'🧋', name:'Bubble Tea',   cost:12, fun:20, social:10 },
];
const CHAT_LINES = [
  'talked about the weather ☀️','swapped diner gossip 🍔','laughed about cats 🐈',
  'debated pizza toppings 🍕','shared town news 📰','complained about Mondays 😅',
  'planned a park picnic 🧺','traded gardening tips 🌱',
];
const KIDNAMES = ['Mia','Leo','Zoe','Kai','Ivy','Max','Lily','Theo','Nia','Eli','Luna','Finn'];

/* ---------------- aging & generations ---------------- */
const AGE_PER_DAY = 2;            // in-game years gained per in-game day (tunable)
const START_AGE = 22;            // a new sim begins as a young adult
const LIFE_MIN = 72, LIFE_MAX = 94;   // natural lifespan range
const ADULT_AGE = 18, TEEN_AGE = 13, CHILD_AGE = 5, ELDER_AGE = 65;
const LIFE_STAGES = [            // [minAge, label, emoji]
  [0,'Baby','👶'], [CHILD_AGE,'Child','🧒'], [TEEN_AGE,'Teen','🧑'],
  [ADULT_AGE,'Adult','🧑‍💼'], [ELDER_AGE,'Elder','🧓'],
];
const FAMILY_SURNAMES = ['Rivers','Holloway','Vance','Sterling','Brooks','Calderon','Ashford','Nakamura','Okafor','Delgado'];
// 100-year legacy outcome flavor, chosen by how well you played
const LEGACY_DESCENDANTS = {
  great:['became mayor of the town 🏛️','founded a famous company 🏢','were celebrated artists 🎨','traveled the whole world ✈️','grew the family fortune tenfold 💎'],
  good: ['lived happy, comfortable lives 🌳','ran the beloved family business 🏪','raised big, loving families 👨‍👩‍👧‍👦','were pillars of the community 🤝'],
  okay: ['got by, one day at a time 🌤️','kept the old house standing 🏠','told stories of you for years 📖','dreamed of more, now and then 💭'],
  hard: ['struggled but stayed together 🥲','scattered to find their way 🍃','sold the old house eventually 📦','remembered the hard times 🌧️'],
};

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
  { id:'degree1',  icon:'🎓', txt:'Earn a college degree',        ev:'degree',   n:1, coin:200, xp:120, cond:'noDegree' },
  { id:'biz1',     icon:'🏢', txt:'Open your own business',       ev:'bizstart', n:1, coin:120, xp:70,  cond:'noBiz' },
  { id:'biz3',     icon:'💼', txt:'Run your business 3 times',    ev:'biz',      n:3, coin:150, xp:80,  cond:'hasBiz' },
  { id:'school1',  icon:'🏫', txt:'Send a child to school',       ev:'school',   n:1, coin:70,  xp:45,  cond:'hasSchoolKid' },
  { id:'fun3',     icon:'🎟️', txt:'Enjoy 3 town activities',       ev:'activity', n:3, coin:90,  xp:55 },
  { id:'perk1',    icon:'🎁', txt:'Unlock a friend perk (50❤)',    ev:'perkunlock', n:1, coin:160, xp:100 },
  { id:'vacay1',   icon:'✈️', txt:'Take a vacation',               ev:'vacation',  n:1, coin:120, xp:70 },
  { id:'treasure1',icon:'💎', txt:'Find 3 hidden treasures',       ev:'treasure',  n:3, coin:150, xp:90 },
  { id:'excursion1',icon:'🎟️', txt:'Book an excursion',            ev:'excursion', n:1, coin:100, xp:60 },
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
  picnic:    { name:'Picnic Table', icon:'🧺', desc:'A lovely spot for a bite outdoors.', fp:[[0,0],[1,0]] },
  // vacation landmarks & interactables
  palm:      { name:'Palm Tree',   icon:'🌴', desc:'Swaying in the breeze.', fp:[[0,0]] },
  cabana:    { name:'Cabana',      icon:'⛱️', desc:'Shade and a comfy seat.', fp:[[0,0],[1,0]] },
  lounger:   { name:'Sun Lounger', icon:'🏖️', desc:'Soak up the sun.', fp:[[0,0]] },
  tiki:      { name:'Tiki Bar',    icon:'🍹', desc:'Tropical drinks, served cold.', fp:[[0,0],[1,0]] },
  ruins:     { name:'Ancient Ruins', icon:'🏛️', desc:'Mysteries of ages past.', fp:[[0,0],[1,0],[0,1],[1,1]] },
  campfire:  { name:'Campfire',    icon:'🔥', desc:'Warm, crackling, cozy.', fp:[[0,0]] },
  treasure:  { name:'Hidden Treasure', icon:'❓', desc:'Something glints here…', fp:[[0,0]] },
  excursion: { name:'Excursion',   icon:'🎟️', desc:'Book an adventure!', fp:[[0,0]] },
  return:    { name:'Departures',  icon:'✈️', desc:'Head back home.', fp:[[0,0]] },
};

/* ---------------- vacations (Wave 5) ----------------
   Book a trip → travel to a themed, explorable map. Tap hidden treasures and
   do excursions; fly home rested. Terrain is generated per `theme` in engine. */
const VACATIONS = [
  { id:'beach', name:'Sunny Beach', icon:'🏖️', price:600, theme:'beach', cols:15, rows:15, days:2,
    desc:'Sun, sand & salty air', spawn:[7,12],
    excursions:[ {id:'snorkel', icon:'🤿', name:'Go Snorkeling', price:120, fun:42, social:12},
                 {id:'jetski',  icon:'🌊', name:'Rent a Jet Ski', price:160, fun:50, energy:-8} ],
    furn:[ {t:'palm',c:2,r:5},{t:'palm',c:12,r:6},{t:'palm',c:4,r:9},{t:'cabana',c:9,r:10},{t:'lounger',c:6,r:10},
      {t:'excursion',c:4,r:4,ex:'snorkel'},{t:'excursion',c:11,r:9,ex:'jetski'},
      {t:'treasure',c:13,r:4},{t:'treasure',c:2,r:11},{t:'treasure',c:8,r:6},
      {t:'return',c:7,r:13} ] },
  { id:'jungle', name:'Jungle Trek', icon:'🌴', price:900, theme:'jungle', cols:16, rows:16, days:3,
    desc:'Wild green & ancient ruins', spawn:[8,13],
    excursions:[ {id:'zipline', icon:'🪢', name:'Zipline Tour', price:180, fun:52, energy:-10},
                 {id:'safari',  icon:'🐘', name:'Wildlife Safari', price:200, fun:46, social:14} ],
    furn:[ {t:'ruins',c:7,r:4},{t:'campfire',c:8,r:10},{t:'palm',c:2,r:7},{t:'palm',c:13,r:8},
      {t:'excursion',c:3,r:4,ex:'zipline'},{t:'excursion',c:12,r:11,ex:'safari'},
      {t:'treasure',c:5,r:3},{t:'treasure',c:13,r:4},{t:'treasure',c:2,r:12},{t:'treasure',c:10,r:7},
      {t:'return',c:8,r:14} ] },
  { id:'resort', name:'Luxury Resort', icon:'🏝️', price:1500, theme:'resort', cols:16, rows:15, days:3,
    desc:'Poolside pampering, all-inclusive', spawn:[8,12],
    excursions:[ {id:'spa',   icon:'💆', name:'Spa Day', price:220, fun:40, energy:30},
                 {id:'sail',  icon:'⛵', name:'Sunset Sail', price:260, fun:54, social:18} ],
    furn:[ {t:'tiki',c:12,r:4},{t:'lounger',c:4,r:10},{t:'lounger',c:6,r:10},{t:'cabana',c:11,r:10},{t:'palm',c:2,r:5},
      {t:'excursion',c:3,r:4,ex:'spa'},{t:'excursion',c:13,r:11,ex:'sail'},
      {t:'treasure',c:14,r:3},{t:'treasure',c:2,r:12},{t:'treasure',c:8,r:5},
      {t:'return',c:8,r:13} ] },
  { id:'mountain', name:'Mountain Lodge', icon:'🏔️', price:1100, theme:'mountain', cols:16, rows:16, days:3,
    desc:'Crisp air & cozy fires', spawn:[8,13],
    excursions:[ {id:'ski',   icon:'🎿', name:'Hit the Slopes', price:190, fun:50, energy:-12},
                 {id:'hot',   icon:'♨️', name:'Hot Springs', price:170, fun:38, energy:26} ],
    furn:[ {t:'cabana',c:8,r:10},{t:'campfire',c:6,r:11},{t:'palm',c:2,r:6},{t:'palm',c:13,r:7},
      {t:'excursion',c:3,r:5,ex:'ski'},{t:'excursion',c:12,r:11,ex:'hot'},
      {t:'treasure',c:5,r:3},{t:'treasure',c:13,r:4},{t:'treasure',c:3,r:12},{t:'treasure',c:11,r:6},
      {t:'return',c:8,r:14} ] },
];
const TREASURE_LOOT = [   // a hidden treasure gives one of these
  {icon:'💰', name:'buried coins', coins:180, xp:20},
  {icon:'💎', name:'a hidden gem', coins:320, xp:30},
  {icon:'🐚', name:'a rare shell', coins:90,  xp:14, fun:8},
  {icon:'🗺️', name:'an old map piece', coins:140, xp:24},
  {icon:'🎁', name:'a lost souvenir', coins:60, xp:12, gift:'flowers'},
];

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

/* ---------------- college ---------------- */
const COLLEGE = {
  enroll:800, classes:4, payBonus:0.2,
  desc:'Enroll, attend 4 classes, and earn a degree.',
  perk:'Degree: careers pay +20% and shifts cost 30% less energy.',
};

/* ---------------- businesses (the entrepreneur path) ----------------
   Harder than a job: variable income (can be a loss early), needs startup
   capital, and you invest to raise the level/ceiling. Cool gigs swing wild
   with a chance of a viral breakthrough; the Famous Singer is the hardest. */
const BUSINESSES = [
  // blue-collar — steadier
  { id:'daycare',  icon:'🧸', name:'Sunny Daycare',      cat:'blue', base:150, swing:0.30, invest:400,  levelCost:300, desc:'Steady, wholesome income' },
  { id:'diner',    icon:'🍔', name:"Mom's Diner",        cat:'blue', base:185, swing:0.35, invest:650,  levelCost:420, desc:'Honest food, honest money' },
  { id:'printing', icon:'🖨️', name:'QuickPrint Shop',    cat:'blue', base:210, swing:0.38, invest:750,  levelCost:480, desc:'Flyers, posters, profit' },
  { id:'construction', icon:'🏗️', name:'BuildRight Co.', cat:'blue', base:270, swing:0.45, invest:1300, levelCost:760, desc:'Big jobs, big swings' },
  // cool — high ceiling, high risk, viral breakthroughs
  { id:'influencer', icon:'📱', name:'Influencer',          cat:'cool', base:160, swing:0.80, invest:500,  levelCost:520, desc:'Go viral… or go quiet' },
  { id:'photog',     icon:'📸', name:'Celebrity Photographer', cat:'cool', base:230, swing:0.62, invest:900, levelCost:640, desc:'One perfect shot pays huge' },
  { id:'actor',      icon:'🎬', name:'Movie Star',           cat:'cool', base:290, swing:0.72, invest:1600, levelCost:980, desc:'Flops and blockbusters' },
  { id:'singer',     icon:'🎤', name:'Famous Singer',        cat:'cool', base:120, swing:0.95, invest:900,  levelCost:900, desc:'The hardest dream of all', hardest:true },
];
const BIZ_BREAKTHROUGH = 0.09;  // chance a cool-biz run goes viral

/* ---------------- school (for the kids) ---------------- */
const SCHOOL = { grades:5, desc:'Kids attend until they graduate, just like a job.' };

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
