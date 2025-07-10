// --- Intervention Management Module ---
const INTERVENTIONS_REF = 'interventions';
// EQUIPMENT_REF, EMPLOYEES_REF should be available or defined.

// Function to load the interventions module
function loadInterventionsModule() {
    const $section = $('#interventions');
    $section.html(`
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-semibold text-gray-700">Planification des Interventions</h3>
            <button id="addInterventionBtn" class="btn btn-primary">Planifier une Intervention</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
                <label for="filterInterventionEquipment" class="form-label">Filtrer par Équipement:</label>
                <select id="filterInterventionEquipment" class="form-input"></select>
            </div>
            <div>
                <label for="filterInterventionEmployee" class="form-label">Filtrer par Employé:</label>
                <select id="filterInterventionEmployee" class="form-input"></select>
            </div>
            <div>
                <label for="filterInterventionStatus" class="form-label">Filtrer par Statut:</label>
                <select id="filterInterventionStatus" class="form-input">
                    <option value="">Tous les Statuts</option>
                    <option value="En attente">En attente</option>
                    <option value="Planifiée">Planifiée</option>
                    <option value="En cours">En cours</option>
                    <option value="Terminée">Terminée</option>
                    <option value="Cloturée">Cloturée</option>
                    <option value="Abandonnée">Abandonnée</option>
                </select>
            </div>
        </div>
        <div id="interventionList" class="overflow-x-auto">
            <p class="text-gray-500">Chargement des interventions...</p>
        </div>
    `);

    $('#addInterventionBtn').on('click', () => openInterventionModal());

    // Populate filters
    populateSelectWithOptions('filterInterventionEquipment', {}, 'id', 'serial', "Tous les Équipements");
    database.ref(EQUIPMENT_REF).once('value', snapshot => {
        populateSelectWithOptions('filterInterventionEquipment', snapshot.val(), 'id', 'serial', "Tous les Équipements");
    });

    populateSelectWithOptions('filterInterventionEmployee', {}, 'id', 'name', "Tous les Employés");
    database.ref('employees').once('value', snapshot => { // Assuming 'employees' is the ref name
        populateSelectWithOptions('filterInterventionEmployee', snapshot.val(), 'id', 'name', "Tous les Employés");
    });

    $('#filterInterventionEquipment, #filterInterventionEmployee, #filterInterventionStatus').on('change', function() {
        displayInterventions(
            $('#filterInterventionEquipment').val(),
            $('#filterInterventionEmployee').val(),
            $('#filterInterventionStatus').val()
        );
    });

    displayInterventions(); // Initial display
}

