// --- Equipment Management Module ---
const EQUIPMENT_REF = 'equipment';
// CONTRACTS_REF should be available if contracts.js is loaded, or define again.
// const CONTRACTS_REF = 'contracts';

// Function to load the equipment module
function loadEquipmentModule() {
    const $section = $('#equipment');
    $section.html(`
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-semibold text-gray-700">Gestion des Équipements</h3>
            <button id="addEquipmentBtn" class="btn btn-primary">Ajouter un Équipement</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label for="filterContractEquipment" class="form-label">Filtrer par Contrat:</label>
                <select id="filterContractEquipment" class="form-input"></select>
            </div>
            <div>
                <label for="filterEquipmentStatus" class="form-label">Filtrer par Statut:</label>
                <select id="filterEquipmentStatus" class="form-input">
                    <option value="">Tous les Statuts</option>
                    <option value="Operational">Opérationnel</option>
                    <option value="Maintenance">En Maintenance</option>
                    <option value="En location">En Location</option>
                    <option value="Usagé">Usagé</option>
                    <option value="Hors service">Hors service</option>
                </select>
            </div>
        </div>
        <div id="equipmentList" class="overflow-x-auto">
            <p class="text-gray-500">Chargement des équipements...</p>
        </div>
    `);

    $('#addEquipmentBtn').on('click', () => openEquipmentModal());

    // Populate contract filter dropdown
    populateSelectWithOptions('filterContractEquipment', {}, 'id', 'customId', "Tous les Contrats");
    database.ref(CONTRACTS_REF).once('value', snapshot => {
        const contractsData = snapshot.val() ?
            Object.entries(snapshot.val()).reduce((acc, [key, value]) => {
                acc[key] = {...value, displayId: value.customId || key }; // Use customId or key for display
                return acc;
            }, {})
            : {};
        populateSelectWithOptions('filterContractEquipment', contractsData, 'id', 'displayId', "Tous les Contrats");
    });

    $('#filterContractEquipment, #filterEquipmentStatus').on('change', function() {
        displayEquipment($('#filterContractEquipment').val(), $('#filterEquipmentStatus').val());
    });

    displayEquipment(); // Initial display
}

// Display equipment in a table, optionally filtered
async function displayEquipment(filterContractId = null, filterStatus = null) {
    const $equipmentList = $('#equipmentList');
    if (!$equipmentList.length) return;
    $equipmentList.html('<p class="text-gray-500">Chargement des équipements...</p>');

    try {
        const equipmentSnapshot = await database.ref(EQUIPMENT_REF).once('value');
        let allEquipment = equipmentSnapshot.val() ? Object.entries(equipmentSnapshot.val()).map(([key, value]) => ({ ...value, id: key })) : [];

        // Apply filters
        if (filterContractId) {
            allEquipment = allEquipment.filter(eq => eq.contractId === filterContractId);
        }
        if (filterStatus) {
            allEquipment = allEquipment.filter(eq => eq.status === filterStatus);
        }

        if (allEquipment.length === 0) {
            $equipmentList.html('<p class="text-center text-gray-500 py-5">Aucun équipement trouvé pour les filtres sélectionnés.</p>');
            return;
        }

        // Fetch contract details for display (customId or key)
        const contractDetailsPromises = allEquipment.map(eq => {
            if (eq.contractId) {
                return database.ref(`${CONTRACTS_REF}/${eq.contractId}`).once('value')
                    .then(snap => ({ ...eq, contractDisplay: snap.val()?.customId || eq.contractId || 'N/A' }))
                    .catch(() => ({ ...eq, contractDisplay: 'Erreur Contrat' }));
            }
            return Promise.resolve({ ...eq, contractDisplay: 'Aucun contrat' });
        });

        const equipmentWithDetails = await Promise.all(contractDetailsPromises);

        let tableHtml = `
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="th-cell">N° Série/ID</th>
                        <th class="th-cell">Type</th>
                        <th class="th-cell">Modèle</th>
                        <th class="th-cell">Contrat Associé</th>
                        <th class="th-cell">Localisation</th>
                        <th class="th-cell">Dernier Service</th>
                        <th class="th-cell">Statut</th>
                        <th class="th-cell">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
        `;
        equipmentWithDetails.forEach(eq => {
            tableHtml += `
                <tr>
                    <td class="td-cell">${eq.serial || eq.id}</td>
                    <td class="td-cell">${eq.type || ''}</td>
                    <td class="td-cell">${eq.model || ''}</td>
                    <td class="td-cell">${eq.contractDisplay}</td>
                    <td class="td-cell">${eq.location || ''}</td>
                    <td class="td-cell">${eq.lastService ? new Date(eq.lastService).toLocaleDateString() : ''}</td>
                    <td class="td-cell">
                        <select class="form-input p-1 changeEquipmentStatus" data-id="${eq.id}">
                            <option value="Operational" ${eq.status === 'Operational' ? 'selected' : ''}>Opérationnel</option>
                            <option value="Maintenance" ${eq.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                            <option value="En location" ${eq.status === 'En location' ? 'selected' : ''}>En location</option>
                            <option value="Usagé" ${eq.status === 'Usagé' ? 'selected' : ''}>Usagé</option>
                            <option value="Hors service" ${eq.status === 'Hors service' ? 'selected' : ''}>Hors service</option>
                        </select>
                    </td>
                    <td class="td-cell">
                        <button class="text-indigo-600 hover:text-indigo-900 editEquipmentBtn" data-id="${eq.id}">Modifier</button>
                        <button class="text-red-600 hover:text-red-900 ml-2 deleteEquipmentBtn" data-id="${eq.id}">Supprimer</button>
                        <button class="text-blue-600 hover:text-blue-900 ml-2 viewStatusHistoryBtn" data-id="${eq.id}">Historique</button>
                    </td>
                </tr>
            `;
        });
        tableHtml += `</tbody></table>`;
        $equipmentList.html(tableHtml);

        // Add Tailwind classes for table cells if not already in global styles
        $('.th-cell').addClass('px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider');
        $('.td-cell').addClass('px-4 py-3 whitespace-nowrap text-sm text-gray-700');

        // Event listeners
        $('.editEquipmentBtn').on('click', function() { openEquipmentModal($(this).data('id')); });
        $('.deleteEquipmentBtn').on('click', function() { deleteEquipment($(this).data('id')); });
        $('.changeEquipmentStatus').on('change', function() { changeEquipmentStatus($(this).data('id'), $(this).val()); });
        $('.viewStatusHistoryBtn').on('click', function() { viewStatusHistory($(this).data('id')); });

    } catch (error) {
        console.error("Error fetching equipment:", error);
        showToast("Erreur lors de la récupération des équipements.", "error");
        $equipmentList.html('<p class="text-center text-red-500 py-5">Erreur de chargement des équipements.</p>');
    }
}


