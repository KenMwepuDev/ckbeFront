// --- Reporting Module ---
// PAYMENTS_REF, INVOICES_REF should be available

function loadReportsModule() {
    const $section = $('#reports');
    $section.html(`
        <div class="mb-6">
            <h3 class="text-xl font-semibold text-gray-700">Rapports Financiers</h3>
        </div>

        <!-- Payment History Report -->
        <div class="p-5 bg-white shadow-md rounded-lg mb-8">
            <h4 class="text-lg font-medium text-gray-600 mb-4">Historique des Paiements par Intervalle de Dates</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
                <div>
                    <label for="reportStartDate" class="form-label">Date de Début:</label>
                    <input type="date" id="reportStartDate" class="form-input">
                </div>
                <div>
                    <label for="reportEndDate" class="form-label">Date de Fin:</label>
                    <input type="date" id="reportEndDate" class="form-input">
                </div>
                <div>
                    <button id="generatePaymentReportBtn" class="btn btn-primary w-full">Générer Rapport</button>
                </div>
            </div>
            <div id="paymentReportResult" class="overflow-x-auto mt-4">
                <p class="text-gray-500">Sélectionnez un intervalle de dates et cliquez sur "Générer Rapport".</p>
            </div>
            <div id="paymentReportSummary" class="mt-4 text-right font-semibold">
                <!-- Summary will be populated here -->
            </div>
        </div>

        <!-- Other reports can be added here, e.g., Overdue Invoices, Revenue by Contract, etc. -->
    `);

    // Set default dates: start of current month and today
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    $('#reportStartDate').val(firstDayOfMonth.toISOString().split('T')[0]);
    $('#reportEndDate').val(today.toISOString().split('T')[0]);

    $('#generatePaymentReportBtn').on('click', generatePaymentHistoryReport);
}

async function generatePaymentHistoryReport() {
    const $reportResult = $('#paymentReportResult');
    const $reportSummary = $('#paymentReportSummary');
    $reportResult.html('<p class="text-gray-500">Génération du rapport en cours...</p>');
    $reportSummary.html('');

    const startDateStr = $('#reportStartDate').val();
    const endDateStr = $('#reportEndDate').val();

    if (!startDateStr || !endDateStr) {
        showToast("Veuillez sélectionner une date de début et une date de fin.", "warning");
        $reportResult.html('<p class="text-red-500">Dates manquantes pour le rapport.</p>');
        return;
    }

    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0); // Start of the day
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999); // End of the day

    if (endDate < startDate) {
        showToast("La date de fin ne peut pas être antérieure à la date de début.", "warning");
        $reportResult.html('<p class="text-red-500">Intervalle de dates invalide.</p>');
        return;
    }

    try {
        // Firebase Realtime Database doesn't directly support date range queries on server timestamps
        // without structuring data specifically for it (e.g., using string dates YYYY-MM-DD or indexing on timestamp).
        // We will fetch all payments and filter client-side. For large datasets, this is inefficient.
        // A more scalable solution would involve Cloud Functions or a different database structure.
        // The 'date' field in payments is a string like "YYYY-MM-DD".

        const paymentsSnapshot = await database.ref(PAYMENTS_REF)
                                            .orderByChild('date') // Order by string date
                                            .startAt(startDateStr)
                                            .endAt(endDateStr)
                                            .once('value');

        let payments = [];
        if (paymentsSnapshot.exists()) {
            paymentsSnapshot.forEach(childSnap => {
                // Additional client-side filtering might be needed if string date ordering isn't perfect
                // or if timestamps were used and fetched without range.
                // Since we are using string dates 'YYYY-MM-DD', the range query should be fairly accurate.
                payments.push({ id: childSnap.key, ...childSnap.val() });
            });
        }

        // If payments were stored with server timestamps and we fetched all:
        // const allPaymentsSnapshot = await database.ref(PAYMENTS_REF).once('value');
        // if (allPaymentsSnapshot.exists()) {
        //     allPaymentsSnapshot.forEach(childSnap => {
        //         const payment = { id: childSnap.key, ...childSnap.val() };
        //         const paymentTimestamp = new Date(payment.createdAt || payment.date); // Assuming 'createdAt' is the server timestamp or 'date' if it's a full ISO string
        //         if (paymentTimestamp >= startDate && paymentTimestamp <= endDate) {
        //             payments.push(payment);
        //         }
        //     });
        // }


        if (payments.length === 0) {
            $reportResult.html('<p class="text-center text-gray-500 py-5">Aucun paiement trouvé pour cet intervalle.</p>');
            return;
        }

        // Sort by date (if not already perfectly sorted by Firebase string date query)
        payments.sort((a, b) => new Date(a.date) - new Date(b.date));

        let totalAmountReceived = 0;
        let tableHtml = `
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="th-cell">Date Paiement</th>
                        <th class="th-cell">ID Paiement</th>
                        <th class="th-cell">Facture Associée (N°)</th>
                        <th class="th-cell">Montant Payé</th>
                        <th class="th-cell">Méthode</th>
                        <th class="th-cell">Notes</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
        `;

        const invoiceDetailsPromises = payments.map(async (payment) => {
            let invoiceCustomId = 'N/A';
            if (payment.invoiceId) {
                const invoiceSnap = await database.ref(`${INVOICES_REF}/${payment.invoiceId}/customId`).once('value');
                invoiceCustomId = invoiceSnap.val() || payment.invoiceId; // Fallback to Firebase key
            }
            totalAmountReceived += parseFloat(payment.amount || 0);
            return { ...payment, invoiceCustomId };
        });

        const paymentsWithInvoiceDetails = await Promise.all(invoiceDetailsPromises);

        paymentsWithInvoiceDetails.forEach(p => {
            tableHtml += `
                <tr>
                    <td class="td-cell">${new Date(p.date).toLocaleDateString()}</td>
                    <td class="td-cell">${p.id}</td>
                    <td class="td-cell">${p.invoiceCustomId}</td>
                    <td class="td-cell">${parseFloat(p.amount || 0).toFixed(2)} $</td>
                    <td class="td-cell">${p.method || ''}</td>
                    <td class="td-cell">${p.notes || ''}</td>
                </tr>
            `;
        });
        tableHtml += `</tbody></table>`;
        $reportResult.html(tableHtml);

        $('.th-cell').addClass('px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider');
        $('.td-cell').addClass('px-4 py-3 whitespace-nowrap text-sm text-gray-700');

        $reportSummary.html(`Total des Paiements Reçus: <span class="text-lg text-green-600">${totalAmountReceived.toFixed(2)} $</span>`);


    } catch (error) {
        console.error("Error generating payment history report:", error);
        showToast("Erreur lors de la génération du rapport.", "error");
        $reportResult.html('<p class="text-center text-red-500 py-5">Erreur de génération du rapport.</p>');
    }
}


console.log("reports.js loaded");
