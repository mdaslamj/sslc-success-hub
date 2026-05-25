/**
 * Science Question Bank — Karnataka SSLC 10th Grade
 * Source: Official Karnataka Board Question Papers & Question Banks (2022–2026)
 * Subjects: Physics, Chemistry, Biology
 */

import type { Question } from "@/hooks/use-exam-engine";

// ---------------------------------------------------------------------------
// Physics — Light
// ---------------------------------------------------------------------------
export const physicsLight: Question[] = [
  {
    id: "phy-light-001",
    subject: "Science",
    chapter: "Light – Reflection and Refraction",
    concept: "Spherical Mirrors",
    difficulty: "easy",
    questionType: "mcq",
    marks: 1,
    question: "The diameter of the reflecting surface of a spherical mirror is called its",
    options: ["Pole of the mirror", "Centre of curvature", "Principal axis", "Aperture"],
    correctAnswer: "Aperture",
    explanation: "The aperture of a spherical mirror is the diameter of the reflecting surface. It determines the amount of light the mirror can collect.",
    cognitiveLevel: "remember",
  },
  {
    id: "phy-light-002",
    subject: "Science",
    chapter: "Light – Reflection and Refraction",
    concept: "Spherical Mirrors",
    difficulty: "medium",
    questionType: "mcq",
    marks: 1,
    question: "A mirror produces an erect and enlarged image of an object. The type of mirror and the nature of that image is respectively:",
    options: [
      "Convex mirror and virtual image",
      "Concave mirror and real image",
      "Convex mirror and real image",
      "Concave mirror and virtual image",
    ],
    correctAnswer: "Concave mirror and virtual image",
    explanation: "A concave mirror produces an erect and enlarged virtual image when the object is placed between the focus and the pole of the mirror.",
    cognitiveLevel: "understand",
  },
  {
    id: "phy-light-003",
    subject: "Science",
    chapter: "Light – Reflection and Refraction",
    concept: "Dispersion of Light",
    difficulty: "easy",
    questionType: "mcq",
    marks: 1,
    question: "When white light passes through a glass prism, which colour deviates the most?",
    options: ["Red", "Yellow", "Green", "Violet"],
    correctAnswer: "Violet",
    explanation: "Violet light has the shortest wavelength and is deviated the most when white light passes through a prism. Red light deviates the least.",
    cognitiveLevel: "remember",
  },
  {
    id: "phy-light-004",
    subject: "Science",
    chapter: "Light – Reflection and Refraction",
    concept: "Human Eye",
    difficulty: "medium",
    questionType: "mcq",
    marks: 1,
    question: "The ability of the eye lens to adjust its focal length for seeing near and distant objects is called:",
    options: ["Persistence of vision", "Power of accommodation", "Far-sightedness", "Astigmatism"],
    correctAnswer: "Power of accommodation",
    explanation: "Power of accommodation is the ability of the eye to adjust the focal length of its lens to focus clearly on objects at varying distances.",
    cognitiveLevel: "remember",
  },
];

// ---------------------------------------------------------------------------
// Physics — Electricity
// ---------------------------------------------------------------------------
export const physicsElectricity: Question[] = [
  {
    id: "phy-elec-001",
    subject: "Science",
    chapter: "Electricity",
    concept: "Resistance",
    difficulty: "easy",
    questionType: "mcq",
    marks: 1,
    question: "When three resistors of different resistances are connected in parallel, the quantity that remains the same across all resistors is:",
    options: ["Current", "Potential difference", "Resistance", "Resistivity"],
    correctAnswer: "Potential difference",
    explanation: "In a parallel circuit, the potential difference (voltage) across each branch is the same. Current divides according to resistance.",
    cognitiveLevel: "understand",
  },
  {
    id: "phy-elec-002",
    subject: "Science",
    chapter: "Electricity",
    concept: "Electric Power",
    difficulty: "easy",
    questionType: "mcq",
    marks: 1,
    question: "The rate of energy consumed in an electrical circuit is called electric:",
    options: ["Current", "Potential difference", "Resistance", "Power"],
    correctAnswer: "Power",
    explanation: "Electric power is the rate at which electrical energy is consumed or transferred. P = V × I = I²R = V²/R. It is measured in Watts (W).",
    cognitiveLevel: "remember",
  },
  {
    id: "phy-elec-003",
    subject: "Science",
    chapter: "Electricity",
    concept: "Domestic Circuits",
    difficulty: "medium",
    questionType: "mcq",
    marks: 1,
    question: "What happens if a fuse is connected to the neutral wire instead of the live wire?",
    options: [
      "The appliances will work normally",
      "The fuse will blow immediately",
      "The appliances remain live and can cause fatal electric shock",
      "The circuit resistance increases",
    ],
    correctAnswer: "The appliances remain live and can cause fatal electric shock",
    explanation: "A fuse must always be connected to the live wire. If connected to the neutral wire, the fuse may blow but the appliances remain connected to the live wire, creating a fatal shock hazard.",
    cognitiveLevel: "apply",
  },
];

