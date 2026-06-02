/**
 * CRM Seguros - Módulo de Validación
 * Autor: IA Assistant
 * Propuesta 5: Validación avanzada de Placas
 */

const validationModule = {
    // Regex para aceptar: ABC123, ABC1234, ABC-123, ABC-1234 (Case insensitive)
    regexPlacas: /^[A-Za-z]{3}-?\d{3,4}$/,
    
    init() {
        // Usamos Event Delegation porque los vehículos se crean dinámicamente
        document.addEventListener('input', (e) => {
            if (e.target && e.target.classList.contains('v-placas')) {
                this.validatePlacas(e.target);
            }
        });
        document.addEventListener('change', (e) => {
            if (e.target && e.target.classList.contains('v-placas')) {
                this.validatePlacas(e.target);
            }
        });
    },

    validatePlacas(input) {
        const val = input.value.trim();
        
        // Si está vacío, quitamos las clases (ya que el 'required' de HTML5 hará su trabajo luego)
        if (!val) {
            this.clearValidation(input);
            return false;
        }

        const isValid = this.regexPlacas.test(val);
        if (isValid) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
            this.removeErrorMsg(input);
            return true;
        } else {
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');
            this.showErrorMsg(input, 'Formato inválido (Ej: ABC1234 o ABC-123)');
            return false;
        }
    },

    clearValidation(input) {
        input.classList.remove('is-valid', 'is-invalid');
        this.removeErrorMsg(input);
    },

    showErrorMsg(input, msg) {
        let errorEl = input.parentNode.querySelector('.validation-message');
        if (!errorEl) {
            errorEl = document.createElement('span');
            errorEl.className = 'validation-message';
            input.parentNode.appendChild(errorEl);
        }
        errorEl.textContent = msg;
    },

    removeErrorMsg(input) {
        const errorEl = input.parentNode.querySelector('.validation-message');
        if (errorEl) {
            errorEl.remove();
        }
    },

    /**
     * Valida todas las placas dentro de un contenedor.
     * Retorna true si todas son válidas, false en caso contrario.
     */
    validateAllVehicles(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return true;
        const inputs = container.querySelectorAll('.v-placas');
        let allValid = true;
        inputs.forEach(input => {
            if (!this.validatePlacas(input)) {
                allValid = false;
            }
        });
        return allValid;
    }
};

document.addEventListener('DOMContentLoaded', () => validationModule.init());
