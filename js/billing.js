// --- Billing and Finance Module (Invoices & Payments) ---
const INVOICES_REF = 'invoices';
const PAYMENTS_REF = 'payments';
// CONTRACTS_REF should be available

// Function to load the billing module
function loadBillingModule() {
    const $section = $('#billing');
    $section.html(`
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-semibold text-gray-700">Facturation et Finance</h3>
            <button id="addInvoiceBtn" class="btn btn-primary">Créer une Facture</button>
        </div>

        <!-- Invoice List -->
        <div class="mb-8">
            <h4 class="text-lg font-medium text-gray-600 mb-3">Liste des Factures</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label for="filterInvoiceContract" class="form-label">Filtrer par Contrat:</label>
                    <select id="filterInvoiceContract" class="form-input"></select>
                </div>
                <div>
                    <label for="filterInvoiceStatus" class="form-label">Filtrer par Statut Facture:</label>
                    <select id="filterInvoiceStatus" class="form-input">
                        <option value="">Tous les Statuts</option>
                        <option value="Draft">Brouillon</option>
                        <option value="Sent">Envoyée</option>
                        <option value="Paid">Payée</option>
                        <option value="Partially Paid">Partiellement Payée</option>
                        <option value="Overdue">En Retard</option>
                        <option value="Cancelled">Annulée</option>
                    </select>
                </div>
                 <div> <!-- Date filter can be added later if complex reporting is needed --> </div>
            </div>
            <div id="invoiceList" class="overflow-x-auto">
                <p class="text-gray-500">Chargement des factures...</p>
            </div>
        </div>

        <!-- Payments are generally viewed in context of an invoice or in reports -->
        <!-- For now, adding a payment will be an action on an invoice -->
    `);

    $('#addInvoiceBtn').on('click', () => openInvoiceModal());

    // Populate contract filter for invoices
    populateSelectWithOptions('filterInvoiceContract', {}, 'id', 'customId', "Tous les Contrats");
    database.ref(CONTRACTS_REF).once('value', snapshot => {
         const contractsData = snapshot.val() ?
            Object.entries(snapshot.val()).reduce((acc, [key, value]) => {
                acc[key] = {...value, displayId: value.customId || key };
                return acc;
            }, {})
            : {};
        populateSelectWithOptions('filterInvoiceContract', contractsData, 'id', 'displayId', "Tous les Contrats");
    });

    $('#filterInvoiceContract, #filterInvoiceStatus').on('change', function() {
        displayInvoices($('#filterInvoiceContract').val(), $('#filterInvoiceStatus').val());
    });

    displayInvoices(); // Initial display of invoices
}

