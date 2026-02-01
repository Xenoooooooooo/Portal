// ===========================
// Task & Dashboard Module
// Merged: task-manager.js + dashboard-loader.js
// ===========================

// Day order for proper week sorting
const DAY_ORDER = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };

// Time conversion utilities (top-level so they're accessible everywhere)
function convertTo12Hour(time24) {
    if (!time24) return '';
    const [hour, minutes] = time24.split(':');
    let h = parseInt(hour);
    const period = h >= 12 ? 'pm' : 'am';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${minutes} ${period}`;
}

function convertTo24Hour(time12) {
    if (!time12) return '';
    const match = time12.match(/(\d+):(\d+)\s*(am|pm)/i);
    if (!match) return time12; // If format is already 24-hour
    let hour = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toLowerCase();
    
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    
    return `${String(hour).padStart(2, '0')}:${minutes}`;
}

function formatScheduleList(schedule) {
    if (!Array.isArray(schedule) || schedule.length === 0) return 'N/A';
    
    // Sort by day of week
    const sorted = [...schedule].sort((a, b) => {
        const orderA = DAY_ORDER[a.day] ?? 7;
        const orderB = DAY_ORDER[b.day] ?? 7;
        return orderA - orderB;
    });
    
    // Format as list items
    return sorted.map(s => `<div style="font-size: 0.9rem; padding: 0.25rem 0;">📅 ${s.day} ${formatScheduleTime(s.start)}-${formatScheduleTime(s.end)}</div>`).join('');
}

import { getCurrentUserId } from './auth.js';
import { 
    getUserTasks, 
    addTask, 
    updateTaskStatus,
    getUserData,
    getUserCourses,
    getUserResources,
    getAnnouncements,
    getUserChats,
    getUserEvents,
    getDashboardStats,
    database,
    addCourseMaterial,
    getCourseMaterials,
    deleteCourseMaterial,
    addCourse,
    updateCourse
} from './firebase-service.js';

let currentTasks = [];
let currentFilter = 'All Tasks';
let isLoading = false;

// ===========================
// Toast Notification System
// ===========================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? `background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;` : ''}
        ${type === 'error' ? `background: linear-gradient(135deg, #f87171 0%, #ef4444 100%); color: white;` : ''}
        ${type === 'info' ? `background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white;` : ''}
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .task-item-full { animation: fadeInUp 0.3s ease; }
    .skeleton { animation: pulse 2s infinite; background: linear-gradient(90deg, var(--light) 25%, rgba(255, 255, 255, 0.2) 50%, var(--light) 75%); background-size: 200% 100%; }
`;
document.head.appendChild(style);

// ===========================
// Dashboard Loading
// ===========================
export async function loadDashboard() {
    const userId = getCurrentUserId();
    if (!userId) {
        console.error('No user ID found');
        return;
    }

    try {
        
        
        const [stats, tasks, courses, resources, announcements, chats, events] = await Promise.all([
            getDashboardStats(userId),
            getUserTasks(userId),
            getUserCourses(userId),
            getUserResources(userId),
            getAnnouncements(),
            getUserChats(userId),
            getUserEvents(userId)
        ]);

        updateStatsCards(stats);
        updateTasksList(tasks);
        updateCoursesList(courses);
        updateResourcesList(resources);
        updateAnnouncementsList(announcements);
        updateChatsList(chats);
        updateEventsList(events);

        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ===========================
// Update Stats Cards
// ===========================
function updateStatsCards(stats) {
    const statCards = document.querySelectorAll('.stat-card');
    
    if (statCards.length >= 4) {
        statCards[0].querySelector('h3').textContent = stats.activeCourses;
        statCards[1].querySelector('h3').textContent = stats.pendingTasks;
        statCards[2].querySelector('h3').textContent = stats.gpa.toFixed(1);
        statCards[3].querySelector('h3').textContent = `${stats.attendance}%`;
    }
}

// ===========================
// Update Tasks List
// ===========================
function updateTasksList(tasks) {
    const taskList = document.querySelector('#dashboard .task-list');
    if (!taskList) return;

    if (tasks.length === 0) {
        taskList.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);"><div style="font-size: 3rem; margin-bottom: 1rem;">📝</div><h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Tasks Yet</h3><p>Your assignments will appear here</p></div>`;
        return;
    }

    const sortedTasks = tasks
        .filter(task => !task.completed)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 4);

    taskList.innerHTML = sortedTasks.map(task => `
        <div class="task-item ${task.priority === 'urgent' ? 'urgent' : ''}" data-task-id="${task.id}">
            <div class="task-check"></div>
            <div class="task-content">
                <h4>${task.title}</h4>
                <p>Due: ${formatDate(task.dueDate)}</p>
                <span class="task-tag ${task.priority === 'urgent' ? 'urgent' : ''}">${task.priority || 'Medium'}</span>
            </div>
        </div>
    `).join('');

    attachTaskCheckboxHandlers();
}

