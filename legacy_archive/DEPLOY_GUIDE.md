# Deployment Guide for BharatBazaro

You have successfully added the **Bargain Feature** and **Signup Validation**. Since I cannot directly push to your GitHub, follow these steps to deploy the changes yourself.

## 1. Locate the Files
All the new code is located on your computer at:
`C:\Users\Infobell\.gemini\antigravity\scratch\bharatbazaro`

You will see two folders:
- `frontend/` (Contains HTML, CSS, JS for the website)
- `backend/` (Contains the Node.js server for bargaining and signup APIs)

## 2. Copy to Your Local Repository
1. Open your existing local git repository for `bharatbazaro`.
   - If you don't have it locally, run: `git clone https://github.com/Prasad-PingFederate/bharatbazaro.git`
2. **Copy the contents** of the `scratch/bharatbazaro/frontend` folder into your repository's root folder.
   - Replace `index.html` (or separate it if you want to keep the old home page).
   - Add `signup.html`, `signup.js`, `style.css`, `app.js`.
3. (Optional) If you want to host the backend, copy the `backend` folder as well. Note that GitHub Pages only hosts static sites (HTML/CSS/JS). If you want the API to work on the live site, you need to deploy the `backend` to a service like Render, Heroku, or Vercel.
   - **For now:** The frontend is configured to talk to `http://localhost:3001`. You will need to update the `fetch` URLs in `app.js` and `signup.js` to your production backend URL once deployed.

## 3. Push to GitHub
Open your terminal (PowerShell or Command Prompt) in your repository folder and run:
```bash
git add .
git commit -m "Added Bargain feature and Signup validation"
git push origin main
```

## 4. Usage
- **Run Backend:**
  ```bash
  cd backend
  npm install
  node server.js
  ```
- **Visit Site:** Open `http://localhost:3001` (The backend serves the frontend files).

## Features Added
- **Premium Bargaining UI:** Glassmorphism design, real-time interactive bot.
- **Signup Validation:**
  - Checks for empty fields.
  - Validates email format.
  - Validates password length.
  - Shakes the button on error ❌.
  - Shows success overlay on valid completion 🎉.
