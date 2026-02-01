import { auth, database } from './firebase-service.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    ref, 
    set, 
    get,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ===========================
// Check if user is already logged in
// ===========================
let allowRedirect = true;

onAuthStateChanged(auth, (user) => {
    if (user && allowRedirect) {
        window.location.href = 'index.html';
    }
});

// ===========================
// Form Switching
// ===========================
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const successMessage = document.getElementById('successMessage');
const showSignupBtn = document.getElementById('showSignup');
const showLoginBtn = document.getElementById('showLogin');
const continueToLoginBtn = document.getElementById('continueToLogin');

showSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    signupForm.classList.add('active');
    clearMessages();
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.classList.remove('active');
    loginForm.classList.add('active');
    clearMessages();
});

continueToLoginBtn.addEventListener('click', () => {
    successMessage.classList.remove('active');
    loginForm.classList.add('active');
});

// ===========================
// Password Toggle (Eye Icon)
// ===========================
document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            this.innerHTML = `
                <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
            `;
        } else {
            passwordInput.type = 'password';
            this.innerHTML = `
                <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            `;
        }
    });
});

// ===========================
// Helper Functions
// ===========================
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function clearMessages() {
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('signupError').style.display = 'none';
}

function showButtonLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    if (isLoading) {
        button.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-flex';
    } else {
        button.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// ===========================
// Username to Email Lookup
// ===========================
async function getUserEmailByUsername(username) {
    try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
            const users = snapshot.val();
            for (const userId in users) {
                if (users[userId].username === username.toLowerCase()) {
                    return users[userId].email;
                }
            }
        }
        return null;
    } catch (error) {
        console.error('Error looking up username:', error);
        return null;
    }
}

// ===========================
// SIGNUP Functionality
// ===========================
const signupFormElement = document.getElementById('signupFormElement');

signupFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();
    
    const firstName = document.getElementById('signupFirstName').value.trim();
    const lastName = document.getElementById('signupLastName').value.trim();
    const username = document.getElementById('signupUsername').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    // Validation
    if (!firstName || !lastName || !username || !password || !confirmPassword) {
        showError('signupError', 'Please fill in all fields');
        return;
    }
    
    // Username validation (no spaces, no special characters)
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(username)) {
        showError('signupError', 'Username can only contain letters and numbers');
        return;
    }
    
    if (username.length < 4) {
        showError('signupError', 'Username must be at least 4 characters');
        return;
    }
    
    if (password.length < 6) {
        showError('signupError', 'Password must be at least 6 characters');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('signupError', 'Passwords do not match');
        return;
    }
    
    showButtonLoading('signupBtn', true);
    
    // Prevent auto-redirect during signup
    allowRedirect = false;
    
    try {
        // Check if username already exists
        const existingEmail = await getUserEmailByUsername(username);
        if (existingEmail) {
            showButtonLoading('signupBtn', false);
            showError('signupError', 'Username already taken');
            return;
        }
        
        // Create email for Firebase Auth (username@lspu.local)
        const email = `${username}@lspu.local`;
        
        // Create user with Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // user created: email
        
        // Update user profile with display name
        const fullName = `${firstName} ${lastName}`;
        await updateProfile(user, {
            displayName: fullName
        });
        
        // display name updated
        
        // Save user data to Realtime Database
        await set(ref(database, 'users/' + user.uid), {
            firstName: firstName,
            lastName: lastName,
            fullName: fullName,
            username: username,
            email: email,
            role: 'student',
            createdAt: new Date().toISOString(),
            gpa: 0,
            courses: [],
            tasks: []
        });
        
        // user data saved to database
        
        // Sign out the user (they need to login manually)
        await auth.signOut();
        
        // Re-enable redirect for future logins
        allowRedirect = true;
        
        // Show success message
        showButtonLoading('signupBtn', false);
        signupForm.classList.remove('active');
        successMessage.classList.add('active');
        
        // Clear form
        signupFormElement.reset();
        
    } catch (error) {
        console.error('Signup error:', error);
        showButtonLoading('signupBtn', false);
        allowRedirect = true; // Re-enable redirect
        
        let errorMessage = 'An error occurred. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Username already taken';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid username format';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak';
                break;
            default:
                errorMessage = error.message;
        }
        
        showError('signupError', errorMessage);
    }
});

// ===========================
// LOGIN Functionality
// ===========================
const loginFormElement = document.getElementById('loginFormElement');

loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();
    
    const username = document.getElementById('loginUsername').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showError('loginError', 'Please fill in all fields');
        return;
    }
    
    showButtonLoading('loginBtn', true);
    
    try {
        // Convert username to email
        const email = await getUserEmailByUsername(username);
        
        if (!email) {
            showButtonLoading('loginBtn', false);
            showError('loginError', 'Username not found');
            return;
        }
        
        // Sign in with email and password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        
        
        // Redirect to dashboard
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Login error:', error);
        showButtonLoading('loginBtn', false);
        
        let errorMessage = 'An error occurred. Please try again.';
        
        switch (error.code) {
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
            case 'auth/user-not-found':
                errorMessage = 'Invalid username or password';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
            default:
                errorMessage = error.message;
        }
        
        showError('loginError', errorMessage);
    }
});

 