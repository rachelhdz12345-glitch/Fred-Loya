/**
 * CRM Seguros - Módulo de Dashboard
 * Autor: IA Assistant
 * Propuesta 3: Dashboard con Métricas Reales
 */

const dashboardModule = {
    init() {
        this.updateMetrics();
        this.renderFastCalls();
        if (window.chartsModule) {
            chartsModule.init();
        }
    },

    updateMetrics() {
        if (!window.appData) return;
        const policies = appData.policies || [];
        const calls = appData.calls || [];

        const activePolicies = policies.filter(p => p.status === 'Activa').length;
        const cancelledPolicies = policies.filter(p => p.status === 'Cancelada').length;
        
        let totalRevenue = 0;
        let totalVehicles = 0;
        let uniqueClients = new Set();

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        policies.forEach(p => {
            if (p.status === 'Activa') {
                const pDate = new Date(p.date);
                if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
                    totalRevenue += (p.total || 0);
                }
                
                uniqueClients.add(p.client.license);
                if(p.client.extraClients) {
                    p.client.extraClients.forEach(ec => uniqueClients.add(ec.name));
                }
                
                if (p.vehicles) {
                    totalVehicles += p.vehicles.length;
                }
            }
        });

        const pendingCalls = calls.filter(c => !c.completed).length;

        // Actualizar UI
        const elActive = document.getElementById('metric-policies-active');
        const elCancelled = document.getElementById('metric-policies-cancelled');
        const elCalls = document.getElementById('metric-calls-pending');
        const elRev = document.getElementById('metric-revenue');
        const elClients = document.getElementById('metric-clients');
        const elVehicles = document.getElementById('metric-vehicles');

        if(elActive) elActive.textContent = activePolicies;
        if(elCancelled) elCancelled.textContent = cancelledPolicies;
        if(elCalls) elCalls.textContent = pendingCalls;
        if(elRev) elRev.textContent = '$' + totalRevenue.toLocaleString('es-MX', {minimumFractionDigits: 2});
        if(elClients) elClients.textContent = uniqueClients.size;
        if(elVehicles) elVehicles.textContent = totalVehicles;
    },

    renderFastCalls() {
        const tbody = document.getElementById('dashboard-fast-calls');
        if (!tbody || !window.appData) return;

        const calls = appData.calls || [];
        const pending = calls.filter(c => !c.completed)
                             .sort((a,b) => new Date(a.date) - new Date(b.date))
                             .slice(0, 5);

        if (pending.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding: 2rem;">No hay llamadas próximas. ¡Todo al día!</td></tr>';
            return;
        }

        const today = new Date();
        today.setHours(0,0,0,0);

        let html = '';
        pending.forEach(c => {
            const dateObj = new Date(c.date);
            const isLate = dateObj < today;
            const statusBadge = isLate ? '<span class="badge danger">Vencida</span>' : '<span class="badge warning">Pendiente</span>';
            const dateStr = dateObj.toLocaleDateString('es-MX', {day: '2-digit', month: 'short'});

            html += `
                <tr>
                    <td><strong>${c.client}</strong></td>
                    <td>${dateStr}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }
};

window.dashboardModule = dashboardModule;
