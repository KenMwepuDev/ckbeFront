// --- Inventory Management Module ---
const INVENTORY_ITEMS_REF = 'inventory_items';
const RESTOCK_HISTORY_REF = 'restock_history';
const STOCK_OUT_HISTORY_REF = 'stock_out_history';
// INTERVENTIONS_REF should be available

// Function to load the inventory module
function loadInventoryModule() {
    const $section = $('#inventory');
    $section.html(`
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-semibold text-gray-700">Gestion des Stocks et Approvisionnements</h3>
            <button id="addInventoryItemBtn" class="btn btn-primary">Ajouter un Article</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label for="filterInventoryCategory" class="form-label">Filtrer par Catégorie:</label>
                <input type="text" id="filterInventoryCategory" class="form-input" placeholder="Nom de la catégorie...">
            </div>
            <div>
                <label for="filterInventoryStatus" class="form-label">Filtrer par Statut:</label>
                <select id="filterInventoryStatus" class="form-input">
                    <option value="">Tous les Statuts</option>
                    <option value="In Stock">En Stock</option>
                    <option value="Low Stock">Stock Bas</option>
                    <option value="Out of Stock">Hors Stock</option>
                </select>
            </div>
        </div>
        <div id="inventoryItemList" class="overflow-x-auto">
            <p class="text-gray-500">Chargement des articles d'inventaire...</p>
        </div>
    `);

    $('#addInventoryItemBtn').on('click', () => openInventoryItemModal());

    $('#filterInventoryCategory, #filterInventoryStatus').on('input change', function() {
        displayInventoryItems($('#filterInventoryCategory').val().trim(), $('#filterInventoryStatus').val());
    });

    displayInventoryItems(); // Initial display
}

// Display inventory items, optionally filtered
async function displayInventoryItems(filterCategory = null, filterStatus = null) {
    const $itemList = $('#inventoryItemList');
    if (!$itemList.length) return;
    $itemList.html('<p class="text-gray-500">Chargement...</p>');

    try {
        const itemsSnapshot = await database.ref(INVENTORY_ITEMS_REF).once('value');
        let allItems = itemsSnapshot.val()
            ? Object.entries(itemsSnapshot.val()).map(([key, value]) => ({ ...value, id: key }))
            : [];

        // Apply filters
        if (filterCategory) {
            allItems = allItems.filter(item => item.category && item.category.toLowerCase().includes(filterCategory.toLowerCase()));
        }
        if (filterStatus) {
            allItems = allItems.filter(item => item.status === filterStatus);
        }

        if (allItems.length === 0) {
            $itemList.html('<p class="text-center text-gray-500 py-5">Aucun article trouvé.</p>');
            return;
        }

        let tableHtml = `
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="th-cell">ID/Code Article</th>
                        <th class="th-cell">Nom</th>
                        <th class="th-cell">Catégorie</th>
                        <th class="th-cell">Quantité</th>
                        <th class="th-cell">Unité</th>
                        <th class="th-cell">Statut</th>
                        <th class="th-cell">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
        `;
        allItems.forEach(item => {
            tableHtml += `
                <tr>
                    <td class="td-cell">${item.customId || item.id}</td>
                    <td class="td-cell">${item.name}</td>
                    <td class="td-cell">${item.category || ''}</td>
                    <td class="td-cell">${item.quantity}</td>
                    <td class="td-cell">${item.unit || ''}</td>
                    <td class="td-cell">${item.status || ''}</td>
                    <td class="td-cell">
                        <button class="text-green-600 hover:text-green-900 restockItemBtn" data-id="${item.id}" data-name="${item.name}">Réapprovisionner</button>
                        <button class="text-yellow-600 hover:text-yellow-900 ml-2 stockOutItemBtn" data-id="${item.id}" data-name="${item.name}">Sortie Stock</button>
                        <button class="text-indigo-600 hover:text-indigo-900 ml-2 editInventoryItemBtn" data-id="${item.id}">Modifier</button>
                        <button class="text-blue-600 hover:text-blue-900 ml-2 viewItemHistoryBtn" data-id="${item.id}" data-name="${item.name}">Historique</button>
                        <button class="text-red-600 hover:text-red-900 ml-2 deleteInventoryItemBtn" data-id="${item.id}">Supprimer</button>
                    </td>
                </tr>
            `;
        });
        tableHtml += `</tbody></table>`;
        $itemList.html(tableHtml);

        $('.th-cell').addClass('px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider');
        $('.td-cell').addClass('px-4 py-3 whitespace-nowrap text-sm text-gray-700');

        $('.editInventoryItemBtn').on('click', function() { openInventoryItemModal($(this).data('id')); });
        $('.deleteInventoryItemBtn').on('click', function() { deleteInventoryItem($(this).data('id')); });
        $('.restockItemBtn').on('click', function() { openRestockModal($(this).data('id'), $(this).data('name')); });
        $('.stockOutItemBtn').on('click', function() { openStockOutModal($(this).data('id'), $(this).data('name')); });
        $('.viewItemHistoryBtn').on('click', function() { viewItemMovementHistory($(this).data('id'), $(this).data('name')); });

    } catch (error) {
        console.error("Error fetching inventory items:", error);
        showToast("Erreur lors de la récupération des articles.", "error");
        $itemList.html('<p class="text-center text-red-500 py-5">Erreur de chargement.</p>');
    }
}