// Display invoices, optionally filtered
async function displayInvoices(filterContractId = null, filterStatus = null) {
    const $invoiceList = $('#invoiceList');
    if (!$invoiceList.length) return;
    $invoiceList.html('<p class="text-gray-500">Chargement...</p>');

    try {
        let query = database.ref(INVOICES_REF);
        // Firebase doesn't support multiple orderByChild/equalTo for different properties directly.
        // So, fetch all and filter client-side, or structure data for specific queries.
        // For now, filter client-side.
        const invoicesSnapshot = await query.once('value');
        let allInvoices = invoicesSnapshot.val()
            ? Object.entries(invoicesSnapshot.val()).map(([key, value]) => ({ ...value, id: key }))
            : [];

        // Apply filters
        if (filterContractId) {
            allInvoices = allInvoices.filter(inv => inv.contractId === filterContractId);
        }
        if (filterStatus) {
            allInvoices = allInvoices.filter(inv => inv.status === filterStatus);
        }

        // Sort by date (newest first)
        allInvoices.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));


        if (allInvoices.length === 0) {
            $invoiceList.html('<p class="text-center text-gray-500 py-5">Aucune facture trouvée.</p>');
            return;
        }

        // Fetch contract details for display
        const detailedInvoicesPromises = allInvoices.map(async (inv) => {
            let contractDisplay = 'N/A';
            if (inv.contractId) {
                const contractSnap = await database.ref(`${CONTRACTS_REF}/${inv.contractId}`).once('value');
                contractDisplay = contractSnap.val()?.customId || inv.contractId;
            }
            // Fetch total payments for this invoice
            let totalPaid = 0;
            const paymentsSnap = await database.ref(PAYMENTS_REF).orderByChild('invoiceId').equalTo(inv.id).once('value');
            if (paymentsSnap.exists()) {
                paymentsSnap.forEach(paymentChild => {
                    totalPaid += parseFloat(paymentChild.val().amount || 0);
                });
            }
            return { ...inv, contractDisplay, totalPaid: totalPaid.toFixed(2) };
        });

        const detailedInvoices = await Promise.all(detailedInvoicesPromises);

        let tableHtml = `
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="th-cell">N° Facture</th>
                        <th class="th-cell">Contrat</th>
                        <th class="th-cell">Date Facture</th>
                        <th class="th-cell">Montant Total</th>
                        <th class="th-cell">Montant Payé</th>
                        <th class="th-cell">Solde Dû</th>
                        <th class="th-cell">Statut</th>
                        <th class="th-cell">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
        `;
        detailedInvoices.forEach(inv => {
            const balanceDue = (parseFloat(inv.amount || 0) - parseFloat(inv.totalPaid || 0)).toFixed(2);
            tableHtml += `
                <tr>
                    <td class="td-cell">${inv.customId || inv.id}</td>
                    <td class="td-cell">${inv.contractDisplay}</td>
                    <td class="td-cell">${inv.date ? new Date(inv.date).toLocaleDateString() : ''}</td>
                    <td class="td-cell">${parseFloat(inv.amount || 0).toFixed(2)} $</td>
                    <td class="td-cell">${inv.totalPaid} $</td>
                    <td class="td-cell">${balanceDue} $</td>
                    <td class="td-cell">${inv.status || ''}</td>
                    <td class="td-cell">
                        <button class="text-green-600 hover:text-green-900 addPaymentBtn" data-id="${inv.id}" data-invoice-custom-id="${inv.customId || inv.id}" data-amount-due="${balanceDue}">Ajouter Paiement</button>
                        <button class="text-indigo-600 hover:text-indigo-900 ml-2 editInvoiceBtn" data-id="${inv.id}">Modifier</button>
                        <button class="text-blue-600 hover:text-blue-900 ml-2 viewInvoicePaymentsBtn" data-id="${inv.id}" data-invoice-custom-id="${inv.customId || inv.id}">Voir Paiements</button>
                        <button class="text-red-600 hover:text-red-900 ml-2 deleteInvoiceBtn" data-id="${inv.id}">Supprimer</button>
                    </td>
                </tr>
            `;
        });
        tableHtml += `</tbody></table>`;
        $invoiceList.html(tableHtml);

        $('.th-cell').addClass('px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider');
        $('.td-cell').addClass('px-4 py-3 whitespace-nowrap text-sm text-gray-700');

        $('.editInvoiceBtn').on('click', function() { openInvoiceModal($(this).data('id')); });
        $('.deleteInvoiceBtn').on('click', function() { deleteInvoice($(this).data('id')); });
        $('.addPaymentBtn').on('click', function() { openPaymentModal($(this).data('id'), $(this).data('invoice-custom-id'), $(this).data('amount-due')); });
        $('.viewInvoicePaymentsBtn').on('click', function() { viewInvoicePayments($(this).data('id'), $(this).data('invoice-custom-id')); });

    } catch (error) {
        console.error("Error fetching invoices:", error);
        showToast("Erreur lors de la récupération des factures.", "error");
        $invoiceList.html('<p class="text-center text-red-500 py-5">Erreur de chargement.</p>');
    }
}

