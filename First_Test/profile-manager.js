// Profile Management System
import { getCurrentUserId } from './auth-guard.js';
import { getUserData } from './database-service.js';
import { database } from './firebase-config.js';
import { ref, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

let originalData = {};
let isInitialized = false;
let isEditMode = false;

// ===========================
// Initialize Profile Page
// ===========================
export async function initializeProfile() {
    console.log('Initializing profile...');
    
    const userId = getCurrentUserId();
    if (!userId) {
        console.error('No user ID found');
        return;
    }

    try {
        const userData = await getUserData(userId);
        if (userData) {
            populateProfileData(userData);
        }
        
        // Only setup event listeners once
        if (!isInitialized) {
            setupEventListeners();
            isInitialized = true;
            console.log('Profile initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing profile:', error);
    }
}

// ===========================
// Setup All Event Listeners
// ===========================
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Setup single edit button
    setupEditButton();
    
    // Setup save/cancel buttons
    setupSaveCancel();
    
    // Setup photo upload button (placeholder)
    const uploadBtn = document.querySelector('.btn-upload-photo');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            alert('Photo upload feature coming soon!');
        });
    }
}

// ===========================
// Populate Profile Data
// ===========================
function populateProfileData(userData) {
    console.log('Populating profile with data:', userData);
    
    // Profile Header
    const fullName = userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    const profileFullName = document.getElementById('profileFullName');
    const profileStudentId = document.getElementById('profileStudentId');
    const profileEmail = document.getElementById('profileEmail');
    
    if (profileFullName) profileFullName.textContent = fullName || 'User';
    if (profileStudentId) profileStudentId.textContent = `Student ID: ${userData.studentId || 'Not Set'}`;
    if (profileEmail) profileEmail.textContent = userData.email || '';
    
    // Avatar
    if (fullName) {
        const initials = fullName
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        const avatar = document.getElementById('profileAvatarLarge');
        if (avatar) avatar.textContent = initials;
    }
    
    // Year Badge
    const yearBadge = document.getElementById('yearBadge');
    if (yearBadge && userData.yearLevel) {
        const yearText = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
        yearBadge.textContent = yearText[userData.yearLevel - 1] || '4th Year';
    }
    
    // Personal Information
    setInputValue('firstName', userData.firstName);
    setInputValue('lastName', userData.lastName);
    setInputValue('dateOfBirth', userData.dateOfBirth);
    setInputValue('gender', userData.gender);
    setInputValue('contactNumber', userData.contactNumber);
    setInputValue('personalEmail', userData.personalEmail);
    
    // Academic Information
    setInputValue('program', userData.program);
    setInputValue('studentIdInput', userData.studentId);
    setInputValue('yearLevel', userData.yearLevel);
    setInputValue('section', userData.section);
    setInputValue('academicStatus', userData.academicStatus || 'regular');
    setInputValue('graduationDate', userData.graduationDate);
    
    // Address Information
    setInputValue('currentAddress', userData.currentAddress);
    setInputValue('city', userData.city);
    setInputValue('province', userData.province);
    setInputValue('zipCode', userData.zipCode);
    
    // Emergency Contact
    setInputValue('emergencyName', userData.emergencyName);
    setInputValue('emergencyRelationship', userData.emergencyRelationship);
    setInputValue('emergencyContact', userData.emergencyContact);
    
    // About Me
    setInputValue('bio', userData.bio);
}

// Helper function to safely set input values
function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value || '';
    }
}

// ===========================
// Get All Editable Inputs
// ===========================
function getAllEditableInputs() {
    const inputIds = [
        // Personal Information
        'firstName', 'lastName', 'dateOfBirth', 'gender', 'contactNumber', 'personalEmail',
        // Academic Information (studentIdInput handled separately)
        'program', 'yearLevel', 'section', 'academicStatus', 'graduationDate',
        // Address Information
        'currentAddress', 'city', 'province', 'zipCode',
        // Emergency Contact
        'emergencyName', 'emergencyRelationship', 'emergencyContact',
        // About Me
        'bio'
    ];
    
    const inputs = inputIds.map(id => document.getElementById(id)).filter(el => el !== null);
    console.log(`Found ${inputs.length} editable inputs`);
    return inputs;
}

