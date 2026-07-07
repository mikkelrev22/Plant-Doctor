const adjectives = [
  'Sunny',
  'Mossy',
  'Sprouty',
  'Leafy',
  'Ferny',
  'Happy',
  'Verdant',
  'Plucky',
];

const nouns = [
  'Aloe',
  'Fern',
  'Pothos',
  'Monstera',
  'Peperomia',
  'Fig',
  'Jade',
  'Calathea',
];

export function generatePlantName() {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const suffix = Math.floor(100 + Math.random() * 900);

  return `${adjective} ${noun} ${suffix}`;
}