// Open modal for adding or editing equipment
function openEquipmentModal(equipmentId = null) {
    let formTitle = "Ajouter un Nouvel Équipement";
    let submitButtonText = "Ajouter Équipement";
    let eqData = { id: '', serial: '', type: '', model: '', contractId: '', location: '', lastService: '', status: 'Operational', notes: '' };

    // Fetch contracts for the dropdown
    const contractsPromise = database.ref(CONTRACTS_REF).once('value').then(snapshot => {
        let contractOptions = '<option value="">Aucun Contrat</option>';
        if (snapshot.val()) {
            Object.entries(snapshot.val()).forEach(([key, value]) => {
                contractOptions += `<option value="${key}">${value.customId || key}</option>`;
            });
        }
        return contractOptions;
    });

    const buildModalContent = (currentEqData, contractOpts) => `
        <form id="equipmentForm">
            <input type="hidden" id="equipmentId" name="equipmentId" value="${currentEqData.id}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="equipmentSerial" class="form-label">N° de Série / ID Unique:</label>
                    <input type="text" id="equipmentSerial" name="serial" class="form-input" value="${currentEqData.serial}" required>
                </div>
                <div>
                    <label for="equipmentType" class="form-label">Type:</label>
                    <input type="text" id="equipmentType" name="type" class="form-input" value="${currentEqData.type}" required>
                </div>
                <div>
                    <label for="equipmentModel" class="form-label">Modèle:</label>
                    <input type="text" id="equipmentModel" name="model" class="form-input" value="${currentEqData.model}">
                </div>
                <div>
                    <label for="equipmentContractId" class="form-label">Contrat Associé:</label>
                    <select id="equipmentContractId" name="contractId" class="form-input">
                        ${contractOpts}
                    </select>
                </div>
                <div>
                    <label for="equipmentLocation" class="form-label">Localisation:</label>
                    <input type="text" id="equipmentLocation" name="location" class="form-input" value="${currentEqData.location}">
                </div>
                <div>
                    <label for="equipmentLastService" class="form-label">Date du Dernier Service:</label>
                    <input type="date" id="equipmentLastService" name="lastService" class="form-input" value="${currentEqData.lastService}">
                </div>
                 <div>
                    <label for="equipmentStatusModal" class="form-label">Statut:</label>
                    <select id="equipmentStatusModal" name="status" class="form-input">
                        <option value="Operational" ${currentEqData.status === 'Operational' ? 'selected' : ''}>Opérationnel</option>
                        <option value="Maintenance" ${currentEqData.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                        <option value="En location" ${currentEqData.status === 'En location' ? 'selected' : ''}>En location</option>
                        <option value="Usagé" ${currentEqData.status === 'Usagé' ? 'selected' : ''}>Usagé</option>
                        <option value="Hors service" ${currentEqData.status === 'Hors service' ? 'selected' : ''}>Hors service</option>
                    </select>
                </div>
            </div>
            <div class="mt-4">
                <label for="equipmentNotes" class="form-label">Notes:</label>
                <textarea id="equipmentNotes" name="notes" class="form-input" rows="3">${currentEqData.notes || ''}</textarea>
            </div>
        </form>
    `;

    const modalFooterContent = `
        <button type="button" class="btn btn-secondary modal-close-btn mr-2">Annuler</button>
        <button type="button" id="saveEquipmentBtn" class="btn btn-primary">${submitButtonText}</button>
    `;

    if (equipmentId) { // Editing existing equipment
        formTitle = "Modifier l'Équipement";
        submitButtonText = "Sauvegarder";
        Promise.all([database.ref(`${EQUIPMENT_REF}/${equipmentId}`).once('value'), contractsPromise])
            .then(([eqSnapshot, contractOpts]) => {
                if (eqSnapshot.val()) {
                    eqData = { ...eqSnapshot.val(), id: equipmentId };
                    openModal(formTitle, buildModalContent(eqData, contractOpts), modalFooterContent);
                    $('#saveEquipmentBtn').text(submitButtonText);
                    // Pre-fill form (redundant if values in buildModalContent are correctly set, but good for safety)
                    $('#equipmentId').val(eqData.id);
                    $('#equipmentSerial').val(eqData.serial);
                    $('#equipmentType').val(eqData.type);
                    $('#equipmentModel').val(eqData.model);
                    $('#equipmentContractId').val(eqData.contractId);
                    $('#equipmentLocation').val(eqData.location);
                    $('#equipmentLastService').val(eqData.lastService);
                    $('#equipmentStatusModal').val(eqData.status);
                    $('#equipmentNotes').val(eqData.notes);

                    $('#saveEquipmentBtn').off('click').on('click', saveEquipment);
                    $('.modal-close-btn').on('click', closeModal);
                } else {
                    showToast("Équipement non trouvé.", "error");
                }
            }).catch(error => {
                console.error("Error fetching equipment/contracts for edit:", error);
                showToast("Erreur de chargement des données pour modification.", "error");
            });
    } else { // Adding new equipment
        contractsPromise.then(contractOpts => {
            openModal(formTitle, buildModalContent(eqData, contractOpts), modalFooterContent);
            $('#saveEquipmentBtn').text(submitButtonText);
            $('#saveEquipmentBtn').off('click').on('click', saveEquipment);
            $('.modal-close-btn').on('click', closeModal);
        });
    }
}

