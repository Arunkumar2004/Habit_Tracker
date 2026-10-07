// Checklists (blueprint 2.2 f). Ticks are stored in the `checklists` collection, record id = list id.

export interface CheckItem { key: string; text: string; hint?: string }
export interface CheckGroup { title: string; items: CheckItem[] }
export interface ChecklistDef {
  id: string;
  title: string;
  icon: string;
  intro: string;
  /** Plan month this list is meant for (shown as a pill; the list is always readable). */
  month?: number;
  groups: CheckGroup[];
}

export const CHECKLISTS: ChecklistDef[] = [
  {
    id: 'casting_ready', title: 'Casting-ready check', icon: 'target', month: 6,
    intro: 'Tick every line before you apply to agencies in Month 6.',
    groups: [
      {
        title: 'Body',
        items: [
          { key: 'b_shoulders', text: 'Shoulders wider than at Month 0 (photos side by side)' },
          { key: 'b_waist', text: 'Waist the same or smaller than at Month 0' },
          { key: 'b_posture', text: 'Posture stays tall without thinking about it' },
          { key: 'b_weight', text: 'Weight steady for the last 2 weeks' },
        ],
      },
      {
        title: 'Face and grooming',
        items: [
          { key: 'f_skin', text: 'Skincare AM + PM done for 8 weeks; skin is clear' },
          { key: 'f_hair', text: 'Best haircut chosen and freshly trimmed' },
          { key: 'f_beard', text: 'Beard style chosen (or clean-shaven), neat neckline' },
          { key: 'f_teeth', text: 'Teeth, nails and brows clean and tidy' },
        ],
      },
      {
        title: 'Walk and pose',
        items: [
          { key: 'w_line', text: 'Your walk film shows a straight line and a steady head' },
          { key: 'w_turn', text: 'Stop, hold 2 s and turn feel clean' },
          { key: 'w_poses', text: '8 poses without looking stiff' },
          { key: 'w_faces', text: '5 faces on cue' },
        ],
      },
      {
        title: 'Paperwork',
        items: [
          { key: 'p_digitals', text: '6 digitals shot in plain light' },
          { key: 'p_portfolio', text: '6–12 best photos picked for a small portfolio' },
          { key: 'p_card', text: 'Model card numbers up to date (height, chest, waist, shoe)' },
          { key: 'p_agencies', text: 'Agency list checked with the 3 questions below' },
        ],
      },
    ],
  },
  {
    id: 'shoot_day', title: 'Shoot-day checklist', icon: 'camera',
    intro: 'For digitals, test shoots and castings.',
    groups: [
      {
        title: 'Before you go',
        items: [
          { key: 's_sleep', text: 'Sleep 8 hours the night before' },
          { key: 's_skin', text: 'No new skincare products for 3 days before' },
          { key: 's_hair', text: 'Haircut and beard trim 3–5 days before, not the same day' },
          { key: 's_clothes', text: 'Plain fitted clothes ready and pressed (see wardrobe)' },
          { key: 's_nails', text: 'Nails short and clean' },
          { key: 's_bag', text: 'Water, a light snack, comb and lip balm in your bag' },
          { key: 's_phone', text: 'Phone charged, ID and the address saved' },
          { key: 's_time', text: 'Arrive 15 minutes early' },
        ],
      },
    ],
  },
  {
    id: 'wardrobe', title: '8-piece wardrobe', icon: 'wardrobe', month: 4,
    intro: 'Plain, well-fitted basics. No logos, no big prints.',
    groups: [
      {
        title: 'The 8 pieces',
        items: [
          { key: 'w_white_tee', text: 'Plain white T-shirt' },
          { key: 'w_black_tee', text: 'Plain black T-shirt' },
          { key: 'w_jeans', text: 'Dark slim jeans' },
          { key: 'w_trousers', text: 'Black trousers' },
          { key: 'w_shirt', text: 'White shirt' },
          { key: 'w_knit', text: 'Plain knit or sweatshirt in a neutral colour' },
          { key: 'w_sneakers', text: 'Clean white sneakers' },
          { key: 'w_shoes', text: 'Black shoes or Chelsea boots' },
        ],
      },
    ],
  },
  {
    id: 'digitals', title: '6 agency digitals', icon: 'camera', month: 5,
    intro: 'Plain wall, daylight, no filter, no edits. Black tee and dark jeans.',
    groups: [
      {
        title: 'The 6 shots',
        items: [
          { key: 'd_head_neutral', text: 'Headshot, front, neutral face' },
          { key: 'd_head_smile', text: 'Headshot, front, smiling' },
          { key: 'd_profile', text: 'Profile (side of the face)' },
          { key: 'd_half', text: 'Half body, waist up' },
          { key: 'd_full_front', text: 'Full length, front' },
          { key: 'd_full_side', text: 'Full length, side' },
        ],
      },
    ],
  },
];

/** "Is this agency real?" The safe answer for each question decides the result. */
export interface AgencyQuestion { key: string; q: string; safe: boolean; why: string }
export const AGENCY_CHECK: AgencyQuestion[] = [
  {
    key: 'q_fee', q: 'Do they ask you to pay a fee to join (registration, portfolio or training)?', safe: false,
    why: 'Real agencies earn a commission when you get booked. They do not charge you to sign up.',
  },
  {
    key: 'q_work', q: 'Can you find their models in real campaigns or shows, and a real office address?', safe: true,
    why: 'A real agency shows its work and has an address you can visit.',
  },
  {
    key: 'q_contract', q: 'Do they give you a written contract to read and take home before you sign?', safe: true,
    why: 'Never sign on the spot. Read it, and ask someone you trust.',
  },
];
export const AGENCY_CHECK_ID = 'agency_check';

export type AgencyVerdict = 'unanswered' | 'real' | 'walk_away';
/** answers: question key → true (yes) / false (no). Any unsafe answer → walk away. */
export function agencyVerdict(answers: Record<string, boolean>): AgencyVerdict {
  let all = true;
  for (const q of AGENCY_CHECK) {
    const a = answers[q.key];
    if (a === undefined) { all = false; continue; }
    if (a !== q.safe) return 'walk_away';
  }
  return all ? 'real' : 'unanswered';
}
