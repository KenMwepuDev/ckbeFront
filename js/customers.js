// --- Customer Management Module ---
const CUSTOMERS_REF = 'customers';

// Function to load the customers module: display list and set up interactions
function loadCustomersModule() {
    const $section = $('#customers');
    $section.html(`
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-semibold text-gray-700">Gestion des Clients</h3>
            <button id="addCustomerBtn" class="btn btn-primary">Ajouter un Client</button>
        </div>
        <div id="customerList" class="overflow-x-auto">
            <p class="text-gray-500">Chargement des clients...</p>
        </div>
    `);

    $('#addCustomerBtn').on('click', () => openCustomerModal());
    displayCustomers();
}

// Display all customers in a table
function displayCustomers() {
    const $customerList = $('#customerList');
    if (!$customerList.length) return; // Ensure the element exists

    database.ref(CUSTOMERS_REF).once('value', snapshot => {
        const customers = snapshot.val();
        if (customers) {
            let tableHtml = `
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
            `;
            Object.keys(customers).forEach(key => {
                const customer = customers[key];
                customer.id = key; // Assign Firebase key as ID if not part of the object
                tableHtml += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${customer.id}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${customer.name || ''}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${customer.contact || ''}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${customer.phone || ''}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${customer.email || ''}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button class="text-indigo-600 hover:text-indigo-900 editCustomerBtn" data-id="${customer.id}">Modifier</button>
                            <button class="text-red-600 hover:text-red-900 ml-4 deleteCustomerBtn" data-id="${customer.id}">Supprimer</button>
                        </td>
                    </tr>
                `;
            });
            tableHtml += `</tbody></table>`;
            $customerList.html(tableHtml);

            // Attach event listeners for edit and delete buttons
            $('.editCustomerBtn').on('click', function() {
                openCustomerModal($(this).data('id'));
            });
            $('.deleteCustomerBtn').on('click', function() {
                deleteCustomer($(this).data('id'));
            });

        } else {
            $customerList.html('<p class="text-center text-gray-500 py-5">Aucun client trouvé.</p>');
        }
    }).catch(error => {
        console.error("Error fetching customers:", error);
        showToast("Erreur lors de la récupération des clients.", "error");
        $customerList.html('<p class="text-center text-red-500 py-5">Erreur de chargement des clients.</p>');
    });
}

// Open modal for adding or editing a customer
function openCustomerModal(customerId = null) {
    let formTitle = "Ajouter un Nouveau Client";
    let submitButtonText = "Ajouter Client";
    let customerData = { id: '', name: '', contact: '', phone: '', email: '' }; // Default for new customer

    if (customerId) {
        formTitle = "Modifier le Client";
        submitButtonText = "Sauvegarder les Modifications";
        // Fetch customer data to pre-fill the form
        database.ref(`${CUSTOMERS_REF}/${customerId}`).once('value', snapshot => {
            if (snapshot.val()) {
                customerData = snapshot.val();
                customerData.id = customerId; // Ensure ID is set
                // Pre-fill form fields (important if modal is already open and re-used)
                $('#customerId').val(customerData.id);
                $('#customerName').val(customerData.name);
                $('#customerContact').val(customerData.contact);
                $('#customerPhone').val(customerData.phone);
                $('#customerEmail').val(customerData.email);
            } else {
                showToast("Client non trouvé.", "error");
                return;
            }
        }).catch(error => {
            console.error("Error fetching customer for edit:", error);
            showToast("Erreur lors de la récupération du client.", "error");
            return;
        });
    }

    const modalBodyContent = `
        <form id="customerForm">
            <input type="hidden" id="customerId" name="customerId" value="${customerData.id}">
            <div class="mb-4">
                <label for="customerName" class="form-label">Nom du Client:</label>
                <input type="text" id="customerName" name="name" class="form-input" value="${customerData.name}" required>
            </div>
            <div class="mb-4">
                <label for="customerContact" class="form-label">Personne à Contacter:</label>
                <input type="text" id="customerContact" name="contact" class="form-input" value="${customerData.contact}">
            </div>
            <div class="mb-4">
                <label for="customerPhone" class="form-label">Téléphone:</label>
                <input type="tel" id="customerPhone" name="phone" class="form-input" value="${customerData.phone}">
            </div>
            <div class="mb-4">
                <label for="customerEmail" class="form-label">Email:</label>
                <input type="email" id="customerEmail" name="email" class="form-input" value="${customerData.email}">
            </div>
        </form>
    `;
    const modalFooterContent = `
        <button type="button" class="btn btn-secondary modal-close-btn mr-2">Annuler</button>
        <button type="button" id="saveCustomerBtn" class="btn btn-primary">${submitButtonText}</button>
    `;

    openModal(formTitle, modalBodyContent, modalFooterContent);

    // Pre-fill form if editing (data might not be ready on initial call if fetched async)
    if (customerId && customerData.id) { // Check if customerData has been populated
        $('#customerId').val(customerData.id);
        $('#customerName').val(customerData.name);
        $('#customerContact').val(customerData.contact);
        $('#customerPhone').val(customerData.phone);
        $('#customerEmail').val(customerData.email);
    }

    $('#saveCustomerBtn').off('click').on('click', () => { // Use .off().on() to prevent multiple bindings
        saveCustomer();
    });

    $('.modal-close-btn').on('click', closeModal);
}

// Save (add or update) customer data
function saveCustomer() {
    const customerId = $('#customerId').val();
    const customerData = {
        name: $('#customerName').val().trim(),
        contact: $('#customerContact').val().trim(),
        phone: $('#customerPhone').val().trim(),
        email: $('#customerEmail').val().trim(),
    };

    // Basic validation
    if (!customerData.name) {
        showToast("Le nom du client est requis.", "error");
        return;
    }

    let promise;
    if (customerId) {
        // Update existing customer
        promise = database.ref(`${CUSTOMERS_REF}/${customerId}`).update(customerData);
    } else {
        // Add new customer - Firebase will generate a unique key if we use push()
        // However, if we want to use a custom ID like C-1001, we need to manage that.
        // For now, let Firebase generate the key.
        const newCustomerRef = database.ref(CUSTOMERS_REF).push();
        customerData.id = newCustomerRef.key; // Store the Firebase key as 'id'
        promise = newCustomerRef.set(customerData);
    }

    promise.then(() => {
        showToast(`Client ${customerId ? 'mis à jour' : 'ajouté'} avec succès.`, "success");
        closeModal();
        displayCustomers(); // Refresh the list
    }).catch(error => {
        console.error("Error saving customer:", error);
        showToast("Erreur lors de l'enregistrement du client.", "error");
    });
}

// Delete a customer
function deleteCustomer(customerId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.")) {
        // Before deleting a customer, check for related contracts.
        database.ref('contracts').orderByChild('customerId').equalTo(customerId).once('value', snapshot => {
            if (snapshot.exists()) {
                showToast("Impossible de supprimer le client : des contrats y sont associés.", "error");
                return;
            }

            // No associated contracts, proceed with deletion
            database.ref(`${CUSTOMERS_REF}/${customerId}`).remove()
                .then(() => {
                    showToast("Client supprimé avec succès.", "success");
                    displayCustomers(); // Refresh the list
                })
                .catch(error => {
                    console.error("Error deleting customer:", error);
                    showToast("Erreur lors de la suppression du client.", "error");
                });
        }).catch(error => {
            console.error("Error checking for contracts:", error);
            showToast("Erreur lors de la vérification des contrats associés.", "error");
        });
    }
}

// Make sure this module's load function is called when the section becomes active
// This is handled by main.js's loadSectionContent function.
console.log("customers.js loaded");
