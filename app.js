const productId = "p1"; // Mock Product ID
const chatWindow = document.getElementById('chatWindow');
const offerInput = document.getElementById('offerInput');
const sendBtn = document.getElementById('sendOfferBtn');

function addMessage(text, sender) {
    const div = document.createElement('div');
    div.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    div.innerHTML = text; // innerHTML to support bolding
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function handleOffer() {
    const offer = parseFloat(offerInput.value);
    if (!offer || offer <= 0) return;

    // Add user message
    addMessage(`I'm offering <strong>₹${offer}</strong>`, 'user');
    offerInput.value = '';

    // Show typing indicator (optional, but good for UX)
    // For now, just a slight delay simulation or immediate

    fetch('http://localhost:3001/api/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, offerAmount: offer })
    })
        .then(response => response.json())
        .then(data => {
            // Handle response
            const { status, message, counterOffer, finalPrice } = data;

            let reply = message;

            if (status === 'counter' && counterOffer) {
                reply += ` <br><strong>Counter Offer: ₹${counterOffer}</strong>`;
            } else if (status === 'accepted') {
                reply += ` <br><strong>Final Price: ₹${finalPrice}</strong> 🎉`;
                // Disable input on success
                offerInput.disabled = true;
                sendBtn.disabled = true;
                sendBtn.innerText = "Deal Closed";
            }

            setTimeout(() => addMessage(reply, 'bot'), 600);
        })
        .catch(err => {
            console.error(err);
            addMessage("Sorry, I'm having trouble connecting to the negotiation server. Please try again later.", 'bot');
        });
}

sendBtn.addEventListener('click', handleOffer);

offerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleOffer();
});
