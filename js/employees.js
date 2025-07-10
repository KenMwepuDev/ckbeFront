// --- Human Resources Management Module (Employees) ---
const EMPLOYEES_REF = 'employees';

// Function to load the employees module
function loadEmployeesModule() {
    const $section = $('#employees');
    $section.html(`
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-semibold text-gray-700">Gestion des Employés</h3>
            <button id="addEmployeeBtn" class="btn btn-primary">Ajouter un Employé</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label for="filterEmployeeRole" class="form-label">Filtrer par Rôle:</label>
                <input type="text" id="filterEmployeeRole" class="form-input" placeholder="Ex: Technicien, Admin...">
            </div>
            <div>
                <label for="filterEmployeeStatusHR" class="form-label">Filtrer par Statut:</label>
                <select id="filterEmployeeStatusHR" class="form-input">
                    <option value="">Tous les Statuts</option>
                    <option value="Active">Actif</option>
                    <option value="On Leave">En Congé</option>
                    <option value="Inactive">Inactif</option>
                </select>
            </div>
        </div>
        <div id="employeeList" class="overflow-x-auto">
            <p class="text-gray-500">Chargement des employés...</p>
        </div>
    `);

    $('#addEmployeeBtn').on('click', () => openEmployeeModal());

    $('#filterEmployeeRole, #filterEmployeeStatusHR').on('input change', function() {
        displayEmployees($('#filterEmployeeRole').val().trim(), $('#filterEmployeeStatusHR').val());
    });

    displayEmployees(); // Initial display
}

// Display employees, optionally filtered
async function displayEmployees(filterRole = null, filterStatus = null) {
    const $employeeList = $('#employeeList');
    if (!$employeeList.length) return;
    $employeeList.html('<p class="text-gray-500">Chargement...</p>');

    try {
        const employeesSnapshot = await database.ref(EMPLOYEES_REF).once('value');
        let allEmployees = employeesSnapshot.val()
            ? Object.entries(employeesSnapshot.val()).map(([key, value]) => ({ ...value, id: key }))
            : [];

        // Apply filters
        if (filterRole) {
            allEmployees = allEmployees.filter(emp => emp.role && emp.role.toLowerCase().includes(filterRole.toLowerCase()));
        }
        if (filterStatus) {
            allEmployees = allEmployees.filter(emp => emp.status === filterStatus);
        }

        if (allEmployees.length === 0) {
            $employeeList.html('<p class="text-center text-gray-500 py-5">Aucun employé trouvé.</p>');
            return;
        }

        let tableHtml = `
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="th-cell">ID Employé</th>
                        <th class="th-cell">Nom</th>
                        <th class="th-cell">Rôle</th>
                        <th class="th-cell">Contact (Tél/Email)</th>
                        <th class="th-cell">Statut</th>
                        <th class="th-cell">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
        `;
        allEmployees.forEach(emp => {
            tableHtml += `
                <tr>
                    <td class="td-cell">${emp.customId || emp.id}</td>
                    <td class="td-cell">${emp.name}</td>
                    <td class="td-cell">${emp.role || ''}</td>
                    <td class="td-cell">
                        ${emp.phone ? `Tél: ${emp.phone}<br>` : ''}
                        ${emp.email ? `Email: ${emp.email}` : ''}
                    </td>
                    <td class="td-cell">
                        <select class="form-input p-1 changeEmployeeStatus" data-id="${emp.id}">
                            <option value="Active" ${emp.status === 'Active' ? 'selected' : ''}>Actif</option>
                            <option value="On Leave" ${emp.status === 'On Leave' ? 'selected' : ''}>En Congé</option>
                            <option value="Inactive" ${emp.status === 'Inactive' ? 'selected' : ''}>Inactif</option>
                            <!-- Add other statuses as needed -->
                        </select>
                    </td>
                    <td class="td-cell">
                        <button class="text-indigo-600 hover:text-indigo-900 editEmployeeBtn" data-id="${emp.id}">Modifier</button>
                        <button class="text-red-600 hover:text-red-900 ml-2 deleteEmployeeBtn" data-id="${emp.id}">Supprimer</button>
                    </td>
                </tr>
            `;
        });
        tableHtml += `</tbody></table>`;
        $employeeList.html(tableHtml);

        $('.th-cell').addClass('px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider');
        $('.td-cell').addClass('px-4 py-3 whitespace-nowrap text-sm text-gray-700');

        $('.editEmployeeBtn').on('click', function() { openEmployeeModal($(this).data('id')); });
        $('.deleteEmployeeBtn').on('click', function() { deleteEmployee($(this).data('id')); });
        $('.changeEmployeeStatus').on('change', function() { changeEmployeeStatus($(this).data('id'), $(this).val()); });

    } catch (error) {
        console.error("Error fetching employees:", error);
        showToast("Erreur lors de la récupération des employés.", "error");
        $employeeList.html('<p class="text-center text-red-500 py-5">Erreur de chargement.</p>');
    }
}