// ===========================
// Helper Functions
// ===========================
function formatScheduleTime(time24) {
    if (!time24 || time24.length !== 5) return time24;
    const [hours, minutes] = time24.split(':');
    let hour = parseInt(hours);
    const period = hour >= 12 ? 'pm' : 'am';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minutes} ${period}`;
}

// ===========================
// Update Courses List
// ===========================
export function updateCoursesList(courses) {
    const coursesGrid = document.querySelector('#courses .courses-grid');
    if (!coursesGrid) return;

    if (courses.length === 0) {
        coursesGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);"><div style="font-size: 3rem; margin-bottom: 1rem;">📚</div><h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Courses Yet</h3></div>`;
        return;
    }

    // Change grid to column layout for course dashboards
    coursesGrid.style.gridTemplateColumns = '1fr';
    
    coursesGrid.innerHTML = courses.map(course => `
        <div class="course-dashboard" data-course-id="${course.id}">
            <div class="course-dashboard-header" style="background: ${course.color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};">
                <div class="course-dashboard-title">
                    <div class="course-expand-icon">▶</div>
                    <div>
                        <h3 style="margin: 0;">${course.name}</h3>
                        <span class="course-code">${course.code}</span>
                    </div>
                </div>
                <div class="course-dashboard-actions">
                    <button class="course-edit-btn" data-course-id="${course.id}" title="Edit Course" style="display: flex; align-items: center; justify-content: center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="course-delete-btn" data-course-id="${course.id}" title="Delete Course" style="display: flex; align-items: center; justify-content: center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="course-dashboard-content" style="display: none;">
                <div class="course-details">
                    <div class="detail-item">
                        <span class="detail-label">Instructor:</span>
                        <span class="detail-value">${course.instructor || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Schedule:</span>
                        <div class="detail-value" style="padding-top: 0.25rem;">${Array.isArray(course.schedule) ? formatScheduleList(course.schedule) : (course.schedule || 'N/A')}</div>
                    </div>
                </div>
                <div class="course-section">
                    <h4 style="margin-top: 1rem; margin-bottom: 0.75rem; color: var(--text-primary);">📝 Course Tasks</h4>
                    <div class="course-tasks-list" data-course-id="${course.id}">
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">Loading tasks...</p>
                    </div>
                    <button class="btn-add-task" data-course-id="${course.id}" style="padding: 0.5rem; margin-top: 0.75rem; border-radius: 6px; border: 1px dashed var(--border); background: transparent; color: var(--primary-color); font-weight: 500; cursor: pointer; transition: all 0.2s;">+ Add Task</button>
                </div>
                <div class="course-section">
                    <h4 style="margin-top: 1rem; margin-bottom: 0.75rem; color: var(--text-primary);">📚 Course Materials</h4>
                    <div class="course-materials-list" data-course-id="${course.id}">
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">Loading materials...</p>
                    </div>
                    <button class="btn-add-material" data-course-id="${course.id}" style="padding: 0.5rem; margin-top: 0.75rem; border-radius: 6px; border: 1px dashed var(--border); background: transparent; color: var(--primary-color); font-weight: 500; cursor: pointer; transition: all 0.2s;">+ Add Material</button>
                </div>
            </div>
        </div>
    `).join('');

    // Attach event listeners
    attachCourseExpandListeners();
    attachCourseDashboardActions();
    loadCourseTasks();
    loadCourseMaterials();
}

// ===========================
// Update Resources List
// ===========================
function updateResourcesList(resources) {
    const resourceList = document.querySelector('#dashboard .resource-list');
    if (!resourceList) return;

    if (resources.length === 0) {
        resourceList.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);"><div style="font-size: 3rem; margin-bottom: 1rem;">📁</div><h3>No Resources Yet</h3></div>`;
        return;
    }

    const recentResources = resources.slice(0, 3);
    resourceList.innerHTML = recentResources.map(resource => `
        <div class="resource-item">
            <div class="resource-icon ${resource.type}">${getResourceIcon(resource.type)}</div>
            <div class="resource-content">
                <h4>${resource.title}</h4>
                <p>${formatDate(resource.uploadedAt)}</p>
            </div>
        </div>
    `).join('');
}

// ===========================
// Update Announcements List
// ===========================
function updateAnnouncementsList(announcements) {
    const announcementList = document.querySelector('#dashboard .announcement-list');
    if (!announcementList) return;

    if (announcements.length === 0) {
        announcementList.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);"><div style="font-size: 3rem; margin-bottom: 1rem;">📢</div><h3>No Announcements</h3></div>`;
        return;
    }

    const recentAnnouncements = announcements.slice(0, 3);
    announcementList.innerHTML = recentAnnouncements.map(announcement => `
        <div class="announcement-item">
            <div class="announcement-icon">${announcement.icon || '📢'}</div>
            <div class="announcement-content">
                <h4>${announcement.title}</h4>
                <p>${announcement.message}</p>
            </div>
        </div>
    `).join('');
}

// ===========================
// Update Chats List
// ===========================
function updateChatsList(chats) {
    const chatList = document.querySelector('#dashboard .chat-list');
    if (!chatList) return;

    if (chats.length === 0) {
        chatList.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);"><div style="font-size: 3rem; margin-bottom: 1rem;">💬</div><h3>No Chats Yet</h3></div>`;
        return;
    }

    const recentChats = chats.slice(0, 3);
    chatList.innerHTML = recentChats.map(chat => `
        <div class="chat-item ${chat.unread ? 'unread' : ''}">
            <div class="chat-avatar">${chat.initials || 'U'}</div>
            <div class="chat-content">
                <h4>${chat.name}</h4>
                <p>${chat.lastMessage}</p>
            </div>
        </div>
    `).join('');
}

// ===========================
// Update Events List
// ===========================
function updateEventsList(events) {
    const eventsList = document.querySelector('#dashboard .calendar-events');
    if (!eventsList) return;

    if (events.length === 0) {
        eventsList.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);"><p>No upcoming events</p></div>`;
        return;
    }

    const upcomingEvents = events
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 2);

    eventsList.innerHTML = upcomingEvents.map(event => `
        <div class="event-item">
            <div class="event-date">
                <span class="date-day">${new Date(event.date).getDate()}</span>
                <span class="date-month">${new Date(event.date).toLocaleString('default', { month: 'short' }).toUpperCase()}</span>
            </div>
            <div class="event-info">
                <h4>${event.title}</h4>
                <p>${event.time}</p>
            </div>
        </div>
    `).join('');
}

// ===========================
// Course Dashboard Functions
// ===========================
function attachCourseExpandListeners() {
    const courseHeaders = document.querySelectorAll('.course-dashboard-header');
    courseHeaders.forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.closest('.course-dashboard-actions')) return;
            const dashboard = header.closest('.course-dashboard');
            const content = dashboard.querySelector('.course-dashboard-content');
            const icon = dashboard.querySelector('.course-expand-icon');
            
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
            icon.style.transform = content.style.display === 'none' ? 'rotate(0deg)' : 'rotate(90deg)';
            icon.style.transition = 'transform 0.3s ease';
        });
    });
}

function attachCourseDashboardActions() {
    // Edit course buttons
    document.querySelectorAll('.course-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const courseId = btn.dataset.courseId;
            showEditCourseModal(courseId);
        });
    });

    // Delete course buttons
    document.querySelectorAll('.course-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const courseId = btn.dataset.courseId;
            if (confirm('Are you sure you want to delete this course?')) {
                deleteCourse(courseId);
            }
        });
    });

    // Add task buttons
    document.querySelectorAll('.btn-add-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const courseId = btn.dataset.courseId;
            showAddTaskModal(courseId);
        });
    });

    // Add material buttons
    document.querySelectorAll('.btn-add-material').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const courseId = btn.dataset.courseId;
            showAddMaterialModal(courseId);
        });
    });
}

