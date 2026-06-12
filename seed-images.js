import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DRY_RUN  = process.argv.includes('--dry-run');
const RESET    = process.argv.includes('--reset');
const BUCKET   = 'imagesTurtle';
const BASE_URL = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;


const IMAGES = [
  {
    storage_path: 'family/actor.webp',
    alt_text:     'An actor',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'male'],
    lemmas:       ['a actor'],
  },
  {
    storage_path: 'family/actress.webp',
    alt_text:     'An actress',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'female'],
    lemmas:       ['a actress'],
  },
  {
    storage_path: 'family/aunt.webp',
    alt_text:     'An aunt',
    mime_type:    'image/webp',
    tags:         ['family', 'people', 'female'],
    lemmas:       ['an aunt'],
  },
  {
    storage_path: 'family/baby.webp',
    alt_text:     'A baby',
    mime_type:    'image/webp',
    tags:         ['family', 'people', 'child'],
    lemmas:       ['a baby'],
  },
  {
    storage_path: 'family/boss-female.webp',
    alt_text:     'A female boss',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'female'],
    lemmas:       ['a boss (female)'],
  },
  {
    storage_path: 'family/boss-male.webp',
    alt_text:     'A boss',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'male'],
    lemmas:       ['a boss (male)'],
  },
  {
    storage_path: 'family/boy.webp',
    alt_text:     'A boy',
    mime_type:    'image/webp',
    tags:         ['people', 'male', 'child'],
    lemmas:       ['a boy'],
  },
  {
    storage_path: 'family/brother.webp',
    alt_text:     'A brother',
    mime_type:    'image/webp',
    tags:         ['family', 'people', 'male'],
    lemmas:       ['a brother'],
  },
  {
    storage_path: 'family/customer-female.webp',
    alt_text:     'A female customer',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'female'],
    lemmas:       ['a customer (female)'],
  },
  {
    storage_path: 'family/customer-male.webp',
    alt_text:     'A customer',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'male'],
    lemmas:       ['a customer (male)'],
  },
  {
    storage_path: 'family/doctor-female.webp',
    alt_text:     'A female doctor',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'female'],
    lemmas:       ['a doctor (female)'],
  },
  {
    storage_path: 'family/doctor-male.webp',
    alt_text:     'A doctor',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'male'],
    lemmas:       ['a doctor (male)'],
  },
  {
    storage_path: 'family/driver-female.webp',
    alt_text:     'A female driver',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'female'],
    lemmas:       ['a driver (female)'],
  },
  {
    storage_path: 'family/driver-male.webp',
    alt_text:     'A driver',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'male'],
    lemmas:       ['a driver (male)'],
  },
  {
    storage_path: 'family/employee-female.webp',
    alt_text:     'A female employee',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'female'],
    lemmas:       ['a employee (female)'],
  },
  {
    storage_path: 'family/employee-male.webp',
    alt_text:     'An employee',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'male'],
    lemmas:       ['a employee (male)'],
  },
  {
    storage_path: 'family/family.png',
    alt_text:     'A family',
    mime_type:    'image/png',
    tags:         ['family', 'people', 'group'],
    lemmas:       ['a family'],
  },
  {
    storage_path: 'family/father.webp',
    alt_text:     'A father',
    mime_type:    'image/webp',
    tags:         ['family', 'people', 'male'],
    lemmas:       ['a father'],
  },
  {
    storage_path: 'family/friends.webp',
    alt_text:     'Friends',
    mime_type:    'image/webp',
    tags:         ['people', 'group', 'social'],
    lemmas:       ['a friend (male)', 'a friend (female)'],
  },
  {
    storage_path: 'family/girl.webp',
    alt_text:     'A girl',
    mime_type:    'image/webp',
    tags:         ['people', 'female', 'child'],
    lemmas:       ['a girl'],
  },
  {
    storage_path: 'family/grandmother.webp',
    alt_text:     'A grandmother',
    mime_type:    'image/webp',
    tags:         ['family', 'people', 'female', 'elderly'],
    lemmas:       ['a grandmother'],
  },
  {
    storage_path: 'family/grandparent.webp',
    alt_text:     'A grandparent',
    mime_type:    'image/webp',
    tags:         ['family', 'people', 'elderly'],
    lemmas:       ['a grandparent', 'a grandfather'],
  },
  {
    storage_path: 'family/guest-female.webp',
    alt_text:     'A female guest',
    mime_type:    'image/webp',
    tags:         ['people', 'social', 'female'],
    lemmas:       ['a guest (female)'],
  },
  {
    storage_path: 'family/guest-male.webp',
    alt_text:     'A guest',
    mime_type:    'image/webp',
    tags:         ['people', 'social', 'male'],
    lemmas:       ['a guest (male)'],
  },
  {
    storage_path: 'family/man.webp',
    alt_text:     'A man',
    mime_type:    'image/webp',
    tags:         ['people', 'male', 'adult'],
    lemmas:       ['a man'],
  },
  {
    storage_path: 'family/mother.webp',
    alt_text:     'A mother',
    mime_type:    'image/webp',
    tags:         ['family', 'people', 'female'],
    lemmas:       ['a mother'],
  },
  {
    storage_path: 'family/nurse-female.webp',
    alt_text:     'A female nurse',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'female'],
    lemmas:       ['a nurse (female)'],
  },
  {
    storage_path: 'family/nurse-male.webp',
    alt_text:     'A nurse',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'male'],
    lemmas:       ['a nurse (male)'],
  },
  {
    storage_path: 'family/passenger-female.webp',
    alt_text:     'A female passenger',
    mime_type:    'image/webp',
    tags:         ['people', 'travel', 'female'],
    lemmas:       ['a passenger (female)'],
  },
  {
    storage_path: 'family/passenger-male.webp',
    alt_text:     'A passenger',
    mime_type:    'image/webp',
    tags:         ['people', 'travel', 'male'],
    lemmas:       ['a passenger (male)'],
  },
  {
    storage_path: 'family/policeman-female.webp',
    alt_text:     'A policewoman',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'female'],
    lemmas:       ['a policewoman'],
  },
  {
    storage_path: 'family/policeman.webp',
    alt_text:     'A policeman',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'male'],
    lemmas:       ['a policeman'],
  },
  {
    storage_path: 'family/singer-female.webp',
    alt_text:     'A female singer',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'female'],
    lemmas:       ['a singer (female)'],
  },
  {
    storage_path: 'family/singer-male.webp',
    alt_text:     'A singer',
    mime_type:    'image/webp',
    tags:         ['people', 'profession', 'male'],
    lemmas:       ['a singer (male)'],
  },
  {
    storage_path: 'family/sister.webp',
    alt_text:     'A sister',
    mime_type:    'image/webp',
    tags:         ['family', 'people', 'female'],
    lemmas:       ['a sister'],
  },
  {
    storage_path: 'family/student-female.webp',
    alt_text:     'A female student',
    mime_type:    'image/webp',
    tags:         ['people', 'education', 'female'],
    lemmas:       ['a student (female)'],
  },
  {
    storage_path: 'family/student-male.webp',
    alt_text:     'A student',
    mime_type:    'image/webp',
    tags:         ['people', 'education', 'male'],
    lemmas:       ['a student (male)'],
  },
  {
    storage_path: 'family/teacher-female.webp',
    alt_text:     'A female teacher',
    mime_type:    'image/webp',
    tags:         ['people', 'education', 'female'],
    lemmas:       ['a teacher (female)'],
  },
  {
    storage_path: 'family/teacher-male.webp',
    alt_text:     'A teacher',
    mime_type:    'image/webp',
    tags:         ['people', 'education', 'male'],
    lemmas:       ['a teacher (male)'],
  },
  {
    storage_path: 'family/uncle.webp',
    alt_text:     'An uncle',
    mime_type:    'image/webp',
    tags:         ['family', 'people', 'male'],
    lemmas:       ['an uncle'],
  },
  {
    storage_path: 'family/woman.webp',
    alt_text:     'A woman',
    mime_type:    'image/webp',
    tags:         ['people', 'female', 'adult'],
    lemmas:       ['a woman'],
  },
];