// Open modal for adding or editing an invoice
function openInvoiceModal(invoiceId = null) {
    let formTitle = "Créer une Nouvelle Facture";
    let submitButtonText = "Créer Facture";
    // Generate a default invoice number like INV-YYYYMMDD-XXXX
    const today = new Date();
    const dateString = today.getFullYear() +
                       ('0' + (today.getMonth() + 1)).slice(-2) +
                       ('0' + today.getDate()).slice(-2);
    let invData = {
        id: '',
        customId: `INV-${dateString}-${generateUniqueId().substring(0,4).toUpperCase()}`,
        contractId: '',
        date: today.toISOString().split('T')[0], // Default to today
        dueDate: '',
        amount: 0,
        status: 'Draft',
        items: [{description: '', quantity: 1, unitPrice: 0, total: 0}], // Default line item
        notes: ''
    };

    const contractsPromise = database.ref(CONTRACTS_REF).once('value').then(snapshot => {
        let contractOptions = '<option value="">Sélectionnez un Contrat</option>';
        if (snapshot.val()) {
            Object.entries(snapshot.val()).forEach(([key, value]) => {
                contractOptions += `<option value="${key}">${value.customId || key}</option>`;
            });
        }
        return contractOptions;
    });

    const buildInvoiceItemsHtml = (items) => {
        let itemsHtml = '';
        items.forEach((item, index) => {
            itemsHtml += `
                <div class="invoice-item grid grid-cols-12 gap-2 mb-2 items-center" data-index="${index}">
                    <input type="text" name="itemDescription" class="form-input col-span-5 item-description" placeholder="Description" value="${item.description || ''}" required>
                    <input type="number" name="itemQuantity" class="form-input col-span-2 item-quantity" placeholder="Qté" value="${item.quantity || 1}" min="0" step="any">
                    <input type="number" name="itemUnitPrice" class="form-input col-span-2 item-unitprice" placeholder="P.U." value="${item.unitPrice || 0}" min="0" step="any">
                    <input type="text" name="itemTotal" class="form-input col-span-2 item-total bg-gray-100" value="${(item.total || 0).toFixed(2)}" readonly>
                    <button type="button" class="text-red-500 hover:text-red-700 col-span-1 removeInvoiceItemBtn">&times;</button>
                </div>
            `;
        });
        return itemsHtml;
    };

    const buildModalContent = (currentInvData, contractOpts) => `
        <form id="invoiceForm">
            <input type="hidden" id="invoiceId" name="invoiceId" value="${currentInvData.id}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                <div>
                    <label for="invoiceCustomId" class="form-label">N° Facture:</label>
                    <input type="text" id="invoiceCustomId" name="customId" class="form-input" value="${currentInvData.customId}" required>
                </div>
                <div>
                    <label for="invoiceContractId" class="form-label">Contrat Associé:</label>
                    <select id="invoiceContractId" name="contractId" class="form-input" required>
                        ${contractOpts}
                    </select>
                </div>
                <div>
                    <label for="invoiceDate" class="form-label">Date de Facturation:</label>
                    <input type="date" id="invoiceDate" name="date" class="form-input" value="${currentInvData.date}" required>
                </div>
                <div>
                    <label for="invoiceDueDate" class="form-label">Date d'Échéance:</label>
                    <input type="date" id="invoiceDueDate" name="dueDate" class="form-input" value="${currentInvData.dueDate}">
                </div>
                 <div>
                    <label for="invoiceStatusModal" class="form-label">Statut:</label>
                    <select id="invoiceStatusModal" name="status" class="form-input">
                        <option value="Draft" ${currentInvData.status === 'Draft' ? 'selected' : ''}>Brouillon</option>
                        <option value="Sent" ${currentInvData.status === 'Sent' ? 'selected' : ''}>Envoyée</option>
                        <option value="Paid" ${currentInvData.status === 'Paid' ? 'selected' : ''}>Payée</option>
                        <option value="Partially Paid" ${currentInvData.status === 'Partially Paid' ? 'selected' : ''}>Partiellement Payée</option>
                        <option value="Overdue" ${currentInvData.status === 'Overdue' ? 'selected' : ''}>En Retard</option>
                        <option value="Cancelled" ${currentInvData.status === 'Cancelled' ? 'selected' : ''}>Annulée</option>
                    </select>
                </div>
            </div>

            <h5 class="text-md font-semibold mt-4 mb-2">Lignes de Facture:</h5>
            <div id="invoiceItemsContainer">
                ${buildInvoiceItemsHtml(currentInvData.items)}
            </div>
            <button type="button" id="addInvoiceItemBtnLine" class="btn btn-secondary btn-sm mt-2">Ajouter Ligne</button>

            <div class="text-right mt-3">
                <label class="form-label">Montant Total HT:</label>
                <input type="text" id="invoiceTotalAmount" name="amount" class="form-input w-1/3 inline-block bg-gray-100" value="${(currentInvData.amount || 0).toFixed(2)}" readonly>
            </div>

            <div class="mt-4">
                <label for="invoiceNotes" class="form-label">Notes / Termes:</label>
                <textarea id="invoiceNotes" name="notes" class="form-input" rows="2">${currentInvData.notes || ''}</textarea>
            </div>
        </form>
    `;
    const modalFooterContent = `
        <button type="button" class="btn btn-secondary modal-close-btn mr-2">Annuler</button>
        <button type="button" id="saveInvoiceBtn" class="btn btn-primary">${submitButtonText}</button>
    `;

    if (invoiceId) { // Editing
        formTitle = "Modifier la Facture";
        submitButtonText = "Sauvegarder";
        Promise.all([database.ref(`${INVOICES_REF}/${invoiceId}`).once('value'), contractsPromise])
            .then(([invSnapshot, contractOpts]) => {
                if (invSnapshot.val()) {
                    invData = { ...invSnapshot.val(), id: invoiceId };
                    // Ensure items array exists and has at least one item for editing
                    if (!invData.items || invData.items.length === 0) {
                        invData.items = [{description: '', quantity: 1, unitPrice: 0, total: 0}];
                    }
                    openModal(formTitle, buildModalContent(invData, contractOpts), modalFooterContent);
                    $('#saveInvoiceBtn').text(submitButtonText);
                    $('#invoiceContractId').val(invData.contractId); // Ensure contract is selected

                    $('#saveInvoiceBtn').off('click').on('click', saveInvoice);
                    attachInvoiceItemListeners();
                    updateInvoiceTotal(); // Recalculate on load
                } else { showToast("Facture non trouvée.", "error"); }
            }).catch(error => {
                console.error("Error fetching invoice/contracts for edit:", error);
                showToast("Erreur de chargement des données.", "error");
            });
    } else { // Adding
        contractsPromise.then(contractOpts => {
            openModal(formTitle, buildModalContent(invData, contractOpts), modalFooterContent);
            $('#saveInvoiceBtn').text(submitButtonText);
            $('#saveInvoiceBtn').off('click').on('click', saveInvoice);
            attachInvoiceItemListeners();
            updateInvoiceTotal();
        });
    }
    $('.modal-close-btn').on('click', closeModal);
}

