export type Difficulty = "easy" | "medium" | "hard" | "";

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
      {
        id: "a1",
        name: "",
        imageUrl: "https://res.cloudinary.com/dartsmc0i/image/upload/v1774563281/Simple_Animal_Sketch_Guide_for_Your_Next_Art_Project_zscwda.jpg",
        difficulty: "easy"
      },
      {
        id: "a2",
        name: "",
        imageUrl: "https://res.cloudinary.com/dartsmc0i/image/upload/v1774473191/copy_of__zf3cbt_daa3bd.jpg",
        difficulty: "medium"
      },
      {
        id: "a3",
        name: "",
        imageUrl: "https://res.cloudinary.com/dartsmc0i/image/upload/v1774562406/e6a4dffba86f273768ed95b40352707d_qos47i.jpg",
        difficulty: "easy"
      },
      {
        id: "a4",
        name: "",
        imageUrl: "https://res.cloudinary.com/dartsmc0i/image/upload/v1774563279/18_Cute_Doodles_Drawings_Ideas_to_Inspire_Your_Creative_Side_l5isoa.jpg",
        difficulty: "medium"
      },
      {
        id: "a5",
        name: "",
        imageUrl: "https://res.cloudinary.com/dartsmc0i/image/upload/v1774563274/Beautiful_Animal_Sketch_Art_bpdgpt.jpg",
        difficulty: "hard"
      },
      {
        id: "a6",
        name: "",
        imageUrl: "https://res.cloudinary.com/dartsmc0i/image/upload/v1774561451/Elephants_are_the_largest_existing_land_animal_in_bx7adr.jpg",
        difficulty: "easy"
      },
      {
        id: "a7",
        name: "",
        imageUrl: "https://res.cloudinary.com/dartsmc0i/image/upload/v1774563276/%D8%AA%D9%86%D8%B2%D9%8A%D9%84_1_j8tde6.jpg",
        difficulty: "hard"
      },
      {
        id: "a8",
        name: "",
        imageUrl: "https://res.cloudinary.com/dartsmc0i/image/upload/v1774562410/%D8%AA%D9%86%D8%B2%D9%8A%D9%84_4_weotmd.jpg",
        difficulty: "medium"
      },
      {
        id: "a9",
        name: "",
        imageUrl: "https://res.cloudinary.com/dartsmc0i/image/upload/v1774562227/%D8%AA%D9%86%D8%B2%D9%8A%D9%84_2_ufmqy3.jpg",
        difficulty: "medium"
      },
      {
        id: "a10",
        name: "",
        imageUrl: "https://res.cloudinary.com/dartsmc0i/image/upload/v1774562399/4cfbca76087a999ec8547dc49fde98e7_nglv8c.jpg",
        difficulty: "easy"
      },
      {
        id: "a11",
        name: "",
        imageUrl: "https://res.cloudinary.com/dartsmc0i/image/upload/v1774562403/%D8%AA%D9%86%D8%B2%D9%8A%D9%84_3_glsdrm.jpg",
        difficulty: "hard"
      },
      {
        id: "a12",
        name: "",
        imageUrl: "https://res.cloudinary.com/dartsmc0i/image/upload/v1774562401/Practice_Drawing_Fish_Cute_Cartoon_Drawings_to_Improve_Your_Skills_fk7esj.jpg",
        difficulty: "easy"
      },
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
  "": ""
};