// Save (add or update) equipment data
function saveEquipment() {
    const equipmentId = $('#equipmentId').val(); // Firebase key for updates
    const serial = $('#equipmentSerial').val().trim();

    const equipmentData = {
        serial: serial,
        type: $('#equipmentType').val().trim(),
        model: $('#equipmentModel').val().trim(),
        contractId: $('#equipmentContractId').val(),
        location: $('#equipmentLocation').val().trim(),
        lastService: $('#equipmentLastService').val(),
        status: $('#equipmentStatusModal').val(),
        notes: $('#equipmentNotes').val().trim()
    };

    if (!equipmentData.serial || !equipmentData.type) {
        showToast("N° de série et type sont requis.", "error");
        return;
    }

    let promise;
    let successMessageAction = "ajouté";
    let equipmentRef;

    if (equipmentId) { // Update existing equipment (using Firebase key)
        equipmentRef = database.ref(`${EQUIPMENT_REF}/${equipmentId}`);
        promise = equipmentRef.update(equipmentData);
        successMessageAction = "mis à jour";
    } else { // Add new equipment. Use serial as key if unique, otherwise push for Firebase key.
        // For simplicity, we'll use Firebase push keys. If serial must be unique ID, more complex logic is needed.
        equipmentRef = database.ref(EQUIPMENT_REF).push();
        equipmentData.id = equipmentRef.key; // Store Firebase key if needed, though serial is primary user-facing ID
        promise = equipmentRef.set(equipmentData);
    }

    // Log initial status if new equipment or status changed in modal
    const previousStatus = equipmentId ? $(`#equipmentList .changeEquipmentStatus[data-id="${equipmentId}"]`).data('initial-status') : null;
    if (!equipmentId || (previousStatus && equipmentData.status !== previousStatus)) {
        logEquipmentStatusChange(equipmentRef.key || equipmentId, equipmentData.status, "Création/Modification initiale");
    }


    promise.then(() => {
        showToast(`Équipement ${successMessageAction} avec succès.`, "success");
        closeModal();
        displayEquipment($('#filterContractEquipment').val(), $('#filterEquipmentStatus').val());
    }).catch(error => {
        console.error("Error saving equipment:", error);
        showToast(error.message || "Erreur lors de l'enregistrement de l'équipement.", "error");
    });
}