// Open modal for adding or editing an inventory item
function openInventoryItemModal(itemId = null) {
    let formTitle = "Ajouter un Nouvel Article à l'Inventaire";
    let submitButtonText = "Ajouter Article";
    let itemData = { id: '', customId: `INV-${generateUniqueId()}`, name: '', category: '', quantity: 0, unit: 'pièces', status: 'In Stock', minStockLevel: 0 };

    const buildModalContent = (currentItemData) => `
        <form id="inventoryItemForm">
            <input type="hidden" id="inventoryItemId" name="inventoryItemId" value="${currentItemData.id}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="itemCustomId" class="form-label">ID/Code Article:</label>
                    <input type="text" id="itemCustomId" name="customId" class="form-input" value="${currentItemData.customId}" required>
                </div>
                <div>
                    <label for="itemName" class="form-label">Nom de l'Article:</label>
                    <input type="text" id="itemName" name="name" class="form-input" value="${currentItemData.name}" required>
                </div>
                <div>
                    <label for="itemCategory" class="form-label">Catégorie:</label>
                    <input type="text" id="itemCategory" name="category" class="form-input" value="${currentItemData.category}">
                </div>
                 <div>
                    <label for="itemQuantity" class="form-label">Quantité Initiale (si nouvel article):</label>
                    <input type="number" id="itemQuantity" name="quantity" class="form-input" value="${currentItemData.quantity}" ${itemId ? 'disabled' : ''} min="0">
                     ${itemId ? '<small class="text-xs text-gray-500">La quantité est gérée via Réappro./Sortie.</small>' : ''}
                </div>
                <div>
                    <label for="itemUnit" class="form-label">Unité:</label>
                    <input type="text" id="itemUnit" name="unit" class="form-input" value="${currentItemData.unit}">
                </div>
                <div>
                    <label for="itemMinStockLevel" class="form-label">Niveau de Stock Minimum:</label>
                    <input type="number" id="itemMinStockLevel" name="minStockLevel" class="form-input" value="${currentItemData.minStockLevel || 0}" min="0">
                </div>
                <div>
                    <label for="itemStatusModal" class="form-label">Statut:</label>
                    <select id="itemStatusModal" name="status" class="form-input">
                        <option value="In Stock" ${currentItemData.status === 'In Stock' ? 'selected' : ''}>En Stock</option>
                        <option value="Low Stock" ${currentItemData.status === 'Low Stock' ? 'selected' : ''}>Stock Bas</option>
                        <option value="Out of Stock" ${currentItemData.status === 'Out of Stock' ? 'selected' : ''}>Hors Stock</option>
                    </select>
                </div>
            </div>
        </form>
    `;
    const modalFooterContent = `
        <button type="button" class="btn btn-secondary modal-close-btn mr-2">Annuler</button>
        <button type="button" id="saveInventoryItemBtn" class="btn btn-primary">${submitButtonText}</button>
    `;

    if (itemId) { // Editing
        formTitle = "Modifier l'Article d'Inventaire";
        submitButtonText = "Sauvegarder";
        database.ref(`${INVENTORY_ITEMS_REF}/${itemId}`).once('value')
            .then(snapshot => {
                if (snapshot.val()) {
                    itemData = { ...snapshot.val(), id: itemId };
                    openModal(formTitle, buildModalContent(itemData), modalFooterContent);
                    $('#saveInventoryItemBtn').text(submitButtonText);
                    // Pre-fill (already done by buildModalContent with value attributes)
                    $('#saveInventoryItemBtn').off('click').on('click', saveInventoryItem);
                } else { showToast("Article non trouvé.", "error"); }
            }).catch(error => {
                console.error("Error fetching item for edit:", error);
                showToast("Erreur de chargement de l'article.", "error");
            });
    } else { // Adding
        openModal(formTitle, buildModalContent(itemData), modalFooterContent);
        $('#saveInventoryItemBtn').text(submitButtonText);
        $('#saveInventoryItemBtn').off('click').on('click', saveInventoryItem);
    }
    $('.modal-close-btn').on('click', closeModal);
}

