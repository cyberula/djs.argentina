// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get references to Auth and Firestore services
const auth = firebase.auth();
const db = firebase.firestore();

(() => {
    const form = document.querySelector('.signup-form');
    if (!form) return;

    const statusEl = form.querySelector('.form-status');
    const submitButton = form.querySelector('button[type="submit"]');
    const defaultButtonLabel = submitButton ? submitButton.textContent : '';
    const endpoint = form.dataset.endpoint || form.getAttribute('action') || '';

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!endpoint) {
            if (statusEl) {
                statusEl.classList.add('is-error');
                statusEl.textContent = 'No se definio el endpoint de Firebase.';
            }
            return;
        }

        if (statusEl) {
            statusEl.classList.remove('is-error', 'is-success');
            statusEl.textContent = 'Enviando...';
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Enviando...';
        }

        const formData = new FormData(form);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                mode: 'cors',
                body: formData,
            });

            if (!response.ok) {
                let message = 'No pudimos enviar tu info. Intentalo de nuevo.';
                try {
                    const errorPayload = await response.json();
                    if (errorPayload && typeof errorPayload.message === 'string') {
                        message = errorPayload.message;
                    }
                } catch (_) {
                    // ignore
                }
                throw new Error(message);
            }

            let successMessage = 'Recibimos tu info. Revisamos y respondemos pronto.';
            try {
                const payload = await response.json();
                if (payload && typeof payload.message === 'string') {
                    successMessage = payload.message;
                }
            } catch (_) {
                // ignore JSON parse errors, keep default message
            }

            if (statusEl) {
                statusEl.classList.add('is-success');
                statusEl.textContent = successMessage;
                statusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            form.reset();
        } catch (error) {
            if (statusEl) {
                statusEl.classList.add('is-error');
                statusEl.textContent = error.message || 'No pudimos enviar tu info. Intentalo de nuevo.';
                statusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = defaultButtonLabel || 'Enviar';
            }
        }
    });
})();
