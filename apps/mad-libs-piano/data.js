// Song and word data for Mad Libs Piano. All song lyrics are in the public domain.
// Each lyric word is written "word|TAG", where TAG is its part of speech.
// The green key always sings the real word; every other key sings a silly word with the same TAG.
// build.js inlines this file into the page and lists every word for build_voice.py to record.

const POS_NAMES = {
  N: "noun", NS: "plural noun", NAME: "name", PRON: "person", POSS: "whose",
  V: "verb", VING: "verb ending in -ing", VED: "past-tense verb", LINK: "linking verb", LINKPAST: "linking verb, past",
  MODAL: "helping verb", ADJ: "adjective", ADV: "adverb", PREP: "preposition", DET: "determiner",
  CONJ: "conjunction", WH: "question word", INTJ: "exclamation", NUM: "number", TO: "to + adverb",
  ITIS: "it is", ITWAS: "it was", IM: "I am", ID: "I would", VS: "verb ending in -s"
};

// Silly words, by part of speech. Kept kid-friendly.
const SILLY = {
  N: ["pickle", "noodle", "walrus", "burrito", "kazoo", "potato", "llama", "sock", "toaster", "banana", "armpit",
    "pancake", "hamster", "meatball", "unicorn", "sandwich", "penguin", "waffle", "cactus", "trombone", "goblin",
    "nugget", "spatula", "donut", "octopus", "pudding", "broccoli", "poodle", "eyebrow", "marshmallow", "tuba",
    "chicken", "bathtub", "giraffe", "muffin", "weasel", "platypus", "jellybean", "nostril", "cupcake", "raccoon",
    "slipper", "moose", "taco", "pretzel", "toenail", "noggin", "burp", "tutu", "lasagna", "porcupine", "wombat"],
  NS: ["pickles", "noodles", "walruses", "socks", "toasters", "bananas", "pancakes", "hamsters", "meatballs",
    "unicorns", "penguins", "waffles", "kazoos", "armpits", "goblins", "nuggets", "donuts", "potatoes", "llamas",
    "burritos", "chickens", "muffins", "cupcakes", "raccoons", "slippers", "eyebrows", "marshmallows", "jellybeans",
    "nostrils", "weasels", "tacos", "pretzels", "gerbils", "toenails", "bubbles", "dinosaurs", "sneakers", "robots",
    "grandmas", "underpants", "meatloaves", "noodle-heads", "pigeons", "wombats"],
  NAME: ["Gertrude", "Kevin", "Mildred", "Waldo", "Bartholomew", "Doris", "Gus", "Bernadette", "Rumpelstiltskin",
    "Nebraska", "Albuquerque", "Timbuktu", "Cleveland", "Toledo", "Kalamazoo", "Mississippi", "Wisconsin",
    "Humperdinck", "Ethel", "Fernando", "Agnes", "Barnaby", "Winnifred", "Poughkeepsie", "Tallahassee", "Ziggy"],
  PRON: ["Grandma", "Grandpa", "Santa", "Bigfoot", "Dracula", "nobody", "everybody", "somebody", "Mom", "Dad",
    "Kevin", "Gertrude", "the dog", "my uncle", "a pirate", "the mailman", "a wizard", "the baby", "a robot",
    "the teacher", "a ninja", "Aunt Mildred", "the goldfish", "a cowboy"],
  POSS: ["Grandma's", "Grandpa's", "Santa's", "Bigfoot's", "Dracula's", "somebody's", "nobody's", "everybody's",
    "Kevin's", "Mildred's", "the dog's", "a pirate's", "the mailman's", "a wizard's", "the baby's", "a robot's",
    "the teacher's", "a ninja's", "my uncle's", "a cowboy's"],
  V: ["wiggle", "sneeze", "burp", "tickle", "juggle", "waddle", "hiccup", "slurp", "boogie", "yodel", "giggle",
    "scoot", "gobble", "smooch", "wobble", "sniff", "bounce", "squish", "nibble", "moonwalk", "tiptoe", "honk",
    "quack", "munch", "flap", "twirl", "squeak", "lick", "poke", "splash", "gargle", "cartwheel", "shimmy", "snore",
    "toot", "hug", "pounce", "belly flop"],
  VING: ["wiggling", "sneezing", "burping", "tickling", "juggling", "waddling", "slurping", "yodeling", "giggling",
    "gobbling", "wobbling", "bouncing", "squishing", "nibbling", "snoring", "honking", "twirling", "splashing",
    "gargling", "tiptoeing", "moonwalking", "munching", "flapping", "sniffing", "scooting", "hopping", "quacking",
    "smooching", "shimmying", "tooting"],
  VED: ["wiggled", "sneezed", "burped", "tickled", "juggled", "waddled", "slurped", "yodeled", "giggled", "gobbled",
    "wobbled", "bounced", "squished", "nibbled", "snored", "honked", "twirled", "splashed", "licked", "poked",
    "smooched", "tooted", "flopped", "sniffed", "munched", "hiccupped", "gargled", "tiptoed", "moonwalked",
    "scooted", "plopped", "quacked", "shimmied"],
  LINK: ["smell", "look", "feel", "seem", "taste", "sound", "stay", "get", "turn", "act", "grow", "go"],
  LINKPAST: ["smelled", "looked", "felt", "seemed", "tasted", "sounded", "stayed", "got", "turned", "acted",
    "grew", "went", "became"],
  MODAL: ["might", "could", "should", "would", "must", "shall", "may", "can", "won't", "can't", "will", "did", "didn't"],
  ADJ: ["squishy", "stinky", "wobbly", "soggy", "fluffy", "sparkly", "greasy", "crunchy", "bouncy", "slimy",
    "grumpy", "sticky", "ticklish", "lumpy", "gigantic", "teeny", "purple", "bald", "spicy", "smelly", "jiggly",
    "cranky", "hairy", "moldy", "gooey", "fuzzy", "noisy", "sweaty", "cheesy", "dizzy", "nutty", "wacky", "goofy",
    "fancy", "rubbery", "sneaky", "puffy", "crusty", "chunky", "frumpy", "lopsided", "itchy", "bossy", "toasty"],
  ADV: ["wildly", "sloppily", "loudly", "sneakily", "grumpily", "backwards", "sideways", "clumsily", "noisily",
    "dizzily", "secretly", "awkwardly", "bravely", "lazily", "suddenly", "politely", "rudely", "barefoot", "twice",
    "upside down", "extremely", "totally", "barely", "kinda", "sorta", "squishily", "gently", "never", "nearly",
    "almost", "accidentally"],
  PREP: ["under", "behind", "inside", "beside", "around", "between", "beneath", "upon", "toward", "against",
    "past", "beyond", "near", "without", "among", "onto", "outside", "underneath", "across", "over", "within"],
  DET: ["one", "some", "this", "that", "every", "no", "each", "my", "your", "our", "any", "another", "a", "the",
    "a big", "a tiny", "a smelly", "a soggy", "a purple", "an extra", "your mom's", "the whole"],
  CONJ: ["and", "but", "or", "yet", "so", "plus", "because", "although", "unless", "while", "and then", "but also"],
  WH: ["who", "why", "when", "where", "which", "whatever", "whoever", "wherever", "whenever", "how come", "what"],
  INTJ: ["whoa", "yikes", "gosh", "golly", "phooey", "yippee", "whoopsie", "hooray", "hey", "wowza", "oops", "ahoy",
    "egad", "yahoo", "boing", "ta-da", "uh-oh", "jeepers", "zoinks", "bleh"],
  NUM: ["seven", "eleven", "twelve", "a zillion", "twenty", "sixty", "ninety", "thirteen", "eighty", "a million",
    "four", "a hundred", "a gazillion", "three"],
  TO: ["not to", "to never", "to sorta", "to secretly", "to kinda", "to sneakily", "to almost", "to loudly"],
  ITIS: ["it's", "that's", "here's", "there's", "what's", "Grandma's", "who's"],
  ITWAS: ["there was", "here came", "it smelled", "it seemed", "Grandma said", "it was", "then came", "it tasted"],
  IM: ["I'm", "you're", "we're", "he's", "she's", "Grandma's", "Santa's", "Bigfoot's", "the dog's", "they're"],
  VS: ["wiggles", "sneezes", "burps", "tickles", "juggles", "waddles", "hiccups", "slurps", "boogies", "yodels", "giggles",
    "scoots", "gobbles", "wobbles", "sniffs", "bounces", "squishes", "nibbles", "moonwalks", "tiptoes", "honks", "quacks",
    "munches", "twirls", "squeaks", "splashes", "gargles", "shimmies", "snores", "toots"],
  ID: ["I'd", "you'd", "we'd", "he'd", "she'd", "they'd", "Grandma'd", "nobody'd"]
};

