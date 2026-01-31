// ===========================
// Utilities Module
// Merged: icons.js + theme-manager.js
// ===========================

// ===========================
// ICONS LIBRARY
// ===========================

const icons = {
    dashboard: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    courses: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
    tasks: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
    resources: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    chat: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
    grades: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
    calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    announcements: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243-4.243m-6 0l-4.242 4.243m12.728 0l-4.242-4.243m-6 0l-4.243 4.243"></path></svg>`,
    logout: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
    search: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>`,
    bell: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
    sun: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
    moon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
    wave: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.828 14.828a4 4 0 0 1-5.656 0M9 10h.01M15 10h.01M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"></path></svg>`,
    plus: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`
};

// ===========================
// Icon Functions
// ===========================
export function getIcon(name) {
    return icons[name] || icons.dashboard;
}

export function injectNavIcons() {
    const navItems = [
        { selector: 'a[href="#dashboard"]', icon: 'dashboard' },
        { selector: 'a[href="#courses"]', icon: 'courses' },
        { selector: 'a[href="#tasks"]', icon: 'tasks' },
        { selector: 'a[href="#resources"]', icon: 'resources' },
        { selector: 'a[href="#chat"]', icon: 'chat' },
        { selector: 'a[href="#grades"]', icon: 'grades' },
        { selector: 'a[href="#calendar"]', icon: 'calendar' },
        { selector: 'a[href="#announcements"]', icon: 'announcements' },
        { selector: 'a[href="#settings"]', icon: 'settings' },
        { selector: 'a[href="#logout"]', icon: 'logout' }
    ];

    navItems.forEach(({ selector, icon }) => {
        const element = document.querySelector(selector);
        if (element) {
            const iconSpan = element.querySelector('.nav-icon');
            if (iconSpan) {
                iconSpan.innerHTML = getIcon(icon);
            }
        }
    });

    const searchIcon = document.querySelector('.search-bar span');
    if (searchIcon) searchIcon.innerHTML = getIcon('search');

    const notificationIcon = document.querySelector('.notification-icon');
    if (notificationIcon) notificationIcon.innerHTML = getIcon('bell');
}

// ===========================
// THEME MANAGER
// ===========================

export class ThemeManager {
    constructor() {
        this.currentTheme = this.getSavedTheme() || 'light';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupToggleListener();
    }

    getSavedTheme() {
        return localStorage.getItem('theme');
    }

    saveTheme(theme) {
        localStorage.setItem('theme', theme);
    }

    applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        this.saveTheme(theme);
        this.updateToggleUI();
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    setupToggleListener() {
        document.addEventListener('themeToggle', () => {
            this.toggleTheme();
        });
    }

    updateToggleUI() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.checked = this.currentTheme === 'dark';
        }

        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.innerHTML = this.currentTheme === 'dark' 
                ? getIcon('moon')
                : getIcon('sun');
        }
    }
}

export const themeManager = new ThemeManager();

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            themeManager.toggleTheme();
        });
    }

    const compactModeToggle = document.getElementById('compactMode');
    if (compactModeToggle) {
        const savedCompactMode = localStorage.getItem('compactMode') === 'true';
        compactModeToggle.checked = savedCompactMode;
        if (savedCompactMode) {
            document.documentElement.setAttribute('data-compact', 'true');
        }

        compactModeToggle.addEventListener('change', () => {
            const isCompact = compactModeToggle.checked;
            localStorage.setItem('compactMode', isCompact);
            if (isCompact) {
                document.documentElement.setAttribute('data-compact', 'true');
            } else {
                document.documentElement.removeAttribute('data-compact');
            }
        });
    }
});

console.log('Utils module (icons + theme) loaded!');