// Display interventions, optionally filtered
async function displayInterventions(filterEquipmentId = null, filterEmployeeId = null, filterStatus = null) {
    const $interventionList = $('#interventionList');
    if (!$interventionList.length) return;
    $interventionList.html('<p class="text-gray-500">Chargement des interventions...</p>');

    try {
        const interventionsSnapshot = await database.ref(INTERVENTIONS_REF).once('value');
        let allInterventions = interventionsSnapshot.val()
            ? Object.entries(interventionsSnapshot.val()).map(([key, value]) => ({ ...value, id: key }))
            : [];

        // Apply filters
        if (filterEquipmentId) {
            allInterventions = allInterventions.filter(inv => inv.equipmentId === filterEquipmentId);
        }
        if (filterEmployeeId) {
            allInterventions = allInterventions.filter(inv => inv.employeeId === filterEmployeeId);
        }
        if (filterStatus) {
            allInterventions = allInterventions.filter(inv => inv.status === filterStatus);
        }

        if (allInterventions.length === 0) {
            $interventionList.html('<p class="text-center text-gray-500 py-5">Aucune intervention trouvée pour les filtres sélectionnés.</p>');
            return;
        }

        // Fetch details for display (Equipment Serial, Employee Name)
        const detailedInterventionsPromises = allInterventions.map(async (inv) => {
            let equipmentSerial = 'N/A';
            if (inv.equipmentId) {
                const eqSnap = await database.ref(`${EQUIPMENT_REF}/${inv.equipmentId}/serial`).once('value');
                equipmentSerial = eqSnap.val() || inv.equipmentId; // Fallback to ID if serial not found
            }

            let employeeName = 'N/A';
            if (inv.employeeId) {
                const empSnap = await database.ref(`employees/${inv.employeeId}/name`).once('value');
                employeeName = empSnap.val() || inv.employeeId; // Fallback to ID
            }
            return { ...inv, equipmentSerial, employeeName };
        });

        const detailedInterventions = await Promise.all(detailedInterventionsPromises);

        let tableHtml = `
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="th-cell">ID Intervention</th>
                        <th class="th-cell">Équipement (Série)</th>
                        <th class="th-cell">Employé Assigné</th>
                        <th class="th-cell">Date Planifiée</th>
                        <th class="th-cell">Type</th>
                        <th class="th-cell">Statut</th>
                        <th class="th-cell">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
        `;
        detailedInterventions.forEach(inv => {
            tableHtml += `
                <tr>
                    <td class="td-cell">${inv.customId || inv.id}</td>
                    <td class="td-cell">${inv.equipmentSerial}</td>
                    <td class="td-cell">${inv.employeeName}</td>
                    <td class="td-cell">${inv.plannedDate ? new Date(inv.plannedDate).toLocaleDateString() : ''}</td>
                    <td class="td-cell">${inv.type || ''}</td>
                    <td class="td-cell">
                        <select class="form-input p-1 changeInterventionStatus" data-id="${inv.id}">
                            <option value="En attente" ${inv.status === 'En attente' ? 'selected' : ''}>En attente</option>
                            <option value="Planifiée" ${inv.status === 'Planifiée' ? 'selected' : ''}>Planifiée</option>
                            <option value="En cours" ${inv.status === 'En cours' ? 'selected' : ''}>En cours</option>
                            <option value="Terminée" ${inv.status === 'Terminée' ? 'selected' : ''}>Terminée</option>
                            <option value="Cloturée" ${inv.status === 'Cloturée' ? 'selected' : ''}>Cloturée</option>
                            <option value="Abandonnée" ${inv.status === 'Abandonnée' ? 'selected' : ''}>Abandonnée</option>
                        </select>
                    </td>
                    <td class="td-cell">
                        <button class="text-indigo-600 hover:text-indigo-900 editInterventionBtn" data-id="${inv.id}">Modifier</button>
                        <button class="text-red-600 hover:text-red-900 ml-2 deleteInterventionBtn" data-id="${inv.id}">Supprimer</button>
                    </td>
                </tr>
            `;
        });
        tableHtml += `</tbody></table>`;
        $interventionList.html(tableHtml);

        $('.th-cell').addClass('px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider');
        $('.td-cell').addClass('px-4 py-3 whitespace-nowrap text-sm text-gray-700');

        $('.editInterventionBtn').on('click', function() { openInterventionModal($(this).data('id')); });
        $('.deleteInterventionBtn').on('click', function() { deleteIntervention($(this).data('id')); });
        $('.changeInterventionStatus').on('change', function() { changeInterventionStatus($(this).data('id'), $(this).val()); });

    } catch (error) {
        console.error("Error fetching interventions:", error);
        showToast("Erreur lors de la récupération des interventions.", "error");
        $interventionList.html('<p class="text-center text-red-500 py-5">Erreur de chargement des interventions.</p>');
    }
}