async function loadCourseTasks() {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
        const tasks = await getUserTasks(userId);
        const coursesGrid = document.querySelector('#courses .courses-grid');
        if (!coursesGrid) return;
        
        const courseDashboards = coursesGrid.querySelectorAll('.course-dashboard');

        courseDashboards.forEach(dashboard => {
            const courseId = dashboard.dataset.courseId;
            const tasksList = dashboard.querySelector('.course-tasks-list');
            const courseTasks = tasks.filter(task => task.courseId === courseId);

            if (courseTasks.length === 0) {
                tasksList.innerHTML = `<p style="color: var(--text-secondary); font-size: 0.9rem;">No tasks yet</p>`;
            } else {
                tasksList.innerHTML = courseTasks.map(task => `
                    <div class="course-task-item" data-task-id="${task.id}" style="padding: 0.6rem; background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} style="cursor: pointer;">
                        <div style="flex: 1; min-width: 0;">
                            <p style="margin: 0; font-size: 0.9rem; color: var(--text-primary); ${task.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${task.title}</p>
                            <p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">Due: ${task.dueDate ? formatDate(task.dueDate) : 'N/A'}</p>
                        </div>
                        <button class="delete-task-btn" style="background: transparent; border: none; color: var(--danger-color); cursor: pointer; font-size: 0.9rem;">✕</button>
                    </div>
                `).join('');

                // Attach task item listeners
                tasksList.querySelectorAll('.task-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        const taskId = e.target.closest('.course-task-item').dataset.taskId;
                        updateTaskStatus(userId, taskId, e.target.checked);
                    });
                });

                tasksList.querySelectorAll('.delete-task-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const taskId = e.target.closest('.course-task-item').dataset.taskId;
                        deleteTaskFromCourse(userId, taskId);
                    });
                });
            }
        });
    } catch (error) {
        console.error('Error loading course tasks:', error);
    }
}

async function deleteTaskFromCourse(userId, taskId) {
    try {
        const taskRef = ref(database, `users/${userId}/tasks/${taskId}`);
        await remove(taskRef);
        loadCourseTasks();
    } catch (error) {
        console.error('Error deleting task:', error);
        showToast('Failed to delete task', 'error');
    }
}

async function deleteCourse(courseId) {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
        // Delete the course
        const courseRef = ref(database, `users/${userId}/courses/${courseId}`);
        await remove(courseRef);

        // Delete all tasks associated with this course
        const tasks = await getUserTasks(userId);
        const associatedTasks = tasks.filter(task => task.courseId === courseId);
        
        for (const task of associatedTasks) {
            const taskRef = ref(database, `users/${userId}/tasks/${task.id}`);
            await remove(taskRef);
        }

        loadDashboard();
        showToast('Course and associated tasks deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting course:', error);
        showToast('Failed to delete course', 'error');
    }
}

