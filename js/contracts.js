// --- Contract Management Module ---
const CONTRACTS_REF = 'contracts';
// CUSTOMERS_REF is already defined in customers.js, assuming it's globally available or re-declare if not.
// const CUSTOMERS_REF = 'customers'; // If not globally available

// Function to load the contracts module
function loadContractsModule() {
    const $section = $('#contracts');
    $section.html(`
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-semibold text-gray-700">Gestion des Contrats</h3>
            <button id="addContractBtn" class="btn btn-primary">Ajouter un Contrat</button>
        </div>
        <div class="mb-4">
            <label for="filterCustomerContracts" class="form-label">Filtrer par Client:</label>
            <select id="filterCustomerContracts" class="form-input"></select>
        </div>
        <div id="contractList" class="overflow-x-auto">
            <p class="text-gray-500">Chargement des contrats...</p>
        </div>
    `);

    $('#addContractBtn').on('click', () => openContractModal());

    // Populate customer filter dropdown
    populateSelectWithOptions('filterCustomerContracts', {}, 'id', 'name', "Tous les Clients"); // Initial empty, will be filled
    database.ref(CUSTOMERS_REF).once('value', snapshot => {
        populateSelectWithOptions('filterCustomerContracts', snapshot.val(), 'id', 'name', "Tous les Clients");
    });

    $('#filterCustomerContracts').on('change', function() {
        displayContracts($(this).val());
    });

    displayContracts(); // Initial display of all contracts
}

