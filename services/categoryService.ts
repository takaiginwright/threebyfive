// NEW: persist categoryDefinitions per project
import { CategoryDefinition, CardCategory, SUBCATEGORIES } from '../types';

let currentNamespace = '3x5_';

export const setStorageNamespace = (userId: string | null) => {
    if (!userId || userId === 'guest') {
        currentNamespace = '3x5_';
    } else {
        currentNamespace = `3x5_user_${userId}_`;
    }
};

const getCategoryKey = (projectId: string) => `${currentNamespace}project_categories_${projectId}`;

// Built-in default categories (from static constants)
const getDefaultCategories = (): CategoryDefinition[] => {
    return Object.values(CardCategory).map(cat => ({
        id: cat.toLowerCase(),
        name: cat.toUpperCase(),
        subcategories: (SUBCATEGORIES[cat] || []).map(sub => ({
            id: `${cat.toLowerCase()}_${sub.toLowerCase().replace(/\s+/g, '_')}`,
            name: sub
        }))
    }));
};

// Load categories for a project (merges defaults with custom)
export const getCategoriesForProject = (projectId: string): CategoryDefinition[] => {
    try {
        const data = localStorage.getItem(getCategoryKey(projectId));
        if (data) {
            return JSON.parse(data);
        }
        // First time: seed with defaults
        const defaults = getDefaultCategories();
        localStorage.setItem(getCategoryKey(projectId), JSON.stringify(defaults));
        return defaults;
    } catch (e) {
        return getDefaultCategories();
    }
};

// Save categories for a project
const saveCategoriesForProject = (projectId: string, categories: CategoryDefinition[]) => {
    localStorage.setItem(getCategoryKey(projectId), JSON.stringify(categories));
};

// Add a new category
export const addCategory = (projectId: string, name: string): CategoryDefinition[] => {
    const categories = getCategoriesForProject(projectId);
    const normalizedName = name.trim().toUpperCase();

    // Check for duplicates (case-insensitive)
    if (categories.some(cat => cat.name.toUpperCase() === normalizedName)) {
        throw new Error('Category already exists');
    }

    const newCategory: CategoryDefinition = {
        id: crypto.randomUUID(),
        name: normalizedName,
        subcategories: []
    };

    const updated = [...categories, newCategory];
    saveCategoriesForProject(projectId, updated);
    return updated;
};

// Add a new subcategory to an existing category
export const addSubcategory = (projectId: string, categoryId: string, name: string): CategoryDefinition[] => {
    const categories = getCategoriesForProject(projectId);
    const categoryIndex = categories.findIndex(cat => cat.id === categoryId);

    if (categoryIndex === -1) {
        throw new Error('Category not found');
    }

    const category = categories[categoryIndex];
    const normalizedName = name.trim();

    // Check for duplicates within category (case-insensitive)
    if (category.subcategories.some(sub => sub.name.toLowerCase() === normalizedName.toLowerCase())) {
        throw new Error('Subcategory already exists in this category');
    }

    const newSubcategory = {
        id: crypto.randomUUID(),
        name: normalizedName
    };

    const updated = [...categories];
    updated[categoryIndex] = {
        ...category,
        subcategories: [...category.subcategories, newSubcategory]
    };

    saveCategoriesForProject(projectId, updated);
    return updated;
};
