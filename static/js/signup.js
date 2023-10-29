document.addEventListener("DOMContentLoaded", function() {
    const signupForm = document.querySelector("form")

    signupForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const formData = new FormData(signupForm);

        fetch('/signup', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = data.redirect;
                const nonce = generateRandomNonce(8)
                const username = document.getElementById("username").value
                localStorage.setItem(username + "-nonce", nonce)
            } else {
                console.log(data.message);
            }
        });
    })

    function generateRandomNonce(byteLength) {
        const nonceArray = new Uint8Array(byteLength);
        crypto.getRandomValues(nonceArray);

        return Array.from(nonceArray)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }
});