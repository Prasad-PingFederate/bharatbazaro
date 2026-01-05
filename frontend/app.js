// Bargain Zone Logic

// Combined Product Data (Bargainable & Non-Bargainable)
const products = [
    {
        id: "p1",
        title: "Vintage Smart Chronograph",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80",
        price: 5000,
        canBargain: true,
        desc: "Premium analog aesthetic with smart tracking."
    },
    {
        id: "m1",
        title: "Apple iPhone 15 (128 GB)",
        image: "https://m.media-amazon.com/images/I/71657TiFeHL._SX679_.jpg",
        price: 72999,
        canBargain: false,
        affiliateLink: "https://www.amazon.in/dp/B0BDK62PDX?tag=dammaiprasad-21",
        desc: "Fixed Price. Best Market Rate."
    },
    {
        id: "p2",
        title: "Sony WH-1000XM5 Headphones",
        image: "https://m.media-amazon.com/images/I/51SKmu2G9FL._AC_UF1000,1000_QL80_.jpg",
        price: 24990,
        canBargain: false,
        affiliateLink: "https://www.amazon.in/dp/B09XS7JWHH?tag=dammaiprasad-21",
        desc: "Official Sony Warranty. Fixed Price."
    },
    {
        id: "p3", // We'll map this to p1 logic/backend for demo simplicity
        title: "Gaming Mouse RGB Pro",
        image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&q=80",
        price: 3500,
        canBargain: true,
        desc: "High precision 16000 DPI sensor."
    },
    {
        id: "h1",
        title: "Philips Air Fryer",
        image: "https://m.media-amazon.com/images/I/71y7B0qPLXL._AC_UY327_FMwebp_QL65_.jpg",
        price: 6499,
        canBargain: false, // Fixed
        affiliateLink: "https://www.amazon.in/dp/B097RV4P14?tag=dammaiprasad-21",
        desc: "Healthy cooking everyday."
    },
    {
        id: "p4", // Mapped to p1 logic
        title: "Leather Weekender Bag",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80",
        price: 8000,
        canBargain: true,
        desc: "Hand-stitched genuine leather."
    }
];

// DOM Elements
const grid = document.getElementById('bargainGrid');
const modal = document.getElementById('bargainModal');
const closeModal = document.getElementById('closeModal');
const chatWindow = document.getElementById('chatWindow');
const offerInput = document.getElementById('offerInput');
const sendBtn = document.getElementById('sendOfferBtn');

// State
let currentProduct = null;
let currentProductId = "p1"; // Default for backend

// 1. Render Grid
function renderGrid() {
    grid.innerHTML = products.map(product => `
        <div class="bargain-card glass-panel">
            <div class="card-img-wrapper">
                <img src="${product.image}" alt="${product.title}">
                ${product.canBargain ? '<span class="badge-live">🔴 Live Bargain</span>' : '<span class="badge-fixed">⚡ Fixed Price</span>'}
            </div>
            <div class="card-content">
                <h3>${product.title}</h3>
                <p class="card-price">₹${product.price.toLocaleString()}</p>
                <p class="card-desc">${product.desc}</p>
                
                ${product.canBargain
            ? `<button class="action-btn bargain-btn" onclick="openBargain('${product.id}')">Start Bargaining 🤖</button>`
            : `<a href="${product.affiliateLink}" target="_blank" class="action-btn amazon-btn">Buy on Amazon <i class="fas fa-external-link-alt"></i></a>`
        }
            </div>
        </div>
    `).join('');
}

// 2. Open Bargain Modal
window.openBargain = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    currentProduct = product;

    // For the backend, we only have "p1" configured for logic, so we'll re-use p1 logic 
    // but visually show the correct product.
    currentProductId = "p1";

    // Update Modal UI
    document.getElementById('modalImg').src = product.image;
    document.getElementById('modalTitle').innerText = product.title;
    document.getElementById('modalPrice').innerText = `₹${product.price.toLocaleString()}`;

    // Reset Chat
    chatWindow.innerHTML = '';
    addMessage(`Hello! I see you're interested in the <strong>${product.title}</strong>.<br>The asking price is ₹${product.price.toLocaleString()}. What's your offer?`, 'bot');

    // Show Modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
};

// 3. Close Modal
closeModal.addEventListener('click', () => {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
});

// Close on outside click
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
});

// 4. Chat Logic
function addMessage(text, sender) {
    const div = document.createElement('div');
    div.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    div.innerHTML = text;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function handleOffer() {
    const offer = parseFloat(offerInput.value);
    if (!offer || offer <= 0) return;

    addMessage(`I'm offering <strong>₹${offer}</strong>`, 'user');
    offerInput.value = '';

    // Backend Request
    fetch('http://localhost:3001/api/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: currentProductId, offerAmount: offer })
    })
        .then(response => response.json())
        .then(data => {
            const { status, message, counterOffer, finalPrice } = data;
            let reply = message;

            if (status === 'counter' && counterOffer) {
                reply += ` <br><strong>Counter Offer: ₹${counterOffer}</strong>`;
            } else if (status === 'accepted') {
                reply += ` <br><strong>Final Price: ₹${finalPrice}</strong> 🎉`;
                // Add Confetti or "Add to Cart" link here in real app
            }

            setTimeout(() => addMessage(reply, 'bot'), 600);
        })
        .catch(err => {
            console.error(err);
            addMessage("Connection error with the Bargain Bot.", 'bot');
        });
}

sendBtn.addEventListener('click', handleOffer);
offerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleOffer();
});

// Initialize
renderGrid();