async function showEditCourseModal(courseId) {
    const userId = getCurrentUserId();
    if (!userId) return;
    
    // Fetch current course data
    try {
        const courses = await getUserCourses(userId);
        const course = courses.find(c => c.id === courseId);
        if (!course) {
            showToast('Course not found', 'error');
            return;
        }

        if (document.querySelector('.edit-course-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'course-edit-overlay';
        overlay.style.cssText = `position: fixed; top:0; left:0; right:0; bottom:0; display:flex; align-items:center; justify-content:center; z-index:9999; background: rgba(0,0,0,0.45);`;

        const modal = document.createElement('div');
        modal.className = 'task-modal';
        modal.style.cssText = `background: var(--white); border-radius: 12px; padding: 1.5rem; max-width: 600px; width: 90%; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); max-height: 80vh; overflow-y: auto;`;

        const scheduleHTML = Array.isArray(course.schedule) 
            ? course.schedule.map((s, idx) => `
                <div class="schedule-item" data-id="${idx}" style="flex:1; font-size:0.95rem; font-weight: 500; display: flex; justify-content: space-between; align-items: center; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
                        <span style="color: var(--text-primary);">${s.day}</span>
                        <span style="color: var(--text-secondary); margin: 0 0.25rem;">|</span>
                        <span style="color: var(--text-primary);">${convertTo12Hour(s.start)} - ${convertTo12Hour(s.end)}</span>
                    </div>
                    <button type="button" class="remove-schedule" style="background: transparent; border: none; cursor: pointer; font-size: 1.1rem; flex-shrink: 0; color: var(--danger-color); padding: 0.25rem;">✕</button>
                </div>
            `).join('')
            : '';

        modal.innerHTML = `
            <h2 style="font-size:1.25rem; font-weight:700; margin-bottom: 0.5rem;">Edit Course</h2>
            <form id="editCourseForm" style="display:flex; flex-direction:column; gap: 1rem; margin-top:0.5rem; width: 100%; box-sizing: border-box;">
                <div class="form-row">
                    <label style="font-weight:600; color:var(--text-primary); margin-bottom: 0.35rem; display: block;">Course Name *</label>
                    <input type="text" id="editCourseName" value="${course.name || ''}" required placeholder="e.g., Engineering Mechanics" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary);">
                </div>
                <div class="form-row">
                    <label style="font-weight:600; color:var(--text-primary); margin-bottom: 0.35rem; display: block;">Course Code *</label>
                    <input type="text" id="editCourseCode" value="${course.code || ''}" required placeholder="e.g., ENGR 301" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary);">
                </div>
                <div class="form-row">
                    <label style="font-weight:600; color:var(--text-primary); margin-bottom: 0.35rem; display: block;">Instructor</label>
                    <input type="text" id="editCourseInstructor" value="${course.instructor || ''}" placeholder="e.g., Prof. Garcia" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary);">
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
                    <label style="font-weight:600; color:var(--text-primary); margin-bottom: 0rem; display: block;">Schedule</label>
                    
                    <!-- Added Schedules Container -->
                    <div class="schedule-list" id="editSchedulesList" style="margin-bottom: 0.75rem; width: 100%; box-sizing: border-box;">${scheduleHTML}</div>
                    
                    <!-- Schedule Input Container -->
                    <div class="schedule-input-container" style="background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem; width: 100%; box-sizing: border-box;">
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <select id="editScheduleDay" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); background: var(--card-bg); font-size: 0.9rem; box-sizing: border-box;">
                                <option value="Mon">Monday</option>
                                <option value="Tue">Tuesday</option>
                                <option value="Wed">Wednesday</option>
                                <option value="Thu">Thursday</option>
                                <option value="Fri">Friday</option>
                                <option value="Sat">Saturday</option>
                                <option value="Sun">Sunday</option>
                            </select>
                            <div style="display: flex; gap: 0.4rem; align-items: center;">
                                <input type="time" id="editScheduleStart" style="flex:1; padding: 0.6rem; border: 1px solid var(--border); border-radius: 8px; font-size: 0.9rem; box-sizing: border-box;" placeholder="--:--">
                                <span style="color: var(--text-secondary); font-weight: 600; font-size: 0.95rem;">-</span>
                                <input type="time" id="editScheduleEnd" style="flex:1; padding: 0.6rem; border: 1px solid var(--border); border-radius: 8px; font-size: 0.9rem; box-sizing: border-box;" placeholder="--:--">
                            </div>
                            <button type="button" id="addEditScheduleBtn" class="btn primary" style="width: 100%; padding: 0.6rem; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box;">Add Schedule</button>
                        </div>
                    </div>
                </div>
                <div class="modal-actions" style="margin-top: 0.5rem;">
                    <button type="button" id="cancelEditBtn" class="btn cancel">Cancel</button>
                    <button type="submit" class="btn primary">Save Changes</button>
                </div>
            </form>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const form = modal.querySelector('#editCourseForm');
        const cancelBtn = modal.querySelector('#cancelEditBtn');
        const addScheduleBtn = modal.querySelector('#addEditScheduleBtn');
        const schedulesList = modal.querySelector('#editSchedulesList');

        function renderScheduleItem(day, start, end) {
            const item = document.createElement('div');
            item.className = 'schedule-item';
            const start12 = convertTo12Hour(start);
            const end12 = convertTo12Hour(end);
            item.innerHTML = `
                <div style="flex:1; font-size:0.95rem; font-weight: 500; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="color: var(--text-primary);">${day}</span>
                        <span style="color: var(--text-secondary); margin: 0 0.25rem;">|</span>
                        <span style="color: var(--text-primary);">${start12} - ${end12}</span>
                    </div>
                    <button type="button" class="remove-schedule" style="background: transparent; border: none; cursor: pointer; font-size: 1.1rem; flex-shrink: 0; color: var(--danger-color); padding: 0.25rem;">✕</button>
                </div>
            `;
            item.style.cssText = `background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem; display: flex; align-items: center;`;
            const removeBtn = item.querySelector('.remove-schedule');
            removeBtn.addEventListener('click', () => item.remove());
            schedulesList.appendChild(item);
        }

        // Add schedule handler
        addScheduleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const day = modal.querySelector('#editScheduleDay').value;
            const start = modal.querySelector('#editScheduleStart').value;
            const end = modal.querySelector('#editScheduleEnd').value;
            if (!start || !end) {
                showToast('Please select start and end time', 'error');
                return;
            }
            renderScheduleItem(day, start, end);
        });

        // Remove schedule handlers
        schedulesList.querySelectorAll('.remove-schedule').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                btn.closest('.schedule-item').remove();
            });
        });

        cancelBtn.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = modal.querySelector('#editCourseName').value.trim();
            const code = modal.querySelector('#editCourseCode').value.trim();
            
            if (!name || !code) {
                showToast('Course name and code are required', 'error');
                return;
            }

            // Collect schedules
            const schedules = [];
            schedulesList.querySelectorAll('.schedule-item').forEach(item => {
                const textContent = item.textContent;
                const parts = textContent.split('|');
                const day = parts[0].trim();
                const times = parts[1].trim().split('-').map(s => s.trim());
                schedules.push({ 
                    day, 
                    start: convertTo24Hour(times[0]), 
                    end: convertTo24Hour(times[1]) 
                });
            });

            const updatedData = {
                name,
                code,
                instructor: modal.querySelector('#editCourseInstructor').value.trim(),
                schedule: schedules
            };

            try {
                await updateCourse(userId, courseId, updatedData);
                await loadDashboard();
                showToast('Course updated successfully!', 'success');
            } catch (error) {
                console.error('Error updating course:', error);
                showToast('Failed to update course', 'error');
            } finally {
                overlay.remove();
            }
        });
    } catch (error) {
        console.error('Error loading course for edit:', error);
        showToast('Failed to load course data', 'error');
    }
}

// ===========================
// Course Materials Functions
// ===========================
async function loadCourseMaterials() {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
        const coursesGrid = document.querySelector('#courses .courses-grid');
        if (!coursesGrid) return;
        
        const courseDashboards = coursesGrid.querySelectorAll('.course-dashboard');

        for (const dashboard of courseDashboards) {
            const courseId = dashboard.dataset.courseId;
            const materialsList = dashboard.querySelector('.course-materials-list');
            const materials = await getCourseMaterials(userId, courseId);

            if (materials.length === 0) {
                materialsList.innerHTML = `<p style="color: var(--text-secondary); font-size: 0.9rem;">No materials yet</p>`;
            } else {
                materialsList.innerHTML = materials.map(material => `
                    <div class="course-material-item" data-material-id="${material.id}" style="padding: 0.6rem; background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.2rem;">${getMaterialIcon(material.type)}</span>
                        <div style="flex: 1; min-width: 0;">
                            <a class="material-link" href="${material.url}" target="_blank" rel="noopener noreferrer" style="font-weight: 500; text-decoration: none; word-break: break-word; font-size: 0.9rem;">${material.title}</a>
                            <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: var(--text-secondary);">${material.type || 'Link'}</p>
                        </div>
                        <button class="delete-material-btn" data-course-id="${courseId}" data-material-id="${material.id}" style="background: transparent; border: none; color: var(--danger-color); cursor: pointer; font-size: 0.9rem; flex-shrink: 0;">✕</button>
                    </div>
                `).join('');

                // Attach delete buttons (stop propagation) and make items clickable
                materialsList.querySelectorAll('.delete-material-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const courseId = btn.dataset.courseId;
                        const materialId = btn.dataset.materialId;
                        deleteCourseMaterialItem(userId, courseId, materialId);
                    });
                });

                // Make entire material item clickable to open the link
                materialsList.querySelectorAll('.course-material-item').forEach(item => {
                    item.style.cursor = 'pointer';
                    item.addEventListener('click', (e) => {
                        if (e.target.closest('.delete-material-btn')) return;
                        const link = item.querySelector('a');
                        if (link && link.href) {
                            window.open(link.href, '_blank', 'noopener,noreferrer');
                        }
                    });
                });
            }
        }
    } catch (error) {
        console.error('Error loading course materials:', error);
    }
}

function getMaterialIcon(type) {
    const icons = {
        'link': '🔗',
        'pdf': '📄',
        'video': '🎥',
        'document': '📝',
        'image': '🖼️',
        'file': '📎'
    };
    return icons[type?.toLowerCase()] || '📎';
}

async function deleteCourseMaterialItem(userId, courseId, materialId) {
    try {
        await deleteCourseMaterial(userId, courseId, materialId);
        await loadCourseMaterials();
        showToast('Material deleted', 'success');
    } catch (error) {
        console.error('Error deleting material:', error);
        showToast('Failed to delete material', 'error');
    }
}

function showAddMaterialModal(courseId) {
    if (document.querySelector('.material-add-overlay')) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'material-add-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    const modal = document.createElement('div');
    modal.className = 'material-modal';
    modal.style.cssText = `
        background: var(--white);
        border-radius: 12px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    `;

    modal.innerHTML = `
        <h2 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--text-primary);">Add Course Material</h2>
        <form id="addMaterialForm" style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Material Title *</label>
                <input type="text" id="materialTitle" required placeholder="e.g., Lecture Slides - Week 1" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; font-size: 1rem; color: var(--text-primary); background: var(--card-bg); box-sizing: border-box;">
            </div>
            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">URL/Link *</label>
                <input type="url" id="materialUrl" required placeholder="https://example.com/material" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; font-size: 1rem; color: var(--text-primary); background: var(--card-bg); box-sizing: border-box;">
            </div>
            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Type</label>
                <select id="materialType" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; font-size: 1rem; color: var(--text-primary); background: var(--card-bg); box-sizing: border-box;">
                    <option value="link">Link</option>
                    <option value="pdf">PDF</option>
                    <option value="video">Video</option>
                    <option value="document">Document</option>
                    <option value="image">Image</option>
                    <option value="file">File</option>
                </select>
            </div>
            <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
                <button type="button" id="cancelMaterialBtn" class="btn cancel" style="flex: 1;">Cancel</button>
                <button type="submit" class="btn primary" style="flex: 1;">Add Material</button>
            </div>
        </form>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const form = modal.querySelector('#addMaterialForm');
    const cancelBtn = modal.querySelector('#cancelMaterialBtn');

    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const titleInput = modal.querySelector('#materialTitle');
        const urlInput = modal.querySelector('#materialUrl');
        
        if (!titleInput.value.trim()) {
            showToast('Please enter a material title', 'error');
            titleInput.focus();
            return;
        }
        
        if (!urlInput.value.trim()) {
            showToast('Please enter a URL', 'error');
            urlInput.focus();
            return;
        }

        const userId = getCurrentUserId();
        const materialData = {
            title: titleInput.value.trim(),
            url: urlInput.value.trim(),
            type: modal.querySelector('#materialType').value
        };

        try {
            await addCourseMaterial(userId, courseId, materialData);
            await loadCourseMaterials();
            showToast('Material added successfully!', 'success');
        } catch (error) {
            console.error('Error adding material:', error);
            showToast('Failed to add material', 'error');
        } finally {
            overlay.remove();
        }
    });
}

