/**
 * CRM Seguros - Módulo de Gráficas
 * Autor: IA Assistant
 * Propuesta 3: Gráficas Dinámicas con Chart.js
 */

const chartsModule = {
    revenueChart: null,
    coverageChart: null,
    weeklyChart: null,

    init() {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js no está cargado.');
            return;
        }

        this.updateThemeColors();
        
        // Renderizar inicial
        setTimeout(() => this.renderCharts(), 100);
        
        // Listener para cambio de tema y repintar colores de gráficas
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                setTimeout(() => {
                    this.updateThemeColors();
                    this.renderCharts();
                }, 100);
            });
        }
    },

    updateThemeColors() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        Chart.defaults.color = isDark ? '#E0E0E0' : '#666666';
        Chart.defaults.borderColor = isDark ? '#444444' : '#E0E0E0';
    },

    renderCharts() {
        if (!window.appData || !appData.policies) return;
        const policies = appData.policies;

        this.renderRevenueChart(policies);
        this.renderCoverageChart(policies);
        this.renderWeeklyChart(policies);
    },

    renderRevenueChart(policies) {
        const ctx = document.getElementById('chartRevenue');
        if(!ctx) return;
        
        // Ganancias por Mes (Últimos 6 meses)
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const currentMonth = new Date().getMonth();
        let labels = [];
        let data = [0, 0, 0, 0, 0, 0];

        for(let i=5; i>=0; i--) {
            let m = currentMonth - i;
            if(m < 0) m += 12;
            labels.push(months[m]);
        }

        policies.forEach(p => {
            if(p.status === 'Activa' && p.total) {
                const pDate = new Date(p.date);
                const pMonth = pDate.getMonth();
                const diff = currentMonth - pMonth;
                // Lógica simple para demo: asume mismo año para calcular los índices
                if(diff >= 0 && diff < 6) {
                    data[5 - diff] += p.total;
                } else if (diff < 0 && (12 + diff) < 6) {
                    // Si el mes es del año pasado pero cae en los ultimos 6 meses
                    data[5 - (12 + diff)] += p.total;
                }
            }
        });

        if (this.revenueChart) this.revenueChart.destroy();
        this.revenueChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ingresos ($)',
                    data: data,
                    backgroundColor: 'rgba(187, 110, 217, 0.8)',
                    hoverBackgroundColor: '#BB6ED9',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    },

    renderCoverageChart(policies) {
        const ctx = document.getElementById('chartCoverage');
        if(!ctx) return;

        const counts = {};
        policies.forEach(p => {
            if (p.vehicles) {
                p.vehicles.forEach(v => {
                    if (v.coverages) {
                        v.coverages.forEach(c => {
                            counts[c] = (counts[c] || 0) + 1;
                        });
                    }
                });
            }
        });

        // Top 5 coberturas
        const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
        const labels = sorted.map(i => i[0]);
        const data = sorted.map(i => i[1]);

        if (this.coverageChart) this.coverageChart.destroy();
        this.coverageChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.length ? labels : ['Sin Datos'],
                datasets: [{
                    data: data.length ? data : [1],
                    backgroundColor: [
                        '#BB6ED9', '#19788C', '#2A9D8F', '#F4A261', '#E63946'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
                },
                cutout: '70%'
            }
        });
    },

    renderWeeklyChart(policies) {
        const ctx = document.getElementById('chartWeekly');
        if(!ctx) return;

        const labels = [];
        const data = [0,0,0,0,0,0,0];
        
        for(let i=6; i>=0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            // Capitalizar primera letra
            let day = d.toLocaleDateString('es-ES', { weekday: 'short' });
            day = day.charAt(0).toUpperCase() + day.slice(1);
            labels.push(day);
        }

        const today = new Date();
        today.setHours(23,59,59,999);
        
        policies.forEach(p => {
            const pDate = new Date(p.date);
            const diffTime = Math.abs(today - pDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
            if(diffDays < 7) {
                data[6 - diffDays]++;
            }
        });

        if (this.weeklyChart) this.weeklyChart.destroy();
        this.weeklyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pólizas Creadas',
                    data: data,
                    borderColor: '#19788C',
                    backgroundColor: 'rgba(25, 120, 140, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#19788C',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }
};

// Se expone al objeto global
window.chartsModule = chartsModule;