// ===========================
// Setup Single Edit Button
// ===========================
function setupEditButton() {
    const editBtn = document.getElementById('mainEditBtn');
    
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Edit button clicked');
            enableEditMode();
        });
    } else {
        console.error('Main edit button not found!');
    }
}

// ===========================
// Enable Edit Mode
// ===========================
function enableEditMode() {
    console.log('Enabling edit mode for all fields');
    isEditMode = true;
    
    // Save original data
    saveOriginalData();
    
    // Enable all regular inputs
    const inputs = getAllEditableInputs();
    console.log(`Enabling ${inputs.length} inputs`);
    
    inputs.forEach(input => {
        input.disabled = false;
        input.style.background = 'var(--white)';
        input.style.cursor = 'text';
    });
    
    // Handle Student ID - only enable if empty
    const studentIdInput = document.getElementById('studentIdInput');
    if (studentIdInput) {
        const currentValue = studentIdInput.value.trim();
        
        if (currentValue === '' || currentValue === 'N/A') {
            // Empty - allow one-time edit
            studentIdInput.disabled = false;
            studentIdInput.style.background = '#fffbeb'; // Light yellow to indicate special field
            studentIdInput.style.cursor = 'text';
            studentIdInput.style.border = '2px solid var(--accent-color)';
            
            // Add info icon/tooltip
            const label = studentIdInput.closest('.form-group').querySelector('label');
            if (label && !label.querySelector('.student-id-warning')) {
                const warning = document.createElement('span');
                warning.className = 'student-id-warning';
                warning.style.cssText = 'color: var(--accent-color); font-size: 0.75rem; margin-left: 0.5rem;';
                warning.textContent = '⚠️ Can only be set once!';
                label.appendChild(warning);
            }
        } else {
            // Already set - keep disabled
            studentIdInput.disabled = true;
            studentIdInput.style.background = 'var(--light)';
            studentIdInput.style.cursor = 'not-allowed';
        }
    }
    
    // Show save/cancel buttons
    const profileActions = document.getElementById('profileActions');
    if (profileActions) {
        profileActions.style.display = 'flex';
        console.log('Save/Cancel buttons shown');
    }
    
    // Hide main edit button
    const editBtn = document.getElementById('mainEditBtn');
    if (editBtn) {
        editBtn.style.display = 'none';
    }
}

// ===========================
// Save Original Data
// ===========================
function saveOriginalData() {
    const inputs = getAllEditableInputs();
    originalData = {};
    
    inputs.forEach(input => {
        originalData[input.id] = input.value;
    });
    
    // Also save student ID
    const studentIdInput = document.getElementById('studentIdInput');
    if (studentIdInput) {
        originalData['studentIdInput'] = studentIdInput.value;
    }
    
    console.log('Original data saved');
}

// ===========================
// Setup Save & Cancel
// ===========================
function setupSaveCancel() {
    const cancelBtn = document.getElementById('cancelEdit');
    const saveBtn = document.getElementById('saveProfile');
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Cancel button clicked');
            cancelEdit();
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Save button clicked');
            saveProfile();
        });
    }
}

// ===========================
// Cancel Edit
// ===========================
function cancelEdit() {
    console.log('Canceling edit mode');
    
    // Restore original data
    const inputs = getAllEditableInputs();
    inputs.forEach(input => {
        if (originalData[input.id] !== undefined) {
            input.value = originalData[input.id];
        }
        input.disabled = true;
        input.style.background = 'var(--light)';
        input.style.cursor = 'not-allowed';
    });
    
    // Restore student ID
    const studentIdInput = document.getElementById('studentIdInput');
    if (studentIdInput) {
        if (originalData['studentIdInput'] !== undefined) {
            studentIdInput.value = originalData['studentIdInput'];
        }
        studentIdInput.disabled = true;
        studentIdInput.style.background = 'var(--light)';
        studentIdInput.style.cursor = 'not-allowed';
        studentIdInput.style.border = '2px solid var(--border)';
        
        // Remove warning label
        const warning = document.querySelector('.student-id-warning');
        if (warning) warning.remove();
    }
    
    // Hide save/cancel buttons
    const profileActions = document.getElementById('profileActions');
    if (profileActions) {
        profileActions.style.display = 'none';
    }
    
    // Show main edit button
    const editBtn = document.getElementById('mainEditBtn');
    if (editBtn) {
        editBtn.style.display = 'flex';
    }
    
    isEditMode = false;
    originalData = {};
    console.log('Edit canceled');
}