export async function initializeTaskManager() {
    
    
    const userId = getCurrentUserId();
    if (!userId) {
        console.warn('No user ID found - user may not be logged in yet');
        // Wait a moment for auth to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        const retryUserId = getCurrentUserId();
        if (!retryUserId) {
            console.error('Still no user ID after retry');
            showToast('Please log in to view tasks', 'error');
            return;
        }
    }

    showLoadingState();
    await loadTasksFromDatabase(userId || getCurrentUserId());
    
    setupMainAddTaskButton();
    setupFilterButtons();
    setupTaskEventListeners();
    setupKeyboardShortcuts();
    setupCoursesControls();
    
    isLoading = false;
    
}

// ===========================
// Courses Controls (Add Course)
// ===========================
function setupCoursesControls() {
    const header = document.querySelector('#courses .section-header');
    if (!header) return;
    if (header.querySelector('.add-course-btn')) return;

    // Create button container for right alignment
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display: flex; gap: 0.5rem;';

    const btn = document.createElement('button');
    btn.className = 'add-course-btn';
    btn.textContent = '+ Add Course';
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        showAddCourseModal();
    });

    btnContainer.appendChild(btn);
    header.appendChild(btnContainer);
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
}

function showAddCourseModal() {
    if (document.querySelector('.course-add-overlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'course-add-overlay task-add-overlay';
    overlay.style.cssText = `position: fixed; top:0; left:0; right:0; bottom:0; display:flex; align-items:center; justify-content:center; z-index:9999; background: rgba(0,0,0,0.45);`;

    const modal = document.createElement('div');
    modal.className = 'task-modal';
    modal.innerHTML = `
        <h2 style="font-size:1.25rem; font-weight:700; margin-bottom: 0.5rem;">Add Course</h2>
        <form id="addCourseForm" style="display:flex; flex-direction:column; gap: 1rem; margin-top:0.5rem; max-height: 70vh; overflow-y: auto; overflow-x: hidden; width: 100%; box-sizing: border-box; padding-right: 0.75rem;">
            <div class="form-row">
                <label style="font-weight:600; color:var(--text-primary); margin-bottom: 0.35rem; display: block;">Course Name *</label>
                <input type="text" id="courseName" required placeholder="e.g., Engineering Mechanics" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary);">
            </div>
            <div class="form-row">
                <label style="font-weight:600; color:var(--text-primary); margin-bottom: 0.35rem; display: block;">Course Code *</label>
                <input type="text" id="courseCode" required placeholder="e.g., ENGR 301" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary);">
            </div>
            <div class="form-row">
                <label style="font-weight:600; color:var(--text-primary); margin-bottom: 0.35rem; display: block;">Instructor</label>
                <input type="text" id="courseInstructor" placeholder="e.g., Prof. Garcia" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary);">
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
                <label style="font-weight:600; color:var(--text-primary); margin-bottom: 0rem; display: block;">Schedule</label>
                
                <!-- Added Schedules Container -->
                <div class="schedule-list" id="scheduleList" style="margin-bottom: 0.75rem; width: 100%; box-sizing: border-box;"></div>
                
                <!-- Schedule Input Container -->
                <div class="schedule-input-container" style="background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem; width: 100%; box-sizing: border-box;">
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <select id="scheduleDay" style="width: 100%; padding: 0.7rem; border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); background: var(--card-bg); font-size: 0.9rem; box-sizing: border-box;">
                            <option value="Mon">Monday</option>
                            <option value="Tue">Tuesday</option>
                            <option value="Wed">Wednesday</option>
                            <option value="Thu">Thursday</option>
                            <option value="Fri">Friday</option>
                            <option value="Sat">Saturday</option>
                            <option value="Sun">Sunday</option>
                        </select>
                        <div style="display: flex; gap: 0.4rem; align-items: center;">
                            <input type="time" id="scheduleStart" style="flex:1; padding: 0.6rem; border: 1px solid var(--border); border-radius: 8px; font-size: 0.9rem; box-sizing: border-box;" placeholder="--:--">
                            <span style="color: var(--text-secondary); font-weight: 600; font-size: 0.95rem;">-</span>
                            <input type="time" id="scheduleEnd" style="flex:1; padding: 0.6rem; border: 1px solid var(--border); border-radius: 8px; font-size: 0.9rem; box-sizing: border-box;" placeholder="--:--">
                        </div>
                        <button type="button" id="addScheduleBtn" class="btn primary" style="width: 100%; padding: 0.6rem; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box;">Add Schedule</button>
                    </div>
                </div>
            </div>
            <div class="modal-actions" style="margin-top: 0.5rem;">
                <button type="button" id="cancelCourseBtn" class="btn cancel">Cancel</button>
                <button type="submit" class="btn primary">Add Course</button>
            </div>
        </form>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const form = modal.querySelector('#addCourseForm');
    const cancelBtn = modal.querySelector('#cancelCourseBtn');
    const addScheduleBtn = modal.querySelector('#addScheduleBtn');
    const scheduleList = modal.querySelector('#scheduleList');

    function renderScheduleItem(itemId, day, start, end) {
        const item = document.createElement('div');
        item.className = 'schedule-item';
        item.dataset.id = itemId;
        const start12 = convertTo12Hour(start);
        const end12 = convertTo12Hour(end);
        item.innerHTML = `
            <div style="flex:1; font-size:0.95rem; font-weight: 500;">
                <span style="color: var(--text-primary);">${day}</span>
                <span style="color: var(--text-secondary); margin: 0 0.5rem;">|</span>
                <span style="color: var(--text-primary);">${start12} - ${end12}</span>
            </div>
            <button type="button" class="remove-schedule" style="background: transparent; border: none; cursor: pointer; font-size: 1.1rem; flex-shrink: 0; color: var(--danger-color); padding: 0.25rem;">✕</button>
        `;
        const removeBtn = item.querySelector('.remove-schedule');
        removeBtn.addEventListener('click', () => item.remove());
        scheduleList.appendChild(item);
    }

    addScheduleBtn.addEventListener('click', () => {
        const day = modal.querySelector('#scheduleDay').value;
        const start = modal.querySelector('#scheduleStart').value;
        const end = modal.querySelector('#scheduleEnd').value;
        if (!start || !end) {
            showToast('Please select start and end time', 'error');
            return;
        }
        const id = `s_${Date.now()}`;
        renderScheduleItem(id, day, start, end);
    });
    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = modal.querySelector('#courseName').value.trim();
        const code = modal.querySelector('#courseCode').value.trim();
        if (!name || !code) {
            showToast('Please provide course name and code', 'error');
            return;
        }

        // collect schedule entries
        const scheduleNodes = scheduleList.querySelectorAll('.schedule-item');
        const scheduleArr = Array.from(scheduleNodes).map(node => {
            const textContent = node.firstElementChild.textContent;
            // Parse format: "Monday | 12:00 pm - 1:00 pm"
            const parts = textContent.split('|');
            const day = parts[0].trim();
            const times = parts[1].trim().split('-').map(s => s.trim());
            return { 
                day, 
                start: convertTo24Hour(times[0]), 
                end: convertTo24Hour(times[1]) 
            };
        });

        const courseData = {
            name,
            code,
            instructor: modal.querySelector('#courseInstructor').value.trim(),
            schedule: scheduleArr,
            color: '#667eea'
        };

        try {
            const userId = getCurrentUserId();
            if (!userId) throw new Error('No user logged in');
            await addCourse(userId, courseData);
            await loadDashboard();
            showToast('Course added!', 'success');
        } catch (err) {
            console.error('Error adding course:', err);
            showToast('Failed to add course', 'error');
        } finally {
            overlay.remove();
        }
    });
}

// ===========================
// Load Tasks from Database
// ===========================
async function loadTasksFromDatabase(userId) {
    try {
        const tasks = await getUserTasks(userId);
        currentTasks = tasks;
        renderTasks(currentFilter);
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        showToast('Failed to load tasks', 'error');
    }
}

// ===========================
// Render Tasks
// ===========================
function renderTasks(filterType) {
    const taskList = document.querySelector('.task-list-full');
    if (!taskList) return;

    const filteredTasks = filterTasksByType(filterType);
    taskList.innerHTML = '';
    
    if (currentTasks.length === 0) {
        taskList.innerHTML = `<div style="text-align: center; padding: 3rem 2rem; color: var(--text-secondary);"><div style="font-size: 3.5rem; margin-bottom: 1rem;">📋</div><h3 style="color: var(--text-primary);">No tasks yet</h3></div>`;
        return;
    }
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = `<div style="text-align: center; padding: 3rem 2rem; color: var(--text-secondary);"><div style="font-size: 3.5rem; margin-bottom: 1rem;">✨</div><h3 style="color: var(--text-primary);">No tasks in this filter</h3></div>`;
        return;
    }
    
    filteredTasks.forEach((task, index) => {
        const taskElement = createTaskElement(task);
        taskElement.style.animationDelay = `${index * 0.05}s`;
        taskList.appendChild(taskElement);
    });

    
}

// ===========================
// Filter Tasks
// ===========================
function filterTasksByType(filterType) {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return currentTasks.filter(task => {
        switch(filterType) {
            case 'All Tasks': return true;
            case 'Urgent': return task.priority === 'Urgent';
            case 'This Week':
                const dueDate = new Date(task.dueDate);
                return dueDate >= now && dueDate <= oneWeekFromNow;
            case 'Completed': return task.completed === true;
            default: return true;
        }
    });
}

// ===========================
// Create Task Element
// ===========================
function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-item-full ${task.priority === 'Urgent' ? 'urgent' : ''} ${task.completed ? 'completed' : ''}`;
    taskDiv.setAttribute('data-task-id', task.id);

    const dueDate = new Date(task.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    taskDiv.innerHTML = `
        <div class="task-check ${task.completed ? 'checked' : ''}" style="cursor: pointer;"></div>
        <div class="task-content-full" style="flex: 1;">
            <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">${task.title}</h3>
            <p class="task-description" style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.75rem;">${task.description || 'No description'}</p>
            <div class="task-meta" style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
                <span class="task-course" style="font-size: 0.85rem; color: var(--text-secondary);">📚 ${task.course || 'General'}</span>
                <span class="task-due" style="font-size: 0.85rem; color: var(--text-secondary);">📅 Due: ${dueDate}</span>
                <span class="task-tag ${task.priority === 'Urgent' ? 'urgent' : ''}" style="display: inline-block; padding: 0.35rem 0.85rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; ${task.priority === 'Urgent' ? 'background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); color: #991b1b;' : 'background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af;'}">${task.priority || 'Normal'}</span>
            </div>
        </div>
        <button class="task-delete-btn" style="background: rgba(239, 68, 68, 0.05); border: 2px solid transparent; color: var(--danger-color); padding: 0.6rem 0.8rem; border-radius: 8px; cursor: pointer; font-size: 1.2rem; transition: all 0.3s ease; flex-shrink: 0;">🗑️</button>
    `;

    const checkbox = taskDiv.querySelector('.task-check');
    const deleteBtn = taskDiv.querySelector('.task-delete-btn');

    checkbox.addEventListener('click', () => toggleTaskCompletion(task.id, !task.completed));
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    
    return taskDiv;
}

// ===========================
// Setup Main Add Task Button
// ===========================
function setupMainAddTaskButton() {
    const mainAddTaskBtn = document.getElementById('mainAddTaskBtn');
    if (mainAddTaskBtn) {
        mainAddTaskBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAddTaskModal();
        });
    }
}

// ===========================
// Show Add Task Modal
// ===========================
async function showAddTaskModal(courseId) {
    // prevent opening multiple add-task modals
    if (document.querySelector('.task-add-overlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'task-add-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    const modal = document.createElement('div');
    modal.className = 'task-modal';

    modal.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--text-primary);">Add New Task</h2>
        <form id="addTaskForm" style="display: flex; flex-direction: column; gap: 1rem; max-height: 70vh; overflow-y: auto; padding-right: 0.5rem;">
            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Task Title *</label>
                <input type="text" id="taskTitle" required placeholder="Enter task title" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; font-size: 1rem; color: var(--text-primary); background: var(--card-bg); box-sizing: border-box;">
            </div>
            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Description</label>
                <textarea id="taskDescription" placeholder="Enter description" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; font-size: 1rem; color: var(--text-primary); background: var(--card-bg); resize: vertical; min-height: 80px; box-sizing: border-box;"></textarea>
            </div>
            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Course/Subject</label>
                <div style="position: relative;">
                    <select id="taskCourseSelect" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; font-size: 1rem; color: var(--text-primary); background: var(--card-bg); box-sizing: border-box; appearance: auto;">
                        <option value="">-- Select a Course --</option>
                        <option value="custom">+ Add Custom Course</option>
                    </select>
                    <input type="text" id="taskCourseCustom" placeholder="Enter course name (e.g., ENGR 301)" style="display: none; width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; font-size: 1rem; color: var(--text-primary); background: var(--card-bg); box-sizing: border-box; margin-top: 0.5rem;">
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                    <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Due Date *</label>
                    <input type="date" id="taskDueDate" required style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; font-size: 1rem; color: var(--text-primary); background: var(--card-bg); box-sizing: border-box;">
                </div>
                <div>
                    <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Priority</label>
                    <select id="taskPriority" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border); border-radius: 8px; font-size: 1rem; color: var(--text-primary); background: var(--card-bg); box-sizing: border-box;">
                        <option value="Normal">Normal</option>
                        <option value="Medium">Medium</option>
                        <option value="Urgent">Urgent</option>
                    </select>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" id="cancelBtn" class="btn cancel">Cancel</button>
                <button type="submit" class="btn primary">Add Task</button>
            </div>
        </form>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Load courses and populate dropdown (await so we can preselect when called from a course)
    await loadCoursesForTaskModal(modal);

    // If opened from a specific course, preselect and hide the course selector
    if (courseId) {
        const courseSelect = modal.querySelector('#taskCourseSelect');
        const courseCustom = modal.querySelector('#taskCourseCustom');
        // set value if option exists
        try { courseSelect.value = courseId; } catch (e) {}
        // hide the whole course selector block (two levels up)
        const courseContainer = courseSelect.parentElement && courseSelect.parentElement.parentElement;
        if (courseContainer) courseContainer.style.display = 'none';
    }

    const form = modal.querySelector('#addTaskForm');
    const cancelBtn = modal.querySelector('#cancelBtn');
    const courseSelect = modal.querySelector('#taskCourseSelect');
    const courseCustom = modal.querySelector('#taskCourseCustom');

    // Handle course selection
    courseSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            courseCustom.style.display = 'block';
            courseCustom.focus();
        } else {
            courseCustom.style.display = 'none';
        }
    });

    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const titleInput = modal.querySelector('#taskTitle');
        const dueDateInput = modal.querySelector('#taskDueDate');
        
        if (!titleInput.value.trim()) {
            showToast('Please enter a task title', 'error');
            titleInput.focus();
            return;
        }
        
        if (!dueDateInput.value) {
            showToast('Please select a due date', 'error');
            dueDateInput.focus();
            return;
        }

        // Get course value (either selected or custom)
        let courseValue = courseSelect.value;
        let courseName = courseValue;
        
        if (courseValue === 'custom') {
            courseName = courseCustom.value.trim();
            if (!courseName) {
                showToast('Please enter a course name', 'error');
                courseCustom.focus();
                return;
            }
        } else if (courseValue === '') {
            courseName = '';
        } else {
            // Look up the course name from our map
            courseName = courseLookupMap[courseValue] || courseValue;
        }
        
        const userId = getCurrentUserId();
        const taskData = {
            title: titleInput.value.trim(),
            description: modal.querySelector('#taskDescription').value.trim(),
            course: courseName,
            courseId: courseSelect.value === 'custom' ? null : courseSelect.value,
            dueDate: dueDateInput.value,
            priority: modal.querySelector('#taskPriority').value,
            completed: false
        };

        try {
            await addTask(userId, taskData);
            await loadTasksFromDatabase(userId);
            // Reload course tasks to show newly added task
            await loadCourseTasks();
            showToast('Task created successfully!', 'success');
        } catch (error) {
            console.error('Error adding task:', error);
            showToast('Failed to add task', 'error');
        } finally {
            overlay.remove();
        }
    });
}