// Change equipment status directly from the list
function changeEquipmentStatus(equipmentId, newStatus) {
    const equipmentRef = database.ref(`${EQUIPMENT_REF}/${equipmentId}`);
    equipmentRef.update({ status: newStatus })
        .then(() => {
            showToast("Statut de l'équipement mis à jour.", "success");
            logEquipmentStatusChange(equipmentId, newStatus, "Changement manuel");
            // No need to call displayEquipment if only status visual changed, but good for consistency
            displayEquipment($('#filterContractEquipment').val(), $('#filterEquipmentStatus').val());
        })
        .catch(error => {
            console.error("Error updating status:", error);
            showToast("Erreur lors de la mise à jour du statut.", "error");
        });
}

// Log status change to equipment_status_history
function logEquipmentStatusChange(equipmentId, newStatus, changedBy = "Système", notes = "") {
    const historyRef = database.ref(`equipment_status_history/${equipmentId}`).push();
    historyRef.set({
        status: newStatus,
        timestamp: firebase.database.ServerValue.TIMESTAMP, // Use server timestamp
        changedBy: changedBy, // Could be a user ID or system action
        notes: notes
    }).catch(error => console.error("Error logging status change:", error));
}

// View status change history for an equipment
function viewStatusHistory(equipmentId) {
    database.ref(`equipment_status_history/${equipmentId}`).orderByChild('timestamp').once('value', snapshot => {
        const history = snapshot.val();
        let historyHtml = `<h5 class="text-md font-semibold mb-3">Historique des statuts pour Équipement ID: ${equipmentId}</h5>`;
        if (history) {
            historyHtml += '<ul class="list-disc pl-5 space-y-2">';
            // Firebase returns object, sort by timestamp client-side if needed, though orderByChild should handle it
            const sortedHistory = Object.values(history).sort((a, b) => b.timestamp - a.timestamp); // Newest first

            sortedHistory.forEach(entry => {
                historyHtml += `
                    <li class="text-sm">
                        <strong>${entry.status}</strong> - ${new Date(entry.timestamp).toLocaleString()}
                        <br><small class="text-gray-500">Par: ${entry.changedBy || 'N/A'}${entry.notes ? ` (${entry.notes})` : ''}</small>
                    </li>`;
            });
            historyHtml += '</ul>';
        } else {
            historyHtml += '<p class="text-gray-500">Aucun historique de changement de statut trouvé pour cet équipement.</p>';
        }
        openModal(`Historique des Statuts - Équipement ${equipmentId}`, historyHtml);
    }).catch(error => {
        console.error("Error fetching status history:", error);
        showToast("Erreur lors de la récupération de l'historique.", "error");
    });
}

// Delete equipment
function deleteEquipment(equipmentId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet équipement ? Les interventions liées pourraient être affectées.")) {
        // Check for related interventions before deleting equipment
        database.ref('interventions').orderByChild('equipmentSerial').equalTo(equipmentId).once('value', snapshot => {
            if (snapshot.exists()) {
                // Note: The sample data uses equipmentSerial which might be the Firebase key or the 'serial' field.
                // Assuming equipmentId here is the Firebase key. If 'serial' field is the link, the query needs adjustment.
                // For now, this check might not be perfect if interventions link via equipmentData.serial instead of Firebase key.
                showToast("Impossible de supprimer l'équipement : des interventions y sont associées.", "error");
                return;
            }

            database.ref(`${EQUIPMENT_REF}/${equipmentId}`).remove()
                .then(() => {
                    // Also remove its status history
                    database.ref(`equipment_status_history/${equipmentId}`).remove();
                    showToast("Équipement supprimé avec succès.", "success");
                    displayEquipment($('#filterContractEquipment').val(), $('#filterEquipmentStatus').val());
                })
                .catch(error => {
                    console.error("Error deleting equipment:", error);
                    showToast("Erreur lors de la suppression de l'équipement.", "error");
                });
        }).catch(error => {
            console.error("Error checking interventions:", error);
            showToast("Erreur lors de la vérification des interventions associées.", "error");
        });
    }
}

console.log("equipment.js loaded");
