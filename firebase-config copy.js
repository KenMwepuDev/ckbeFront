// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDkDqFSa3UJlNOLzMEOx9D6bLjlN3gMSSI",
  authDomain: "postmarket-7aaaa.firebaseapp.com",
  databaseURL: "https://postmarket-7aaaa-default-rtdb.firebaseio.com/",
  projectId: "postmarket-7aaaa",
  storageBucket: "postmarket-7aaaa.appspot.com",
  messagingSenderId: "299171015850",
  appId: "1:299171015850:web:xxxxxxxxxxxxxxxxxxxxxx" // App ID might need to be generated from Firebase console if not readily available
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get a reference to the database service
const database = firebase.database();

// Export for use in other modules (optional, can also use firebase.database() directly)
// export { database }; // Uncomment if using ES6 modules and a bundler

// Helper function to show toast notifications
function showToast(message, isError = false) {
    const toast = $('#toast-notification');
    toast.text(message);
    if (isError) {
        toast.css('background-color', '#e53e3e'); // Red for errors
    } else {
        toast.css('background-color', '#2d3748'); // Default dark
    }
    toast.fadeIn();
    setTimeout(() => {
        toast.fadeOut();
    }, 3000);
}

// Helper to generate unique IDs (similar to Firebase push IDs but simpler for this example)
function generateUniqueId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Basic Modal Controls (can be enhanced in main.js or per module)
$(document).ready(function() {
    $('#closeModal').on('click', function() {
        $('#genericModal').fadeOut();
    });

    // Optional: Close modal if backdrop is clicked
    $('#genericModal').on('click', function(e) {
        if ($(e.target).is('#genericModal')) {
            $(this).fadeOut();
        }
    });
});

// Function to populate select options
function populateSelectWithOptions(selectElementId, data, valueField, textField, defaultOptionText = "Select an option") {
    const $select = $(`#${selectElementId}`);
    $select.empty(); // Clear existing options
    $select.append(`<option value="">${defaultOptionText}</option>`);
    if (data) {
        Object.keys(data).forEach(key => {
            const item = data[key];
            // Ensure item is an object and has the required fields
            if (typeof item === 'object' && item !== null && item.hasOwnProperty(valueField) && item.hasOwnProperty(textField)) {
                 // If using Firebase keys as ID, the 'key' might be the valueField
                let value = item[valueField];
                if (valueField === 'id' && !item.id) value = key; // Fallback to Firebase key if id prop is missing

                $select.append(`<option value="${value}">${item[textField]}</option>`);
            } else if (typeof item === 'object' && item !== null && item.hasOwnProperty(textField)) {
                // If valueField is the key itself (common in Firebase)
                 $select.append(`<option value="${key}">${item[textField]}</option>`);
            }
        });
    }
}
console.log("Firebase configured and helper functions loaded.");
