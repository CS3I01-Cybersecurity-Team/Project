document.getElementById('show-password-storage-form').addEventListener('click', function() {
    var form = document.getElementById('password-storage-form');
    form.style.display = (form.style.display === 'none') ? 'block' : 'none';
});

document.getElementById('show-password-request-form').addEventListener('click', function() {
    var form = document.getElementById('password-request-form');
    form.style.display = (form.style.display === 'none') ? 'block' : 'none';
});

document.addEventListener("DOMContentLoaded", function() {
    const passwordStorageForm = document.getElementById("password-storage-form");

    passwordStorageForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const formData = new FormData(passwordStorageForm)

        const saltResponse = await fetch('/get-salt', {
            method: 'GET'
        });

        const usernameResponse = await fetch('/get-username', {
            method: 'GET'
        });

        const data = await saltResponse.json()
        const textEncoder = new TextEncoder('iso-8859-1');
        const encodedData = textEncoder.encode(data.salt)
        const encodedSalt = Array.from(encodedData);

        const data1 = await usernameResponse.json()
        const username = data1.username;

        const passwordBuffer = new TextEncoder().encode(sessionStorage.getItem('password') + localStorage.getItem(username + "-nonce"))

        const key = await window.crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveBits']
        )
        .then(key => window.crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: new Uint8Array(encodedSalt),
                iterations: 600000,
                hash: {name: 'SHA-256'},
            },
            key,
            256
        ));

        const keyAlgorithm = { name: 'AES-GCM', length: 256 };
        const derivedKey = await window.crypto.subtle.importKey(
            'raw',
            key,
            keyAlgorithm,
            true,
            ['encrypt', 'decrypt'] 
        );

        iv = window.crypto.getRandomValues(new Uint8Array(16));
        const passwordToEncrypt = new TextEncoder().encode(formData.get('password'))
        const result = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv},
            derivedKey,
            passwordToEncrypt
        )

        const encryptedDataArray = Array.from(new Uint8Array(result));
        const ivArray = Array.from(iv);

        const dataToSend = {
            encryptedData: encryptedDataArray,
            iv: ivArray,
            appName: formData.get("app-name")
        };

        fetch('/store_password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend)
        }).then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Data sent to server and stored successfully.');
            } else {
                console.error('Failed to send data to the server.');
            }
        });
    }) 
})

document.addEventListener("DOMContentLoaded", function() {
    const passwordRequestForm = document.getElementById("password-request-form")
    const decryptedPasswordContainer = document.getElementById("decrypted-password-container")
    const showPasswordButton = document.getElementById("show-password-button");
    let finalPassword = ''

    passwordRequestForm.addEventListener("submit", async function(event) {
        event.preventDefault()
        const formData = new FormData(passwordRequestForm)

        const appName = formData.get('website-name')
        const url = `/get-encrypted-password?appName=${encodeURIComponent(appName)}`

        const encrytptedPasswordResponse = await fetch(url, {
            method: 'GET'
        })

        const saltResponse = await fetch('/get-salt', {
            method: 'GET'
        });

        const usernameResponse = await fetch('/get-username', {
            method: 'GET'
        });

        const encryptedPasswordData = await encrytptedPasswordResponse.json()
        const saltData = await saltResponse.json()
        const usernameData = await usernameResponse.json()

        const textEncoder = new TextEncoder('iso-8859-1')

        const username = usernameData.username
        const encodedSalt = textEncoder.encode(saltData.salt)
        const passwordBuffer = new TextEncoder().encode(sessionStorage.getItem('password') + localStorage.getItem(username + "-nonce"))

        const key = await window.crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveBits']
        )
        .then(key => window.crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: new Uint8Array(encodedSalt),
                iterations: 600000,
                hash: {name: 'SHA-256'},
            },
            key,
            256
        ));

        const keyAlgorithm = { name: 'AES-GCM', length: 256 };
        const derivedKey = await window.crypto.subtle.importKey(
            'raw',
            key,
            keyAlgorithm,
            true,
            ['encrypt', 'decrypt'] 
        );
        
        const encryptedPassword = Uint8Array.from(encryptedPasswordData.encrypted_password)
        const iv = Uint8Array.from(encryptedPasswordData.iv)
        
        const decryptedData = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            derivedKey,
            encryptedPassword
        )
        finalPassword = new TextDecoder().decode(new Uint8Array(decryptedData))
        showPasswordButton.style.display = "block";
    })

    let isMouseDown = false;

    showPasswordButton.addEventListener("mousedown", function() {
        isMouseDown = true;
        decryptedPasswordContainer.style.display = "block";
        decryptedPasswordContainer.textContent = `Decrypted Password: ${finalPassword}`;
    });

    showPasswordButton.addEventListener("mouseup", function() {
        isMouseDown = false;
        decryptedPasswordContainer.style.display = "none";
        decryptedPasswordContainer.textContent = `Decrypted Password: *******`;
    });

    showPasswordButton.addEventListener("mouseout", function() {
        if (isMouseDown) {
            decryptedPasswordContainer.style.display = "none";
            decryptedPasswordContainer.textContent = `Decrypted Password: *******`;
        }
    });
})