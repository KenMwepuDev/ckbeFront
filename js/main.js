$(document).ready(function() {
    // --- Navigation Logic ---
    $('.nav-link').on('click', function(e) {
        e.preventDefault();
        const sectionId = $(this).data('section');
        const sectionTitle = $(this).text();

        // Update active link in sidebar
        $('.nav-link').removeClass('active');
        $(this).addClass('active');

        // Show selected section, hide others
        $('.section').removeClass('active').hide(); // Hide all sections
        $('#' + sectionId).addClass('active').fadeIn(300); // Fade in the active section

        // Update header title
        $('#section-title').text(sectionTitle);

        // Load section-specific content or refresh data
        loadSectionContent(sectionId);
    });

    // Initial section display (Dashboard)
    $('#dashboard').addClass('active').show();
    $('.nav-link[data-section="dashboard"]').addClass('active');
    $('#section-title').text('Tableau de Bord');

    // --- Modal Controls ---
    $('#closeModal, .modal-close-btn').on('click', function() {
        closeModal();
    });

    // Close modal if backdrop is clicked
    $('#genericModal').on('click', function(e) {
        if ($(e.target).is('#genericModal')) {
            closeModal();
        }
    });

    // --- Initial Data Load for Active Section ---
    // This ensures the default active section (Dashboard) also triggers its load function if any.
    const initialSection = $('.nav-link.active').data('section') || 'dashboard';
    loadSectionContent(initialSection);
});

function loadSectionContent(sectionId) {
    // Dynamically call a function to load content for the section if it exists
    // e.g., if sectionId is 'customers', it will try to call 'loadCustomersModule'
    const loadFunctionName = `load${capitalizeFirstLetter(sectionId)}Module`;
    if (typeof window[loadFunctionName] === 'function') {
        window[loadFunctionName]();
    } else {
        // console.log(`No specific load function for section: ${sectionId}`);
        // For sections without a specific load function, ensure their static content is visible
        // This is mostly handled by the active class, but specific initializations can go here
        if (sectionId === 'dashboard') {
            // Any specific dashboard initializations
        }
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// --- Global Modal Functions ---
function openModal(title, bodyContent, footerContent = '') {
    $('#modalTitle').text(title);
    $('#modalBody').html(bodyContent); // Set HTML content for the body

    if (footerContent) {
        if ($('#modalFooter').length === 0) {
            $('#modalBody').after('<div id="modalFooter" class="mt-6 pt-4 border-t border-gray-200 text-right"></div>');
        }
        $('#modalFooter').html(footerContent);
    } else {
        $('#modalFooter').remove(); // Remove footer if no content
    }

    $('#genericModal').fadeIn();
}

function closeModal() {
    $('#genericModal').fadeOut(() => {
        // Reset modal state after fade out
        $('#modalTitle').text('Modal Title');
        $('#modalBody').html('');
        $('#modalFooter').remove();
    });
}

// --- Toast Notification Function (moved from firebase-config.js for broader use) ---
function showToast(message, type = 'info') { // type can be 'info', 'success', 'error', 'warning'
    const toast = $('#toast-notification');
    toast.text(message);

    // Remove existing color classes
    toast.removeClass('bg-green-500 bg-red-500 bg-yellow-400 bg-blue-500 text-white');

    switch (type) {
        case 'success':
            toast.addClass('bg-green-500 text-white');
            break;
        case 'error':
            toast.addClass('bg-red-500 text-white');
            break;
        case 'warning':
            toast.addClass('bg-yellow-400 text-gray-800'); // Yellow might need darker text
            break;
        case 'info':
        default:
            toast.addClass('bg-blue-500 text-white'); // Default to blue for info
            break;
    }

    toast.fadeIn();
    setTimeout(() => {
        toast.fadeOut();
    }, 3500);
}

// --- Form Helpers ---
// Function to clear a form
function clearForm(formId) {
    $(`#${formId}`)[0].reset();
    // If you have hidden fields or other custom inputs, clear them manually
    $(`#${formId} input[type="hidden"]`).val('');
    // For select elements, you might want to reset to the first option or a specific default
    $(`#${formId} select`).prop('selectedIndex', 0);
}

// Function to serialize form data to an object
function getFormData(formId) {
    const formData = $(`#${formId}`).serializeArray();
    const dataObject = {};
    $.each(formData, function(i, field) {
        dataObject[field.name] = field.value;
    });
    return dataObject;
}

console.log("main.js loaded with navigation, modal controls, and helpers.");
