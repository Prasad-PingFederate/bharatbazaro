const dealsGrid = document.getElementById('dealsGrid');
const filterBtns = document.querySelectorAll('.filter-side-btn');

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const category = window.defaultCategory || urlParams.get('category') || 'all';

    // Update active button state
    filterBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });

    fetchDeals(category);
});

// Filter Logic
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        filterBtns.forEach(b => b.classList.remove('active'));
        // Add to clicked
        btn.classList.add('active');

        const category = btn.dataset.category;
        fetchDeals(category);
    });
});

async function fetchDeals(category = 'all') {
    dealsGrid.innerHTML = `
        <div class="loading-deals">
            <div class="spinner"></div>
            <p>Scanning top deals...</p>
        </div>
    `;

    // Timeout Promise to prevent infinite loading
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), 5000)
    );

    try {
        // Fetch from our backend with fallback
        const response = await Promise.race([
            fetch(`http://localhost:3001/api/deals?category=${category}`),
            timeout
        ]);

        const data = await response.json();

        if (response.ok && data.success) {
            renderDeals(data.deals);
        } else {
            throw new Error("API Error");
        }
    } catch (err) {
        console.warn("Backend fetch failed, using fallback data:", err);
        // Fallback to static data so the user sees SOMETHING
        renderFallbackDeals(category);
    }
}

function renderDeals(deals) {
    if (deals.length === 0) {
        dealsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: white;">No deals found in this category.</p>';
        return;
    }

    dealsGrid.innerHTML = deals.map(deal => `
        <article class="deal-card">
            ${deal.discount ? `<div class="t-badge">-${deal.discount}%</div>` : ''}
            <img src="${deal.image}" alt="${deal.title}" class="card-image">
            <div class="card-content">
                <h3 class="card-title">${deal.title}</h3>
                <div class="card-rating">
                    ${renderStars(deal.rating)} <span style="color:var(--text-muted); font-size:0.8rem">(${deal.reviews})</span>
                </div>
                <div class="price-row">
                    <span class="current-price">₹${deal.price.toLocaleString()}</span>
                    ${deal.originalPrice ? `<span class="old-price">₹${deal.originalPrice.toLocaleString()}</span>` : ''}
                </div>
                <a href="${deal.affiliateLink}" target="_blank" class="deal-btn">
                    View on Amazon <i class="fas fa-external-link-alt"></i>
                </a>
            </div>
        </article>
    `).join('');
}

function renderFallbackDeals(category) {
    // Hardcoded list for when server is unreachable
    let fallbackDeals = [
        {
            title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
            image: "https://m.media-amazon.com/images/I/51SKmu2G9FL._AC_UF1000,1000_QL80_.jpg",
            price: 24990,
            originalPrice: 29990,
            discount: 17,
            rating: 4.5,
            reviews: 1205,
            category: "tech",
            affiliateLink: "https://www.amazon.in/dp/B09XS7JWHH?tag=YOUR_TAG_HERE"
        },
        {
            title: "Apple iPhone 15 (128 GB) - Black",
            image: "https://m.media-amazon.com/images/I/71657TiFeHL._SX679_.jpg",
            price: 72999,
            originalPrice: 79900,
            discount: 9,
            rating: 4.8,
            reviews: 5043,
            category: "tech",
            affiliateLink: "https://www.amazon.in/dp/B0BDK62PDX?tag=YOUR_TAG_HERE"
        },
        {
            title: "Echo Dot (5th Gen) | Smart speaker with Alexa",
            image: "https://m.media-amazon.com/images/I/61WR+9t3OoL._AC_UY327_FMwebp_QL65_.jpg",
            price: 4999,
            originalPrice: 5499,
            discount: 10,
            rating: 4.3,
            reviews: 890,
            category: "tech",
            affiliateLink: "https://www.amazon.in/dp/B09B8VFJ65?tag=YOUR_TAG_HERE"
        },
        {
            title: "Men's Slim Fit Casual Shirt",
            image: "https://m.media-amazon.com/images/I/61hv7K72bZL._AC_UL480_FMwebp_QL65_.jpg",
            price: 699,
            originalPrice: 1499,
            discount: 53,
            rating: 4.0,
            reviews: 230,
            category: "fashion",
            affiliateLink: "https://amazon.in/your-affiliate-link"
        },
        {
            title: "Philips Air Fryer HD9200/90",
            image: "https://m.media-amazon.com/images/I/71y7B0qPLXL._AC_UY327_FMwebp_QL65_.jpg",
            price: 6499,
            originalPrice: 9999,
            discount: 35,
            rating: 4.6,
            reviews: 3400,
            category: "home",
            affiliateLink: "https://amazon.in/your-affiliate-link"
        }
    ];

    if (category && category !== 'all') {
        fallbackDeals = fallbackDeals.filter(d => d.category === category);
    }

    renderDeals(fallbackDeals);
}

function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i - 0.5 <= rating) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}