// Display contracts in a table, optionally filtered by customerId
function displayContracts(filterCustomerId = null) {
    const $contractList = $('#contractList');
    if (!$contractList.length) return;

    let contractsQuery = database.ref(CONTRACTS_REF);
    if (filterCustomerId) {
        contractsQuery = contractsQuery.orderByChild('customerId').equalTo(filterCustomerId);
    }

    contractsQuery.once('value', async snapshot => {
        const contracts = snapshot.val();
        let tableHtml = `
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Contrat</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Début</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Fin</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
        `;

        if (contracts) {
            // Fetch customer names for display
            const customerPromises = [];
            Object.keys(contracts).forEach(key => {
                const contract = contracts[key];
                if (contract.customerId) {
                    customerPromises.push(
                        database.ref(`${CUSTOMERS_REF}/${contract.customerId}/name`).once('value')
                        .then(nameSnapshot => ({ ...contract, id: key, customerName: nameSnapshot.val() || 'N/A' }))
                        .catch(() => ({ ...contract, id: key, customerName: 'Erreur chargement client' }))
                    );
                } else {
                     // Handle contracts that might not have a customerId (though unlikely with proper data structure)
                    customerPromises.push(Promise.resolve({ ...contract, id: key, customerName: 'Client non spécifié' }));
                }
            });

            const contractsWithCustomerNames = await Promise.all(customerPromises);

            contractsWithCustomerNames.forEach(contract => {
                tableHtml += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${contract.id}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${contract.customerName}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${contract.startDate || ''}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${contract.endDate || ''}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${contract.status || ''}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button class="text-indigo-600 hover:text-indigo-900 editContractBtn" data-id="${contract.id}">Modifier</button>
                            <button class="text-red-600 hover:text-red-900 ml-4 deleteContractBtn" data-id="${contract.id}">Supprimer</button>
                        </td>
                    </tr>
                `;
            });
             tableHtml += `</tbody></table>`;
        } else {
            tableHtml = '<p class="text-center text-gray-500 py-5">Aucun contrat trouvé.</p>';
        }
        $contractList.html(tableHtml);

        $('.editContractBtn').on('click', function() { openContractModal($(this).data('id')); });
        $('.deleteContractBtn').on('click', function() { deleteContract($(this).data('id')); });

    }).catch(error => {
        console.error("Error fetching contracts:", error);
        showToast("Erreur lors de la récupération des contrats.", "error");
        $contractList.html('<p class="text-center text-red-500 py-5">Erreur de chargement des contrats.</p>');
    });
}

// Open modal for adding or editing a contract
function openContractModal(contractId = null) {
    let formTitle = "Ajouter un Nouveau Contrat";
    let submitButtonText = "Ajouter Contrat";
    // Default for new contract. Note: ID generated by Firebase if not provided.
    let contractData = { id: '', customerId: '', startDate: '', endDate: '', status: 'Active' };

    const modalBodyPromise = database.ref(CUSTOMERS_REF).once('value').then(customerSnapshot => {
        const customers = customerSnapshot.val();
        let customerOptions = '<option value="">Sélectionnez un Client</option>';
        if (customers) {
            Object.keys(customers).forEach(key => {
                customerOptions += `<option value="${key}">${customers[key].name} (ID: ${key})</option>`;
            });
        }

        return `
            <form id="contractForm">
                <input type="hidden" id="contractId" name="contractId" value="${contractData.id}">
                <div class="mb-4">
                    <label for="contractCustomerId" class="form-label">Client:</label>
                    <select id="contractCustomerId" name="customerId" class="form-input" required>
                        ${customerOptions}
                    </select>
                </div>
                <div class="mb-4">
                    <label for="contractStartDate" class="form-label">Date de Début:</label>
                    <input type="date" id="contractStartDate" name="startDate" class="form-input" value="${contractData.startDate}" required>
                </div>
                <div class="mb-4">
                    <label for="contractEndDate" class="form-label">Date de Fin:</label>
                    <input type="date" id="contractEndDate" name="endDate" class="form-input" value="${contractData.endDate}">
                </div>
                <div class="mb-4">
                    <label for="contractStatus" class="form-label">Statut:</label>
                    <select id="contractStatus" name="status" class="form-input" required>
                        <option value="Active" ${contractData.status === 'Active' ? 'selected' : ''}>Actif</option>
                        <option value="Inactive" ${contractData.status === 'Inactive' ? 'selected' : ''}>Inactif</option>
                        <option value="Expired" ${contractData.status === 'Expired' ? 'selected' : ''}>Expiré</option>
                        <option value="Pending" ${contractData.status === 'Pending' ? 'selected' : ''}>En attente</option>
                    </select>
                </div>
                 <div class="mb-4"> <!-- Optional: Field for custom Contract ID -->
                    <label for="customContractId" class="form-label">ID Contrat (Optionnel, ex: CT-2024-001):</label>
                    <input type="text" id="customContractId" name="customContractId" class="form-input" value="${contractData.id || ''}">
                    <small class="text-xs text-gray-500">Laissez vide pour un ID auto-généré par Firebase.</small>
                </div>
            </form>
        `;
    });

    const modalFooterContent = `
        <button type="button" class="btn btn-secondary modal-close-btn mr-2">Annuler</button>
        <button type="button" id="saveContractBtn" class="btn btn-primary">${submitButtonText}</button>
    `;

    if (contractId) {
        formTitle = "Modifier le Contrat";
        submitButtonText = "Sauvegarder les Modifications"; // Update button text for consistency
        database.ref(`${CONTRACTS_REF}/${contractId}`).once('value', snapshot => {
            if (snapshot.val()) {
                contractData = snapshot.val();
                contractData.id = contractId; // Ensure Firebase key is used as ID

                modalBodyPromise.then(bodyHtml => {
                    openModal(formTitle, bodyHtml, modalFooterContent);
                    $('#saveContractBtn').text(submitButtonText); // Ensure button text is updated

                    // Pre-fill form
                    $('#contractId').val(contractData.id); // Hidden field for Firebase key
                    $('#customContractId').val(contractData.customId || contractData.id); // Display custom ID or Firebase key
                    $('#contractCustomerId').val(contractData.customerId);
                    $('#contractStartDate').val(contractData.startDate);
                    $('#contractEndDate').val(contractData.endDate);
                    $('#contractStatus').val(contractData.status);

                    $('#saveContractBtn').off('click').on('click', saveContract);
                    $('.modal-close-btn').on('click', closeModal);
                });
            } else {
                showToast("Contrat non trouvé.", "error");
            }
        }).catch(error => {
            console.error("Error fetching contract for edit:", error);
            showToast("Erreur lors de la récupération du contrat.", "error");
        });
    } else {
        // New contract
        modalBodyPromise.then(bodyHtml => {
            openModal(formTitle, bodyHtml, modalFooterContent);
            $('#saveContractBtn').text(submitButtonText);
            $('#saveContractBtn').off('click').on('click', saveContract);
            $('.modal-close-btn').on('click', closeModal);
        });
    }
}


// Save (add or update) contract data
function saveContract() {
    const firebaseKey = $('#contractId').val(); // This is the Firebase key for updates
    const customId = $('#customContractId').val().trim(); // User-defined ID (e.g., CT-2023-001)

    const contractData = {
        customerId: $('#contractCustomerId').val(),
        startDate: $('#contractStartDate').val(),
        endDate: $('#contractEndDate').val(),
        status: $('#contractStatus').val(),
        customId: customId // Store the custom ID
    };

    // Basic validation
    if (!contractData.customerId || !contractData.startDate || !contractData.status) {
        showToast("Client, date de début et statut sont requis.", "error");
        return;
    }
    if (contractData.endDate && contractData.endDate < contractData.startDate) {
        showToast("La date de fin ne peut pas être antérieure à la date de début.", "error");
        return;
    }

    let promise;
    let successMessageAction = "ajouté";

    if (firebaseKey) { // Existing contract, update using Firebase key
        promise = database.ref(`${CONTRACTS_REF}/${firebaseKey}`).update(contractData);
        successMessageAction = "mis à jour";
    } else if (customId) { // New contract with a user-defined ID
        // Check if this custom ID already exists to prevent duplicates
        promise = database.ref(CONTRACTS_REF).child(customId).once('value').then(snapshot => {
            if (snapshot.exists()) {
                throw new Error(`Le numéro de contrat '${customId}' existe déjà.`);
            }
            return database.ref(`${CONTRACTS_REF}/${customId}`).set(contractData);
        });
    } else { // New contract, let Firebase generate the key
        const newContractRef = database.ref(CONTRACTS_REF).push();
        contractData.customId = newContractRef.key; // Use Firebase key as customId if none provided
        promise = newContractRef.set(contractData);
    }

    promise.then(() => {
        showToast(`Contrat ${successMessageAction} avec succès.`, "success");
        closeModal();
        displayContracts($('#filterCustomerContracts').val()); // Refresh the list with current filter
    }).catch(error => {
        console.error("Error saving contract:", error);
        showToast(error.message || "Erreur lors de l'enregistrement du contrat.", "error");
    });
}

// Delete a contract
function deleteContract(contractId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce contrat ? Ceci pourrait affecter les équipements et interventions liés.")) {
        // Check for related equipment before deleting a contract
        database.ref('equipment').orderByChild('contractId').equalTo(contractId).once('value', snapshot => {
            if (snapshot.exists()) {
                showToast("Impossible de supprimer le contrat : des équipements y sont associés.", "error");
                return;
            }

            // No associated equipment, proceed with deletion
            database.ref(`${CONTRACTS_REF}/${contractId}`).remove()
                .then(() => {
                    showToast("Contrat supprimé avec succès.", "success");
                    displayContracts($('#filterCustomerContracts').val()); // Refresh list
                })
                .catch(error => {
                    console.error("Error deleting contract:", error);
                    showToast("Erreur lors de la suppression du contrat.", "error");
                });
        }).catch(error => {
            console.error("Error checking for equipment:", error);
            showToast("Erreur lors de la vérification des équipements associés.", "error");
        });
    }
}

console.log("contracts.js loaded");