// Open modal for adding or editing an employee
function openEmployeeModal(employeeId = null) {
    let formTitle = "Ajouter un Nouvel Employé";
    let submitButtonText = "Ajouter Employé";
    let empData = { id: '', customId: `EMP-${generateUniqueId()}`, name: '', role: '', phone: '', email: '', status: 'Active', joinDate: '' };

    const buildModalContent = (currentEmpData) => `
        <form id="employeeForm">
            <input type="hidden" id="employeeId" name="employeeId" value="${currentEmpData.id}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="employeeCustomId" class="form-label">ID Employé (Matricule):</label>
                    <input type="text" id="employeeCustomId" name="customId" class="form-input" value="${currentEmpData.customId}" required>
                </div>
                <div>
                    <label for="employeeName" class="form-label">Nom Complet:</label>
                    <input type="text" id="employeeName" name="name" class="form-input" value="${currentEmpData.name}" required>
                </div>
                <div>
                    <label for="employeeRole" class="form-label">Rôle/Poste:</label>
                    <input type="text" id="employeeRole" name="role" class="form-input" value="${currentEmpData.role}">
                </div>
                <div>
                    <label for="employeePhone" class="form-label">Téléphone:</label>
                    <input type="tel" id="employeePhone" name="phone" class="form-input" value="${currentEmpData.phone}">
                </div>
                <div>
                    <label for="employeeEmail" class="form-label">Email:</label>
                    <input type="email" id="employeeEmail" name="email" class="form-input" value="${currentEmpData.email}">
                </div>
                <div>
                    <label for="employeeJoinDate" class="form-label">Date d'Embauche:</label>
                    <input type="date" id="employeeJoinDate" name="joinDate" class="form-input" value="${currentEmpData.joinDate}">
                </div>
                <div>
                    <label for="employeeStatusModal" class="form-label">Statut:</label>
                    <select id="employeeStatusModal" name="status" class="form-input">
                        <option value="Active" ${currentEmpData.status === 'Active' ? 'selected' : ''}>Actif</option>
                        <option value="On Leave" ${currentEmpData.status === 'On Leave' ? 'selected' : ''}>En Congé</option>
                        <option value="Inactive" ${currentEmpData.status === 'Inactive' ? 'selected' : ''}>Inactif</option>
                    </select>
                </div>
            </div>
            <div class="mt-4">
                <label for="employeeNotes" class="form-label">Notes (Optionnel):</label>
                <textarea id="employeeNotes" name="notes" class="form-input" rows="2">${currentEmpData.notes || ''}</textarea>
            </div>
        </form>
    `;
    const modalFooterContent = `
        <button type="button" class="btn btn-secondary modal-close-btn mr-2">Annuler</button>
        <button type="button" id="saveEmployeeBtn" class="btn btn-primary">${submitButtonText}</button>
    `;

    if (employeeId) { // Editing
        formTitle = "Modifier les Informations de l'Employé";
        submitButtonText = "Sauvegarder";
        database.ref(`${EMPLOYEES_REF}/${employeeId}`).once('value')
            .then(snapshot => {
                if (snapshot.val()) {
                    empData = { ...snapshot.val(), id: employeeId };
                    openModal(formTitle, buildModalContent(empData), modalFooterContent);
                    $('#saveEmployeeBtn').text(submitButtonText);
                    $('#saveEmployeeBtn').off('click').on('click', saveEmployee);
                } else { showToast("Employé non trouvé.", "error"); }
            }).catch(error => {
                console.error("Error fetching employee for edit:", error);
                showToast("Erreur de chargement de l'employé.", "error");
            });
    } else { // Adding
        openModal(formTitle, buildModalContent(empData), modalFooterContent);
        $('#saveEmployeeBtn').text(submitButtonText);
        $('#saveEmployeeBtn').off('click').on('click', saveEmployee);
    }
    $('.modal-close-btn').on('click', closeModal);
}