// ── RESET ──────────────────────────────────────────────────────────
if (RESET) {
  console.log('\n🔄  RESET — clearing image data from dictionary…');
  if (!DRY_RUN) {
    const { error } = await supabase
      .from('dictionary')
      .update({ image: null, image_meta_data: null })
      .not('image', 'is', null);
    if (error) { console.error(error.message); process.exit(1); }
    console.log('✅  image and image_meta_data cleared.');
  } else {
    console.log('🔶  DRY RUN — nothing written.');
  }
  process.exit(0);
}


// ── SEED ───────────────────────────────────────────────────────────
console.log(`\n📦  Bucket: ${BUCKET}`);
console.log(`🖼   Images to process: ${IMAGES.length}`);
if (DRY_RUN) console.log('🔶  DRY RUN mode — no writes\n');

let matched = 0;
let notFound = 0;

for (const img of IMAGES) {
  const metadata = {
    bucket:       BUCKET,
    storage_path: img.storage_path,
    alt_text:     img.alt_text,
    mime_type:    img.mime_type,
    tags:         img.tags,
  };

  for (const lemma of img.lemmas) {
    if (DRY_RUN) {
      console.log(`  🔶  ${lemma.padEnd(28)} → ${img.storage_path}`);
      matched++;
      continue;
    }

    const { data, error } = await supabase
      .from('dictionary')
      .update({ image: img.storage_path, image_meta_data: metadata })
      .eq('lemma', lemma)
      .select('id');

    if (error) {
      console.error(`  ❌  ${lemma}:`, error.message);
    } else if (!data?.length) {
      console.warn(`  ⚠️   lemma not found: "${lemma}"`);
      notFound++;
    } else {
      console.log(`  ✅  ${lemma.padEnd(28)} → ${img.storage_path}`);
      matched++;
    }
  }
}

console.log(`\n📊  Summary:`);
console.log(`    Lemmas patched: ${matched}`);
if (notFound) console.log(`    Not found:      ${notFound}`);
if (DRY_RUN) console.log('\n🔶  DRY RUN — nothing was written to Supabase.');
else         console.log('\n✅  Done!');
