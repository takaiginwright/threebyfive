
import { IdeaCard, Project, IdeaSet, StoryQuestion } from '../types';

const THEME_KEY = '3x5_theme';

// Session Management for Storage
let currentNamespace = '3x5_'; // Default to guest/legacy

export const setStorageNamespace = (userId: string | null) => {
    if (!userId || userId === 'guest') {
        currentNamespace = '3x5_'; // Keeps legacy data as "Guest" data
    } else {
        currentNamespace = `3x5_user_${userId}_`;
    }
};

const getKey = (base: string) => `${currentNamespace}${base}`;

const KEYS = {
    CARDS: 'cards',
    PROJECTS: 'projects',
    SETS: 'sets',
    QUESTIONS: 'questions'
};

// THEME (Global)
export type Theme = 'light' | 'dark';

export const getTheme = (): Theme => {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    return (theme === 'dark' || theme === 'light') ? theme : 'light';
  } catch (e) {
    return 'light';
  }
};

export const saveTheme = (theme: Theme) => {
  localStorage.setItem(THEME_KEY, theme);
};

// PROJECTS

export const getProjects = (): Project[] => {
  try {
    const data = localStorage.getItem(getKey(KEYS.PROJECTS));
    const projects = data ? JSON.parse(data) : [];
    
    // Ensure "General" project always exists
    if (!projects.find((p: Project) => p.id === 'general')) {
        const general: Project = { id: 'general', name: 'General', createdAt: Date.now() };
        projects.unshift(general);
        localStorage.setItem(getKey(KEYS.PROJECTS), JSON.stringify(projects));
        return projects;
    }
    return projects;
  } catch (e) {
    return [{ id: 'general', name: 'General', createdAt: Date.now() }];
  }
};

export const saveProject = (project: Project): Project[] => {
    const projects = getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    let newProjects;
    if (index >= 0) {
        newProjects = [...projects];
        newProjects[index] = project;
    } else {
        newProjects = [...projects, project];
    }
    localStorage.setItem(getKey(KEYS.PROJECTS), JSON.stringify(newProjects));
    return newProjects;
};

export const deleteProject = (id: string): Project[] => {
    if (id === 'general') return getProjects(); // Cannot delete general
    const projects = getProjects().filter(p => p.id !== id);
    localStorage.setItem(getKey(KEYS.PROJECTS), JSON.stringify(projects));
    
    // Delete Sets associated with project
    const sets = getSets();
    const updatedSets = sets.filter(s => s.projectId !== id);
    localStorage.setItem(getKey(KEYS.SETS), JSON.stringify(updatedSets));
    
    // Delete Questions associated with project
    const questions = getStoryQuestions();
    const updatedQuestions = questions.filter(q => q.projectId !== id);
    localStorage.setItem(getKey(KEYS.QUESTIONS), JSON.stringify(updatedQuestions));

    // Move orphaned cards to General
    const cards = getCards();
    const updatedCards = cards.map(c => c.projectId === id ? { ...c, projectId: 'general', sets: [], storyQuestions: [] } : c);
    localStorage.setItem(getKey(KEYS.CARDS), JSON.stringify(updatedCards));
    
    return projects;
};

// SETS

