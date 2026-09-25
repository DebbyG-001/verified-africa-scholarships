// Curated photography (Unsplash). Each image is chosen for a specific place in the product.
const u = (id, w = 1200, h) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ''}&q=75`;

export const IMG = {
  heroMain: { src: u('1531482615713-2afd69097998', 1400), alt: 'Students working together at computers in a bright study space' },
  heroSide: { src: u('1523240795612-9a054b0db644', 800), alt: 'A group of students studying together around a table' },
  heroSmall: { src: u('1541339907198-e08756dedf3f', 700), alt: 'Graduates throwing their caps into the air at sunset' },
  roadmap: { src: u('1454165804606-c3d57bc86b40', 1200), alt: 'A student planning at a desk with a laptop and notes' },
  vault: { src: u('1456513080510-7bf3a84b82f8', 1200), alt: 'Open books and papers on a desk' },
  prepare: { src: u('1434030216411-0b793f4b4173', 1200), alt: 'A student writing in a notebook' },
  matching: { src: u('1531545514256-b1400bc00f31', 1200), alt: 'Students smiling while working on laptops' },
  abroad: { src: u('1436491865332-7a61a109cc05', 1200), alt: 'An aeroplane wing above the clouds' },
  coding: { src: u('1517694712202-14dd9538aa97', 1200), alt: 'A laptop showing code on a desk' },
  lab: { src: u('1532094349884-543bc11b234d', 1200), alt: 'Laboratory glassware in a science lab' },
  lecture: { src: u('1524178232363-1fb2b075b655', 1200), alt: 'A lecture hall with students attending class' },
  library: { src: u('1481627834876-b7833e8f5570', 1200), alt: 'Tall library shelves filled with books' },
  conference: { src: u('1540575467063-178a50c2df87', 1200), alt: 'An audience at a conference' },
  office: { src: u('1521737604893-d14cc237f11d', 1200), alt: 'A team collaborating in a modern office' },
  graduation: { src: u('1627556704302-624286467c65', 1200), alt: 'A graduation cap held up against the sky' },
  campus: { src: u('1562774053-701939374585', 1200), alt: 'A university campus building and lawn' },
  ai: { src: u('1677442136019-21780ecad995', 1200), alt: 'Abstract illustration representing artificial intelligence' },
  studyGroup: { src: u('1543269865-cbf427effbad', 1200), alt: 'Friends studying together and laughing' },
  teamwork: { src: u('1522071820081-009f0129c71c', 1200), alt: 'Students collaborating around laptops' },
  professional: { src: u('1573497019940-1c28c88b4f3e', 900), alt: 'A smiling young professional' },
  writing: { src: u('1488190211105-8b0e65b80b4e', 1200), alt: 'A notebook and pen on a desk ready for writing' },
  books: { src: u('1503676260728-1c00da094a0b', 1200), alt: 'A stack of books with an apple' },
  classroom: { src: u('1606761568499-6d2451b23c66', 1200), alt: 'Students in a classroom' },
  codeScreen: { src: u('1461749280684-dccba630e2f6', 1200), alt: 'Close-up of code on a screen' },
};

// Category imagery for opportunities (illustrative; never implies the listing's own photo).
const TYPE_POOLS = {
  Scholarship: ['graduation', 'library', 'campus', 'books'],
  'Essay competition': ['writing', 'prepare', 'vault'],
  Fellowship: ['conference', 'professional', 'teamwork'],
  Internship: ['office', 'teamwork', 'coding'],
  Grant: ['lab', 'roadmap', 'books'],
  Conference: ['conference', 'lecture'],
  Competition: ['codeScreen', 'studyGroup', 'teamwork'],
  Programme: ['classroom', 'studyGroup', 'matching'],
  Opportunity: ['campus', 'heroSide', 'library'],
};

export function imageForOpportunity(o) {
  const pool = TYPE_POOLS[o?.type] || TYPE_POOLS.Opportunity;
  let h = 0; for (const ch of String(o?.id || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const key = pool[h % pool.length];
  return { ...IMG[key], alt: '' }; // decorative in cards: the title carries the meaning
}

export const CATEGORY_IMAGES = {
  Scholarship: IMG.graduation, 'Essay competition': IMG.writing, Fellowship: IMG.conference, Internship: IMG.office,
  Grant: IMG.lab, Conference: IMG.lecture, Competition: IMG.codeScreen, Programme: IMG.classroom, Opportunity: IMG.campus,
};
