# How to Manage Affiliate Deals

I've set up a **Deals Dashboard** (in JSON format) for you to easily manage your affiliate products.

**Important:** For security reasons, I do NOT access your Amazon account. You simply paste your own affiliate links into the system.

## 1. Where to Add Deals
Open the file: `backend/data/deals.json`

You will see a list of products like this:
```json
{
    "id": 1,
    "title": "Sony Headphones",
    "image": "https://image-url...",
    "price": 24990,
    "originalPrice": 29990,
    "discount": 17,
    "rating": 4.5,
    "reviews": 1205,
    "category": "tech",
    "affiliateLink": "https://www.amazon.in/dp/...?tag=YOUR_TAG_HERE" 
}
```

## 2. Steps to Add a New Deal
1. Go to Amazon Associates, find a product, and get your **Text Link** (e.g., `amzn.to/xyz` or full URL).
2. Add a new block to `deals.json`.
3. Paste the link into `"affiliateLink"`.
4. Update the `image`, `title`, and `price`.
5. Save the file.

## 3. Reloading
The website will automatically show the new deals when you refresh the page. You do not need to restart the server if you are just editing the JSON file (since the server reads it on every request).

## 4. Categories
Currently supported categories in the UI:
- `tech`
- `fashion`
- `home`

You can add more, but you'll need to update `deals.html` to add a new filter button.