function attachInvoiceItemListeners() {
    $('#invoiceItemsContainer').on('input', '.item-quantity, .item-unitprice', function() {
        const $itemRow = $(this).closest('.invoice-item');
        const quantity = parseFloat($itemRow.find('.item-quantity').val()) || 0;
        const unitPrice = parseFloat($itemRow.find('.item-unitprice').val()) || 0;
        $itemRow.find('.item-total').val((quantity * unitPrice).toFixed(2));
        updateInvoiceTotal();
    });

    $('#addInvoiceItemBtnLine').off('click').on('click', function() {
        const newItemHtml = `
            <div class="invoice-item grid grid-cols-12 gap-2 mb-2 items-center" data-index="${$('#invoiceItemsContainer .invoice-item').length}">
                <input type="text" name="itemDescription" class="form-input col-span-5 item-description" placeholder="Description" required>
                <input type="number" name="itemQuantity" class="form-input col-span-2 item-quantity" placeholder="Qté" value="1" min="0" step="any">
                <input type="number" name="itemUnitPrice" class="form-input col-span-2 item-unitprice" placeholder="P.U." value="0" min="0" step="any">
                <input type="text" name="itemTotal" class="form-input col-span-2 item-total bg-gray-100" value="0.00" readonly>
                <button type="button" class="text-red-500 hover:text-red-700 col-span-1 removeInvoiceItemBtn">&times;</button>
            </div>
        `;
        $('#invoiceItemsContainer').append(newItemHtml);
    });

    $('#invoiceItemsContainer').on('click', '.removeInvoiceItemBtn', function() {
        if ($('#invoiceItemsContainer .invoice-item').length > 1) {
            $(this).closest('.invoice-item').remove();
            updateInvoiceTotal();
        } else {
            showToast("Une facture doit avoir au moins une ligne.", "warning");
        }
    });
}

