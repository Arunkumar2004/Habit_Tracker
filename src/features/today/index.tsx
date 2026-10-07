// OWNER: Today+Habits agent. Must export todayScreens and habitsScreens (with a 'default' key each).
import type { Screens } from '../../app/screens';
import './today.css';
import './quick'; // registers the Water, Protein and Note quick-add entries
import { TodayScreen } from './Today';
import { HabitsScreen } from './Habits';
import { HabitDetailScreen } from './HabitDetail';
import { HabitEditScreen } from './HabitEdit';

export const todayScreens: Screens = { default: TodayScreen };
/** 'habit' takes {id}; 'edit' takes {id} to edit or nothing (optionally {group}) to add. */
export const habitsScreens: Screens = { default: HabitsScreen, habit: HabitDetailScreen, edit: HabitEditScreen };
