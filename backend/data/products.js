// Zippo Multi-Category Super App Products Catalogue
// Categories: cut_veggies, grocery, cakes, water, flowers, electricals
const products = [
  // 1. Fresh Cut Vegetables
  {
    id: 'onion-tomato-mix',
    name: 'Onion & Tomato Chop Mix',
    tamilName: 'வெங்காயம் தக்காளி',
    category: 'cut_veggies',
    unit: '500 g pack',
    price: 45,
    description: 'Diced onion and tomato, kitchen-ready in the exact ratio most gravies start with.'
  },
  {
    id: 'sambar-mix',
    name: 'Sambar Vegetable Mix',
    tamilName: 'சாம்பார் காய்கறி',
    category: 'cut_veggies',
    unit: '750 g pack',
    price: 79,
    description: 'Drumstick, brinjal, pumpkin and okra, cut to sambar size — no cutting board needed.'
  },
  {
    id: 'salad-mix',
    name: 'Everyday Salad Mix',
    tamilName: 'சாலட் கலவை',
    category: 'cut_veggies',
    unit: '400 g pack',
    price: 55,
    description: 'Cucumber, carrot and beetroot, julienned and ready to toss with lemon and salt.'
  },
  {
    id: 'greens-mix',
    name: 'Cleaned Greens Bundle',
    tamilName: 'கீரை',
    category: 'cut_veggies',
    unit: '300 g pack',
    price: 39,
    description: 'Keerai washed three times and finely chopped, ready for direct cooking.'
  },
  {
    id: 'poriyal-mix',
    name: 'Poriyal Vegetable Mix',
    tamilName: 'பொரியல் காய்கறி',
    category: 'cut_veggies',
    unit: '600 g pack',
    price: 65,
    description: 'Beans, carrot and cabbage, diced fine and even, straight into the kadai.'
  },
  {
    id: 'bulk-hotel-mix',
    name: 'Bulk Kitchen Pack',
    tamilName: 'ஹோட்டல் தேவை',
    category: 'cut_veggies',
    unit: '5 kg pack',
    price: 420,
    description: 'For mess kitchens and small hotels — mixed vegetables cut to your standing order.'
  },

  // 2. Groceries & Essentials
  {
    id: 'aashirvaad-atta',
    name: 'Aashirvaad Shudh Chakki Atta',
    tamilName: 'கோதுமை மாவு',
    category: 'grocery',
    unit: '5 kg pack',
    price: 230,
    description: '100% whole wheat flour with dietary fiber, soft rotis every time.'
  },
  {
    id: 'ponni-rice',
    name: 'Premium Ponni Boiled Rice',
    tamilName: 'பொன்னி அரிசி',
    category: 'grocery',
    unit: '5 kg bag',
    price: 340,
    description: 'Aged premium Ponni rice, fluffy and aromatic for everyday South Indian lunch.'
  },
  {
    id: 'arokya-milk',
    name: 'Fresh Toned Milk',
    tamilName: 'பசும்பால்',
    category: 'grocery',
    unit: '500 ml packet',
    price: 27,
    description: 'Farm fresh pasteurized toned milk, chilled and delivered fresh daily.'
  },
  {
    id: 'farm-eggs-6',
    name: 'Farm Fresh White Eggs (6 pcs)',
    tamilName: 'முட்டை 6',
    category: 'grocery',
    unit: '6 pcs pack',
    price: 42,
    description: 'Grade A hygienic farm eggs, high protein everyday breakfast essential.'
  },
  {
    id: 'gold-winner-oil',
    name: 'Refined Sunflower Oil',
    tamilName: 'சூரியகாந்தி எண்ணெய்',
    category: 'grocery',
    unit: '1 L pouch',
    price: 135,
    description: 'Fortified with Vitamin A & D for light and healthy everyday cooking.'
  },
  {
    id: 'toor-dal-1kg',
    name: 'Premium Toor Dal',
    tamilName: 'துவரம் பருப்பு',
    category: 'grocery',
    unit: '1 kg pack',
    price: 165,
    description: 'Protein rich, unpolished toor dal for rich, aromatic sambar and rasam.'
  },

  // 3. Fresh Cakes & Bakery
  {
    id: 'choco-truffle-cake',
    name: 'Dutch Chocolate Truffle Cake',
    tamilName: 'சாக்லேட் ட்ரஃபிள் கேக்',
    category: 'cakes',
    unit: '500 g cake',
    price: 450,
    description: 'Rich Belgian dark chocolate ganache layered on moist chocolate sponge.'
  },
  {
    id: 'black-forest-cake',
    name: 'Classic Black Forest Cake',
    tamilName: 'பிளாக் ஃபாரஸ்ட் கேக்',
    category: 'cakes',
    unit: '500 g cake',
    price: 399,
    description: 'Layers of chocolate sponge, whipped vanilla cream, and red cherry glaze.'
  },
  {
    id: 'red-velvet-heart-cake',
    name: 'Red Velvet Heart Cream Cheese Cake',
    tamilName: 'ரெட் வெல்வெட் கேக்',
    category: 'cakes',
    unit: '500 g cake',
    price: 480,
    description: 'Silky red velvet crumb layered with authentic rich cream cheese frosting.'
  },
  {
    id: 'butterscotch-crunch-cake',
    name: 'Butterscotch Praline Crunch Cake',
    tamilName: 'பட்டர்ஸ்காட்ச் கேக்',
    category: 'cakes',
    unit: '500 g cake',
    price: 380,
    description: 'Soft vanilla sponge filled with caramel sauce and caramelized cashew crunch.'
  },
  {
    id: 'pineapple-fresh-cream-cake',
    name: 'Pineapple Fresh Cream Cake',
    tamilName: 'அன்னாசி பழ கேக்',
    category: 'cakes',
    unit: '500 g cake',
    price: 350,
    description: 'Light vanilla sponge soaked with sweet pineapple compote and airy whipped cream.'
  },
  {
    id: 'belgian-choco-fudge-1kg',
    name: 'Belgian Chocolate Fudge Birthday Cake',
    tamilName: 'சாக்லேட் ஃபட்ஜ் கேக் 1kg',
    category: 'cakes',
    unit: '1 kg cake',
    price: 799,
    description: 'Grand celebration 1kg double-layered chocolate fudge cake for birthdays and anniversaries.'
  },
  {
    id: 'white-forest-cake',
    name: 'White Forest Cherry Cake',
    tamilName: 'ஒயிட் ஃபாரஸ்ட் கேக்',
    category: 'cakes',
    unit: '500 g cake',
    price: 410,
    description: 'Fluffy vanilla sponge topped with Swiss white chocolate shavings and maraschino cherries.'
  },
  {
    id: 'blueberry-cheesecake-slice',
    name: 'New York Blueberry Cheesecake',
    tamilName: 'புளூபெர்ரி சீஸ்கேக்',
    category: 'cakes',
    unit: '1 slice (160g)',
    price: 160,
    description: 'Baked buttery biscuit crust filled with velvety cream cheese and wild blueberry glaze.'
  },
  {
    id: 'choco-lava-cake-2',
    name: 'Warm Molten Choco Lava Cake',
    tamilName: 'சோகோ லாவா கேக் (2)',
    category: 'cakes',
    unit: '2 pcs pack',
    price: 130,
    description: 'Decadent mini chocolate cakes with hot gooey molten chocolate center.'
  },
  {
    id: 'fudge-walnut-brownie-2',
    name: 'Sizzling Walnut Fudge Brownie',
    tamilName: 'வால்நட் பிரவுனி (2)',
    category: 'cakes',
    unit: '2 pcs pack',
    price: 140,
    description: 'Dense, chewy chocolate fudge brownies packed with crunchy roasted Californian walnuts.'
  },
  {
    id: 'mango-tres-leches',
    name: 'Mango Tres Leches Milk Tub Cake',
    tamilName: 'மாம்பழ ட்ரெஸ் லெச்சஸ்',
    category: 'cakes',
    unit: '350 g tub',
    price: 240,
    description: 'Three-milk soaked soft Mexican sponge cake topped with fresh Alphonso mango pulp.'
  },
  {
    id: 'assorted-cupcakes-4',
    name: 'Assorted Gourmet Cupcakes',
    tamilName: 'கப்கேக்ஸ் (4)',
    category: 'cakes',
    unit: '4 pcs box',
    price: 160,
    description: 'Box of 4 freshly frosted cupcakes: Belgian Choco, Red Velvet, Vanilla Bean, and Strawberry.'
  },
  {
    id: 'sparkler-candle-pack',
    name: 'Musical Birthday Candle & Sparklers',
    tamilName: 'பிறந்தநாள் மெழுகுவர்த்தி',
    category: 'cakes',
    unit: '1 set',
    price: 40,
    description: 'Smokeless golden sparkling candle set with birthday song chime for cake cutting.'
  },
  {
    id: 'butter-croissant-2',
    name: 'French Butter Croissant (2 pcs)',
    tamilName: 'வெண்ணெய் குரோசண்ட்',
    category: 'cakes',
    unit: '2 pcs pack',
    price: 120,
    description: 'Flaky, buttery baked croissants fresh from the bakery oven.'
  },
  {
    id: 'wheat-bread-loaf',
    name: '100% Whole Wheat Slice Bread',
    tamilName: 'கோதுமை ரொட்டி',
    category: 'cakes',
    unit: '400 g loaf',
    price: 48,
    description: 'Zero maida, soft sliced wholesome brown bread for healthy breakfasts.'
  },

  // 4. 20L Water Cans
  {
    id: 'bisleri-20l-can',
    name: 'Bisleri 20L Purified Water Can',
    tamilName: 'பிஸ்லரி 20லி தண்ணீர்',
    category: 'water',
    unit: '20 L can',
    price: 90,
    description: 'Ozonated mineral water with vital minerals, sealed and delivered to doorstep.'
  },
  {
    id: 'aquafina-20l-can',
    name: 'Aquafina 20L Drinking Water Jar',
    tamilName: 'அக்வாஃபினா 20லி கேன்',
    category: 'water',
    unit: '20 L can',
    price: 85,
    description: 'Multi-stage RO purified drinking water for home and office dispenser.'
  },
  {
    id: 'dispenser-tap-pump',
    name: 'Automatic Water Can Dispenser Pump',
    tamilName: 'தண்ணீர் பம்ப்',
    category: 'water',
    unit: '1 unit',
    price: 299,
    description: 'Rechargeable USB electric pump that snaps directly onto standard 20L cans.'
  },

  // 5. Pooja Flowers & Fragrance
  {
    id: 'madurai-mallipoo',
    name: 'Madurai Jasmine / Mallipoo String',
    tamilName: 'மதுரை மல்லிப்பூ',
    category: 'flowers',
    unit: '1 muzham string',
    price: 60,
    description: 'Fresh hand-tied aromatic Madurai jasmine flowers for morning pooja.'
  },
  {
    id: 'pooja-mix-flowers',
    name: 'Morning Pooja Flower Basket Mix',
    tamilName: 'பூஜை மலர்கள்',
    category: 'flowers',
    unit: '200 g basket',
    price: 45,
    description: 'Fresh Sevvanthi, Arali, Rose petals, and Vilvam leaves for morning prayer.'
  },
  {
    id: 'rose-garland',
    name: 'Fresh Red Rose & Fragrant Garland',
    tamilName: 'ரோஜா மாலை',
    category: 'flowers',
    unit: '1 garland',
    price: 150,
    description: 'Handcrafted fresh rose garland for deity or special family occasions.'
  },

  // 6. Electricals & Quick Hardware
  {
    id: 'philips-9w-led',
    name: 'Philips 9W Cool Day Light LED Bulb',
    tamilName: '9W எல்இடி பல்ப்',
    category: 'electricals',
    unit: '1 pc box (B22)',
    price: 110,
    description: 'Energy saving bright 825 lumens bulb with 1-year replacement warranty.'
  },
  {
    id: 'anchor-power-strip',
    name: 'Anchor 4-Socket Power Strip Spike Buster',
    tamilName: 'பவர் ஸ்ட்ரிப்',
    category: 'electricals',
    unit: '1 unit (2m)',
    price: 349,
    description: 'Heavy duty 4 universal sockets with master switch and overload protection.'
  },
  {
    id: 'duracell-aa-4',
    name: 'Duracell Ultra AA Batteries (Pack of 4)',
    tamilName: 'டியூராசெல் பேட்டரி',
    category: 'electricals',
    unit: '4 pcs pack',
    price: 180,
    description: 'Long-lasting power for TV remotes, wall clocks, and smart appliances.'
  },
  {
    id: 'fast-charging-cable',
    name: 'Braided Type-C Fast Charging Cable (65W)',
    tamilName: 'சார்ஜிங் கேபிள்',
    category: 'electricals',
    unit: '1.2 m cable',
    price: 199,
    description: 'Tangle-free nylon braided 65W PD fast charging & data transfer cable.'
  }
]

module.exports = products
