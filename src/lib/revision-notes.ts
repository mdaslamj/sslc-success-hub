/**
 * revision-notes.ts — Task 12
 * Chapter-wise quick revision summaries for all SSLC subjects.
 * Source: Karnataka SSLC textbooks and question papers in project knowledge.
 */

export type RevisionNote = {
  chapterId: string;
  chapterName: string;
  subject: string;
  subjectIcon: string;
  keyPoints: string[];
  formulas?: string[];
  mustRemember: string[];
  examTip: string;
};

export const REVISION_NOTES: RevisionNote[] = [

  // ── MATHEMATICS ──────────────────────────────────────────────────────────

  {
    chapterId: "real-numbers",
    chapterName: "Real Numbers",
    subject: "Mathematics", subjectIcon: "📐",
    keyPoints: [
      "HCF × LCM = Product of two numbers (a × b)",
      "Euclid's Division Lemma: a = bq + r, where 0 ≤ r < b",
      "A number is rational if its decimal expansion terminates or is non-terminating repeating",
      "√2, √3, √5, √7 are all irrational numbers",
      "Terminating decimal: denominator has only factors of 2 and 5",
    ],
    formulas: [
      "HCF × LCM = a × b",
      "a = bq + r (Euclid's Division Lemma)",
    ],
    mustRemember: [
      "HCF × LCM = Product of numbers",
      "√p is irrational if p is prime",
    ],
    examTip: "Always find HCF first using Euclid's algorithm, then use HCF × LCM = a × b to find LCM.",
  },
  {
    chapterId: "arithmetic-progressions",
    chapterName: "Arithmetic Progressions",
    subject: "Mathematics", subjectIcon: "📐",
    keyPoints: [
      "AP: sequence where difference between consecutive terms is constant",
      "Common difference d = a₂ - a₁",
      "nth term: aₙ = a + (n-1)d",
      "Sum of n terms: Sₙ = n/2 [2a + (n-1)d] or Sₙ = n/2 (a + l)",
      "Sum of first n natural numbers = n(n+1)/2",
    ],
    formulas: [
      "aₙ = a + (n-1)d",
      "Sₙ = n/2 [2a + (n-1)d]",
      "Sₙ = n/2 (first term + last term)",
    ],
    mustRemember: [
      "nth term formula: aₙ = a + (n-1)d",
      "Sum formula: Sₙ = n/2[2a + (n-1)d]",
    ],
    examTip: "If last term is given use Sₙ = n/2(a+l). If not, use Sₙ = n/2[2a+(n-1)d].",
  },
  {
    chapterId: "quadratic-equations",
    chapterName: "Quadratic Equations",
    subject: "Mathematics", subjectIcon: "📐",
    keyPoints: [
      "Standard form: ax² + bx + c = 0, where a ≠ 0",
      "Discriminant D = b² - 4ac determines nature of roots",
      "D > 0: Two distinct real roots",
      "D = 0: Two equal real roots (x = -b/2a)",
      "D < 0: No real roots",
      "Quadratic formula: x = (-b ± √D) / 2a",
    ],
    formulas: [
      "D = b² - 4ac",
      "x = (-b ± √(b²-4ac)) / 2a",
      "Sum of roots = -b/a",
      "Product of roots = c/a",
    ],
    mustRemember: [
      "Discriminant D = b² - 4ac",
      "D > 0 → 2 real roots, D = 0 → equal roots, D < 0 → no real roots",
    ],
    examTip: "Always check discriminant before solving. If D = perfect square, factorise instead of formula.",
  },
  {
    chapterId: "triangles",
    chapterName: "Triangles",
    subject: "Mathematics", subjectIcon: "📐",
    keyPoints: [
      "Basic Proportionality Theorem (BPT): If DE ∥ BC, then AD/DB = AE/EC",
      "AA similarity: Two triangles are similar if two angles are equal",
      "Ratio of areas of similar triangles = (ratio of corresponding sides)²",
      "Pythagoras theorem: AC² = AB² + BC² (in right triangle)",
      "Converse of Pythagoras: If AC² = AB² + BC², angle B = 90°",
    ],
    formulas: [
      "AD/DB = AE/EC (BPT)",
      "ar(△ABC)/ar(△PQR) = (AB/PQ)²",
      "AC² = AB² + BC² (Pythagoras)",
    ],
    mustRemember: [
      "BPT: parallel line divides sides proportionally",
      "Area ratio = (sides ratio)²",
    ],
    examTip: "In BPT problems, always set up the proportion correctly: AD/DB = AE/EC (not AD/AB).",
  },
  {
    chapterId: "trigonometry",
    chapterName: "Introduction to Trigonometry",
    subject: "Mathematics", subjectIcon: "📐",
    keyPoints: [
      "sin θ = opp/hyp, cos θ = adj/hyp, tan θ = opp/adj",
      "cosec θ = 1/sin θ, sec θ = 1/cos θ, cot θ = 1/tan θ",
      "sin²θ + cos²θ = 1",
      "1 + tan²θ = sec²θ",
      "1 + cot²θ = cosec²θ",
      "sin 30°=½, sin 45°=1/√2, sin 60°=√3/2, sin 90°=1",
    ],
    formulas: [
      "sin²θ + cos²θ = 1",
      "tan²θ + 1 = sec²θ",
      "cot²θ + 1 = cosec²θ",
    ],
    mustRemember: [
      "sin 30°=½, cos 30°=√3/2, tan 30°=1/√3",
      "sin 45°=cos 45°=1/√2, tan 45°=1",
      "sin 60°=√3/2, cos 60°=½, tan 60°=√3",
    ],
    examTip: "Learn the table of values for 0°, 30°, 45°, 60°, 90° — at least one question always comes from it.",
  },

  // ── SCIENCE — PHYSICS ─────────────────────────────────────────────────────

  {
    chapterId: "physics-light",
    chapterName: "Light – Reflection and Refraction",
    subject: "Science", subjectIcon: "🔬",
    keyPoints: [
      "Concave mirror: converging mirror, used in torches, headlights, shaving mirrors",
      "Convex mirror: diverging mirror, always forms virtual, erect, diminished image",
      "Mirror formula: 1/v + 1/u = 1/f",
      "Magnification: m = -v/u = h'/h",
      "Snell's law: n₁ sin i = n₂ sin r",
      "Refractive index: n = c/v = sin i / sin r",
      "Power of lens: P = 1/f (in metres), unit = dioptre (D)",
    ],
    formulas: [
      "1/v + 1/u = 1/f (mirror & lens formula)",
      "m = -v/u (magnification)",
      "n = sin i / sin r (Snell's law)",
      "P = 1/f (dioptre)",
    ],
    mustRemember: [
      "Sign convention: distances measured from pole/optical centre",
      "Distances in direction of incident light = positive",
    ],
    examTip: "Always apply sign convention before substituting in mirror/lens formula. Incident light travels left to right.",
  },
  {
    chapterId: "physics-electricity",
    chapterName: "Electricity",
    subject: "Science", subjectIcon: "🔬",
    keyPoints: [
      "Ohm's law: V = IR (at constant temperature)",
      "Resistance in series: R = R₁ + R₂ + R₃",
      "Resistance in parallel: 1/R = 1/R₁ + 1/R₂ + 1/R₃",
      "Electric power: P = VI = I²R = V²/R",
      "Electric energy: E = P × t = VIt",
      "1 kWh = 3.6 × 10⁶ J",
      "Fuse wire: low melting point, always in live wire",
    ],
    formulas: [
      "V = IR (Ohm's law)",
      "P = VI = I²R = V²/R",
      "E = Pt (electrical energy)",
      "Series: R = R₁+R₂+R₃",
      "Parallel: 1/R = 1/R₁+1/R₂+1/R₃",
    ],
    mustRemember: [
      "In series: current is same, voltage divides",
      "In parallel: voltage is same, current divides",
      "Fuse must be in live wire only",
    ],
    examTip: "In parallel circuits, the total resistance is LESS than the smallest individual resistance.",
  },

  // ── SCIENCE — CHEMISTRY ──────────────────────────────────────────────────

  {
    chapterId: "chemistry-reactions",
    chapterName: "Chemical Reactions and Equations",
    subject: "Science", subjectIcon: "🔬",
    keyPoints: [
      "Types: combination, decomposition, displacement, double displacement, redox",
      "Oxidation = loss of electrons / gain of oxygen",
      "Reduction = gain of electrons / loss of oxygen",
      "Reactivity series (high to low): K, Na, Ca, Mg, Al, Zn, Fe, Cu, Ag, Au",
      "Bleaching powder formula: CaOCl₂",
      "Rancidity: fats/oils oxidise — prevented by antioxidants or inert gas packaging",
    ],
    formulas: [
      "CaOCl₂ = Bleaching powder",
      "2AgBr → 2Ag + Br₂ (photographic reaction)",
    ],
    mustRemember: [
      "Reactivity series order: Mg > Al > Zn > Fe > Cu > Ag",
      "More reactive metal displaces less reactive metal from its salt solution",
    ],
    examTip: "In displacement reactions, check the reactivity series — only a more reactive metal displaces a less reactive one.",
  },

  // ── SCIENCE — BIOLOGY ────────────────────────────────────────────────────

  {
    chapterId: "life-processes",
    chapterName: "Life Processes",
    subject: "Science", subjectIcon: "🔬",
    keyPoints: [
      "Photosynthesis: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂",
      "Aerobic respiration: C₆H₁₂O₆ + O₂ → CO₂ + H₂O + ATP (38 ATP)",
      "Anaerobic respiration (yeast): glucose → ethanol + CO₂",
      "Anaerobic respiration (muscles): glucose → lactic acid",
      "Nephron is the functional unit of kidney",
      "Xylem transports water; Phloem transports food",
      "Double circulation in mammals maintains constant temperature",
    ],
    formulas: [
      "6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂ (photosynthesis)",
    ],
    mustRemember: [
      "Stomata: exchange of gases in leaves",
      "Transpiration pulls water up the plant",
      "Bile: produced by liver, stored in gall bladder, alkaline",
    ],
    examTip: "Remember: xylem = water (X for water), phloem = food (F for food). Xylem flows one way, phloem both ways.",
  },
  {
    chapterId: "heredity-evolution",
    chapterName: "Heredity and Evolution",
    subject: "Science", subjectIcon: "🔬",
    keyPoints: [
      "Mendel's Law of Segregation: alleles separate during gamete formation",
      "F1 generation from Tt × Tt: 1TT : 2Tt : 1tt (ratio 3:1 tall:short)",
      "Sex determination: XX = female, XY = male; father determines sex",
      "Mutations: sudden heritable changes in DNA",
      "Natural Selection (Darwin): organisms with favourable variations survive",
      "Evolution: gradual change in inherited characteristics over generations",
    ],
    mustRemember: [
      "F2 ratio: 3 dominant : 1 recessive",
      "Father has X and Y chromosomes — determines child's sex",
      "Acquired characteristics are NOT inherited (Lamarck wrong, Darwin right)",
    ],
    examTip: "Always draw a Punnett square in exam. For dihybrid: 9:3:3:1 ratio in F2.",
  },
  {
    chapterId: "our-environment",
    chapterName: "Our Environment",
    subject: "Science", subjectIcon: "🔬",
    keyPoints: [
      "10% energy law: only 10% energy transfers to next trophic level",
      "Biomagnification: harmful chemicals concentrate at higher trophic levels",
      "CFCs deplete the ozone layer (O₃)",
      "Biodegradable: broken down by microorganisms (food, paper, cotton)",
      "Non-biodegradable: cannot decompose naturally (plastic, glass, DDT)",
      "Decomposers: bacteria and fungi break down dead organic matter",
    ],
    mustRemember: [
      "10% law: 1000J grass → 100J herbivore → 10J carnivore",
      "CFCs = main cause of ozone depletion",
      "Biomagnification affects TOP of food chain most",
    ],
    examTip: "Food chain energy calculation: multiply by 10% for each step. 100J at level 1 = 1J at level 3.",
  },

  // ── SOCIAL SCIENCE ───────────────────────────────────────────────────────

  {
    chapterId: "banking-transactions",
    chapterName: "Banking Transactions",
    subject: "Social Science", subjectIcon: "🌍",
    keyPoints: [
      "Word 'Bank' from Italian 'Banco' (bench/table)",
      "RBI = central bank, also called 'Bank of Banks'",
      "Savings account: for individuals, earns interest",
      "Current account: for businesses, no interest, unlimited withdrawals",
      "Fixed deposit: lump sum for fixed period, highest interest",
      "Recurring deposit: fixed monthly savings for future needs",
    ],
    mustRemember: [
      "RBI = Central Bank of India (Bank of Banks)",
      "Current account: no interest, service fee charged",
      "Savings account: most common, used by students/pensioners",
    ],
    examTip: "Remember: Current account → current/daily business use. Savings → saving for future.",
  },
  {
    chapterId: "world-organisations",
    chapterName: "World Organisations",
    subject: "Social Science", subjectIcon: "🌍",
    keyPoints: [
      "UN established: 24 October 1945, HQ: New York",
      "General Assembly = World Parliament (all 193 members)",
      "Security Council = Cabinet of UN (5 permanent members with veto)",
      "ICJ headquarters: The Hague (Netherlands)",
      "WHO established: 1948, HQ: Geneva",
      "UNICEF won Nobel Peace Prize: 1965",
      "SAARC headquarters: Kathmandu, Nepal",
    ],
    mustRemember: [
      "UN HQ = New York, ICJ = The Hague, WHO = Geneva",
      "5 Permanent SC members: USA, UK, France, Russia, China",
      "SAARC = Kathmandu, established 1985",
    ],
    examTip: "Make a table: Organisation → Headquarters → Year established. This comes every year in exams.",
  },
  {
    chapterId: "india-soils",
    chapterName: "India – Soils",
    subject: "Social Science", subjectIcon: "🌍",
    keyPoints: [
      "Alluvial soil: most widespread, most fertile, Indo-Gangetic plains",
      "Black soil (Regur): best for cotton, Deccan plateau, retains moisture",
      "Red soil: millet/tobacco/oilseeds, peninsular India",
      "Laterite soil: formed by leaching, deficient in nitrogen and salts",
      "Desert soil: Rajasthan, low moisture, sandy",
      "Mountain soil: high humus/organic matter, forests",
    ],
    mustRemember: [
      "Black soil = cotton, Regur soil, Deccan",
      "Alluvial = most extensive in India",
      "Laterite = leached, deficient in N and salts",
    ],
    examTip: "Link soil to crop: Black→Cotton, Red→Millet/Groundnut, Alluvial→Rice/Wheat.",
  },
  {
    chapterId: "social-stratification",
    chapterName: "Social Stratification",
    subject: "Social Science", subjectIcon: "🌍",
    keyPoints: [
      "Article 17: abolishes untouchability",
      "Protection of Civil Rights Act: 1955 (renamed from Untouchability Crime Act in 1976)",
      "Social stratification in India: caste system",
      "Gandhi called untouchables 'Harijans'",
      "Ambedkar fought for rights of Dalits and helped write Constitution",
    ],
    mustRemember: [
      "Article 17 = abolishes untouchability",
      "Civil Rights Protection Act = 1976",
      "Caste system = form of social stratification in India",
    ],
    examTip: "Article numbers come every year: Article 17 (untouchability), Article 21 (right to life), Article 32 (constitutional remedies).",
  },
];

export function getRevisionNote(chapterId: string): RevisionNote | null {
  return REVISION_NOTES.find((n) => n.chapterId === chapterId) ?? null;
}

export function getRevisionNotesBySubject(subject: string): RevisionNote[] {
  return REVISION_NOTES.filter((n) => n.subject === subject);
}
