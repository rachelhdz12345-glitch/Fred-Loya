/**
 * CRM Seguros - Lógica Principal Avanzada con Dark Mode y Coberturas Múltiples
 * Autor: IA Assistant
 */

// ==========================================
// ESTADO Y DATOS GLOBALES
// ==========================================
const appData = {
    currentUser: null,
    policies: JSON.parse(localStorage.getItem('crm_policies')) || [],
    calls: JSON.parse(localStorage.getItem('crm_calls')) || [],
    wizardData: { store: '', client: {}, vehicles: [], quote: 0 },
    editingPolicyId: null
};

window.appData = appData;

// Catálogo de 10 Coberturas
const COVERAGE_RATES = {
    'Daños a terceros': { base: 250, perPerson: 50 },
    'Colisión': { base: 300, perPerson: 50 },
    'Comprensiva o amplia': { base: 400, perPerson: 50 },
    'Gastos médicos': { base: 450, perPerson: 55 },
    'Robo total': { base: 350, perPerson: 45 },
    'Asistencia vial': { base: 120, perPerson: 15 },
    'Auto sustituto': { base: 200, perPerson: 20 },
    'Protección legal': { base: 180, perPerson: 25 },
    'Cristales': { base: 90, perPerson: 10 },
    'Daños por desastres naturales': { base: 275, perPerson: 30 }
};

