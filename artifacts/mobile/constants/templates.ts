export type Difficulty = "easy" | "medium" | "hard";

export interface TemplateImage {
  id: string;
  name: string;
  imageUrl: string;
  difficulty: Difficulty;
}

export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  templates: TemplateImage[];
}

const u = (seed: string) =>
  `https://picsum.photos/seed/${seed}/400/400`;

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: "animals",
    name: "Animals",
    icon: "feather",
    color: "#34C759",
    templates: [
      { id: "a1", name: "Cat", imageUrl: u("cat"), difficulty: "easy" },
      { id: "a2", name: "Dog", imageUrl: u("dog"), difficulty: "easy" },
      { id: "a3", name: "Rabbit", imageUrl: u("rabbit"), difficulty: "easy" },
      { id: "a4", name: "Lion", imageUrl: u("lion"), difficulty: "medium" },
      { id: "a5", name: "Elephant", imageUrl: u("elephant"), difficulty: "medium" },
      { id: "a6", name: "Horse", imageUrl: u("horse"), difficulty: "medium" },
      { id: "a7", name: "Fox", imageUrl: u("fox-animal"), difficulty: "easy" },
      { id: "a8", name: "Bear", imageUrl: u("bear-animal"), difficulty: "medium" },
      { id: "a9", name: "Owl", imageUrl: u("owl-bird"), difficulty: "hard" },
      { id: "a10", name: "Tiger", imageUrl: u("tiger-wild"), difficulty: "hard" },
      { id: "a11", name: "Deer", imageUrl: u("deer-forest"), difficulty: "medium" },
      { id: "a12", name: "Wolf", imageUrl: u("wolf-animal"), difficulty: "hard" },
    ],
  },
  {
    id: "anime",
    name: "Anime",
    icon: "star",
    color: "#FF6B9D",
    templates: [
      { id: "n1", name: "Character 1", imageUrl: u("anime1"), difficulty: "hard" },
      { id: "n2", name: "Character 2", imageUrl: u("anime2"), difficulty: "hard" },
      { id: "n3", name: "Portrait 1", imageUrl: u("anime-face"), difficulty: "medium" },
      { id: "n4", name: "Portrait 2", imageUrl: u("anime-portrait"), difficulty: "medium" },
      { id: "n5", name: "Hero", imageUrl: u("anime-hero"), difficulty: "hard" },
      { id: "n6", name: "Villain", imageUrl: u("anime-villain"), difficulty: "hard" },
      { id: "n7", name: "Chibi", imageUrl: u("chibi-cute"), difficulty: "easy" },
      { id: "n8", name: "Warrior", imageUrl: u("anime-warrior"), difficulty: "hard" },
      { id: "n9", name: "School Girl", imageUrl: u("anime-school"), difficulty: "medium" },
      { id: "n10", name: "Mage", imageUrl: u("anime-mage"), difficulty: "hard" },
      { id: "n11", name: "Ninja", imageUrl: u("anime-ninja"), difficulty: "medium" },
      { id: "n12", name: "Princess", imageUrl: u("anime-princess"), difficulty: "medium" },
    ],
  },
  {
    id: "cartoons",
    name: "Cartoons",
    icon: "smile",
    color: "#FFCC00",
    templates: [
      { id: "c1", name: "Happy Face", imageUrl: u("cartoon-face"), difficulty: "easy" },
      { id: "c2", name: "Cute Bear", imageUrl: u("cartoon-bear"), difficulty: "easy" },
      { id: "c3", name: "Space Dog", imageUrl: u("cartoon-dog-space"), difficulty: "easy" },
      { id: "c4", name: "Superhero", imageUrl: u("cartoon-superhero"), difficulty: "medium" },
      { id: "c5", name: "Wizard", imageUrl: u("cartoon-wizard"), difficulty: "medium" },
      { id: "c6", name: "Dinosaur", imageUrl: u("cartoon-dinosaur"), difficulty: "easy" },
      { id: "c7", name: "Robot", imageUrl: u("cartoon-robot"), difficulty: "medium" },
      { id: "c8", name: "Mermaid", imageUrl: u("cartoon-mermaid"), difficulty: "hard" },
      { id: "c9", name: "Dragon", imageUrl: u("cartoon-dragon"), difficulty: "hard" },
      { id: "c10", name: "Unicorn", imageUrl: u("cartoon-unicorn"), difficulty: "medium" },
      { id: "c11", name: "Pirate", imageUrl: u("cartoon-pirate"), difficulty: "medium" },
      { id: "c12", name: "Fairy", imageUrl: u("cartoon-fairy"), difficulty: "hard" },
    ],
  },
  {
    id: "fruits",
    name: "Fruits",
    icon: "gift",
    color: "#FF9500",
    templates: [
      { id: "f1", name: "Apple", imageUrl: u("apple-fruit"), difficulty: "easy" },
      { id: "f2", name: "Banana", imageUrl: u("banana-fruit"), difficulty: "easy" },
      { id: "f3", name: "Strawberry", imageUrl: u("strawberry-red"), difficulty: "easy" },
      { id: "f4", name: "Orange", imageUrl: u("orange-citrus"), difficulty: "easy" },
      { id: "f5", name: "Grapes", imageUrl: u("grapes-purple"), difficulty: "medium" },
      { id: "f6", name: "Watermelon", imageUrl: u("watermelon-slice"), difficulty: "easy" },
      { id: "f7", name: "Pineapple", imageUrl: u("pineapple-tropical"), difficulty: "medium" },
      { id: "f8", name: "Cherry", imageUrl: u("cherry-red"), difficulty: "easy" },
      { id: "f9", name: "Mango", imageUrl: u("mango-tropical"), difficulty: "easy" },
      { id: "f10", name: "Lemon", imageUrl: u("lemon-yellow"), difficulty: "easy" },
      { id: "f11", name: "Kiwi", imageUrl: u("kiwi-slice"), difficulty: "medium" },
      { id: "f12", name: "Peach", imageUrl: u("peach-fruit"), difficulty: "easy" },
    ],
  },
  {
    id: "people",
    name: "People",
    icon: "user",
    color: "#007AFF",
    templates: [
      { id: "p1", name: "Portrait 1", imageUrl: u("portrait-person1"), difficulty: "hard" },
      { id: "p2", name: "Portrait 2", imageUrl: u("portrait-person2"), difficulty: "hard" },
      { id: "p3", name: "Profile 1", imageUrl: u("face-profile1"), difficulty: "medium" },
      { id: "p4", name: "Profile 2", imageUrl: u("face-profile2"), difficulty: "medium" },
      { id: "p5", name: "Side View", imageUrl: u("person-side"), difficulty: "hard" },
      { id: "p6", name: "Smile", imageUrl: u("smiling-face"), difficulty: "medium" },
      { id: "p7", name: "Child", imageUrl: u("child-portrait"), difficulty: "medium" },
      { id: "p8", name: "Elder", imageUrl: u("elder-portrait"), difficulty: "hard" },
      { id: "p9", name: "Young Man", imageUrl: u("young-man-face"), difficulty: "hard" },
      { id: "p10", name: "Young Woman", imageUrl: u("young-woman-face"), difficulty: "hard" },
      { id: "p11", name: "Full Body", imageUrl: u("full-body-person"), difficulty: "hard" },
      { id: "p12", name: "Hands", imageUrl: u("hands-drawing"), difficulty: "medium" },
    ],
  },
  {
    id: "cars",
    name: "Cars",
    icon: "navigation",
    color: "#5856D6",
    templates: [
      { id: "r1", name: "Sports Car", imageUrl: u("sports-car-red"), difficulty: "hard" },
      { id: "r2", name: "Classic Car", imageUrl: u("classic-car-vintage"), difficulty: "hard" },
      { id: "r3", name: "SUV", imageUrl: u("suv-car-side"), difficulty: "medium" },
      { id: "r4", name: "Race Car", imageUrl: u("formula-racecar"), difficulty: "hard" },
      { id: "r5", name: "Truck", imageUrl: u("pickup-truck"), difficulty: "medium" },
      { id: "r6", name: "Van", imageUrl: u("camper-van"), difficulty: "medium" },
      { id: "r7", name: "Sedan", imageUrl: u("sedan-car-side"), difficulty: "medium" },
      { id: "r8", name: "Motorcycle", imageUrl: u("motorcycle-side"), difficulty: "hard" },
      { id: "r9", name: "Bus", imageUrl: u("city-bus"), difficulty: "easy" },
      { id: "r10", name: "Convertible", imageUrl: u("convertible-car"), difficulty: "hard" },
      { id: "r11", name: "Jeep", imageUrl: u("jeep-offroad"), difficulty: "medium" },
      { id: "r12", name: "Taxi", imageUrl: u("yellow-taxi"), difficulty: "easy" },
    ],
  },
];

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "#34C759",
  medium: "#FF9500",
  hard: "#FF3B30",
};
