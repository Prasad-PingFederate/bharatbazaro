document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get Fields
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const gender = document.getElementById('gender').value;
    const dob = document.getElementById('dob').value;
    const email = document.getElementById('email').value.trim();
    const nationality = document.getElementById('nationality').value;
    const password = document.getElementById('password').value;
    const checkAge = document.getElementById('checkAge').checked;
    const checkTerms = document.getElementById('checkTerms').checked;
    const messageBox = document.getElementById('messageBox');

    // Basic Client-Side Validation
    if (!firstName || !lastName || !email || !password) {
        showMessage('Please fill in all required text fields.', 'red');
        return;
    }

    if (!checkAge) {
        showMessage('You must indicate that you are above 18 years of age.', 'red');
        return;
    }

    if (!checkTerms) {
        showMessage('You must accept the Terms & Conditions.', 'red');
        return;
    }

    // construct payload
    const payload = {
        firstName,
        lastName,
        gender,
        dob,
        email,
        nationality,
        password,
        isOver18: checkAge,
        acceptedTerms: checkTerms
    };

    showMessage('Creating account...', 'blue');

    try {
        const response = await fetch('http://localhost:3001/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showMessage(data.message || 'Account created successfully!', 'green');
            // Redirect after delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            showMessage(data.message || 'Signup failed.', 'red');
        }

    } catch (err) {
        console.error(err);
        showMessage('Network error. Is the backend server running?', 'red');
    }
});

function showMessage(msg, color) {
    const box = document.getElementById('messageBox');
    box.style.color = color === 'red' ? '#ef4444' : (color === 'green' ? '#22c55e' : '#3b82f6');
    box.textContent = msg;
}