// ==========================================
// CONTROLADOR PRINCIPAL
// ==========================================
const app = {
    init() {
        this.initTheme();
        this.bindEvents();
        this.checkAuth();
        this.renderCalls();
        if (window.dashboardModule) dashboardModule.init();
    },

    callsCurrentPagePending: 1,
    callsCurrentPageCompleted: 1,
    itemsPerPage: 10,

    initTheme() {
        const savedTheme = localStorage.getItem('crm_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.getElementById('theme-toggle').addEventListener('click', this.toggleTheme.bind(this));
    },

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('crm_theme', newTheme);
    },

    bindEvents() {
        document.getElementById('login-form').addEventListener('submit', this.handleLogin.bind(this));
        document.getElementById('btn-logout').addEventListener('click', this.handleLogout.bind(this));

        document.querySelectorAll('.nav-item[data-target]').forEach(btn => btn.addEventListener('click', (e) => this.navigate(e.currentTarget.dataset.target, e.currentTarget)));
        document.querySelectorAll('.dash-card[data-target]').forEach(card => card.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;
            this.navigate(target);
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
            const navBtn = document.querySelector(`.sidebar-nav .nav-item[data-target="${target}"]`);
            if(navBtn) navBtn.classList.add('active');
        }));

        document.querySelectorAll('.btn-prev').forEach(btn => btn.addEventListener('click', () => this.wizardStep(-1)));
        document.getElementById('form-step-1').addEventListener('submit', (e) => { e.preventDefault(); this.wizardStep(1); });
        document.getElementById('form-step-2').addEventListener('submit', (e) => { e.preventDefault(); this.wizardStep(1); });
        document.getElementById('form-step-3').addEventListener('submit', (e) => { e.preventDefault(); this.generateWizardQuote(); this.wizardStep(1); });
        document.getElementById('btn-accept-quote').addEventListener('click', () => this.wizardStep(1));
        document.getElementById('form-step-5').addEventListener('submit', this.processPayment.bind(this));

        document.querySelectorAll('input[name="has-infraction"]').forEach(radio => radio.addEventListener('change', (e) => this.toggleInfraction(e, 'infraction-container-wrapper', 'infractions-container')));
        document.querySelectorAll('input[name="edit-has-infraction"]').forEach(radio => radio.addEventListener('change', (e) => {
            this.toggleInfraction(e, 'edit-infraction-container-wrapper', 'edit-infractions-container');
            this.calculateEditQuote();
        }));

        document.getElementById('search-form').addEventListener('submit', this.handleSearch.bind(this));
        document.getElementById('delete-search').addEventListener('input', this.handleDeleteSearch.bind(this));

        document.getElementById('btn-new-call').addEventListener('click', () => document.getElementById('new-call-form-container').classList.remove('hidden'));
        document.getElementById('btn-cancel-call').addEventListener('click', () => { document.getElementById('new-call-form-container').classList.add('hidden'); document.getElementById('form-new-call').reset(); });
        document.getElementById('form-new-call').addEventListener('submit', this.handleNewCall.bind(this));
        document.getElementById('form-edit-call').addEventListener('submit', this.handleEditCallSubmit.bind(this));

        document.getElementById('form-edit-policy').addEventListener('change', () => this.calculateEditQuote());
        document.getElementById('form-edit-policy').addEventListener('input', () => this.calculateEditQuote());
        document.getElementById('form-edit-policy').addEventListener('submit', this.saveEditedPolicy.bind(this));

        const globalSearch = document.getElementById('global-search-input');
        if (globalSearch) {
            globalSearch.addEventListener('input', this.handleGlobalSearch.bind(this));
            globalSearch.addEventListener('focus', this.handleGlobalSearch.bind(this));
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.global-search-container')) {
                const dropdown = document.getElementById('global-search-dropdown');
                if (dropdown) dropdown.classList.add('hidden');
            }
        });

        // Eventos de Paginación
        const btnPP = document.getElementById('btn-pending-prev');
        if(btnPP) btnPP.addEventListener('click', () => { if(this.callsCurrentPagePending > 1) { this.callsCurrentPagePending--; this.renderCalls(); } });
        const btnPN = document.getElementById('btn-pending-next');
        if(btnPN) btnPN.addEventListener('click', () => { this.callsCurrentPagePending++; this.renderCalls(); });
        
        const btnCP = document.getElementById('btn-completed-prev');
        if(btnCP) btnCP.addEventListener('click', () => { if(this.callsCurrentPageCompleted > 1) { this.callsCurrentPageCompleted--; this.renderCalls(); } });
        const btnCN = document.getElementById('btn-completed-next');
        if(btnCN) btnCN.addEventListener('click', () => { this.callsCurrentPageCompleted++; this.renderCalls(); });
    },

    toggleInfraction(e, wrapperId, containerId) {
        const wrapper = document.getElementById(wrapperId);
        const container = document.getElementById(containerId);
        if(!wrapper || !container) return;
        
        if(e.target.value === 'yes') { 
            wrapper.classList.remove('hidden'); 
            if(container.children.length === 0) {
                this.addInfractionField(containerId);
            }
        } else { 
            wrapper.classList.add('hidden'); 
            container.innerHTML = '';
        }
    },

    addInfractionField(containerId, type = '', amount = '') {
        const container = document.getElementById(containerId);
        const div = document.createElement('div');
        div.className = 'form-row infraction-box mb-2';
        div.innerHTML = `
            <div class="form-group flex-1">
                <input type="text" class="infraction-type-input" placeholder="Motivo de la infracción" value="${type}" required>
            </div>
            <div class="form-group flex-1">
                <input type="number" class="infraction-amount-input" min="0" step="0.01" placeholder="Monto ($)" value="${amount}" required>
            </div>
            <div class="form-group" style="flex: 0 0 40px; display: flex; align-items: flex-end; padding-bottom: 5px;">
                <button type="button" class="btn btn-danger btn-sm" onclick="app.removeInfractionField(this)"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `;
        container.appendChild(div);
    },

    removeInfractionField(btn) {
        btn.closest('.infraction-box').remove();
    },

    getInfractionsData(containerId) {
        const data = [];
        document.querySelectorAll(`#${containerId} .infraction-box`).forEach(box => {
            const type = box.querySelector('.infraction-type-input').value.trim();
            const amount = parseFloat(box.querySelector('.infraction-amount-input').value || 0);
            if(type) data.push({ type, amount });
        });
        return data;
    },

    checkAuth() {
        const storedUser = sessionStorage.getItem('crm_user');
        if (storedUser) {
            appData.currentUser = storedUser;
            document.getElementById('current-user').textContent = storedUser;
            this.showMainLayout();
        } else {
            this.showScreen('screen-login');
        }
    },

    handleLogin(e) {
        e.preventDefault();
        const empName = document.getElementById('emp-name').value.trim();
        if (empName) {
            appData.currentUser = empName;
            sessionStorage.setItem('crm_user', empName);
            document.getElementById('current-user').textContent = empName;
            document.getElementById('login-form').reset();
            this.showMainLayout();
        }
    },

    handleLogout() {
        sessionStorage.removeItem('crm_user');
        appData.currentUser = null;
        document.getElementById('main-layout').classList.add('hidden');
        this.showScreen('screen-login');
    },

    showMainLayout() {
        document.getElementById('screen-login').classList.remove('active');
        document.getElementById('screen-login').classList.add('hidden');
        document.getElementById('main-layout').classList.remove('hidden');
        this.navigate('screen-dashboard');
    },

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => { s.classList.add('hidden'); s.classList.remove('active'); });
        const screen = document.getElementById(screenId);
        if(screen) { screen.classList.remove('hidden'); screen.classList.add('active'); }
    },

    navigate(screenId, navItemElement = null) {
        this.showScreen(screenId);
        if (navItemElement) {
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
            navItemElement.classList.add('active');
        }
        if (screenId === 'screen-create-wizard') this.resetWizard();
        if (screenId === 'screen-search') {
            document.getElementById('search-form').reset();
            document.getElementById('search-results-container').innerHTML = '';
        }
        if (screenId === 'screen-delete') {
            document.getElementById('delete-search').value = '';
            document.getElementById('delete-results-container').innerHTML = '';
        }
        if (screenId === 'screen-calls') this.renderCalls();
        if (screenId === 'screen-dashboard' && window.dashboardModule) dashboardModule.init();
    },

    // ==========================================
    // VEHÍCULOS Y COBERTURAS MÚLTIPLES
    // ==========================================
    addVehicleForm(containerId, btnId, data = null) {
        const container = document.getElementById(containerId);
        const count = container.children.length;
        if (count >= 4) return;
        const vId = 'v' + Date.now() + Math.floor(Math.random()*100);

        let checkboxesHtml = '';
        Object.keys(COVERAGE_RATES).forEach(cov => {
            const isChecked = data && data.coverages && data.coverages.includes(cov) ? 'checked' : '';
            checkboxesHtml += `
                <label>
                    <input type="checkbox" class="v-cov-chk" value="${cov}" ${isChecked}>
                    <span class="coverage-pill"><i class="fa-solid fa-shield"></i> ${cov}</span>
                </label>
            `;
        });

        const div = document.createElement('div');
        div.className = 'vehicle-box';
        div.innerHTML = `
            <h4>Vehículo <span class="v-index">${count + 1}</span> <button type="button" class="btn-remove-box" onclick="app.removeVehicle(this, '${containerId}', '${btnId}')"><i class="fa-solid fa-trash"></i> Eliminar</button></h4>
            <div class="form-row">
                <div class="form-group flex-1">
                    <label>Número de placas <span class="required">*</span></label>
                    <input type="text" class="v-placas" value="${data ? data.placas : ''}" required>
                </div>
                <div class="form-group flex-1">
                    <label>Modelo del vehículo <span class="required">*</span></label>
                    <input type="text" class="v-model" value="${data ? data.model : ''}" required>
                </div>
                <div class="form-group flex-1">
                    <label>Kilometraje <span class="required">*</span></label>
                    <input type="number" class="v-km" value="${data ? data.km : ''}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Selecciona las coberturas <span class="required">*</span></label>
                <div class="coverage-pills" id="cov-container-${vId}">
                    ${checkboxesHtml}
                </div>
            </div>
        `;
        container.appendChild(div);

        // Required validation mock for checkboxes (at least one)
        const containerChecks = div.querySelectorAll('.v-cov-chk');
        containerChecks.forEach(chk => {
            chk.addEventListener('change', () => {
                if(containerId === 'edit-vehicles-container') this.calculateEditQuote();
            });
        });

        this.checkVehicleLimit(containerId, btnId);
        if(containerId === 'edit-vehicles-container') this.calculateEditQuote();
    },

    removeVehicle(btnElement, containerId, btnId) {
        btnElement.closest('.vehicle-box').remove();
        const container = document.getElementById(containerId);
        container.querySelectorAll('.vehicle-box .v-index').forEach((span, i) => { span.textContent = i + 1; });
        this.checkVehicleLimit(containerId, btnId);
        if(containerId === 'edit-vehicles-container') this.calculateEditQuote();
    },

    checkVehicleLimit(containerId, btnId) {
        const count = document.getElementById(containerId).children.length;
        const btn = document.getElementById(btnId);
        if (count >= 4) btn.classList.add('hidden');
        else btn.classList.remove('hidden');
    },

    addExtraClient(containerId, data = null) {
        const container = document.getElementById(containerId);
        const div = document.createElement('div');
        div.className = 'extra-client-box';
        div.innerHTML = `
            <h4>Cliente Adicional <button type="button" class="btn-remove-box" onclick="this.closest('.extra-client-box').remove(); ${containerId==='edit-extra-clients-container'?'app.calculateEditQuote()':''}"><i class="fa-solid fa-trash"></i> Eliminar</button></h4>
            <div class="form-row">
                <div class="form-group flex-1">
                    <label>Nombre <span class="required">*</span></label>
                    <input type="text" class="ec-name" value="${data ? data.name : ''}" required>
                </div>
                <div class="form-group flex-1" style="max-width: 150px;">
                    <label>Edad <span class="required">*</span></label>
                    <input type="number" class="ec-age" min="0" value="${data ? data.age : ''}" required>
                </div>
                <div class="form-group flex-1">
                    <label>Relación <span class="required">*</span></label>
                    <select class="ec-relation" required>
                        <option value="Cónyuge" ${data && data.relation === 'Cónyuge' ? 'selected' : ''}>Cónyuge</option>
                        <option value="Hijo/a" ${data && data.relation === 'Hijo/a' ? 'selected' : ''}>Hijo/a</option>
                        <option value="Padre/Madre" ${data && data.relation === 'Padre/Madre' ? 'selected' : ''}>Padre/Madre</option>
                        <option value="Otro" ${data && data.relation === 'Otro' ? 'selected' : ''}>Otro</option>
                    </select>
                </div>
            </div>
        `;
        container.appendChild(div);
        if(containerId === 'edit-extra-clients-container') this.calculateEditQuote();
    },

    getExtraClientsData(containerId) {
        const clients = [];
        document.querySelectorAll(`#${containerId} .extra-client-box`).forEach(box => {
            clients.push({
                name: box.querySelector('.ec-name').value,
                age: box.querySelector('.ec-age').value,
                relation: box.querySelector('.ec-relation').value
            });
        });
        return clients;
    },

    getVehiclesData(containerId) {
        const vehicles = [];
        document.querySelectorAll(`#${containerId} .vehicle-box`).forEach((box, i) => {
            const selectedCoverages = Array.from(box.querySelectorAll('.v-cov-chk:checked')).map(chk => chk.value);
            vehicles.push({
                id: i + 1,
                placas: box.querySelector('.v-placas').value,
                model: box.querySelector('.v-model').value,
                km: box.querySelector('.v-km').value,
                coverages: selectedCoverages
            });
        });
        return vehicles;
    },

    // ==========================================
    // LÓGICA DEL WIZARD (CREACIÓN)
    // ==========================================
    currentWizardStep: 1,
    resetWizard() {
        this.currentWizardStep = 1;
        this.updateWizardUI();
        document.getElementById('form-step-1').reset();
        document.getElementById('form-step-2').reset();
        document.getElementById('wizard-extra-clients-container').innerHTML = '';
        document.getElementById('vehicles-container').innerHTML = '';
        this.addVehicleForm('vehicles-container', 'btn-add-vehicle'); // 1 x defecto
        document.getElementById('form-step-5').reset();
        appData.wizardData = { store: '', client: {}, vehicles: [], quote: 0 };
    },

    wizardStep(direction) {
        if (direction === 1) {
            if (this.currentWizardStep === 1) {
                appData.wizardData.store = document.getElementById('store-num').value;
            } else if (this.currentWizardStep === 2) {
                const hasInfraction = document.querySelector('input[name="has-infraction"]:checked').value === 'yes';
                appData.wizardData.client = {
                    name: document.getElementById('client-name').value,
                    dob: document.getElementById('client-dob').value,
                    address: document.getElementById('client-address').value,
                    license: document.getElementById('client-license').value,
                    hasInfraction,
                    infractions: hasInfraction ? this.getInfractionsData('infractions-container') : [],
                    extraClients: this.getExtraClientsData('wizard-extra-clients-container')
                };
            } else if (this.currentWizardStep === 3) {
                // Validación de placas Propuesta 5
                if (window.validationModule && !validationModule.validateAllVehicles('vehicles-container')) {
                    this.showToast('Corrige los errores en las placas antes de continuar', 'danger');
                    return;
                }
                
                appData.wizardData.vehicles = this.getVehiclesData('vehicles-container');
                // Validar que cada vehículo tenga al menos 1 cobertura
                for (let v of appData.wizardData.vehicles) {
                    if(v.coverages.length === 0) {
                        this.showToast('Cada vehículo debe tener al menos una cobertura', 'danger');
                        return; // No avanzar
                    }
                }
            }
        }
        this.currentWizardStep += direction;
        this.updateWizardUI();
    },

    updateWizardUI() {
        document.querySelectorAll('.wizard-progress .step').forEach(step => {
            const stepNum = parseInt(step.dataset.step, 10);
            if (stepNum <= this.currentWizardStep) step.classList.add('active');
            else step.classList.remove('active');
        });
        document.querySelectorAll('.wizard-step').forEach(step => {
            step.classList.add('hidden'); step.classList.remove('active');
        });
        const currentStepEl = document.getElementById(`wizard-step-${this.currentWizardStep}`);
        if(currentStepEl) { currentStepEl.classList.remove('hidden'); currentStepEl.classList.add('active'); }
    },

    generateQuoteHTML(vehicles, extraClientsCount, clientData = null) {
        const totalPeople = 1 + extraClientsCount;
        let html = `<div class="quote-summary">
            <h4 class="mb-4">Desglose (${vehicles.length} vehículo/s, ${totalPeople} persona/s)</h4>
            <table class="quote-table">
                <thead>
                    <tr>
                        <th>Vehículo</th>
                        <th>Coberturas Acumuladas</th>
                        <th class="text-right">Subtotal Vehículo</th>
                    </tr>
                </thead>
                <tbody>`;

        let generalSubtotal = 0;
        let generalPeopleSubtotal = 0;

        vehicles.forEach((v, i) => {
            let vBaseSum = 0;
            let vPersonSum = 0;
            let covNames = [];

            v.coverages.forEach(cov => {
                const rates = COVERAGE_RATES[cov];
                if(rates) {
                    vBaseSum += rates.base;
                    vPersonSum += rates.perPerson;
                    covNames.push(`${cov} ($${rates.base})`);
                }
            });

            const vehiclePeopleCost = vPersonSum * totalPeople;
            const vehicleTotal = vBaseSum + vehiclePeopleCost;
            
            generalSubtotal += vBaseSum;
            generalPeopleSubtotal += vehiclePeopleCost;

            html += `
                <tr>
                    <td><strong>V${i+1} (${v.model || 'Sin especificar'})</strong></td>
                    <td style="font-size:0.85rem; color:var(--medium-gray);">${covNames.join('<br>')}</td>
                    <td class="text-right">$${vBaseSum}</td>
                </tr>
            `;
        });

        const subtotalSinIVA = generalSubtotal + generalPeopleSubtotal;
        
        let infractionTotal = 0;
        let infractionsHtml = '';
        if (clientData && clientData.hasInfraction && clientData.infractions) {
            clientData.infractions.forEach(inf => {
                infractionTotal += inf.amount;
                infractionsHtml += `<div class="quote-total-row" style="color:var(--danger); font-size:0.9rem;"><span>Infracción: ${inf.type}</span> <span>+$${inf.amount.toFixed(2)}</span></div>`;
            });
        }

        const iva = (subtotalSinIVA + infractionTotal) * 0.16;
        const grandTotal = subtotalSinIVA + infractionTotal + iva;

        html += `
                </tbody>
            </table>
            
            <div class="quote-total-section">
                <div class="quote-total-row"><span>Costo Total Coberturas Base:</span> <span>$${generalSubtotal}</span></div>
                <div class="quote-total-row"><span>Costo Total por Personas (${totalPeople}):</span> <span>$${generalPeopleSubtotal}</span></div>
                ${infractionsHtml}
                <div class="quote-total-row" style="color:var(--medium-gray);"><span>Subtotal:</span> <span>$${(subtotalSinIVA + infractionTotal)}</span></div>
                <div class="quote-total-row" style="color:var(--medium-gray);"><span>IVA (16%):</span> <span>$${iva.toFixed(2)}</span></div>
                
                <div class="quote-final-row">
                    <span>Total Final</span>
                    <span>$${grandTotal.toFixed(2)}</span>
                </div>
            </div>
        </div>`;

        return { html, grandTotal: parseFloat(grandTotal.toFixed(2)) };
    },

    generateWizardQuote() {
        const res = this.generateQuoteHTML(appData.wizardData.vehicles, appData.wizardData.client.extraClients.length, appData.wizardData.client);
        document.getElementById('quote-container').innerHTML = res.html;
        appData.wizardData.quote = res.grandTotal;
    },

    processPayment(e) {
        e.preventDefault();
        const newPolicy = {
            id: 'POL-' + Math.floor(Math.random() * 1000000),
            date: new Date().toISOString(),
            store: appData.wizardData.store,
            client: appData.wizardData.client,
            vehicles: appData.wizardData.vehicles,
            total: appData.wizardData.quote,
            status: 'Activa'
        };
        appData.policies.push(newPolicy);
        this.savePolicies();
        document.getElementById('wizard-final-policy-id').textContent = 'Póliza: ' + newPolicy.id;
        this.wizardStep(1); // Mover al step 6
    },

    // ==========================================
    // EDICIÓN DE PÓLIZAS
    // ==========================================
    loadEditPolicy(policyId) {
        const p = appData.policies.find(x => x.id === policyId);
        if(!p) return;
        appData.editingPolicyId = policyId;
        
        document.getElementById('edit-policy-id-display').textContent = `ID: ${p.id}`;
        document.getElementById('edit-client-name').value = p.client.name;
        document.getElementById('edit-client-dob').value = p.client.dob;
        document.getElementById('edit-client-address').value = p.client.address;
        document.getElementById('edit-client-license').value = p.client.license;
        
        const infRadio = document.querySelector(`input[name="edit-has-infraction"][value="${p.client.hasInfraction ? 'yes' : 'no'}"]`);
        if(infRadio) infRadio.checked = true;
        this.toggleInfraction({target:{value: p.client.hasInfraction ? 'yes' : 'no'}}, 'edit-infraction-container-wrapper', 'edit-infractions-container');
        if(p.client.hasInfraction && p.client.infractions) {
            const container = document.getElementById('edit-infractions-container');
            container.innerHTML = '';
            p.client.infractions.forEach(inf => this.addInfractionField('edit-infractions-container', inf.type, inf.amount));
        }

        const extraContainer = document.getElementById('edit-extra-clients-container');
        extraContainer.innerHTML = '';
        (p.client.extraClients || []).forEach(ec => this.addExtraClient('edit-extra-clients-container', ec));

        const vehContainer = document.getElementById('edit-vehicles-container');
        vehContainer.innerHTML = '';
        p.vehicles.forEach(v => {
            // Backward compatibility para datos viejos que tenian un solo string 'coverage'
            if(!v.coverages && v.coverage) v.coverages = [v.coverage];
            this.addVehicleForm('edit-vehicles-container', 'btn-edit-add-vehicle', v);
        });

        this.calculateEditQuote();
        this.showScreen('screen-edit-policy');
    },

    calculateEditQuote() {
        const vehicles = this.getVehiclesData('edit-vehicles-container');
        const extraClientsCount = document.querySelectorAll('#edit-extra-clients-container .extra-client-box').length;
        
        const hasInfraction = document.querySelector('input[name="edit-has-infraction"]:checked') && document.querySelector('input[name="edit-has-infraction"]:checked').value === 'yes';
        const clientData = {
            hasInfraction,
            infractions: hasInfraction ? this.getInfractionsData('edit-infractions-container') : []
        };
        
        const res = this.generateQuoteHTML(vehicles, extraClientsCount, clientData);
        document.getElementById('edit-quote-container').innerHTML = res.html;
    },

    saveEditedPolicy(e) {
        e.preventDefault();
        
        // Validación de placas Propuesta 5
        if (window.validationModule && !validationModule.validateAllVehicles('edit-vehicles-container')) {
            this.showToast('Corrige los errores en las placas antes de guardar', 'danger');
            return;
        }
        
        const vehicles = this.getVehiclesData('edit-vehicles-container');
        for (let v of vehicles) {
            if(v.coverages.length === 0) {
                this.showToast('Cada vehículo debe tener al menos una cobertura', 'danger');
                return;
            }
        }

        const pIndex = appData.policies.findIndex(x => x.id === appData.editingPolicyId);
        if(pIndex === -1) return;

        const hasInfraction = document.querySelector('input[name="edit-has-infraction"]:checked').value === 'yes';
        const extraClientsCount = document.querySelectorAll('#edit-extra-clients-container .extra-client-box').length;
        
        appData.policies[pIndex].client = {
            name: document.getElementById('edit-client-name').value,
            dob: document.getElementById('edit-client-dob').value,
            address: document.getElementById('edit-client-address').value,
            license: document.getElementById('edit-client-license').value,
            hasInfraction,
            infractions: hasInfraction ? this.getInfractionsData('edit-infractions-container') : [],
            extraClients: this.getExtraClientsData('edit-extra-clients-container')
        };
        appData.policies[pIndex].vehicles = vehicles;
        appData.policies[pIndex].total = this.generateQuoteHTML(vehicles, appData.policies[pIndex].client.extraClients.length, appData.policies[pIndex].client).grandTotal;

        this.savePolicies();
        this.showToast('Cambios guardados correctamente', 'success');
        this.showScreen('screen-search');
        document.getElementById('search-form').dispatchEvent(new Event('submit'));
    },

    // ==========================================
    // BÚSQUEDA Y RESULTADOS
    // ==========================================
    handleSearch(e) {
        e.preventDefault();
        const nameQuery = document.getElementById('search-name').value.toLowerCase().trim();
        const licenseQuery = document.getElementById('search-license').value.toLowerCase().trim();
        const container = document.getElementById('search-results-container');
        
        if (!nameQuery && !licenseQuery) {
            container.innerHTML = '<p class="text-muted">Ingresa un nombre o número de licencia para buscar.</p>';
            return;
        }

        const results = appData.policies.filter(p => {
            const matchName = nameQuery ? p.client.name.toLowerCase().includes(nameQuery) : false;
            const matchLicense = licenseQuery ? p.client.license.toLowerCase().includes(licenseQuery) : false;
            return matchName || matchLicense;
        });
        this.renderSearchResults(results, container);
    },

    renderSearchResults(results, container) {
        if (results.length === 0) {
            container.innerHTML = '<div class="card"><p class="text-muted text-center">No se encontraron pólizas.</p></div>';
            return;
        }
        let html = '';
        results.forEach(p => {
            html += `
                <div class="result-card">
                    <div class="result-info">
                        <h4>Póliza: ${p.id} <span style="font-size:0.8rem; background:var(--success); color:white; padding:2px 8px; border-radius:12px; margin-left:10px;">${p.status}</span></h4>
                        <div class="result-details">
                            <div><strong>Cliente:</strong> ${p.client.name}<br><strong>Licencia:</strong> ${p.client.license}</div>
                            <div><strong>Vehículos:</strong> ${p.vehicles.length}<br><strong>Total:</strong> <span style="color:var(--primary-purple); font-weight:bold;">$${p.total}</span></div>
                        </div>
                    </div>
                    <div class="result-actions">
                        <button class="btn btn-outline btn-sm" onclick="app.loadEditPolicy('${p.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="app.confirmDeletePolicy('${p.id}', true)"><i class="fa-solid fa-trash"></i> Eliminar</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    // ==========================================
    // BÚSQUEDA GLOBAL HEADER
    // ==========================================
    handleGlobalSearch(e) {
        const query = e.target.value.toLowerCase().trim();
        const dropdown = document.getElementById('global-search-dropdown');
        if (!dropdown) return;
        
        if (!query) {
            dropdown.classList.add('hidden');
            return;
        }

        const results = appData.policies.filter(p => {
            const matchId = p.id.toLowerCase().includes(query);
            const matchName = p.client.name.toLowerCase().includes(query);
            const matchLicense = p.client.license.toLowerCase().includes(query);
            const matchVehicles = p.vehicles.some(v => v.placas.toLowerCase().includes(query));
            return matchId || matchName || matchLicense || matchVehicles;
        }).slice(0, 5); // Limit to 5 results

        if (results.length === 0) {
            dropdown.innerHTML = '<div class="dropdown-item"><p class="text-muted text-center">No se encontraron resultados.</p></div>';
            dropdown.classList.remove('hidden');
            return;
        }

        let html = '';
        results.forEach(p => {
            html += `
                <div class="dropdown-item" onclick="app.loadEditPolicy('${p.id}'); document.getElementById('global-search-dropdown').classList.add('hidden');">
                    <h5>${p.client.name} <span class="badge ${p.status === 'Activa' ? 'success' : 'danger'}" style="float:right;">${p.status}</span></h5>
                    <p>ID: ${p.id} | Licencia: ${p.client.license}</p>
                </div>
            `;
        });
        dropdown.innerHTML = html;
        dropdown.classList.remove('hidden');
    },

    // ==========================================
    // ELIMINAR PÓLIZA
    // ==========================================
    handleDeleteSearch() {
        const query = document.getElementById('delete-search').value.toLowerCase().trim();
        const container = document.getElementById('delete-results-container');
        if (!query) { container.innerHTML = ''; return; }

        const results = appData.policies.filter(p => p.client.name.toLowerCase().includes(query) || p.client.license.toLowerCase().includes(query));
        if (results.length === 0) { container.innerHTML = '<p class="text-muted text-center">No hay coincidencias.</p>'; return; }

        let html = '';
        results.forEach(p => {
            html += `
                <div class="result-card">
                    <div class="result-info">
                        <h4>${p.client.name} - ${p.id}</h4>
                        <p class="text-muted">Licencia: ${p.client.license} | Vehículos: ${p.vehicles.length}</p>
                    </div>
                    <button class="btn btn-danger" onclick="app.confirmDeletePolicy('${p.id}', false)"><i class="fa-solid fa-trash"></i> Eliminar</button>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    confirmDeletePolicy(policyId, fromSearchScreen) {
        document.getElementById('modal-confirm-title').textContent = '¿Eliminar Póliza?';
        document.getElementById('modal-confirm-msg').textContent = `Se eliminará permanentemente la póliza ${policyId}. Esta acción no se puede deshacer.`;
        document.getElementById('btn-confirm-action').onclick = () => this.deletePolicy(policyId, fromSearchScreen);
        this.showModal('modal-confirm');
    },

    deletePolicy(policyId, fromSearchScreen) {
        appData.policies = appData.policies.filter(p => p.id !== policyId);
        this.savePolicies();
        this.closeModal('modal-confirm');
        this.showToast('La póliza fue eliminada del sistema.', 'success');
        if(fromSearchScreen) document.getElementById('search-form').dispatchEvent(new Event('submit'));
        else this.handleDeleteSearch();
    },

    // ==========================================
    // LLAMADAS PENDIENTES
    // ==========================================
    handleNewCall(e) {
        e.preventDefault();
        appData.calls.push({
            id: Date.now(),
            client: document.getElementById('call-client').value,
            date: document.getElementById('call-date').value,
            phone: document.getElementById('call-phone').value,
            notes: document.getElementById('call-notes').value,
            completed: false
        });
        this.saveCalls();
        document.getElementById('form-new-call').reset();
        document.getElementById('new-call-form-container').classList.add('hidden');
        this.renderCalls();
        this.showToast('Llamada Registrada', 'success');
    },

    renderCalls() {
        const pendingContainer = document.getElementById('calls-pending-container');
        const completedContainer = document.getElementById('calls-completed-container');
        if(!pendingContainer || !completedContainer) return;
        
        const pending = appData.calls.filter(c => !c.completed).sort((a,b) => new Date(a.date) - new Date(b.date));
        const completed = appData.calls.filter(c => c.completed).sort((a,b) => new Date(b.date) - new Date(a.date));

        const renderList = (list, page, containerEl, infoEl, btnPrev, btnNext) => {
            if(list.length === 0) {
                if(btnPrev) btnPrev.parentElement.classList.add('hidden');
                return '<div class="card text-center"><p class="text-muted">No hay registros.</p></div>';
            }
            
            const totalPages = Math.ceil(list.length / this.itemsPerPage);
            // Validar que la página actual no se pase al eliminar elementos
            let currentPage = page;
            if(currentPage > totalPages) currentPage = totalPages;
            if(currentPage < 1) currentPage = 1;

            if(btnPrev && infoEl && btnNext) {
                if(totalPages > 1) {
                    btnPrev.parentElement.classList.remove('hidden');
                    infoEl.textContent = `Página ${currentPage} de ${totalPages}`;
                    btnPrev.disabled = currentPage === 1;
                    btnNext.disabled = currentPage === totalPages;
                } else {
                    btnPrev.parentElement.classList.add('hidden');
                }
            }

            const startIndex = (currentPage - 1) * this.itemsPerPage;
            const pagedList = list.slice(startIndex, startIndex + this.itemsPerPage);

            return pagedList.map(c => {
                const isLate = !c.completed && new Date(c.date) < new Date(new Date().setHours(0,0,0,0));
                const dateStr = new Date(c.date).toLocaleDateString();
                return `
                    <div class="call-card ${c.completed ? 'completed' : ''} ${isLate ? 'late' : ''}">
                        <div class="result-info">
                            <h4 class="call-title">${c.client} ${isLate ? '<span class="required" style="font-size:0.8rem;">(Vencida)</span>' : ''}</h4>
                            <p class="text-muted"><i class="fa-solid fa-phone"></i> ${c.phone} | <i class="fa-regular fa-calendar"></i> ${dateStr}</p>
                            ${c.notes ? `<p class="mt-2" style="font-size:0.9rem;"><em>Nota:</em> ${c.notes}</p>` : ''}
                        </div>
                        <div class="result-actions" style="flex-direction: column; align-items:flex-end;">
                            ${!c.completed ? `<button class="btn btn-success btn-sm btn-block" onclick="app.toggleCallStatus(${c.id})"><i class="fa-solid fa-check"></i> Completada</button>` : `<button class="btn btn-outline btn-sm btn-block" onclick="app.toggleCallStatus(${c.id})"><i class="fa-solid fa-rotate-left"></i> Reabrir</button>`}
                            <button class="btn btn-outline btn-sm btn-block" onclick="app.openEditCallModal(${c.id})"><i class="fa-solid fa-pen"></i> Editar</button>
                            <button class="btn btn-danger btn-sm btn-block" onclick="app.confirmDeleteCall(${c.id})"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
            }).join('');
        };

        pendingContainer.innerHTML = renderList(pending, this.callsCurrentPagePending, pendingContainer, document.getElementById('page-pending-info'), document.getElementById('btn-pending-prev'), document.getElementById('btn-pending-next'));
        completedContainer.innerHTML = renderList(completed, this.callsCurrentPageCompleted, completedContainer, document.getElementById('page-completed-info'), document.getElementById('btn-completed-prev'), document.getElementById('btn-completed-next'));
    },

    toggleCallStatus(id) {
        const call = appData.calls.find(c => c.id === id);
        if (call) {
            call.completed = !call.completed;
            this.saveCalls();
            this.renderCalls();
            this.showToast(call.completed ? 'Llamada completada' : 'Llamada reabierta', 'success');
        }
    },

    openEditCallModal(id) {
        const call = appData.calls.find(c => c.id === id);
        if(!call) return;
        document.getElementById('edit-call-id').value = call.id;
        document.getElementById('edit-call-client').value = call.client;
        document.getElementById('edit-call-date').value = call.date;
        document.getElementById('edit-call-phone').value = call.phone;
        document.getElementById('edit-call-notes').value = call.notes || '';
        this.showModal('modal-edit-call');
    },

    handleEditCallSubmit(e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('edit-call-id').value);
        const call = appData.calls.find(c => c.id === id);
        if(call) {
            call.client = document.getElementById('edit-call-client').value;
            call.date = document.getElementById('edit-call-date').value;
            call.phone = document.getElementById('edit-call-phone').value;
            call.notes = document.getElementById('edit-call-notes').value;
            this.saveCalls();
            this.closeModal('modal-edit-call');
            this.renderCalls();
            this.showToast('Llamada actualizada', 'success');
        }
    },

    confirmDeleteCall(id) {
        document.getElementById('modal-confirm-title').textContent = '¿Eliminar Llamada?';
        document.getElementById('modal-confirm-msg').textContent = `¿Deseas eliminar este registro de llamada pendiente?`;
        document.getElementById('btn-confirm-action').onclick = () => this.deleteCall(id);
        this.showModal('modal-confirm');
    },

    deleteCall(id) {
        appData.calls = appData.calls.filter(c => c.id !== id);
        this.saveCalls();
        this.closeModal('modal-confirm');
        this.renderCalls();
        this.showToast('Llamada eliminada', 'success');
    },

    // ==========================================
    // UTILIDADES (Storage, Modales, Toasts)
    // ==========================================
    savePolicies() { localStorage.setItem('crm_policies', JSON.stringify(appData.policies)); },
    saveCalls() { localStorage.setItem('crm_calls', JSON.stringify(appData.calls)); },

    showModal(modalId) { document.getElementById(modalId).classList.remove('hidden'); },
    closeModal(modalId) { document.getElementById(modalId).classList.add('hidden'); },

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if(!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        const icon = type === 'success' ? 'circle-check' : 'circle-exclamation';
        const color = type === 'success' ? 'var(--success)' : 'var(--danger)';
        toast.style.borderLeftColor = color;
        toast.innerHTML = `<i class="fa-solid fa-${icon}" style="color:${color}"></i> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