// Save (add or update) employee data
function saveEmployee() {
    const employeeId = $('#employeeId').val(); // Firebase key for updates
    const customId = $('#employeeCustomId').val().trim();

    const employeeData = {
        customId: customId,
        name: $('#employeeName').val().trim(),
        role: $('#employeeRole').val().trim(),
        phone: $('#employeePhone').val().trim(),
        email: $('#employeeEmail').val().trim().toLowerCase(),
        status: $('#employeeStatusModal').val(),
        joinDate: $('#employeeJoinDate').val(),
        notes: $('#employeeNotes').val().trim(),
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    if (!employeeData.customId || !employeeData.name) {
        showToast("ID Employé (Matricule) et Nom sont requis.", "error");
        return;
    }
    if (employeeData.email && !/\S+@\S+\.\S+/.test(employeeData.email)) { // Basic email validation
        showToast("Veuillez entrer une adresse email valide.", "error");
        return;
    }


    let promise;
    let successMessageAction = "ajouté";

    if (employeeId) { // Update existing
        promise = database.ref(`${EMPLOYEES_REF}/${employeeId}`).update(employeeData);
        successMessageAction = "mis à jour";
    } else { // Add new
        employeeData.createdAt = firebase.database.ServerValue.TIMESTAMP;
        // Check if customId (matricule) already exists if it's meant to be unique Firebase key
        // For simplicity, like other modules, use push() and store customId as a field.
        const newEmployeeRef = database.ref(EMPLOYEES_REF).push();
        promise = newEmployeeRef.set(employeeData);
    }

    promise.then(() => {
        showToast(`Employé ${successMessageAction} avec succès.`, "success");
        closeModal();
        displayEmployees($('#filterEmployeeRole').val(), $('#filterEmployeeStatusHR').val());
    }).catch(error => {
        console.error("Error saving employee:", error);
        showToast(error.message || "Erreur lors de l'enregistrement.", "error");
    });
}

// Change employee status directly from the list
function changeEmployeeStatus(employeeId, newStatus) {
    database.ref(`${EMPLOYEES_REF}/${employeeId}`).update({
        status: newStatus,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    })
    .then(() => {
        showToast("Statut de l'employé mis à jour.", "success");
        // No need to call displayEmployees if only the select value changed visually,
        // but if other derived data depends on status, a refresh is good.
        // For now, this is fine. If complex dependencies, call:
        // displayEmployees($('#filterEmployeeRole').val(), $('#filterEmployeeStatusHR').val());
    })
    .catch(error => {
        console.error("Error updating employee status:", error);
        showToast("Erreur lors de la mise à jour du statut.", "error");
        // Revert visual change on error if necessary
        displayEmployees($('#filterEmployeeRole').val(), $('#filterEmployeeStatusHR').val());
    });
}

// Delete an employee
function deleteEmployee(employeeId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet employé ? Vérifiez qu'il/elle n'est assigné(e) à aucune intervention active.")) {
        // Check for related active interventions before deleting an employee
        database.ref(INTERVENTIONS_REF)
                .orderByChild('employeeId')
                .equalTo(employeeId)
                .once('value', snapshot => {
            let hasActiveInterventions = false;
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const intervention = childSnapshot.val();
                    if (intervention.status !== 'Cloturée' && intervention.status !== 'Abandonnée' && intervention.status !== 'Terminée') {
                        hasActiveInterventions = true;
                    }
                });
            }

            if (hasActiveInterventions) {
                showToast("Impossible de supprimer : l'employé est assigné à des interventions non cloturées/terminées.", "error");
                return;
            }

            // No active interventions, proceed with deletion
            database.ref(`${EMPLOYEES_REF}/${employeeId}`).remove()
                .then(() => {
                    showToast("Employé supprimé avec succès.", "success");
                    displayEmployees($('#filterEmployeeRole').val(), $('#filterEmployeeStatusHR').val());
                })
                .catch(error => {
                    console.error("Error deleting employee:", error);
                    showToast("Erreur lors de la suppression de l'employé.", "error");
                });
        }).catch(error => {
            console.error("Error checking interventions for employee:", error);
            showToast("Erreur lors de la vérification des interventions associées.", "error");
        });
    }
}

console.log("employees.js loaded");
