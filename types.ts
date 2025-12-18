// NEW: custom category + subcategory support - Project-level definitions
export interface CategoryDefinition {
  id: string;
  name: string; // Display name (e.g., "SETTING", "CULTURE")
  subcategories: { id: string; name: string }[]; // Subcategories under this category
}

// Legacy enum kept for backward compatibility with existing tags
export enum CardCategory {
  Setting = 'Setting',
  Theme = 'Theme',
  Character = 'Character',
  Plot = 'Plot',
  Mood = 'Mood',
  Visuals = 'Visuals',
  Sound = 'Sound',
  Genre = 'Genre',
  Other = 'Other'
}

export const ALL_CATEGORIES = Object.values(CardCategory);

export const SUBCATEGORIES: Record<CardCategory, string[]> = {
  [CardCategory.Setting]: ['Location', 'Time Period', 'Atmosphere', 'World Rule'],
  [CardCategory.Theme]: ['Identity', 'Freedom', 'Memory', 'Dreams vs Reality', 'Belonging', 'Ancestry', 'Central Question'],
  [CardCategory.Character]: ['Archetype', 'Function', 'Trait', 'Flaw', 'Goal'],
  [CardCategory.Plot]: ['Beat', 'Device', 'Purpose', 'Structure', 'Conflict'],
  [CardCategory.Mood]: ['Dreamlike', 'Intense', 'Tender', 'Surreal', 'Melancholy', 'Gritty', 'Ethereal', 'Playful', 'Liminal', 'Mystical'],
  [CardCategory.Visuals]: ['Color', 'Style', 'Lighting', 'Composition'],
  [CardCategory.Sound]: ['Design', 'Music', 'Silence', 'Foley'],
  [CardCategory.Genre]: ['Genre Type', 'World Type', 'Trope'],
  [CardCategory.Other]: []
};

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  isGuest: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface IdeaSet {
  id: string;
  projectId: string;
  name: string;
  createdAt: number;
}

export interface StoryQuestion {
  id: string;
  projectId: string;
  question: string;
  description?: string;
  createdAt: number;
}

export type MediaType = 'image' | 'video' | 'audio' | 'link';

export interface MediaAttachment {
  id: string;
  type: MediaType;
  url: string;
  label?: string; // Caption or Link Title
}

export interface IdeaCard {
  id: string;
  projectId: string; // Link to Project
  title: string;
  content: string;
  tags: Partial<Record<CardCategory, string[]>>; // Key is Category. Value is formatted string
  media: MediaAttachment[];
  drawing?: string; // Base64 PNG data URL for sketches
  threads: string[]; // IDs of linked cards
  sets: string[]; // IDs of Sets this card belongs to
  storyQuestions: string[]; // IDs of Story Questions this card answers/relates to
  createdAt: number;
  updatedAt: number;
  color: string; // Changed to string to support migration, but typically CardColor
  isArchived?: boolean; // New Archive Flag
  
  // View Specific Data
  canvasX?: number;
  canvasY?: number;
  timelineOrder?: number;
}

// Cinematic Palette: Bold Accents
export type CardColor = 'white' | 'amber' | 'royal' | 'crimson' | 'gold' | 'sage' | 'plum' | 'teal';

export const CARD_COLORS: Record<string, string> = {
  // Light Mode Palette
  white: '#E5E7EB',   // Cool Gray 200 (Neutral)
  amber: '#FF9F1C',   // Amber Orange
  royal: '#2955D9',   // Deep Royal Blue
  crimson: '#D7263D', // Crimson Red
  gold: '#FFC43D',    // Golden Yellow
  sage: '#6BA292',    // Sage Green
  plum: '#6D2E7F',    // Plum Purple
  teal: '#1B9AAA',    // Teal Blue

  // Backward Compatibility
  pink: '#D7263D',
  lavender: '#6D2E7F',
  charcoal: '#E5E7EB',
};

// Dark Mode Palette (~85% brightness of light mode, slightly desaturated for screen comfort)
export const CARD_COLORS_DARK: Record<string, string> = {
  white: '#404040',   // Neutral Dark Gray Border
  amber: '#D9820B',   // Dimmed Amber
  royal: '#244BBF',   // Dimmed Royal
  crimson: '#BD2236', // Dimmed Crimson
  gold: '#D9A01A',    // Dimmed Gold
  sage: '#538576',    // Dimmed Sage
  plum: '#5E286E',    // Dimmed Plum
  teal: '#178593',    // Dimmed Teal

  // Backward Compatibility
  pink: '#BD2236',
  lavender: '#5E286E',
  charcoal: '#404040',
};

export type ViewMode = 'grid' | 'timeline' | 'canvas' | 'threads';

// Deprecated in favor of getThemeColor, but kept for legacy calls if any
export const getColorHex = (colorName: string): string => {
    return CARD_COLORS[colorName] || CARD_COLORS.white;
};

export const getThemeColor = (colorName: string, isDark: boolean): string => {
    const palette = isDark ? CARD_COLORS_DARK : CARD_COLORS;
    return palette[colorName] || palette.white;
};