// Save (add or update) inventory item
function saveInventoryItem() {
    const itemId = $('#inventoryItemId').val(); // Firebase key for updates
    const customId = $('#itemCustomId').val().trim();

    const itemData = {
        customId: customId,
        name: $('#itemName').val().trim(),
        category: $('#itemCategory').val().trim(),
        unit: $('#itemUnit').val().trim(),
        status: $('#itemStatusModal').val(),
        minStockLevel: parseInt($('#itemMinStockLevel').val()) || 0,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    if (!itemData.customId || !itemData.name) {
        showToast("ID Article et Nom sont requis.", "error");
        return;
    }

    let promise;
    let successMessageAction = "ajouté";

    if (itemId) { // Update existing
        promise = database.ref(`${INVENTORY_ITEMS_REF}/${itemId}`).update(itemData);
        successMessageAction = "mis à jour";
    } else { // Add new
        itemData.quantity = parseInt($('#itemQuantity').val()) || 0; // Set initial quantity for new items
        itemData.createdAt = firebase.database.ServerValue.TIMESTAMP;
        // Use customId as Firebase key if unique and desired, or push() for auto-key.
        // For consistency with other modules, let's use push() and store customId as a field.
        const newItemRef = database.ref(INVENTORY_ITEMS_REF).push();
        promise = newItemRef.set(itemData).then(() => {
            // If initial quantity > 0, log it as a restock event
            if (itemData.quantity > 0) {
                logRestock(newItemRef.key, itemData.quantity, "Stock initial");
            }
        });
    }

    promise.then(() => {
        showToast(`Article ${successMessageAction} avec succès.`, "success");
        closeModal();
        displayInventoryItems($('#filterInventoryCategory').val(), $('#filterInventoryStatus').val());
    }).catch(error => {
        console.error("Error saving item:", error);
        showToast(error.message || "Erreur lors de l'enregistrement.", "error");
    });
}

// --- Restock Modal and Logic ---
function openRestockModal(itemId, itemName) {
    const modalTitle = `Réapprovisionner: ${itemName}`;
    const modalBody = `
        <form id="restockForm">
            <input type="hidden" id="restockItemId" value="${itemId}">
            <div class="mb-4">
                <label for="restockQuantity" class="form-label">Quantité à Ajouter:</label>
                <input type="number" id="restockQuantity" class="form-input" min="1" required>
            </div>
            <div class="mb-4">
                <label for="restockNotes" class="form-label">Notes (Optionnel):</label>
                <input type="text" id="restockNotes" class="form-input" placeholder="Ex: Fournisseur Untel">
            </div>
        </form>
    `;
    const modalFooter = `
        <button type="button" class="btn btn-secondary modal-close-btn mr-2">Annuler</button>
        <button type="button" id="confirmRestockBtn" class="btn btn-success">Confirmer Réapprovisionnement</button>
    `;
    openModal(modalTitle, modalBody, modalFooter);
    $('#confirmRestockBtn').on('click', () => processRestock(itemId));
    $('.modal-close-btn').on('click', closeModal);
}

function processRestock(itemId) {
    const quantity = parseInt($('#restockQuantity').val());
    const notes = $('#restockNotes').val().trim();

    if (isNaN(quantity) || quantity <= 0) {
        showToast("Veuillez entrer une quantité valide.", "error");
        return;
    }

    const itemRef = database.ref(`${INVENTORY_ITEMS_REF}/${itemId}`);
    itemRef.transaction(currentItemData => {
        if (currentItemData) {
            currentItemData.quantity = (currentItemData.quantity || 0) + quantity;
            // Update status based on new quantity and minStockLevel
            if (currentItemData.quantity > (currentItemData.minStockLevel || 0)) {
                currentItemData.status = "In Stock";
            } else if (currentItemData.quantity > 0) {
                currentItemData.status = "Low Stock";
            } else {
                currentItemData.status = "Out of Stock";
            }
            currentItemData.updatedAt = firebase.database.ServerValue.TIMESTAMP;
        }
        return currentItemData;
    })
    .then(transactionResult => {
        if (transactionResult.committed) {
            logRestock(itemId, quantity, notes);
            showToast("Stock réapprovisionné avec succès!", "success");
            closeModal();
            displayInventoryItems($('#filterInventoryCategory').val(), $('#filterInventoryStatus').val());
        } else {
            showToast("Le réapprovisionnement a échoué (conflit de données).", "error");
        }
    })
    .catch(error => {
        console.error("Restock error:", error);
        showToast("Erreur lors du réapprovisionnement.", "error");
    });
}

function logRestock(itemId, quantity, notes = "") {
    const historyRef = database.ref(RESTOCK_HISTORY_REF).push();
    historyRef.set({
        inventoryItemId: itemId,
        date: firebase.database.ServerValue.TIMESTAMP,
        quantity: quantity,
        notes: notes,
        type: "restock" // For combined history view
    });
}


// --- Stock Out Modal and Logic ---
function openStockOutModal(itemId, itemName) {
    const modalTitle = `Enregistrer une Sortie de Stock: ${itemName}`;
    // Fetch interventions for the dropdown
    let interventionOptions = '<option value="">Aucune (Sortie Manuelle)</option>';
    database.ref(INTERVENTIONS_REF).orderByChild('customId').once('value', snapshot => {
        if (snapshot.val()) {
            Object.entries(snapshot.val()).forEach(([key, value]) => {
                interventionOptions += `<option value="${key}">${value.customId} (Éq: ${value.equipmentId ? value.equipmentId.slice(0,8) : 'N/A'})</option>`;
            });
        }

        const modalBody = `
            <form id="stockOutForm">
                <input type="hidden" id="stockOutItemId" value="${itemId}">
                <div class="mb-4">
                    <label for="stockOutQuantity" class="form-label">Quantité Sortie:</label>
                    <input type="number" id="stockOutQuantity" class="form-input" min="1" required>
                </div>
                <div class="mb-4">
                    <label for="stockOutInterventionId" class="form-label">Intervention Associée (Optionnel):</label>
                    <select id="stockOutInterventionId" class="form-input">
                        ${interventionOptions}
                    </select>
                </div>
                <div class="mb-4">
                    <label for="stockOutNotes" class="form-label">Notes (Optionnel):</label>
                    <input type="text" id="stockOutNotes" class="form-input" placeholder="Ex: Pour réparation X">
                </div>
            </form>
        `;
        const modalFooter = `
            <button type="button" class="btn btn-secondary modal-close-btn mr-2">Annuler</button>
            <button type="button" id="confirmStockOutBtn" class="btn btn-warning">Confirmer Sortie</button>
        `; // Changed to btn-warning
        openModal(modalTitle, modalBody, modalFooter);
        $('#confirmStockOutBtn').on('click', () => processStockOut(itemId));
        $('.modal-close-btn').on('click', closeModal);
    });
}

function processStockOut(itemId) {
    const quantity = parseInt($('#stockOutQuantity').val());
    const interventionId = $('#stockOutInterventionId').val() || null;
    const notes = $('#stockOutNotes').val().trim();

    if (isNaN(quantity) || quantity <= 0) {
        showToast("Veuillez entrer une quantité valide.", "error");
        return;
    }

    const itemRef = database.ref(`${INVENTORY_ITEMS_REF}/${itemId}`);
    itemRef.transaction(currentItemData => {
        if (currentItemData) {
            if ((currentItemData.quantity || 0) < quantity) {
                // Not enough stock, abort transaction by returning undefined
                console.warn("Not enough stock for transaction.");
                return;
            }
            currentItemData.quantity -= quantity;
             // Update status based on new quantity and minStockLevel
            if (currentItemData.quantity <= 0) {
                currentItemData.status = "Out of Stock";
            } else if (currentItemData.quantity <= (currentItemData.minStockLevel || 0)) {
                currentItemData.status = "Low Stock";
            } else {
                 currentItemData.status = "In Stock"; // Could remain In Stock if still above min
            }
            currentItemData.updatedAt = firebase.database.ServerValue.TIMESTAMP;
        }
        return currentItemData;
    })
    .then(transactionResult => {
        if (transactionResult.committed && transactionResult.snapshot.val() !== null) {
            logStockOut(itemId, quantity, interventionId, notes);
            showToast("Sortie de stock enregistrée!", "success");
            closeModal();
            displayInventoryItems($('#filterInventoryCategory').val(), $('#filterInventoryStatus').val());
        } else {
            showToast("Sortie de stock échouée. Quantité insuffisante ou conflit de données.", "error");
        }
    })
    .catch(error => {
        console.error("Stock out error:", error);
        showToast("Erreur lors de la sortie de stock.", "error");
    });
}

function logStockOut(itemId, quantity, interventionId = null, notes = "") {
    const historyRef = database.ref(STOCK_OUT_HISTORY_REF).push();
    historyRef.set({
        inventoryItemId: itemId,
        interventionId: interventionId,
        date: firebase.database.ServerValue.TIMESTAMP,
        quantity: quantity,
        notes: notes,
        type: "stock_out" // For combined history view
    });
}

// --- View Item Movement History ---
async function viewItemMovementHistory(itemId, itemName) {
    const modalTitle = `Historique des Mouvements pour: ${itemName} (ID: ${itemId})`;
    let historyHtml = `<div class="max-h-96 overflow-y-auto">`; // Scrollable history

    try {
        const restockSnap = await database.ref(RESTOCK_HISTORY_REF).orderByChild('inventoryItemId').equalTo(itemId).once('value');
        const stockOutSnap = await database.ref(STOCK_OUT_HISTORY_REF).orderByChild('inventoryItemId').equalTo(itemId).once('value');

        let movements = [];
        if (restockSnap.val()) {
            Object.values(restockSnap.val()).forEach(m => movements.push(m));
        }
        if (stockOutSnap.val()) {
            Object.values(stockOutSnap.val()).forEach(m => movements.push(m));
        }

        if (movements.length === 0) {
            historyHtml += '<p class="text-gray-500">Aucun mouvement de stock trouvé pour cet article.</p>';
        } else {
            movements.sort((a, b) => b.date - a.date); // Sort by date, newest first

            historyHtml += '<ul class="list-disc pl-5 space-y-3">';
            for (const entry of movements) {
                const dateStr = new Date(entry.date).toLocaleString();
                let details = `<strong>Quantité: ${entry.quantity}</strong>`;
                if (entry.notes) details += ` <span class="text-xs text-gray-500">(${entry.notes})</span>`;

                if (entry.type === "restock") {
                    historyHtml += `<li class="text-sm text-green-700">Réapprovisionnement - ${dateStr}<br>${details}</li>`;
                } else if (entry.type === "stock_out") {
                    let interventionInfo = '';
                    if (entry.interventionId) {
                        const intSnap = await database.ref(`${INTERVENTIONS_REF}/${entry.interventionId}/customId`).once('value');
                        interventionInfo = ` (Intervention: ${intSnap.val() || entry.interventionId})`;
                    }
                    historyHtml += `<li class="text-sm text-red-700">Sortie de Stock - ${dateStr}${interventionInfo}<br>${details}</li>`;
                }
            }
            historyHtml += '</ul>';
        }
    } catch (error) {
        console.error("Error fetching item history:", error);
        historyHtml += '<p class="text-red-500">Erreur lors du chargement de l\'historique.</p>';
        showToast("Erreur de chargement de l'historique.", "error");
    }

    historyHtml += `</div>`;
    openModal(modalTitle, historyHtml);
}


// Delete an inventory item
function deleteInventoryItem(itemId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet article de l'inventaire? L'historique des mouvements sera aussi supprimé.")) {
        // Check for related stock_out or restock_history entries before deleting.
        // More robust would be to check if quantity > 0 or if it's linked anywhere else.
        // For now, just a simple check on history (though history should be deleted with item).
        // A better check: ensure quantity is 0.
        database.ref(`${INVENTORY_ITEMS_REF}/${itemId}/quantity`).once('value', qtySnapshot => {
            const currentQuantity = qtySnapshot.val();
            if (currentQuantity > 0) {
                showToast("Impossible de supprimer : l'article a encore du stock. Veuillez d'abord ajuster la quantité à 0.", "error");
                return;
            }

            database.ref(`${INVENTORY_ITEMS_REF}/${itemId}`).remove()
                .then(() => {
                    // Also remove its history
                    database.ref(RESTOCK_HISTORY_REF).orderByChild('inventoryItemId').equalTo(itemId).once('value', snap => {
                        snap.forEach(child => child.ref.remove());
                    });
                    database.ref(STOCK_OUT_HISTORY_REF).orderByChild('inventoryItemId').equalTo(itemId).once('value', snap => {
                        snap.forEach(child => child.ref.remove());
                    });
                    showToast("Article d'inventaire supprimé avec succès.", "success");
                    displayInventoryItems($('#filterInventoryCategory').val(), $('#filterInventoryStatus').val());
                })
                .catch(error => {
                    console.error("Error deleting item:", error);
                    showToast("Erreur lors de la suppression de l'article.", "error");
                });
        });
    }
}

console.log("inventory.js loaded");