// ---------------------------------------------------------------------------
// Chemistry — Chemical Reactions
// ---------------------------------------------------------------------------
export const chemistryReactions: Question[] = [
  {
    id: "chem-react-001",
    subject: "Science",
    chapter: "Chemical Reactions and Equations",
    concept: "Types of Reactions",
    difficulty: "medium",
    questionType: "mcq",
    marks: 1,
    question: "Observe: CuSO₄ + Fe → FeSO₄ + Cu and 2AgNO₃ + Cu → Cu(NO₃)₂ + 2Ag. Which statement is correct?",
    options: [
      "Copper is more reactive than iron and silver",
      "Iron is less reactive than copper and silver",
      "Copper is more reactive than silver but less reactive than iron",
      "Silver is more reactive than copper and iron",
    ],
    correctAnswer: "Copper is more reactive than silver but less reactive than iron",
    explanation: "From the reactions: Iron displaces copper (Fe > Cu in reactivity) and Copper displaces silver (Cu > Ag). So the reactivity order is Fe > Cu > Ag.",
    cognitiveLevel: "analyze",
    commonMistakes: ["Confusing which metal displaces which", "Not reading both equations together"],
  },
  {
    id: "chem-react-002",
    subject: "Science",
    chapter: "Chemical Reactions and Equations",
    concept: "Chemical Formulae",
    difficulty: "easy",
    questionType: "mcq",
    marks: 1,
    question: "The chemical formula of bleaching powder is:",
    options: ["NaCl", "Na₂CO₃", "CaCO₃", "CaOCl₂"],
    correctAnswer: "CaOCl₂",
    explanation: "Bleaching powder is calcium oxychloride with formula CaOCl₂. It is prepared by passing chlorine gas over dry slaked lime Ca(OH)₂.",
    cognitiveLevel: "remember",
  },
  {
    id: "chem-react-003",
    subject: "Science",
    chapter: "Chemical Reactions and Equations",
    concept: "Oxidation and Reduction",
    difficulty: "medium",
    questionType: "mcq",
    marks: 1,
    question: "Which gas is flushed into bags containing chips to prevent oxidation?",
    options: ["Hydrogen", "Oxygen", "Chlorine", "Nitrogen"],
    correctAnswer: "Nitrogen",
    explanation: "Nitrogen is an inert gas used in chip packets to prevent oxidation (rancidity) of the oils in chips. It creates an environment free of oxygen.",
    cognitiveLevel: "understand",
  },
];

// ---------------------------------------------------------------------------
// Chemistry — Carbon Compounds
// ---------------------------------------------------------------------------
export const chemistryCarbon: Question[] = [
  {
    id: "chem-carbon-001",
    subject: "Science",
    chapter: "Carbon and its Compounds",
    concept: "Combustion",
    difficulty: "easy",
    questionType: "mcq",
    marks: 1,
    question: "Saturated hydrocarbons burn in air to give a:",
    options: [
      "Yellow sooty flame",
      "Blue clean flame",
      "Red flame with smoke",
      "Colourless flame",
    ],
    correctAnswer: "Blue clean flame",
    explanation: "Saturated hydrocarbons (like methane, LPG) burn completely in sufficient oxygen to give a blue, clean flame with no soot. Unsaturated compounds give yellow sooty flames.",
    cognitiveLevel: "remember",
  },
  {
    id: "chem-carbon-002",
    subject: "Science",
    chapter: "Carbon and its Compounds",
    concept: "Covalent Bonding",
    difficulty: "medium",
    questionType: "mcq",
    marks: 1,
    question: "Carbon forms a large number of compounds because of its ability to:",
    options: [
      "Form ionic bonds with other elements",
      "Bond with metals easily",
      "Form covalent bonds and catenation",
      "React with water",
    ],
    correctAnswer: "Form covalent bonds and catenation",
    explanation: "Carbon forms millions of compounds due to catenation (ability to bond with other carbon atoms) and tetravalency (4 bonding electrons). This gives rise to long chains, branched chains, and rings.",
    cognitiveLevel: "understand",
  },
];

// ---------------------------------------------------------------------------
// Chemistry — Metals and Non-metals
// ---------------------------------------------------------------------------
export const chemistryMetals: Question[] = [
  {
    id: "chem-metal-001",
    subject: "Science",
    chapter: "Metals and Non-metals",
    concept: "Properties of Metals",
    difficulty: "easy",
    questionType: "mcq",
    marks: 1,
    question: "When magnesium ribbon burns in air, the product formed is:",
    options: ["Acidic", "Basic", "Neutral", "Amphoteric"],
    correctAnswer: "Basic",
    explanation: "Magnesium burns in oxygen to form magnesium oxide (MgO), which is a basic oxide. When dissolved in water, it forms Mg(OH)₂ which turns red litmus blue.",
    cognitiveLevel: "understand",
  },
  {
    id: "chem-metal-002",
    subject: "Science",
    chapter: "Metals and Non-metals",
    concept: "Reactivity Series",
    difficulty: "medium",
    questionType: "mcq",
    marks: 1,
    question: "Which of the following metals does NOT react with cold water but reacts vigorously with hot water?",
    options: ["Sodium", "Potassium", "Calcium", "Magnesium"],
    correctAnswer: "Magnesium",
    explanation: "Magnesium reacts very slowly with cold water but vigorously with hot water or steam to produce magnesium hydroxide and hydrogen gas. Sodium and potassium react vigorously even with cold water.",
    cognitiveLevel: "apply",
  },
];

// ---------------------------------------------------------------------------
// All Science chapters index
// ---------------------------------------------------------------------------
export const scienceChapters = [
  { id: "physics-light", name: "Light – Reflection and Refraction", questions: physicsLight },
  { id: "physics-electricity", name: "Electricity", questions: physicsElectricity },
  { id: "chemistry-reactions", name: "Chemical Reactions and Equations", questions: chemistryReactions },
  { id: "chemistry-carbon", name: "Carbon and its Compounds", questions: chemistryCarbon },
  { id: "chemistry-metals", name: "Metals and Non-metals", questions: chemistryMetals },
];
