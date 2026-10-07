import type { ComponentType } from 'react';

export interface ScreenProps { params: Record<string, string> }
/** Each feature area exports a map of screens for its tab; 'default' is the tab's main screen. */
export type Screens = Record<string, ComponentType<ScreenProps>>;