function updateInvoiceTotal() {
    let totalAmount = 0;
    $('#invoiceItemsContainer .invoice-item').each(function() {
        totalAmount += parseFloat($(this).find('.item-total').val()) || 0;
    });
    $('#invoiceTotalAmount').val(totalAmount.toFixed(2));
}


// Save (add or update) invoice data
function saveInvoice() {
    const invoiceId = $('#invoiceId').val(); // Firebase key for updates
    const customId = $('#invoiceCustomId').val().trim();

    const invoiceItems = [];
    $('#invoiceItemsContainer .invoice-item').each(function() {
        const $row = $(this);
        invoiceItems.push({
            description: $row.find('.item-description').val().trim(),
            quantity: parseFloat($row.find('.item-quantity').val()) || 0,
            unitPrice: parseFloat($row.find('.item-unitprice').val()) || 0,
            total: parseFloat($row.find('.item-total').val()) || 0
        });
    });

    if (invoiceItems.some(item => !item.description)) {
        showToast("La description est requise pour chaque ligne de facture.", "error");
        return;
    }
    if (invoiceItems.length === 0) {
        showToast("Une facture doit contenir au moins une ligne d'article.", "error");
        return;
    }

    const invoiceData = {
        customId: customId,
        contractId: $('#invoiceContractId').val(),
        date: $('#invoiceDate').val(),
        dueDate: $('#invoiceDueDate').val() || null,
        amount: parseFloat($('#invoiceTotalAmount').val()) || 0,
        status: $('#invoiceStatusModal').val(),
        items: invoiceItems,
        notes: $('#invoiceNotes').val().trim(),
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    if (!invoiceData.customId || !invoiceData.contractId || !invoiceData.date) {
        showToast("N° Facture, Contrat et Date sont requis.", "error");
        return;
    }

    let promise;
    let successMessageAction = "créée";

    if (invoiceId) { // Update existing
        promise = database.ref(`${INVOICES_REF}/${invoiceId}`).update(invoiceData);
        successMessageAction = "mise à jour";
    } else { // Add new
        invoiceData.createdAt = firebase.database.ServerValue.TIMESTAMP;
        const newInvoiceRef = database.ref(INVOICES_REF).push();
        promise = newInvoiceRef.set(invoiceData);
    }

    promise.then(() => {
        showToast(`Facture ${successMessageAction} avec succès.`, "success");
        closeModal();
        displayInvoices($('#filterInvoiceContract').val(), $('#filterInvoiceStatus').val());
    }).catch(error => {
        console.error("Error saving invoice:", error);
        showToast(error.message || "Erreur lors de l'enregistrement.", "error");
    });
}

// Delete an invoice
function deleteInvoice(invoiceId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette facture ? Tous les paiements associés seront également supprimés.")) {
        // Check for related payments
        database.ref(PAYMENTS_REF).orderByChild('invoiceId').equalTo(invoiceId).once('value', paymentSnapshot => {
            if (paymentSnapshot.exists()) {
                // Could offer to delete payments or prevent invoice deletion. For now, delete them.
                paymentSnapshot.forEach(child => child.ref.remove());
            }

            database.ref(`${INVOICES_REF}/${invoiceId}`).remove()
                .then(() => {
                    showToast("Facture et paiements associés supprimés.", "success");
                    displayInvoices($('#filterInvoiceContract').val(), $('#filterInvoiceStatus').val());
                })
                .catch(error => {
                    console.error("Error deleting invoice:", error);
                    showToast("Erreur suppression facture.", "error");
                });
        });
    }
}


