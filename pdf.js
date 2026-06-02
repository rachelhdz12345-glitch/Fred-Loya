/**
 * CRM Seguros - Módulo de PDF
 * Autor: IA Assistant
 * Propuesta 4: Descargar Póliza como PDF
 */

const pdfModule = {
    downloadPDF() {
        // Obtenemos la póliza según el contexto de la pantalla
        let policyId = '';
        const isEditScreen = document.getElementById('screen-edit-policy').classList.contains('active');
        const isWizardSuccess = document.getElementById('wizard-step-6') && document.getElementById('wizard-step-6').classList.contains('active');
        
        if (isEditScreen) {
            policyId = appData.editingPolicyId;
        } else if (isWizardSuccess) {
            // El último agregado en el Wizard
            policyId = appData.policies[appData.policies.length - 1].id;
        } else {
            if(app && app.showToast) app.showToast('No hay póliza activa para descargar', 'danger');
            return;
        }
        
        const policy = appData.policies.find(p => p.id === policyId);
        if(!policy) {
            if(app && app.showToast) app.showToast('No se encontró la póliza', 'danger');
            return;
        }

        this.generateAndDownload(policy);
    },

    generateAndDownload(policy) {
        if(app && app.showToast) app.showToast('Generando PDF, por favor espera...', 'success');
        
        const wrapper = document.getElementById('pdf-template-wrapper');
        const inner = document.getElementById('pdf-content-inner');
        
        // Limpiamos contenido anterior
        inner.innerHTML = '';
        
        // Formateamos Fecha
        const dateObj = new Date(policy.date);
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
        
        // Generar Vehículos HTML
        let vehiclesHtml = '';
        policy.vehicles.forEach((v, i) => {
            vehiclesHtml += `
                <div style="margin-bottom: 1rem; padding: 1rem; border: 1px solid #E0E0E0; border-radius: 8px; page-break-inside: avoid;">
                    <h4 style="margin-bottom: 0.5rem; color: #19788C;">Vehículo ${i+1}: ${v.model || 'No especificado'}</h4>
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 1px solid #eee; width: 20%;"><strong>Placas:</strong></td>
                            <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${v.placas}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 1px solid #eee;"><strong>Coberturas:</strong></td>
                            <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${v.coverages.join(', ')}</td>
                        </tr>
                    </table>
                </div>
            `;
        });
        
        const html = `
            <div style="font-family: 'Inter', sans-serif; color: #333;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #BB6ED9; padding-bottom: 1rem; margin-bottom: 2rem;">
                    <div>
                        <h2 style="margin: 0; color: #BB6ED9; font-size: 2rem;">Seguros CRM</h2>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 0.9rem;">Documento Oficial de Póliza</p>
                    </div>
                    <div style="text-align: right;">
                        <h3 style="margin: 0; color: #333;">${policy.id}</h3>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 0.9rem;">Emisión: ${dateStr}</p>
                        <p style="margin: 5px 0 0 0; font-weight: bold; color: #2A9D8F; font-size: 0.9rem;">Estado: ${policy.status}</p>
                    </div>
                </div>
                
                <div style="margin-bottom: 2rem; page-break-inside: avoid;">
                    <h3 style="border-bottom: 2px solid #BB6ED9; padding-bottom: 0.5rem; color: #BB6ED9; margin-bottom: 1rem;">Datos del Cliente Titular</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
                        <tr>
                            <td style="padding: 0.75rem 0.5rem; border-bottom: 1px solid #eee; width: 15%;"><strong>Nombre:</strong></td>
                            <td style="padding: 0.75rem 0.5rem; border-bottom: 1px solid #eee; width: 35%;">${policy.client.name}</td>
                            <td style="padding: 0.75rem 0.5rem; border-bottom: 1px solid #eee; width: 15%;"><strong>Nacimiento:</strong></td>
                            <td style="padding: 0.75rem 0.5rem; border-bottom: 1px solid #eee; width: 35%;">${policy.client.dob}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.75rem 0.5rem; border-bottom: 1px solid #eee;"><strong>Domicilio:</strong></td>
                            <td style="padding: 0.75rem 0.5rem; border-bottom: 1px solid #eee;">${policy.client.address}</td>
                            <td style="padding: 0.75rem 0.5rem; border-bottom: 1px solid #eee;"><strong>Licencia:</strong></td>
                            <td style="padding: 0.75rem 0.5rem; border-bottom: 1px solid #eee;">${policy.client.license}</td>
                        </tr>
                    </table>
                </div>

                <div style="margin-bottom: 2rem;">
                    <h3 style="border-bottom: 2px solid #BB6ED9; padding-bottom: 0.5rem; color: #BB6ED9; margin-bottom: 1rem;">Vehículos Asegurados</h3>
                    ${vehiclesHtml}
                </div>

                <div style="margin-top: 3rem; background: #FAFAFA; padding: 1.5rem; border-radius: 8px; border: 1px solid #E0E0E0; page-break-inside: avoid;">
                    <h3 style="margin: 0; color: #333; text-align: right; font-size: 1.2rem;">Cotización / Desglose Financiero</h3>
                    <h2 style="margin: 10px 0 0 0; color: #333; text-align: right;">Total Final: <span style="color: #BB6ED9; font-size: 2rem;">$${policy.total}</span></h2>
                    <p style="text-align: right; color: #666; font-size: 0.85rem; margin-top: 5px;">(Incluye Subtotal e IVA del 16%)</p>
                </div>
                
                <div style="margin-top: 4rem; text-align: center; color: #999; font-size: 0.8rem;">
                    <p>Este documento es una representación impresa de la póliza contratada mediante Seguros CRM.</p>
                </div>
            </div>
        `;
        
        inner.innerHTML = html;
        wrapper.classList.remove('hidden'); // Lo mostramos para que html2pdf lo lea correctamente
        
        const opt = {
            margin:       0.5,
            filename:     `Poliza_${policy.id}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Generar
        html2pdf().set(opt).from(wrapper).save().then(() => {
            wrapper.classList.add('hidden'); // Ocultar nuevamente
            inner.innerHTML = ''; // Limpiar la memoria
        });
    }
};