// Load courses for task modal dropdown
let courseLookupMap = {}; // Store courses for lookup by ID

async function loadCoursesForTaskModal(modal) {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
        const courses = await getUserCourses(userId);
        const courseSelect = modal.querySelector('#taskCourseSelect');
        courseLookupMap = {}; // Reset the map

        if (courses.length > 0) {
            courses.forEach(course => {
                // Store course in lookup map for later
                courseLookupMap[course.id] = `${course.code && course.name ? `${course.code} - ${course.name}` : (course.name || course.code || 'Unknown Course')}`;
                
                const option = document.createElement('option');
                option.value = course.id;
                const displayText = courseLookupMap[course.id];
                option.textContent = displayText;
                courseSelect.insertBefore(option, courseSelect.querySelector('option[value="custom"]'));
            });
        }
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

// ===========================
// Toggle Task Completion
// ===========================
async function toggleTaskCompletion(taskId, completed) {
    const userId = getCurrentUserId();
    
    try {
        await updateTaskStatus(userId, taskId, completed);
        
        const task = currentTasks.find(t => t.id === taskId);
        if (task) {
            task.completed = completed;
            renderTasks(currentFilter);
            showToast(completed ? 'Task completed!' : 'Task marked incomplete', 'success');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        showToast('Failed to update task', 'error');
    }
}

// ===========================
// Delete Task
// ===========================
async function deleteTask(taskId) {
    const task = currentTasks.find(t => t.id === taskId);
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: var(--white);
        border-radius: 12px;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    `;

    modal.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h2 style="color: var(--text-primary); margin-bottom: 0.5rem;">Delete Task?</h2>
            <p style="color: var(--text-secondary);">Are you sure you want to delete "${task?.title || 'Task'}"?</p>
        </div>
        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button id="cancelDeleteBtn" style="flex: 1; padding: 0.75rem; background: var(--light); border: 2px solid var(--border); border-radius: 8px; color: var(--text-primary); font-weight: 600; cursor: pointer;">Cancel</button>
            <button id="confirmDeleteBtn" style="flex: 1; padding: 0.75rem; background: linear-gradient(135deg, #f87171 0%, #ef4444 100%); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer;">Delete</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const cancelBtn = modal.querySelector('#cancelDeleteBtn');
    const confirmBtn = modal.querySelector('#confirmDeleteBtn');

    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    confirmBtn.addEventListener('click', async () => {
        overlay.remove();
        try {
            const userId = getCurrentUserId();
            const taskRef = ref(database, `users/${userId}/tasks/${taskId}`);
            await remove(taskRef);
            
            currentTasks = currentTasks.filter(t => t.id !== taskId);
            renderTasks(currentFilter);
            showToast('Task deleted!', 'success');
        } catch (error) {
            console.error('Error deleting task:', error);
            showToast('Failed to delete task', 'error');
        }
    });
}

// ===========================
// Setup Filter Buttons
// ===========================
function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.textContent.trim();
            renderTasks(currentFilter);
        });
    });
}

// ===========================
// Setup Task Event Listeners
// ===========================
function setupTaskEventListeners() {
    
}

// ===========================
// Setup Keyboard Shortcuts
// ===========================
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            showAddTaskModal();
        }
        
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('[style*="position: fixed"]');
            modals.forEach(modal => {
                if (modal.style.zIndex > 9000) modal.remove();
            });
        }
    });
}

// ===========================
// Loading Skeleton
// ===========================
function createTaskSkeleton() {
    const skeleton = document.createElement('div');
    skeleton.className = 'task-item-full skeleton';
    skeleton.style.cssText = `
        background: var(--white);
        border-radius: 12px;
        padding: 1.5rem;
        display: flex;
        gap: 1rem;
    `;
    skeleton.innerHTML = `
        <div style="width: 24px; height: 24px; border-radius: 4px; background: var(--border); flex-shrink: 0;"></div>
        <div style="flex: 1;">
            <div style="height: 20px; background: var(--border); border-radius: 4px; margin-bottom: 0.5rem; width: 60%;"></div>
            <div style="height: 16px; background: var(--border); border-radius: 4px; margin-bottom: 1rem; width: 80%;"></div>
            <div style="display: flex; gap: 1rem;">
                <div style="height: 24px; background: var(--border); border-radius: 4px; width: 100px;"></div>
                <div style="height: 24px; background: var(--border); border-radius: 4px; width: 120px;"></div>
            </div>
        </div>
    `;
    return skeleton;
}

function showLoadingState() {
    const taskList = document.querySelector('.task-list-full');
    if (!taskList) return;
    
    taskList.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        taskList.appendChild(createTaskSkeleton());
    }
    isLoading = true;
}

// ===========================
// Helper Functions
// ===========================
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === now.toDateString()) {
        return 'Today, 11:59 PM';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow, 11:59 PM';
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

function getResourceIcon(type) {
    const icons = { pdf: '📄', video: '🎥', doc: '📝', document: '📝' };
    return icons[type] || '📁';
}

function attachTaskCheckboxHandlers() {
    document.querySelectorAll('.task-check').forEach(checkbox => {
        checkbox.addEventListener('click', async function(e) {
            e.stopPropagation();
            const taskItem = this.closest('.task-item');
            const taskId = taskItem.dataset.taskId;
            
            if (this.classList.contains('completed')) {
                this.classList.remove('completed');
                this.style.background = 'none';
                this.style.border = '2px solid var(--border)';
                this.innerHTML = '';
                taskItem.style.opacity = '1';
            } else {
                this.classList.add('completed');
                this.style.background = 'var(--success-color)';
                this.style.border = '2px solid var(--success-color)';
                this.innerHTML = '✓';
                this.style.color = 'white';
                taskItem.style.opacity = '0.6';
            }
        });
    });
}

 
