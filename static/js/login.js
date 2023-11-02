document.addEventListener("DOMContentLoaded", function() {
    const loginForm = document.getElementById('form');
    const usernameInput = document.getElementById('username')
    const passwordInput = document.getElementById('password')
    const signUpButton = document.getElementById('signup-button')

    loginForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const formData = new FormData(loginForm);
        
        fetch('/login', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = data.redirect;
                const password = passwordInput.value;
                sessionStorage.setItem("password", password);
            } else {
                usernameInput.value = '';
                passwordInput.value = '';
                window.alert(data.message)
            }
        });
    });

    signUpButton.addEventListener('click', function() {
        window.location.href = '/signup'
    })
});


