// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBhGA-MuqiNDktAJ4NTo14Sggmp2ixTGSU",
    authDomain: "eduplanner-pro-b245e.firebaseapp.com",
    projectId: "eduplanner-pro-b245e",
    storageBucket: "eduplanner-pro-b245e.appspot.com",
    messagingSenderId: "460534275593",
    appId: "1:460534275593:web:5fec2dd0057b69bf3a22d8",
    measurementId: "G-JR32W2XFNJ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', function() {
    const taskForm = document.getElementById('task-form');
    const taskNameInput = document.getElementById('task-name');
    const subjectSelect = document.getElementById('subject');
    const descInput = document.getElementById('task-desc');
    const dueDateInput = document.getElementById('due-date');
    const taskTypeSelect = document.getElementById('task-type');
    const reminderIntervalSelect = document.getElementById('reminder-interval');
    const groupMembersInput = document.getElementById('group-members');
    const exportButton = document.getElementById('export-tasks');
    const importInput = document.getElementById('import-tasks');
    const deleteTaskButton = document.getElementById('delete-task');
    const calendarEl = document.getElementById('calendar');
    const printScheduleBtn = document.getElementById('print-schedule');
    const mainContainer = document.querySelector('.container');
    const loginScreen = document.getElementById('login-screen');
    const registerScreen = document.getElementById('register-screen');
    const loginButton = document.getElementById('login-btn');
    const registerButton = document.getElementById('register-btn');
    const showRegisterButton = document.getElementById('show-register-btn');
    const showLoginButton = document.getElementById('show-login-btn');
    const logoutButton = document.getElementById('logout-button');
    
    // Modal elements
    const modal = document.getElementById('task-modal');
    const modalContent = document.querySelector('.modal-content');
    const modalClose = document.querySelector('.close');
    const modalTaskName = document.getElementById('modal-task-name');
    const modalTaskSubject = document.getElementById('modal-task-subject');
    const modalTaskDueDate = document.getElementById('modal-task-due-date');
    const modalTaskType = document.getElementById('modal-task-type');
    const modalTaskDesc = document.getElementById('modal-task-desc');
    const modalTaskResources = document.getElementById('modal-task-resources');
    const modalTaskGroupMembers = document.getElementById('modal-task-group-members');

    const resources = {
        Math: [
            { name: "Khan Academy", url: "https://www.khanacademy.org/math" },
            { name: "Wolfram Alpha", url: "https://www.wolframalpha.com/" }
        ],
        Science: [
            { name: "NASA", url: "https://www.nasa.gov/" },
            { name: "ScienceDaily", url: "https://www.sciencedaily.com/" }
        ],
        SS: [
            { name: "National Geographic", url: "https://www.nationalgeographic.com/" },
            { name: "Smithsonian", url: "https://www.si.edu/" }
        ],
        ELA: [
            { name: "Grammarly", url: "https://www.grammarly.com/" },
            { name: "Purdue OWL", url: "https://owl.purdue.edu/" }
        ]
    };

    let calendar;

    taskForm.addEventListener('submit', function(event) {
        event.preventDefault();
    
        const taskName = taskNameInput.value;
        const subject = subjectSelect.value;
        const description = descInput.value;
        const dueDate = dueDateInput.value;
        const taskType = taskTypeSelect.value;
        const reminderInterval = parseInt(reminderIntervalSelect.value, 10);
        const groupMembers = groupMembersInput.value;
    
        addTask(taskName, subject, description, dueDate, taskType, reminderInterval, groupMembers);
        storeTask(taskName, subject, description, dueDate, taskType, reminderInterval, groupMembers);
    
        trackAssignmentProgress(taskName, new Date(dueDate));
    
        // Clear input fields
        taskForm.reset(); // Resetting all fields
        showNotification('Task added successfully!', 'success');
    });

    function trackAssignmentProgress(taskName, dueDate) {
        const now = new Date();
        const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        
        for (let i = 1; i <= daysRemaining; i++) {
            const reminderTime = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    
            if (reminderTime > now) {
                setTimeout(() => {
                    alert(`Reminder: ${taskName} - You should have completed at least ${i * 10}% of your assignment by now.`);
                }, reminderTime - now);
            }
        }
    }

    async function addTask(name, subject, description, date, type, reminderInterval, groupMembers) {
        const dueDateTime = new Date(date);
        const newTaskRef = db.collection("tasks").doc(); // Create a new document reference
    
        // Define the taskData object
        const taskData = {
            name,
            subject,
            description,
            date,
            type,
            reminderInterval,
            groupMembers,
            dueDate: dueDateTime
        };
    
        // Set the task data in Firestore
        await newTaskRef.set(taskData);
    
        const event = {
            id: newTaskRef.id, // Use the document ID
            title: `${name} - ${subject}`,
            start: dueDateTime,
            description: description,
            extendedProps: {
                type: type,
                subject: subject,
                groupMembers: groupMembers,
                reminderInterval: reminderInterval
            },
            backgroundColor: getColorForSubject(subject),
            borderColor: getColorForSubject(subject)
        };
    
        calendar.addEvent(event);
        updateTasksOnCalendarCount();
        scheduleReminder(dueDateTime, name, reminderInterval);
    
        const user = firebase.auth().currentUser;
    
        if (user) {
            const userEmail = user.email;
            const tasksRef = firebase.firestore().collection('tasks').doc(userEmail);
    
            tasksRef.update({
                tasks: firebase.firestore.FieldValue.arrayUnion({
                    name: name,
                    completed: false
                })
            }).then(() => {
                console.log('Task added successfully');
                // Optionally update UI or perform additional tasks
            }).catch(error => {
                console.error('Error adding task: ', error);
            });
    
            // Update task count in the user's document
            updateTaskCounts(user.uid, 1, 0);
        } else {
            console.error('User not logged in.');
        }
    }

    function storeTask(name, subject, description, date, type, reminderInterval, groupMembers) {
        const user = firebase.auth().currentUser; // Get current user
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const id = new Date().getTime(); // Generate a unique ID using the current timestamp
        tasks.push({ 
            id, 
            name, 
            subject, 
            description, 
            date, 
            type, 
            reminderInterval, 
            groupMembers, 
            email: user ? user.email : null // Link the task to the user's email
        });
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function loadTasks() {
        const user = firebase.auth().currentUser;
        if (user) {
            const userId = user.uid;
            calendar.getEvents().forEach(event => event.remove());
            const tasks = JSON.parse(localStorage.getItem(`tasks_${userId}`)) || [];
            tasks.forEach(task => {
                addTask(task.name, task.subject, task.description, task.date, task.type, task.reminderInterval, task.groupMembers);
            });

            updateTasksOnCalendarCount();
            updateTasksCompletedCount();
        }
    }

    function showNotification(message, type) {
        const notificationElement = document.getElementById('notification');
        notificationElement.textContent = message;
        notificationElement.className = type;
        notificationElement.style.display = 'block';
        setTimeout(() => {
            notificationElement.style.display = 'none';
            notificationElement.className = '';
        }, 3000);
    }

    function getColorForSubject(subject) {
        switch (subject) {
            case 'Math': return 'blue';
            case 'Science': return 'green';
            case 'SS': return 'orange';
            case 'ELA': return 'red';
            default: return 'black';
        }
    }

    function scheduleReminder(date, taskName, reminderInterval) {
        const reminderTime = new Date(date.getTime() - reminderInterval);

        if (reminderTime > new Date()) {
            setTimeout(() => {
                alert(`Reminder: ${taskName} is due soon!`);
            }, reminderTime - new Date());
        }
    }

    exportButton.addEventListener('click', function() {
        const tasks = localStorage.getItem('tasks');
        if (tasks) {
            const blob = new Blob([tasks], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tasks.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });

    importInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const tasks = JSON.parse(e.target.result);
                localStorage.setItem('tasks', JSON.stringify(tasks));
                loadTasks();
            };
            reader.readAsText(file);
        }
    });

    function showTaskDetails(event) {
        clearInterval(countdownInterval);
    
        modalTaskName.textContent = event.title.split(' - ')[0];
        modalTaskSubject.textContent = event.extendedProps.subject;
        modalTaskType.textContent = event.extendedProps.type;
        modalTaskDesc.textContent = event.extendedProps.description;
        modalTaskGroupMembers.textContent = event.extendedProps.groupMembers;
    
        modalTaskResources.innerHTML = '';
        const subjectResources = resources[event.extendedProps.subject];
        if (subjectResources) {
            subjectResources.forEach(resource => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = resource.url;
                a.textContent = resource.name;
                a.target = '_blank';
                a.style.color = '#13120E'; // Ensure the links are visible
                li.appendChild(a);
                modalTaskResources.appendChild(li);
            });
        }
    
        switch (event.extendedProps.type) {
            case 'homework':
                modalContent.style.backgroundColor = '#FFEFD5'; // Example color for homework
                modalContent.style.boxShadow = '0 5px 15px rgba(255, 239, 213, 0.5)'; // Example box-shadow for homework
                break;
            case 'project':
                modalContent.style.backgroundColor = '#E6E6FA'; // Example color for project
                modalContent.style.boxShadow = '0 5px 15px rgba(230, 230, 250, 0.5)'; // Example box-shadow for project
                break;
            case 'exam':
                modalContent.style.backgroundColor = '#FFB6C1'; // Example color for exam
                modalContent.style.boxShadow = '0 5px 15px rgba(255, 182, 193, 0.5)'; // Example box-shadow for exam
                break;
            default:
                modalContent.style.backgroundColor = '#FFF'; // Default color
                modalContent.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)'; // Default box-shadow
        }
    
        updateTimeRemaining(event.start);
    
        countdownInterval = setInterval(() => {
            updateTimeRemaining(event.start);
        }, 1000);

        deleteTaskButton.onclick = async function() {
            const eventId = modal.dataset.eventId || event.id;
        
            // Remove the task from localStorage
            removeTaskFromLocalStorage(eventId);
        
            // Remove the task from the calendar
            calendar.getEventById(eventId).remove();
            modal.style.display = 'none';
            showNotification('Task deleted successfully! Please press save to persist changes.', 'success');

            // Increase the completed tasks count and save it to localStorage
            let completedTasksCount = JSON.parse(localStorage.getItem('completedTasksCount')) || 0;
            completedTasksCount++;
            localStorage.setItem('completedTasksCount', JSON.stringify(completedTasksCount));
            
            updateTasksCompletedCount();
            updateTasksOnCalendarCount();
        
            // Update the task in Firebase
            const user = firebase.auth().currentUser;
            if (user) {
                try {
                    const userId = user.uid;
                    const taskRef = db.collection("tasks").doc(eventId);
        
                    // Get the task data
                    const taskDoc = await taskRef.get();
                    const taskData = taskDoc.data();
        
                    if (taskData) {
                        // Log task data before updating
                        console.log('Task data before update:', taskData);
        
                        // Update the task to mark it as completed
                        await taskRef.update({ completed: true });
        
                        // Update task counts in the user's document
                        await updateTaskCounts(userId, -1, 1);
                    } else {
                        console.log('Task not found in Firebase.', 'error');
                    }
                } catch (error) {
                    console.error("Error removing task from Firebase:", error);
                    console.log('Failed to delete task from Firebase.', 'error');
                }
            } else {
                console.error("User is not authenticated");
                showNotification('User is not authenticated.', 'error');
            }
        };
    
        modal.style.display = 'block';
    }

    modalClose.addEventListener('click', function() {
        modal.style.display = 'none';
        clearInterval(countdownInterval);
    });

    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
            clearInterval(countdownInterval);
        }
    });

    // Dark and light mode functionality
    const darkThemeToggle = document.getElementById('dark-theme-toggle');

    darkThemeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark');
        if (document.body.classList.contains('dark')) {
            darkThemeToggle.textContent = 'Toggle Light Theme';
        } else {
            darkThemeToggle.textContent = 'Toggle Dark Theme';
        }
    });

    // Initialize button text based on the initial theme
    if (document.body.classList.contains('dark')) {
        darkThemeToggle.textContent = 'Toggle Light Theme';
    } else {
        darkThemeToggle.textContent = 'Toggle Dark Theme';
    }
    
    // Function to update the modal for dark theme
    function updateModalForDarkTheme() {
        if (document.body.classList.contains('dark')) {
            modalContent.style.backgroundColor = '#1C1C1C';
            modalContent.style.color = '#FFFFFF';
        } else {
            modalContent.style.backgroundColor = '#F5F5DC';
            modalContent.style.color = '#000000';
        }
    }

    // Call the function to ensure modal is styled correctly on load
    updateModalForDarkTheme();

    // Update modal styles when theme is toggled
    darkThemeToggle.addEventListener('click', updateModalForDarkTheme);

    // Function to calculate time remaining
    function calculateTimeRemaining(dueDate) {
        const now = new Date();
        const timeDifference = new Date(dueDate) - now;
        
        const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    // Function to update countdown
    function updateCountdown(dueDate) {
        const countdown = calculateTimeRemaining(dueDate);
        modalTaskDueDate.textContent = countdown;

        // Update the countdown every second
        const countdownInterval = setInterval(() => {
            const newCountdown = calculateTimeRemaining(dueDate);
            modalTaskDueDate.textContent = newCountdown;

            // Stop the interval if the task is due
            if (new Date(dueDate) <= new Date()) {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }
    
    let countdownInterval;

    function updateTimeRemaining(dueDate) {
        const now = new Date();
        const timeRemaining = dueDate - now;

        if (timeRemaining <= 0) {
            modalTaskDueDate.textContent = 'Due date has passed';
            clearInterval(countdownInterval);
        } else {
            const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

            modalTaskDueDate.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s remaining`;
        }
    }

    function printSchedule() {
        window.print();
    }

    printScheduleBtn.addEventListener('click', printSchedule);

    // Function to show login screen
    function showLoginScreen() {
        loginScreen.style.display = 'block';
        registerScreen.style.display = 'none';
        mainContainer.style.display = 'none';
    }

    // Function to show registration screen
    function showRegisterScreen() {
        loginScreen.style.display = 'none';
        registerScreen.style.display = 'block';
        mainContainer.style.display = 'none';
    }

    function showMainContainer() {
        loginScreen.style.display = 'none';
        registerScreen.style.display = 'none';
        mainContainer.style.display = 'block';
    
        // Initialize FullCalendar
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            events: [],
            eventClick: function(info) {
                showTaskDetails(info.event);
            }
        });
    
        calendar.render();
        loadTasks(); // Load tasks for the logged-in user
    }

    // Initially, show the login screen
    showLoginScreen();
    
    // Attach event listeners for showing login/register screens
    showRegisterButton.addEventListener('click', showRegisterScreen);
    showLoginButton.addEventListener('click', showLoginScreen);

    // Function to handle user registration
    async function register() {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Add user to Firestore
            await firebase.firestore().collection('users').doc(user.uid).set({
                email: email,
                password: password,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showNotification('User registered successfully!', 'success');
            showMainContainer(); // Show the main container after registration
        } catch (error) {
            console.error('Error registering user:', error);
            alert('Error registering user: ' + error.message);
        }
    }

    // Function to handle user login
    async function login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            console.log('User logged in:', user);
            showNotification('User logged in successfully!', 'success');
            showMainContainer(); // Show the main container after login
        } catch (error) {
            console.error('Error logging in user:', error);
            alert('Error logging in user: ' + error.message);
        }
    }

    // Attach event listeners to login/register buttons
    loginButton.addEventListener('click', login);
    registerButton.addEventListener('click', register);
    
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            showNotification('User logged in successfully!', 'success');
            showMainContainer(); // Show main container if user is already logged in
        } else {
            showNotification('User is not logged in!', 'success');
            showLoginScreen(); // Show login screen if user is not logged in
        }
    });

    // Attach logout function to logout button
    logoutButton.addEventListener('click', function() {
        saveTasks(); // Save tasks before signing out
        firebase.auth().signOut().then(function() {
            calendar.getEvents().forEach(event => event.remove()); // Clear tasks from calendar
            showNotification('Logged out successfully!', 'success');
            showLoginScreen(); // Show login screen after logout
        }).catch(function(error) {
            console.error('Error signing out:', error);
        });
    });

    document.getElementById('saveButton').onclick = function() {
        saveTasks();
        showNotification('Progress saved successfully!', 'success');
    };

    function saveTasks() {
        const user = firebase.auth().currentUser;
        if (user) {
            const userId = user.uid;
            const events = calendar.getEvents();
            const tasks = events.map(event => ({
                id: event.id,
                name: event.title.split(' - ')[0],
                subject: event.title.split(' - ')[1],
                description: event.extendedProps.description,
                date: event.start.toISOString(),
                type: event.extendedProps.type,
                reminderInterval: event.extendedProps.reminderInterval,
                groupMembers: event.extendedProps.groupMembers
            }));
            localStorage.setItem(`tasks_${userId}`, JSON.stringify(tasks));
        }
    }

    // Update the number of tasks on the calendar
    function updateTasksOnCalendarCount() {
        const tasksOnCalendarCount = calendar.getEvents().length;
        document.getElementById('tasks-on-calendar').textContent = tasksOnCalendarCount;
    }

    // Update the number of completed tasks
    function updateTasksCompletedCount() {
        const completedTasksCount = JSON.parse(localStorage.getItem('completedTasksCount')) || 0;
        document.getElementById('tasks-completed').textContent = completedTasksCount;
    }

    async function updateTaskCounts(userId, pendingIncrement, completedIncrement) {
        const userRef = db.collection('users').doc(userId);
    
        try {
            const updates = {};
            
            if (pendingIncrement !== 0) {
                updates.pendingTasks = firebase.firestore.FieldValue.increment(pendingIncrement);
            }
    
            if (completedIncrement !== 0) {
                updates.completedTasks = firebase.firestore.FieldValue.increment(completedIncrement);
            }
    
            // Log the updates being made
            console.log('Updating task counts with:', updates);
    
            // Update the task counts in the user's document
            await userRef.update(updates);
    
            // Log the updated document
            const updatedDoc = await userRef.get();
            console.log('Updated user document:', updatedDoc.data());
        } catch (error) {
            console.error('Error updating task counts:', error);
        }
    }    

    async function removeTaskFromLocalStorage(taskId) {
        const user = firebase.auth().currentUser;
    
        if (user) {
            const userId = user.uid;
    
            // Increase the completed tasks count in local storage
            let completedTasksCount = JSON.parse(localStorage.getItem('completedTasksCount')) || 0;

            localStorage.setItem('completedTasksCount', JSON.stringify(completedTasksCount));
            updateTasksCompletedCount(); // Update UI display of completed tasks
    
            try {
                // Get current user's document reference
                const userRef = db.collection('users').doc(userId);
    
                // Update completed tasks count in Firebase
                await userRef.update({
                    completedTasks: firebase.firestore.FieldValue.increment(1)
                });
    
                // Decrease the pending task count
                await updateTaskCounts(userId, 0, -1);
    
                // Remove the task from local storage
                let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
                tasks = tasks.filter(task => task.id !== taskId);
                localStorage.setItem('tasks', JSON.stringify(tasks));
    
            } catch (error) {
                console.error('Error updating completed tasks in Firebase:', error);
                // Handle error as needed
            }
        } else {
            console.error('No user is currently logged in.');
        }
    }    

    loadTasks();
    updateTasksOnCalendarCount();
    updateTasksCompletedCount();
});