// Plan area entry point (blueprint 2.2). Screens: default (Roadmap / Week / Food / Lists), workout, routine.
import type { Screens } from '../../app/screens';
import { PlanHome } from './PlanHome';
import { WorkoutScreen } from './Workout';
import { RoutineScreen } from './Routine';
import { ExerciseGallery } from './anim';
import { PlanEditor } from './editor/PlanEditor';
import './plan.css';

export const planScreens: Screens = {
  default: PlanHome,
  workout: WorkoutScreen,
  routine: RoutineScreen,
  edit: PlanEditor,
  moves: ExerciseGallery,
};
