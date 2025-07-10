// Dashboard Module - Business Metrics and Counts
function loadDashboardModule() {
    console.log("Loading dashboard module...");
    
    // Load data and calculate metrics
    loadBusinessMetrics();
}

function loadBusinessMetrics() {
    // Load data from Firebase or local storage
    const dataRef = firebase.database().ref('/');
    
    dataRef.once('value')
        .then((snapshot) => {
            const data = snapshot.val() || {};
            displayDashboardMetrics(data);
        })
        .catch((error) => {
            console.error("Error loading dashboard data:", error);
            // Fallback to local data if Firebase fails
            loadLocalData();
        });
}

function loadLocalData() {
    // Fallback to local JSON data
    fetch('Data.json')
        .then(response => response.json())
        .then(data => {
            displayDashboardMetrics(data);
        })
        .catch(error => {
            console.error("Error loading local data:", error);
            showToast("Erreur lors du chargement des données", "error");
        });
}

function displayDashboardMetrics(data) {
    const dashboardSection = $('#dashboard');
    
    // Calculate metrics
    const metrics = calculateBusinessMetrics(data);
    
    // Create dashboard HTML
    const dashboardHTML = createDashboardHTML(metrics);
    
    // Update dashboard content
    dashboardSection.html(dashboardHTML);
    
    // Add event listeners for quick actions
    addDashboardEventListeners();
}

function calculateBusinessMetrics(data) {
    const metrics = {
        customers: {
            total: data.customers ? data.customers.length : 0,
            active: data.customers ? data.customers.filter(c => c.status !== 'Inactive').length : 0
        },
        contracts: {
            total: data.contracts ? data.contracts.length : 0,
            active: data.contracts ? data.contracts.filter(c => c.status === 'Active').length : 0,
            expired: data.contracts ? data.contracts.filter(c => c.status === 'Expired').length : 0
        },
        equipment: {
            total: data.equipment ? data.equipment.length : 0,
            operational: data.equipment ? data.equipment.filter(e => e.status === 'Operational').length : 0,
            maintenance: data.equipment ? data.equipment.filter(e => e.status === 'Maintenance').length : 0,
            outOfService: data.equipment ? data.equipment.filter(e => e.status === 'Out of Service').length : 0
        },
        interventions: {
            total: data.interventions ? data.interventions.length : 0,
            inProgress: data.interventions ? data.interventions.filter(i => i.status === 'In Progress').length : 0,
            completed: data.interventions ? data.interventions.filter(i => i.status === 'Completed').length : 0,
            pending: data.interventions ? data.interventions.filter(i => i.status === 'Pending').length : 0
        },
        employees: {
            total: data.employees ? data.employees.length : 0,
            active: data.employees ? data.employees.filter(e => e.status === 'Active').length : 0
        },
        inventory: {
            total: data.inventory_items ? data.inventory_items.length : 0,
            inStock: data.inventory_items ? data.inventory_items.filter(i => i.status === 'In Stock').length : 0,
            lowStock: data.inventory_items ? data.inventory_items.filter(i => i.quantity < 5).length : 0
        },
        financial: {
            totalInvoices: data.invoices ? data.invoices.length : 0,
            paidInvoices: data.invoices ? data.invoices.filter(i => i.status === 'Paid').length : 0,
            pendingInvoices: data.invoices ? data.invoices.filter(i => i.status === 'Pending').length : 0,
            totalRevenue: data.invoices ? data.invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0) : 0,
            totalPayments: data.payments ? data.payments.reduce((sum, pay) => sum + (pay.amount || 0), 0) : 0
        }
    };
    
    return metrics;
}

