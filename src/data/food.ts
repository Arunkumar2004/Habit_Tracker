// Food plan (blueprint 2.2 e): plate guide, a veg and a non-veg day (~2,300 kcal; 128 g / 141 g protein),
// and the weekly shopping list. Numbers are home-measure estimates for Indian food, close enough to steer by.
import type { Diet } from '../types';

export interface PlatePart { key: string; part: string; measure: string; examples: string; icon: string }
export const PLATE_GUIDE: PlatePart[] = [
  { key: 'protein', part: 'Protein', measure: '1 palm', examples: 'Paneer, eggs, chicken, fish, dal, curd, tofu', icon: 'protein' },
  { key: 'carbs', part: 'Carbs', measure: '1 fist', examples: 'Rice, roti, oats, potato, poha', icon: 'food' },
  { key: 'veg', part: 'Veg', measure: '2 fists', examples: 'Sabzi, salad, greens, any colour', icon: 'leaf' },
  { key: 'fat', part: 'Fat', measure: '1 thumb', examples: 'Ghee, oil, nuts, seeds', icon: 'water' },
];

export interface Meal { id: string; time: string; name: string; items: string[]; kcal: number; protein: number }
export interface DayMenu { diet: Diet; label: string; kcal: number; protein: number; meals: Meal[] }

const VEG_MEALS: Meal[] = [
  { id: 'breakfast', time: '7:30', name: 'Breakfast', items: ['Oats (60 g) cooked in 250 ml milk', '1 banana', '10 almonds'], kcal: 540, protein: 22 },
  { id: 'mid', time: '11:00', name: 'Mid-morning', items: ['Hung curd or Greek yoghurt (200 g)', '1 apple or guava'], kcal: 250, protein: 18 },
  { id: 'lunch', time: '13:30', name: 'Lunch', items: ['3 rotis', '1 bowl dal', '1 bowl sabzi', 'Salad'], kcal: 600, protein: 22 },
  { id: 'pre', time: '17:00', name: 'Before the gym', items: ['1 scoop whey in water', 'Roasted chana (40 g)'], kcal: 270, protein: 32 },
  { id: 'dinner', time: '20:30', name: 'Dinner', items: ['Paneer or tofu (100 g)', '1 cup rice', 'Mixed veg', 'Small bowl dal'], kcal: 520, protein: 27 },
  { id: 'bed', time: '22:00', name: 'Before bed', items: ['200 ml milk'], kcal: 120, protein: 7 },
];

const NONVEG_MEALS: Meal[] = [
  { id: 'breakfast', time: '7:30', name: 'Breakfast', items: ['3-egg omelette', '2 slices brown bread', '1 banana'], kcal: 480, protein: 25 },
  { id: 'mid', time: '11:00', name: 'Mid-morning', items: ['Hung curd or Greek yoghurt (200 g)', '1 apple or guava'], kcal: 250, protein: 18 },
  { id: 'lunch', time: '13:30', name: 'Lunch', items: ['Chicken curry (150 g raw weight)', '2 rotis', '½ cup rice', 'Salad'], kcal: 640, protein: 42 },
  { id: 'pre', time: '17:00', name: 'Before the gym', items: ['1 scoop whey in water', 'Roasted chana (30 g)'], kcal: 230, protein: 30 },
  { id: 'dinner', time: '20:30', name: 'Dinner', items: ['2 rotis with 1 tsp ghee', '1 bowl dal', 'Mixed veg', 'Salad'], kcal: 580, protein: 19 },
  { id: 'bed', time: '22:00', name: 'Before bed', items: ['200 ml milk'], kcal: 120, protein: 7 },
];

const sum = (m: Meal[], k: 'kcal' | 'protein') => m.reduce((n, x) => n + x[k], 0);

export const DAY_MENUS: Record<Diet, DayMenu> = {
  veg: { diet: 'veg', label: 'Veg day', kcal: sum(VEG_MEALS, 'kcal'), protein: sum(VEG_MEALS, 'protein'), meals: VEG_MEALS },
  non_veg: { diet: 'non_veg', label: 'Non-veg day', kcal: sum(NONVEG_MEALS, 'kcal'), protein: sum(NONVEG_MEALS, 'protein'), meals: NONVEG_MEALS },
};

/** How to bend the plan towards your own target. */
export const FOOD_TWEAKS = {
  more: 'Add a glass of milk and a banana (about +225 kcal, +7 g protein).',
  less: 'Have one roti less at lunch and dinner (about −200 kcal).',
  protein: 'Short on protein? Add 100 g hung curd (+10 g) or 2 egg whites (+7 g).',
};

export interface ShopItem { key: string; name: string; qty: string; diet?: Diet }
export interface ShopGroup { title: string; items: ShopItem[] }
export const SHOPPING_LIST: ShopGroup[] = [
  {
    title: 'Protein',
    items: [
      { key: 'milk', name: 'Milk', qty: '3.5 L' },
      { key: 'curd', name: 'Curd or Greek yoghurt', qty: '1.5 kg' },
      { key: 'whey', name: 'Whey protein', qty: '7 scoops' },
      { key: 'dal', name: 'Dal (mixed)', qty: '750 g' },
      { key: 'chana', name: 'Roasted chana', qty: '300 g' },
      { key: 'paneer', name: 'Paneer or tofu', qty: '700 g', diet: 'veg' },
      { key: 'eggs', name: 'Eggs', qty: '21' , diet: 'non_veg' },
      { key: 'chicken', name: 'Chicken or fish', qty: '1.05 kg', diet: 'non_veg' },
    ],
  },
  {
    title: 'Carbs',
    items: [
      { key: 'oats', name: 'Oats', qty: '450 g', diet: 'veg' },
      { key: 'bread', name: 'Brown bread', qty: '1 loaf', diet: 'non_veg' },
      { key: 'atta', name: 'Whole-wheat atta', qty: '1.5 kg' },
      { key: 'rice', name: 'Rice', qty: '1 kg' },
    ],
  },
  {
    title: 'Fruit and veg',
    items: [
      { key: 'banana', name: 'Bananas', qty: '14' },
      { key: 'apple', name: 'Apples or guavas', qty: '7' },
      { key: 'veg', name: 'Mixed vegetables', qty: '3 kg' },
      { key: 'salad', name: 'Cucumber, tomato, onion, lemon', qty: '2 kg' },
      { key: 'greens', name: 'Spinach or methi', qty: '2 bunches' },
    ],
  },
  {
    title: 'Fats and extras',
    items: [
      { key: 'almonds', name: 'Almonds', qty: '100 g' },
      { key: 'ghee', name: 'Ghee or cooking oil', qty: '250 ml' },
      { key: 'spices', name: 'Spices top-up', qty: 'as needed' },
    ],
  },
];

export function shoppingFor(diet: Diet): ShopGroup[] {
  return SHOPPING_LIST.map((g) => ({ ...g, items: g.items.filter((i) => !i.diet || i.diet === diet) }));
}