// --- Payment Modal and Logic ---
function openPaymentModal(invoiceId, invoiceCustomId, amountDue) {
    const modalTitle = `Ajouter un Paiement pour Facture: ${invoiceCustomId}`;
    const today = new Date().toISOString().split('T')[0];

    const modalBody = `
        <form id="paymentForm">
            <input type="hidden" id="paymentInvoiceId" value="${invoiceId}">
            <div class="mb-4">
                <label class="form-label">Montant Dû: <span class="font-bold">${parseFloat(amountDue).toFixed(2)} $</span></label>
            </div>
            <div class="mb-4">
                <label for="paymentAmount" class="form-label">Montant du Paiement:</label>
                <input type="number" id="paymentAmount" class="form-input" value="${parseFloat(amountDue).toFixed(2)}" min="0.01" step="0.01" required>
            </div>
            <div class="mb-4">
                <label for="paymentDate" class="form-label">Date du Paiement:</label>
                <input type="date" id="paymentDate" class="form-input" value="${today}" required>
            </div>
            <div class="mb-4">
                <label for="paymentMethod" class="form-label">Méthode de Paiement:</label>
                <select id="paymentMethod" class="form-input">
                    <option value="Bank Transfer">Virement Bancaire</option>
                    <option value="Credit Card">Carte de Crédit</option>
                    <option value="Cash">Espèces</option>
                    <option value="Check">Chèque</option>
                    <option value="Other">Autre</option>
                </select>
            </div>
            <div class="mb-4">
                <label for="paymentNotes" class="form-label">Référence/Notes Paiement:</label>
                <input type="text" id="paymentNotes" class="form-input" placeholder="Ex: REF-12345">
            </div>
        </form>
    `;
    const modalFooter = `
        <button type="button" class="btn btn-secondary modal-close-btn mr-2">Annuler</button>
        <button type="button" id="confirmPaymentBtn" class="btn btn-success">Confirmer Paiement</button>
    `;
    openModal(modalTitle, modalBody, modalFooter);
    $('#confirmPaymentBtn').on('click', () => processPayment(invoiceId));
    $('.modal-close-btn').on('click', closeModal);
}