// ===========================
// Save Profile
// ===========================
async function saveProfile() {
    console.log('Saving profile');
    
    const userId = getCurrentUserId();
    if (!userId) {
        alert('User not authenticated');
        return;
    }
    
    // Validate Student ID if it was editable
    const studentIdInput = document.getElementById('studentIdInput');
    const studentIdValue = studentIdInput ? studentIdInput.value.trim() : '';
    const wasStudentIdEmpty = originalData['studentIdInput'] === '' || originalData['studentIdInput'] === 'N/A';
    
    if (wasStudentIdEmpty && studentIdValue) {
        // Student ID is being set for the first time
        const confirmMsg = `⚠️ IMPORTANT: You are setting your Student ID to "${studentIdValue}".\n\n` +
                          `This can only be done ONCE and cannot be changed later by you.\n\n` +
                          `Please make sure this is correct.\n\n` +
                          `Continue?`;
        
        if (!confirm(confirmMsg)) {
            return; // User cancelled
        }
    }
    
    try {
        // Show loading
        const saveBtn = document.getElementById('saveProfile');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span>💾 Saving...</span>';
        }
        
        // Collect data from all inputs
        const inputs = getAllEditableInputs();
        const updateData = {};
        
        inputs.forEach(input => {
            updateData[input.id] = input.value;
        });
        
        // Add student ID if it was edited
        if (studentIdInput && !studentIdInput.disabled) {
            updateData['studentId'] = studentIdValue;
            updateData['studentIdInput'] = studentIdValue;
        }
        
        console.log('Data to save:', updateData);
        
        // Update in Firebase
        const userRef = ref(database, `users/${userId}`);
        await update(userRef, updateData);
        
        console.log('Profile saved successfully');
        
        // Success message
        let successMsg = 'Profile updated successfully!';
        if (wasStudentIdEmpty && studentIdValue) {
            successMsg = '✅ Profile updated successfully!\n\n' +
                        `Your Student ID "${studentIdValue}" has been set and locked.\n` +
                        `It cannot be changed again without administrator assistance.`;
        }
        alert(successMsg);
        
        // Disable all inputs
        inputs.forEach(input => {
            input.disabled = true;
            input.style.background = 'var(--light)';
            input.style.cursor = 'not-allowed';
        });
        
        // Disable student ID permanently
        if (studentIdInput) {
            studentIdInput.disabled = true;
            studentIdInput.style.background = 'var(--light)';
            studentIdInput.style.cursor = 'not-allowed';
            studentIdInput.style.border = '2px solid var(--border)';
            
            // Remove warning label
            const warning = document.querySelector('.student-id-warning');
            if (warning) warning.remove();
            
            // Update header display
            const profileStudentId = document.getElementById('profileStudentId');
            if (profileStudentId && studentIdValue) {
                profileStudentId.textContent = `Student ID: ${studentIdValue}`;
            }
        }
        
        // Hide save/cancel buttons
        const profileActions = document.getElementById('profileActions');
        if (profileActions) {
            profileActions.style.display = 'none';
        }
        
        // Show main edit button
        const editBtn = document.getElementById('mainEditBtn');
        if (editBtn) {
            editBtn.style.display = 'flex';
        }
        
        // Reset button
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Save Changes
            `;
        }
        
        isEditMode = false;
        originalData = {};
        
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save changes. Please try again.');
        
        // Reset button
        const saveBtn = document.getElementById('saveProfile');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Save Changes
            `;
        }
    }
}

console.log('Profile management module loaded!');