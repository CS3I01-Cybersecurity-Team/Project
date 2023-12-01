document.addEventListener("DOMContentLoaded", function() {
    const signupForm = document.querySelector("form")
    const logInButton = document.getElementById('login-button')

    signupForm.addEventListener("submit", function(event) {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        const formData = new FormData(signupForm);

        fetch('/signup', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.alert(data.message)
                window.location.href = data.redirect;
                const nonce = generateRandomNonce(8)
                const username = document.getElementById("username").value
                localStorage.setItem(username + "-nonce", nonce)
            } else {
                window.alert(data.message)
            }
        });
    })

    logInButton.addEventListener('click', function(){
        window.location.href = '/login'
    })

    function generateRandomNonce(byteLength) {
        const nonceArray = new Uint8Array(byteLength);
        crypto.getRandomValues(nonceArray);

        return Array.from(nonceArray)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }

    function validateForm() {
        var password = document.getElementById('password').value;

        if (password.length < 8) {
            window.alert('Password must be at least 8 characters long.');
            return false;
        }

        if (!/[A-Z]/.test(password)) {
            window.alert('Password must contain at least one uppercase letter.');
            return false;
        }

        if (!/[a-z]/.test(password)) {
            window.alert('Password must contain at least one lowercase letter.');
            return false;
        }

        if (!/[0-9!#%]/.test(password)) {
            window.alert('Password must contain at least one number or symbol (!, #, %).');
            return false;
        }

        return true;
    }
});