function processPayment(invoiceId) {
    const paymentData = {
        invoiceId: invoiceId,
        amount: parseFloat($('#paymentAmount').val()),
        date: $('#paymentDate').val(),
        method: $('#paymentMethod').val(),
        notes: $('#paymentNotes').val().trim(),
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    if (isNaN(paymentData.amount) || paymentData.amount <= 0) {
        showToast("Veuillez entrer un montant de paiement valide.", "error");
        return;
    }
    if (!paymentData.date) {
        showToast("La date du paiement est requise.", "error");
        return;
    }

    const newPaymentRef = database.ref(PAYMENTS_REF).push();
    newPaymentRef.set(paymentData)
        .then(() => {
            // Update invoice status based on payments
            updateInvoiceStatusAfterPayment(invoiceId);
            showToast("Paiement enregistré avec succès!", "success");
            closeModal();
            // displayInvoices will be called by updateInvoiceStatusAfterPayment if successful
        })
        .catch(error => {
            console.error("Payment error:", error);
            showToast("Erreur lors de l'enregistrement du paiement.", "error");
        });
}

async function updateInvoiceStatusAfterPayment(invoiceId) {
    const invoiceRef = database.ref(`${INVOICES_REF}/${invoiceId}`);
    const invoiceSnap = await invoiceRef.once('value');
    const invoice = invoiceSnap.val();

    if (!invoice) return;

    const paymentsSnap = await database.ref(PAYMENTS_REF).orderByChild('invoiceId').equalTo(invoiceId).once('value');
    let totalPaid = 0;
    if (paymentsSnap.exists()) {
        paymentsSnap.forEach(paymentChild => {
            totalPaid += parseFloat(paymentChild.val().amount || 0);
        });
    }

    let newStatus = invoice.status;
    const amountDue = parseFloat(invoice.amount || 0);

    if (totalPaid >= amountDue) {
        newStatus = "Paid";
    } else if (totalPaid > 0) {
        newStatus = "Partially Paid";
    } else if (invoice.status !== "Draft" && invoice.status !== "Cancelled") { // If no payments and not draft/cancelled
        // Potentially check due date for "Overdue" status here, or keep as "Sent"
        // For now, if it was 'Sent' and no payment, it stays 'Sent' unless due date logic is added
    }

    if (newStatus !== invoice.status) {
        await invoiceRef.update({ status: newStatus, updatedAt: firebase.database.ServerValue.TIMESTAMP });
    }
    displayInvoices($('#filterInvoiceContract').val(), $('#filterInvoiceStatus').val()); // Refresh list
}

// View payments for a specific invoice
async function viewInvoicePayments(invoiceId, invoiceCustomId) {
    const modalTitle = `Paiements pour Facture: ${invoiceCustomId}`;
    let paymentsHtml = `<div class="max-h-80 overflow-y-auto">`; // Scrollable

    try {
        const paymentsSnap = await database.ref(PAYMENTS_REF).orderByChild('invoiceId').equalTo(invoiceId).once('value');
        if (paymentsSnap.exists()) {
            paymentsHtml += '<ul class="list-disc pl-5 space-y-2">';
            const paymentEntries = [];
            paymentsSnap.forEach(child => paymentEntries.push({id: child.key, ...child.val()}));
            paymentEntries.sort((a,b) => new Date(b.date) - new Date(a.date)); // Sort by date desc

            paymentEntries.forEach(entry => {
                paymentsHtml += `
                    <li class="text-sm">
                        ${new Date(entry.date).toLocaleDateString()}: <strong>${parseFloat(entry.amount).toFixed(2)} $</strong> (${entry.method})
                        ${entry.notes ? `<br><small class="text-gray-500">Notes: ${entry.notes}</small>` : ''}
                        <button class="text-xs text-red-500 hover:text-red-700 ml-2 deletePaymentBtn" data-payment-id="${entry.id}" data-invoice-id="${invoiceId}">(Supprimer)</button>
                    </li>`;
            });
            paymentsHtml += '</ul>';
        } else {
            paymentsHtml += '<p class="text-gray-500">Aucun paiement trouvé pour cette facture.</p>';
        }
    } catch (error) {
        console.error("Error fetching payments for invoice:", error);
        paymentsHtml += '<p class="text-red-500">Erreur de chargement des paiements.</p>';
    }
    paymentsHtml += `</div>`;
    const footer = `<button type="button" class="btn btn-secondary modal-close-btn">Fermer</button>`;
    openModal(modalTitle, paymentsHtml, footer);

    // Attach listener for deleting individual payments
    $('.deletePaymentBtn').on('click', function() {
        const paymentId = $(this).data('payment-id');
        const invId = $(this).data('invoice-id');
        if (confirm("Supprimer ce paiement ?")) {
            deletePayment(paymentId, invId);
        }
    });
}

function deletePayment(paymentId, invoiceId) {
    database.ref(`${PAYMENTS_REF}/${paymentId}`).remove()
    .then(() => {
        showToast("Paiement supprimé.", "success");
        updateInvoiceStatusAfterPayment(invoiceId); // Update invoice status and refresh lists
        // If the modal for viewing payments is still open, it should be refreshed or closed.
        // For simplicity, we'll close it. If it was the genericModal, this will close it.
        closeModal();
        // If a different modal was used for payment list, specific close logic would be needed.
    })
    .catch(error => {
        console.error("Error deleting payment:", error);
        showToast("Erreur suppression paiement.", "error");
    });
}


console.log("billing.js loaded");