export const getSets = (): IdeaSet[] => {
    try {
        const data = localStorage.getItem(getKey(KEYS.SETS));
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
};

export const saveSet = (set: IdeaSet): IdeaSet[] => {
    const sets = getSets();
    const index = sets.findIndex(s => s.id === set.id);
    let newSets;
    if (index >= 0) {
        newSets = [...sets];
        newSets[index] = set;
    } else {
        newSets = [...sets, set];
    }
    localStorage.setItem(getKey(KEYS.SETS), JSON.stringify(newSets));
    return newSets;
};

export const deleteSet = (id: string): IdeaSet[] => {
    const sets = getSets().filter(s => s.id !== id);
    localStorage.setItem(getKey(KEYS.SETS), JSON.stringify(sets));
    
    // Clean up cards
    const cards = getCards();
    const updatedCards = cards.map(c => ({
        ...c,
        sets: c.sets ? c.sets.filter(sId => sId !== id) : []
    }));
    localStorage.setItem(getKey(KEYS.CARDS), JSON.stringify(updatedCards));
    
    return sets;
};

// STORY QUESTIONS

export const getStoryQuestions = (): StoryQuestion[] => {
    try {
        const data = localStorage.getItem(getKey(KEYS.QUESTIONS));
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
};

export const saveStoryQuestion = (question: StoryQuestion): StoryQuestion[] => {
    const questions = getStoryQuestions();
    const index = questions.findIndex(q => q.id === question.id);
    let newQuestions;
    if (index >= 0) {
        newQuestions = [...questions];
        newQuestions[index] = question;
    } else {
        newQuestions = [...questions, question];
    }
    localStorage.setItem(getKey(KEYS.QUESTIONS), JSON.stringify(newQuestions));
    return newQuestions;
};

export const deleteStoryQuestion = (id: string): StoryQuestion[] => {
    const questions = getStoryQuestions().filter(q => q.id !== id);
    localStorage.setItem(getKey(KEYS.QUESTIONS), JSON.stringify(questions));

    // Clean up cards
    const cards = getCards();
    const updatedCards = cards.map(c => ({
        ...c,
        storyQuestions: c.storyQuestions ? c.storyQuestions.filter(qId => qId !== id) : []
    }));
    localStorage.setItem(getKey(KEYS.CARDS), JSON.stringify(updatedCards));

    return questions;
};


// CARDS

export const getCards = (): IdeaCard[] => {
  try {
    const data = localStorage.getItem(getKey(KEYS.CARDS));
    let cards: IdeaCard[] = data ? JSON.parse(data) : [];
    
    // Migration: Ensure all cards have a projectId
    if (cards.some(c => !c.projectId)) {
        cards = cards.map(c => c.projectId ? c : { ...c, projectId: 'general' });
        localStorage.setItem(getKey(KEYS.CARDS), JSON.stringify(cards));
    }
    
    // Migration: Ensure all cards have media array
    if (cards.some(c => !c.media)) {
        cards = cards.map(c => c.media ? c : { ...c, media: [] });
        localStorage.setItem(getKey(KEYS.CARDS), JSON.stringify(cards));
    }

    // Migration: Ensure all cards have threads array
    if (cards.some(c => !c.threads)) {
        cards = cards.map(c => c.threads ? c : { ...c, threads: [] });
        localStorage.setItem(getKey(KEYS.CARDS), JSON.stringify(cards));
    }

    // Migration: Ensure all cards have sets array
    if (cards.some(c => !c.sets)) {
        cards = cards.map(c => c.sets ? c : { ...c, sets: [] });
        localStorage.setItem(getKey(KEYS.CARDS), JSON.stringify(cards));
    }
    
    // Migration: Ensure all cards have storyQuestions array
    if (cards.some(c => !c.storyQuestions)) {
        cards = cards.map(c => c.storyQuestions ? c : { ...c, storyQuestions: [] });
        localStorage.setItem(getKey(KEYS.CARDS), JSON.stringify(cards));
    }
    
    // Migration: Ensure isArchived exists
    if (cards.some(c => c.isArchived === undefined)) {
        cards = cards.map(c => c.isArchived === undefined ? { ...c, isArchived: false } : c);
        localStorage.setItem(getKey(KEYS.CARDS), JSON.stringify(cards));
    }

    // Migration: Ensure Canvas & Timeline Data
    let needsSave = false;
    cards = cards.map((c, index) => {
        let updated = { ...c };
        if (updated.canvasX === undefined) {
             updated.canvasX = Math.random() * 600; // Random spread for initial look
             updated.canvasY = Math.random() * 400;
             needsSave = true;
        }
        if (updated.timelineOrder === undefined) {
            updated.timelineOrder = index;
            needsSave = true;
        }
        return updated;
    });

    if (needsSave) {
        localStorage.setItem(getKey(KEYS.CARDS), JSON.stringify(cards));
    }
    
    return cards;
  } catch (e) {
    console.error('Failed to load cards', e);
    return [];
  }
};

export const saveCard = (card: IdeaCard): IdeaCard[] => {
  const cards = getCards();
  const index = cards.findIndex((c) => c.id === card.id);
  let newCards;
  if (index >= 0) {
    newCards = [...cards];
    newCards[index] = card;
  } else {
    // New card defaults
    if (card.canvasX === undefined) {
        card.canvasX = window.innerWidth / 2 - 150 + (Math.random() * 40 - 20);
        card.canvasY = window.innerHeight / 2 - 100 + (Math.random() * 40 - 20);
    }
    if (card.timelineOrder === undefined) {
        card.timelineOrder = cards.length;
    }
    if (!card.sets) {
        card.sets = [];
    }
    if (!card.storyQuestions) {
        card.storyQuestions = [];
    }
    if (card.isArchived === undefined) {
        card.isArchived = false;
    }
    newCards = [card, ...cards];
  }
  localStorage.setItem(getKey(KEYS.CARDS), JSON.stringify(newCards));
  return newCards;
};

export const saveCards = (cards: IdeaCard[]): IdeaCard[] => {
    localStorage.setItem(getKey(KEYS.CARDS), JSON.stringify(cards));
    return cards;
}

export const deleteCard = (id: string): IdeaCard[] => {
  const cards = getCards();
  // Remove card
  const newCards = cards.filter((c) => c.id !== id);
  // Remove threads pointing to this card
  const cleanedCards = newCards.map(c => ({
    ...c,
    threads: c.threads ? c.threads.filter(tid => tid !== id) : []
  }));
  
  localStorage.setItem(getKey(KEYS.CARDS), JSON.stringify(cleanedCards));
  return cleanedCards;
};

export const createNewCard = (projectId: string = 'general'): IdeaCard => ({
  id: crypto.randomUUID(),
  projectId,
  title: '',
  content: '',
  tags: {},
  media: [],
  drawing: undefined,
  threads: [],
  sets: [],
  storyQuestions: [],
  isArchived: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  color: 'white'
});