function createDashboardHTML(metrics) {
    return `
        <div class="space-y-6">
            <!-- Welcome Section -->
            <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-lg">
                <h3 class="text-2xl font-bold mb-2">Bienvenue sur l'ERP Biomédical</h3>
                <p class="text-blue-100">Vue d'ensemble de vos activités et métriques clés</p>
            </div>

            <!-- Key Metrics Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <!-- Customers Card -->
                <div class="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">Clients</p>
                            <p class="text-2xl font-bold text-gray-900">${metrics.customers.total}</p>
                            <p class="text-xs text-green-600">${metrics.customers.active} actifs</p>
                        </div>
                        <div class="p-3 bg-blue-100 rounded-full">
                            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Contracts Card -->
                <div class="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">Contrats</p>
                            <p class="text-2xl font-bold text-gray-900">${metrics.contracts.total}</p>
                            <p class="text-xs text-green-600">${metrics.contracts.active} actifs</p>
                        </div>
                        <div class="p-3 bg-green-100 rounded-full">
                            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Equipment Card -->
                <div class="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">Équipements</p>
                            <p class="text-2xl font-bold text-gray-900">${metrics.equipment.total}</p>
                            <p class="text-xs text-green-600">${metrics.equipment.operational} opérationnels</p>
                        </div>
                        <div class="p-3 bg-purple-100 rounded-full">
                            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <!-- Interventions Card -->
                <div class="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">Interventions</p>
                            <p class="text-2xl font-bold text-gray-900">${metrics.interventions.total}</p>
                            <p class="text-xs text-orange-600">${metrics.interventions.inProgress} en cours</p>
                        </div>
                        <div class="p-3 bg-orange-100 rounded-full">
                            <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detailed Metrics Section -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Equipment Status -->
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4">Statut des Équipements</h4>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Opérationnels</span>
                            <span class="text-sm font-semibold text-green-600">${metrics.equipment.operational}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">En maintenance</span>
                            <span class="text-sm font-semibold text-orange-600">${metrics.equipment.maintenance}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Hors service</span>
                            <span class="text-sm font-semibold text-red-600">${metrics.equipment.outOfService}</span>
                        </div>
                    </div>
                </div>

                <!-- Intervention Status -->
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4">Statut des Interventions</h4>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">En cours</span>
                            <span class="text-sm font-semibold text-orange-600">${metrics.interventions.inProgress}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Terminées</span>
                            <span class="text-sm font-semibold text-green-600">${metrics.interventions.completed}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">En attente</span>
                            <span class="text-sm font-semibold text-blue-600">${metrics.interventions.pending}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Financial Overview -->
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h4 class="text-lg font-semibold text-gray-800 mb-4">Aperçu Financier</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="text-center">
                        <p class="text-sm text-gray-600">Revenus Totaux</p>
                        <p class="text-2xl font-bold text-green-600">${formatCurrency(metrics.financial.totalRevenue)}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-gray-600">Factures Payées</p>
                        <p class="text-2xl font-bold text-blue-600">${metrics.financial.paidInvoices}/${metrics.financial.totalInvoices}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm text-gray-600">Paiements Reçus</p>
                        <p class="text-2xl font-bold text-purple-600">${formatCurrency(metrics.financial.totalPayments)}</p>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h4 class="text-lg font-semibold text-gray-800 mb-4">Actions Rapides</h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button onclick="quickAction('customers')" class="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                        <div class="text-center">
                            <svg class="w-8 h-8 text-blue-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            <p class="text-sm font-medium text-gray-700">Nouveau Client</p>
                        </div>
                    </button>
                    <button onclick="quickAction('interventions')" class="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                        <div class="text-center">
                            <svg class="w-8 h-8 text-orange-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            <p class="text-sm font-medium text-gray-700">Nouvelle Intervention</p>
                        </div>
                    </button>
                    <button onclick="quickAction('equipment')" class="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                        <div class="text-center">
                            <svg class="w-8 h-8 text-purple-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            <p class="text-sm font-medium text-gray-700">Nouvel Équipement</p>
                        </div>
                    </button>
                    <button onclick="quickAction('invoices')" class="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                        <div class="text-center">
                            <svg class="w-8 h-8 text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            <p class="text-sm font-medium text-gray-700">Nouvelle Facture</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function addDashboardEventListeners() {
    // Add any specific dashboard event listeners here
    console.log("Dashboard event listeners added");
}

function quickAction(action) {
    // Navigate to the appropriate section and trigger the add action
    const sectionMap = {
        'customers': 'customers',
        'interventions': 'interventions',
        'equipment': 'equipment',
        'invoices': 'billing'
    };
    
    const targetSection = sectionMap[action];
    if (targetSection) {
        // Navigate to the section
        $('.nav-link').removeClass('active');
        $(`.nav-link[data-section="${targetSection}"]`).addClass('active');
        
        $('.section').removeClass('active').hide();
        $(`#${targetSection}`).addClass('active').fadeIn(300);
        
        $('#section-title').text($(`.nav-link[data-section="${targetSection}"]`).text());
        
        // Load the section content
        loadSectionContent(targetSection);
        
        // Trigger the add action if available
        setTimeout(() => {
            const addFunction = `add${capitalizeFirstLetter(action.slice(0, -1))}`;
            if (typeof window[addFunction] === 'function') {
                window[addFunction]();
            }
        }, 500);
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

// Export functions for global access
window.loadDashboardModule = loadDashboardModule;
window.quickAction = quickAction; 