// Open modal for adding or editing an intervention
function openInterventionModal(interventionId = null) {
    let formTitle = "Planifier une Nouvelle Intervention";
    let submitButtonText = "Planifier";
    let intData = { id: '', customId: `INT-${generateUniqueId()}`, equipmentId: '', employeeId: '', plannedDate: '', type: 'Maintenance', description: '', status: 'En attente' };

    const equipmentPromise = database.ref(EQUIPMENT_REF).once('value').then(snapshot => {
        let options = '<option value="">Sélectionnez un Équipement</option>';
        if (snapshot.val()) {
            Object.entries(snapshot.val()).forEach(([key, value]) => {
                options += `<option value="${key}">${value.serial || key} (${value.type || 'N/A'})</option>`;
            });
        }
        return options;
    });

    const employeesPromise = database.ref('employees').once('value').then(snapshot => {
        let options = '<option value="">Assigner à un Employé (Optionnel)</option>';
        if (snapshot.val()) {
            Object.entries(snapshot.val()).forEach(([key, value]) => {
                options += `<option value="${key}">${value.name || key}</option>`;
            });
        }
        return options;
    });

    const buildModalContent = (currentIntData, eqOpts, empOpts) => `
        <form id="interventionForm">
            <input type="hidden" id="interventionId" name="interventionId" value="${currentIntData.id}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="interventionCustomId" class="form-label">ID Intervention:</label>
                    <input type="text" id="interventionCustomId" name="customId" class="form-input" value="${currentIntData.customId}" required>
                </div>
                <div>
                    <label for="interventionEquipmentId" class="form-label">Équipement Concerné:</label>
                    <select id="interventionEquipmentId" name="equipmentId" class="form-input" required>
                        ${eqOpts}
                    </select>
                </div>
                <div>
                    <label for="interventionEmployeeId" class="form-label">Employé Assigné:</label>
                    <select id="interventionEmployeeId" name="employeeId" class="form-input">
                        ${empOpts}
                    </select>
                </div>
                <div>
                    <label for="interventionPlannedDate" class="form-label">Date Planifiée:</label>
                    <input type="date" id="interventionPlannedDate" name="plannedDate" class="form-input" value="${currentIntData.plannedDate}" required>
                </div>
                <div>
                    <label for="interventionType" class="form-label">Type d'Intervention:</label>
                    <input type="text" id="interventionType" name="type" class="form-input" value="${currentIntData.type}">
                </div>
                <div>
                    <label for="interventionStatusModal" class="form-label">Statut:</label>
                    <select id="interventionStatusModal" name="status" class="form-input">
                        <option value="En attente" ${currentIntData.status === 'En attente' ? 'selected' : ''}>En attente</option>
                        <option value="Planifiée" ${currentIntData.status === 'Planifiée' ? 'selected' : ''}>Planifiée</option>
                        <option value="En cours" ${currentIntData.status === 'En cours' ? 'selected' : ''}>En cours</option>
                        <option value="Terminée" ${currentIntData.status === 'Terminée' ? 'selected' : ''}>Terminée</option>
                        <option value="Cloturée" ${currentIntData.status === 'Cloturée' ? 'selected' : ''}>Cloturée</option>
                        <option value="Abandonnée" ${currentIntData.status === 'Abandonnée' ? 'selected' : ''}>Abandonnée</option>
                    </select>
                </div>
            </div>
            <div class="mt-4">
                <label for="interventionDescription" class="form-label">Description / Notes:</label>
                <textarea id="interventionDescription" name="description" class="form-input" rows="3">${currentIntData.description || ''}</textarea>
            </div>
        </form>
    `;

    const modalFooterContent = `
        <button type="button" class="btn btn-secondary modal-close-btn mr-2">Annuler</button>
        <button type="button" id="saveInterventionBtn" class="btn btn-primary">${submitButtonText}</button>
    `;

    if (interventionId) { // Editing
        formTitle = "Modifier l'Intervention";
        submitButtonText = "Sauvegarder";
        Promise.all([database.ref(`${INTERVENTIONS_REF}/${interventionId}`).once('value'), equipmentPromise, employeesPromise])
            .then(([intSnapshot, eqOpts, empOpts]) => {
                if (intSnapshot.val()) {
                    intData = { ...intSnapshot.val(), id: interventionId };
                    openModal(formTitle, buildModalContent(intData, eqOpts, empOpts), modalFooterContent);
                    $('#saveInterventionBtn').text(submitButtonText);

                    // Pre-fill form
                    $('#interventionId').val(intData.id);
                    $('#interventionCustomId').val(intData.customId);
                    $('#interventionEquipmentId').val(intData.equipmentId);
                    $('#interventionEmployeeId').val(intData.employeeId);
                    $('#interventionPlannedDate').val(intData.plannedDate);
                    $('#interventionType').val(intData.type);
                    $('#interventionStatusModal').val(intData.status);
                    $('#interventionDescription').val(intData.description);

                    $('#saveInterventionBtn').off('click').on('click', saveIntervention);
                } else { showToast("Intervention non trouvée.", "error"); }
            }).catch(error => {
                console.error("Error fetching data for intervention edit:", error);
                showToast("Erreur de chargement des données.", "error");
            });
    } else { // Adding
        Promise.all([equipmentPromise, employeesPromise]).then(([eqOpts, empOpts]) => {
            openModal(formTitle, buildModalContent(intData, eqOpts, empOpts), modalFooterContent);
            $('#saveInterventionBtn').text(submitButtonText);
            $('#saveInterventionBtn').off('click').on('click', saveIntervention);
        });
    }
    $('.modal-close-btn').on('click', closeModal);
}