// Melodies: one MIDI note per word, line by line (same tunes as Song Piano).
const SONGS = [
  { id: "twinkle", title: "Twinkle, Twinkle, Little Star", credit: "Words by Jane Taylor, 1806",
    melody: [[[60, 60], [67, 67], [69, 69], 67], [65, 65, [64, 64], 62, 62, 60], [67, [67, 65], 65, 64, 64, 62], [67, 67, [65, 65], 64, 64, 62], [[60, 60], [67, 67], [69, 69], 67], [65, 65, [64, 64], 62, 62, 60]],
    lyrics: `Twinkle,|V twinkle,|V little|ADJ star,|N
How|WH I|PRON wonder|V what|WH you|PRON are!|LINK
Up|ADV above|PREP the|DET world|N so|ADV high,|ADJ
Like|PREP a|DET diamond|N in|PREP the|DET sky.|N
Twinkle,|V twinkle,|V little|ADJ star,|N
How|WH I|PRON wonder|V what|WH you|PRON are!|LINK` },
  { id: "row", title: "Row, Row, Row Your Boat", credit: "Traditional, first printed 1852",
    melody: [[60, 60, 60, 62, 64], [[64, 62], 64, 65, 67], [[72, 72, 72], [67, 67, 67], [64, 64, 64], [60, 60, 60]], [67, 65, 64, 62, 60]],
    lyrics: `Row,|V row,|V row|V your|POSS boat,|N
Gently|ADV down|PREP the|DET stream.|N
Merrily,|ADV merrily,|ADV merrily,|ADV merrily,|ADV
Life|N is|LINK but|ADV a|DET dream.|N` },
  { id: "grace", title: "Amazing Grace", credit: "Words by John Newton, 1779",
    melody: [[[60, 65, 69], 69, 67, 65, 62, 60], [60, 65, 69, 69, 67, 72], [69, 72, 69, 69, 67, 65, 62, 60], [60, 65, 69, 67, 67, 65], [60, 65, 69, 69, 67, 65, 62, 60], [60, 65, 69, 69, [67, 72]], [69, [72, 69], 69, 67, 65, [62, 60]], [60, 65, 69, 67, [67, 65]], [60, [65, 69], [69, 67], 65, 62, 60], [60, 65, [69, 69, 67], 72], [69, 72, 69, 69, 67, 65, 62, 60], [60, 65, 69, 67, 67, 65]],
    lyrics: `Amazing|ADJ grace!|N How|WH sweet|ADJ the|DET sound|N
That|WH saved|VED a|DET wretch|N like|PREP me!|PRON
I|PRON once|ADV was|LINKPAST lost,|ADJ but|CONJ now|ADV am|LINK found;|ADJ
Was|LINKPAST blind,|ADJ but|CONJ now|ADV I|PRON see.|V
'Twas|ITWAS grace|N that|WH taught|VED my|POSS heart|N to|TO fear,|V
And|CONJ grace|N my|POSS fears|NS relieved;|VED
How|WH precious|ADJ did|MODAL that|DET grace|N appear|V
The|DET hour|N I|PRON first|ADV believed!|VED
Through|PREP many|DET dangers,|NS toils|NS and|CONJ snares,|NS
I|PRON have|MODAL already|ADV come;|VED
'Tis|ITIS grace|N hath|MODAL brought|VED me|PRON safe|ADJ thus|ADV far,|ADV
And|CONJ grace|N will|MODAL lead|V me|PRON home.|N` },
  { id: "clementine", title: "Oh My Darling, Clementine", credit: "Words by Percy Montrose, 1884",
    melody: [[60, 60, [60, 55], 64, 64, [64, 60]], [[60, 64, 67, 67], 65, 64, 62], [62, 64, [65, 65], [64, 62, 64, 60]], [60, 64, [62, 55], [59, 62, 60]], [60, 60, [60, 55], 64, 64, [64, 60]], [60, 64, [67, 67], [65, 64, 62]], [62, 64, 65, 65, 64, [62, 64, 60]], [[60, 64], [62, 55], [59, 62, 60]], [60, 60, 60, 55, 64, 64, [64, 60]], [60, 64, 67, 67, [65, 64], 62], [[62, 64], [65, 65], [64, 62], [64, 60]], [[60, 64], 62, 55, [59, 62, 60]]],
    lyrics: `In|PREP a|DET cavern,|N in|PREP a|DET canyon,|N
Excavating|VING for|PREP a|DET mine,|N
Dwelt|VED a|DET miner|N forty-niner,|N
And|CONJ his|POSS daughter|N Clementine.|NAME
Oh|INTJ my|POSS darling,|N oh|INTJ my|POSS darling,|N
Oh|INTJ my|POSS darling,|N Clementine!|NAME
You|PRON are|LINK lost|ADJ and|CONJ gone|ADJ forever,|ADV
Dreadful|ADJ sorry,|ADJ Clementine.|NAME
Light|ADJ she|PRON was|LINKPAST and|CONJ like|PREP a|DET fairy,|N
And|CONJ her|POSS shoes|NS were|LINKPAST number|N nine,|NUM
Herring|N boxes|NS without|PREP topses,|NS
Sandals|NS were|LINKPAST for|PREP Clementine.|NAME` },
  { id: "range", title: "Home on the Range", credit: "Words by Brewster Higley, 1870s",
    melody: [[55, 55, 60, 62, 64, 60, 59, [57, 65, 65], 65], [64, 65, 67, 64, 64, 64, 62], [55, 55, 62, 64, 60, 59, 65], [65, 65, 64, 62, 60, 59, 62, 60], [67, 65, 64, 65, 67], [64, 65, 67, 64, 64, 64, 62], [55, 55, 62, 64, 60, 59, 65], [65, 65, 64, 62, 60, 59, 62, 60]],
    lyrics: `Oh,|INTJ give|V me|PRON a|DET home|N where|WH the|DET buffalo|NS roam,|V
Where|WH the|DET deer|NS and|CONJ the|DET antelope|NS play,|V
Where|WH seldom|ADV is|LINK heard|VED a|DET discouraging|ADJ word,|N
And|CONJ the|DET skies|NS are|LINK not|ADV cloudy|ADJ all|DET day.|N
Home,|N home|N on|PREP the|DET range,|N
Where|WH the|DET deer|NS and|CONJ the|DET antelope|NS play;|V
Where|WH seldom|ADV is|LINK heard|VED a|DET discouraging|ADJ word,|N
And|CONJ the|DET skies|NS are|LINK not|ADV cloudy|ADJ all|DET day.|N` },
  { id: "shenandoah", title: "Shenandoah", credit: "Traditional sea shanty, 1800s",
    melody: [[55, 60, 69, 67, 65, 72, 69], [67, 67, 69, 64], [55, 60, 69, 67, 65, 72, 69], [62, 64, 60, 64], [67, 60, 62, 60], [55, 60, 69, 67, 72, 69], [67, 67, 69, 64], [55, 60, 69, 67, 65, 72, 69], [62, 64, 60, 64], [67, 60, 62, 60]],
    lyrics: `Oh|INTJ Shenandoah,|NAME I|PRON long|V to|TO see|V you,|PRON
Away,|ADV you|PRON rolling|ADJ river.|N
Oh|INTJ Shenandoah,|NAME I|PRON long|V to|TO see|V you,|PRON
Away,|ADV I'm|IM bound|ADJ away|ADV
'Cross|PREP the|DET wide|ADJ Missouri.|NAME
Oh|INTJ Shenandoah,|NAME I|PRON love|V your|POSS daughter,|N
Away,|ADV you|PRON rolling|ADJ river.|N
For|PREP her|PRON I'd|ID cross|V your|POSS roaming|ADJ waters,|NS
Away,|ADV I'm|IM bound|ADJ away|ADV
'Cross|PREP the|DET wide|ADJ Missouri.|NAME` },
  { id: "birthday", title: "Happy Birthday to You", credit: "Tune and words from the 1890s. The most-sung song in the world",
    melody: [[[60, 60], [62, 60], 65, 64], [[60, 60], [62, 60], 67, 65], [[60, 60], [72, 69], 65, 64], [[70, 70], [69, 65], 67, 65]],
    lyrics: `Happy|ADJ birthday|N to|PREP you!|PRON
Happy|ADJ birthday|N to|PREP you!|PRON
Happy|ADJ birthday,|N dear|ADJ Sam,|NAME
Happy|ADJ birthday|N to|PREP you!|PRON` },
  { id: "jingle", title: "Jingle Bells", credit: "Words and music by James Lord Pierpont, 1857",
    melody: [[[69, 69], 69, [69, 69], 69], [[69, 72], 65, 67, 69], [70, 70, 70, 70, 70, 69, 69, 69, 69, [67, 67], [69, 67], 72], [[69, 69], 69, [69, 69], 69], [[69, 72], 65, 67, 69], [70, 70, 70, 70, 70, 69, 69, 69, 69, [72, 72], [70, 67], 65]],
    lyrics: `Jingle|V bells,|NS jingle|V bells,|NS
Jingle|V all|DET the|DET way!|N
Oh|INTJ what|WH fun|N it|PRON is|LINK to|TO ride|V in|PREP a|DET one-horse|ADJ open|ADJ sleigh!|N
Jingle|V bells,|NS jingle|V bells,|NS
Jingle|V all|DET the|DET way!|N
Oh|INTJ what|WH fun|N it|PRON is|LINK to|TO ride|V in|PREP a|DET one-horse|ADJ open|ADJ sleigh!|N` },
  { id: "macdonald", title: "Old MacDonald Had a Farm", credit: "Traditional farm song, printed by 1917",
    melody: [[65, [65, 65, 60], 62, 62, 60], [69, 69, 67, 67, 65], [60, 65, 65, 65, 60, 62, 62, 60], [69, 69, 67, 67, 65], [60, 60, 65, 65, 65, 60, 60, 65, 65, 65], [65, 65, 65, 65, 65, 65, [65, 65, 65], 65, 65, 65], [65, [65, 65, 60], 62, 62, 60], [69, 69, 67, 67, 65]],
    lyrics: `Old|ADJ MacDonald|NAME had|VED a|DET farm,|N
E-|INTJ I-|INTJ E-|INTJ I-|INTJ O!|INTJ
And|CONJ on|PREP his|POSS farm|N he|PRON had|VED a|DET cow,|N
E-|INTJ I-|INTJ E-|INTJ I-|INTJ O!|INTJ
With|PREP a|DET moo|N moo|N here|ADV and|CONJ a|DET moo|N moo|N there,|ADV
Here|ADV a|DET moo,|N there|ADV a|DET moo,|N everywhere|ADV a|DET moo|N moo!|N
Old|ADJ MacDonald|NAME had|VED a|DET farm,|N
E-|INTJ I-|INTJ E-|INTJ I-|INTJ O!|INTJ` },
  { id: "merry", title: "We Wish You a Merry Christmas", credit: "Traditional English carol",
    melody: [[62, 67, 67, 69, [67, 66], [64, 64]], [64, 69, 69, 71, [69, 67], [66, 62]], [62, 71, 71, 72, [71, 69], [67, 64]], [62, 62, [64, 69], 66, 67]],
    lyrics: `We|PRON wish|V you|PRON a|DET merry|ADJ Christmas,|N
We|PRON wish|V you|PRON a|DET merry|ADJ Christmas,|N
We|PRON wish|V you|PRON a|DET merry|ADJ Christmas,|N
And|CONJ a|DET happy|ADJ New|ADJ Year!|N` },
  { id: "mary", title: "Mary Had a Little Lamb", credit: "Words by Sarah Josepha Hale, 1830",
    melody: [[[64, 62], 60, 62, [64, 64], 64], [[62, 62], 62, [64, 67], 67], [[64, 62], 60, 62, [64, 64], 64], [64, 62, 62, 64, 62, 60], [[64, 62, 60], 62, [64, 64], 64], [[62, 62], 62, [64, 67], 67], [[64, 62, 60], 62, [64, 64], 64], [64, 62, 62, 64, 62, 60]],
    lyrics: `Mary|NAME had|VED a|DET little|ADJ lamb,|N
Little|ADJ lamb,|N little|ADJ lamb,|N
Mary|NAME had|VED a|DET little|ADJ lamb,|N
Its|POSS fleece|N was|LINKPAST white|ADJ as|PREP snow.|N
Everywhere|ADV that|WH Mary|NAME went,|VED
Mary|NAME went,|VED Mary|NAME went,|VED
Everywhere|ADV that|WH Mary|NAME went,|VED
The|DET lamb|N was|LINKPAST sure|ADJ to|TO go.|V` },
  { id: "spider", title: "The Itsy Bitsy Spider", credit: "Traditional, printed by 1910",
    melody: [[55, [60, 60, 60, 62], [64, 64], 64, 62, 60, [62, 64], 60], [64, 64, 65, 67, 67, 65, 64, [65, 67], 64],
      [60, 60, 62, 64, 64, 62, 60, 62, 64, 60], [55, 55, [60, 60, 60, 62], [64, 64], 64, 62, 60, 62, [64, 60]]],
    lyrics: `The|DET itsy-bitsy|ADJ spider|N climbed|VED up|PREP the|DET water|N spout.|N
Down|ADV came|VED the|DET rain|N and|CONJ washed|VED the|DET spider|N out.|ADV
Out|ADV came|VED the|DET sun|N and|CONJ dried|VED up|ADV all|DET the|DET rain,|N
And|CONJ the|DET itsy-bitsy|ADJ spider|N climbed|VED up|PREP the|DET spout|N again.|ADV` },
  { id: "london", title: "London Bridge Is Falling Down", credit: "Traditional English rhyme, 1700s",
    melody: [[[67, 69], 67, 65, [64, 65], 67], [[62, 64], 65, [64, 65], 67], [[67, 69], 67, 65, [64, 65], 67], [62, 67, [64, 60]],
      [67, 69, 67, 65, 64, 65, 67], [62, 64, 65, 64, 65, 67], [67, 69, 67, 65, 64, 65, 67], [62, 67, [64, 60]]],
    lyrics: `London|NAME Bridge|NAME is|LINK falling|VING down,|ADV
Falling|VING down,|ADV falling|VING down,|ADV
London|NAME Bridge|NAME is|LINK falling|VING down,|ADV
My|POSS fair|ADJ lady!|N
Build|V it|PRON up|ADV with|PREP sticks|NS and|CONJ stones,|NS
Sticks|NS and|CONJ stones,|NS sticks|NS and|CONJ stones,|NS
Build|V it|PRON up|ADV with|PREP sticks|NS and|CONJ stones,|NS
My|POSS fair|ADJ lady!|N` },
  { id: "yankee", title: "Yankee Doodle", credit: "American folk song, 1700s",
    melody: [[[60, 60], [62, 64], 60, 64, 62], [[55, 60, 60], 62, 64, [60, 59]], [60, 60, [62, 64], 65, 64, 62], [60, 59, 55, [57, 59, 60, 60]]],
    lyrics: `Yankee|NAME Doodle|NAME went|VED to|PREP town,|N
A-riding|VING on|PREP a|DET pony,|N
Stuck|VED a|DET feather|N in|PREP his|POSS cap,|N
And|CONJ called|VED it|PRON macaroni!|N` },
  { id: "sleeping", title: "Are You Sleeping (Frère Jacques)", credit: "Traditional French round, 1700s",
    melody: [[60, 62, [64, 60], 60, 62, [64, 60]], [[64, 65], 67, [64, 65], 67], [[67, 69], 67, 65, [64, 60], [67, 69], 67, 65, [64, 60]], [60, 55, 60, 60, 55, 60]],
    lyrics: `Are|LINK you|PRON sleeping,|VING are|LINK you|PRON sleeping,|VING
Brother|N John?|NAME Brother|N John?|NAME
Morning|N bells|NS are|LINK ringing,|VING morning|N bells|NS are|LINK ringing,|VING
Ding,|INTJ dang,|INTJ dong!|INTJ Ding,|INTJ dang,|INTJ dong!|INTJ` },
  { id: "farmer", title: "The Farmer in the Dell", credit: "Traditional singing game, 1800s",
    melody: [[55, [60, 60], 60, 60, 60], [55, [62, 64], 64, 64, 64], [[67, 67], 69, [67, 64, 60]], [62, [64, 64], 62, 62, 60],
      [55, [60, 60], 60, 60, 60], [55, [62, 64], 64, 64, 64], [[67, 67], 69, [67, 64, 60]], [62, [64, 64], 62, 62, 60]],
    lyrics: `The|DET farmer|N in|PREP the|DET dell,|N
The|DET farmer|N in|PREP the|DET dell,|N
Hi-ho,|INTJ the|DET derry-o,|INTJ
The|DET farmer|N in|PREP the|DET dell!|N
The|DET farmer|N takes|VS a|DET wife,|N
The|DET farmer|N takes|VS a|DET wife,|N
Hi-ho,|INTJ the|DET derry-o,|INTJ
The|DET farmer|N takes|VS a|DET wife!|N` },
  { id: "scarborough", title: "Scarborough Fair", credit: "Traditional English ballad",
    melody: [[60, 60, [67, 67], 67, [62, 63, 62], 60], [[67, 70], 72, [70, 67, 69], 65, 67], [[72, 72, 72], 70, 67, 67, 65, 63, 62], [60, 67, 65, 63, 62, 60, 58, 60],
      [60, 60, 67, 67, 67, 62, [63, 62], 60], [[67, 70], 72, [70, 67, 69], 65, 67], [[72, 72], 72, 70, 67, [67, 65, 62]], [60, 67, 65, 63, 62, 60, 58, 60]],
    lyrics: `Are|LINK you|PRON going|VING to|PREP Scarborough|NAME Fair?|NAME
Parsley,|N sage,|N rosemary|N and|CONJ thyme,|N
Remember|V me|PRON to|PREP one|PRON who|WH lives|VS there,|ADV
She|PRON once|ADV was|LINKPAST a|DET true|ADJ love|N of|PREP mine.|PRON
Tell|V her|PRON to|TO make|V me|PRON a|DET cambric|ADJ shirt,|N
Parsley,|N sage,|N rosemary|N and|CONJ thyme,|N
Without|PREP no|DET seams|NS nor|CONJ needlework,|N
Then|ADV she'll|IM be|LINK a|DET true|ADJ love|N of|PREP mine.|PRON` },
  { id: "saints", title: "When the Saints Go Marching In", credit: "Traditional American spiritual and jazz standard",
    melody: [[60, 64, 65, 67, 60, [64, 65], 67], [60, 64, 65, 67, 64, [60, 64], 62], [64, 64, 62, 60, 60, 64, 67, 67, [65, 65]], [64, 65, 67, 64, [60, 62], 60]],
    lyrics: `Oh|INTJ when|WH the|DET saints|NS go|V marching|VING in,|ADV
Oh|INTJ when|WH the|DET saints|NS go|V marching|VING in,|ADV
Oh|INTJ Lord,|NAME I|PRON want|V to|TO be|V in|PREP that|DET number,|N
When|WH the|DET saints|NS go|V marching|VING in!|ADV` },
  { id: "daisy", title: "Daisy Bell (Bicycle Built for Two)", credit: "Words and music by Harry Dacre, 1892",
    melody: [[[72, 69], [65, 60], 62, 64, 65, [62, 65], 60], [67, 72, [69, 65], 62, 64, 65, 67, 69, 67], [69, 70, 69, 67, [72, 69], [67, 65]], [67, 69, [65, 62], 65, [62, 60]],
      [60, 65, 69, 67, [60, 65], 69, 67], [69, 70, [72, 69, 65], 67, 60, 65]],
    lyrics: `Daisy,|NAME Daisy,|NAME give|V me|PRON your|POSS answer,|N do!|V
I'm|IM half|ADV crazy|ADJ all|ADV for|PREP the|DET love|N of|PREP you.|PRON
It|PRON won't|MODAL be|V a|DET stylish|ADJ marriage,|N
I|PRON can't|MODAL afford|V a|DET carriage,|N
But|CONJ you'll|ID look|V sweet|ADJ upon|PREP the|DET seat|N
Of|PREP a|DET bicycle|N built|VED for|PREP two!|NUM` },
  { id: "joy", title: "Ode to Joy (Joyful, Joyful)", credit: "Tune by Beethoven, 1824. Words by Henry van Dyke, 1907",
    melody: [[[64, 64], [65, 67], 67, [65, 64], 62], [60, 60, [62, 64], 64, 62, 62], [64, [64, 65], 67, 67, [65, 64], 62], [[60, 60], 62, 64, 62, [60, 60]]],
    lyrics: `Joyful,|ADJ joyful,|ADJ we|PRON adore|V thee,|PRON
God|NAME of|PREP glory,|N Lord|NAME of|PREP love;|N
Hearts|NS unfold|V like|PREP flowers|NS before|PREP thee,|PRON
Opening|VING to|PREP the|DET sun|N above.|ADV` },
  { id: "auld", title: "Auld Lang Syne", credit: "Words by Robert Burns, 1788. Traditional Scottish tune",
    melody: [[55, 60, [60, 60, 64], 62, [60, 62]], [64, [60, 60], 64, 67, 69], [69, 67, [64, 64, 60], 62, [60, 62]], [64, 60, 57, 60]],
    lyrics: `Should|MODAL auld|ADJ acquaintance|N be|V forgot,|VED
And|CONJ never|ADV brought|VED to|PREP mind?|N
Should|MODAL auld|ADJ acquaintance|N be|V forgot,|VED
And|CONJ auld|ADJ lang|ADJ syne?|N` }
];

// Song menu order: the simplest, best-known songs first; long story-songs that suit
// "One syllable" best (Clementine, Scarborough Fair) at the bottom.
const SONG_ORDER = ["twinkle", "row", "birthday", "mary", "macdonald", "jingle", "spider", "london", "sleeping", "farmer",
  "yankee", "merry", "saints", "joy", "daisy", "auld", "range", "grace", "shenandoah", "clementine", "scarborough"];
SONGS.sort((a, b) => SONG_ORDER.indexOf(a.id) - SONG_ORDER.indexOf(b.id));

if (typeof module !== "undefined") module.exports = { SONGS, SILLY, POS_NAMES };
