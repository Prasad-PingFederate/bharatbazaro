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
    // Extensive list of Hot Deals mimicking a real sale event
    let fallbackDeals = [
        // Mobiles
        {
            title: "Apple iPhone 15 (128 GB) - Black",
            image: "https://m.media-amazon.com/images/I/71657TiFeHL._SX679_.jpg",
            price: 72999,
            originalPrice: 79900,
            discount: 9,
            rating: 4.8,
            reviews: 5043,
            category: "mobiles",
            affiliateLink: "https://www.amazon.in/dp/B0BDK62PDX?tag=dammaiprasad-21"
        },
        {
            title: "OnePlus 12R (Cool Blue, 8GB RAM, 128GB Storage)",
            image: "https://m.media-amazon.com/images/I/717Qo4MH97L._SX679_.jpg",
            price: 39999,
            originalPrice: 42999,
            discount: 7,
            rating: 4.5,
            reviews: 3200,
            category: "mobiles",
            affiliateLink: "https://www.amazon.in/dp/B0BSNP4668?tag=dammaiprasad-21"
        },
        {
            title: "Samsung Galaxy M34 5G",
            image: "https://m.media-amazon.com/images/I/91ItZJh1FDL._SX679_.jpg",
            price: 15999,
            originalPrice: 24499,
            discount: 35,
            rating: 4.2,
            reviews: 15000,
            category: "mobiles",
            affiliateLink: "https://www.amazon.in/dp/B0C788D792?tag=dammaiprasad-21"
        },

        // Electronics
        {
            title: "Sony WH-1000XM5 Noise Cancelling Headphones",
            image: "https://m.media-amazon.com/images/I/51SKmu2G9FL._AC_UF1000,1000_QL80_.jpg",
            price: 24990,
            originalPrice: 29990,
            discount: 17,
            rating: 4.5,
            reviews: 1205,
            category: "electronics",
            affiliateLink: "https://www.amazon.in/dp/B09XS7JWHH?tag=dammaiprasad-21"
        },
        {
            title: "Dell 15 Laptop, Intel Core i5",
            image: "https://m.media-amazon.com/images/I/51jPUwqqt6L._SX679_.jpg",
            price: 46990,
            originalPrice: 66000,
            discount: 29,
            rating: 4.1,
            reviews: 500,
            category: "electronics",
            affiliateLink: "https://www.amazon.in/dp/B0HBWK9B31?tag=dammaiprasad-21"
        },
        {
            title: "Echo Dot (5th Gen) | Smart speaker",
            image: "https://m.media-amazon.com/images/I/61WR+9t3OoL._AC_UY327_FMwebp_QL65_.jpg",
            price: 4999,
            originalPrice: 5499,
            discount: 10,
            rating: 4.4,
            reviews: 8090,
            category: "electronics",
            affiliateLink: "https://www.amazon.in/dp/B09B8VFJ65?tag=dammaiprasad-21"
        },

        // Fashion
        {
            title: "Men's Slim Fit Casual Shirt",
            image: "https://m.media-amazon.com/images/I/61hv7K72bZL._AC_UL480_FMwebp_QL65_.jpg",
            price: 699,
            originalPrice: 1499,
            discount: 53,