// Save (add or update) intervention data
function saveIntervention() {
    const firebaseKey = $('#interventionId').val(); // Firebase key for updates
    const customId = $('#interventionCustomId').val().trim();

    const interventionData = {
        customId: customId,
        equipmentId: $('#interventionEquipmentId').val(),
        employeeId: $('#interventionEmployeeId').val() || null, // Store null if empty
        plannedDate: $('#interventionPlannedDate').val(),
        type: $('#interventionType').val().trim(),
        status: $('#interventionStatusModal').val(),
        description: $('#interventionDescription').val().trim(),
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    if (!interventionData.customId || !interventionData.equipmentId || !interventionData.plannedDate) {
        showToast("ID Intervention, Équipement et Date planifiée sont requis.", "error");
        return;
    }

    let promise;
    let successMessageAction = "planifiée";

    if (firebaseKey) { // Update existing using Firebase key
        promise = database.ref(`${INTERVENTIONS_REF}/${firebaseKey}`).update(interventionData);
        successMessageAction = "mise à jour";
    } else { // Add new. Use customId as key if provided and unique, otherwise push.
        // For simplicity, we'll use Firebase push() and store customId as a field.
        // If customId MUST be the Firebase key, check for uniqueness first.
        interventionData.createdAt = firebase.database.ServerValue.TIMESTAMP;
        const newInterventionRef = database.ref(INTERVENTIONS_REF).push();
        promise = newInterventionRef.set(interventionData);
    }

    promise.then(() => {
        showToast(`Intervention ${successMessageAction} avec succès.`, "success");
        closeModal();
        displayInterventions(
            $('#filterInterventionEquipment').val(),
            $('#filterInterventionEmployee').val(),
            $('#filterInterventionStatus').val()
        );
    }).catch(error => {
        console.error("Error saving intervention:", error);
        showToast(error.message || "Erreur lors de l'enregistrement de l'intervention.", "error");
    });
}

// Change intervention status directly from the list
function changeInterventionStatus(interventionId, newStatus) {
    database.ref(`${INTERVENTIONS_REF}/${interventionId}`).update({
        status: newStatus,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    })
    .then(() => {
        showToast("Statut de l'intervention mis à jour.", "success");
        // Optionally, log this change to a specific intervention history if needed
        displayInterventions( // Refresh to ensure consistency, though only one field changed
            $('#filterInterventionEquipment').val(),
            $('#filterInterventionEmployee').val(),
            $('#filterInterventionStatus').val()
        );
    })
    .catch(error => {
        console.error("Error updating intervention status:", error);
        showToast("Erreur lors de la mise à jour du statut.", "error");
    });
}

// Delete an intervention
function deleteIntervention(interventionId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette intervention ?")) {
        // Check for related stock_out entries before deleting.
        database.ref('stock_out').orderByChild('interventionId').equalTo(interventionId).once('value', snapshot => {
            if (snapshot.exists()) {
                showToast("Impossible de supprimer l'intervention : des sorties de stock y sont associées.", "error");
                return;
            }

            database.ref(`${INTERVENTIONS_REF}/${interventionId}`).remove()
                .then(() => {
                    showToast("Intervention supprimée avec succès.", "success");
                    displayInterventions(
                        $('#filterInterventionEquipment').val(),
                        $('#filterInterventionEmployee').val(),
                        $('#filterInterventionStatus').val()
                    );
                })
                .catch(error => {
                    console.error("Error deleting intervention:", error);
                    showToast("Erreur lors de la suppression de l'intervention.", "error");
                });
        }).catch(error => {
            console.error("Error checking stock_out:", error);
            showToast("Erreur lors de la vérification des sorties de stock associées.", "error");
        });
    }
}

console.log("interventions.js loaded");
