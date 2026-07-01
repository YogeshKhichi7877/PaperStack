# 📚 PaperStack | IIIT Surat Archive

PaperStack is a modern, centralized archive for IIIT Surat students to access previous year exam papers, track exam statistics, and discuss academic resources.

## ✨ Features
* **Funky Branding:** Modern UI with teal-theme gradients.
* **Secure Access:** Restricted to `@iiitsurat.ac.in` email IDs.
* **Analytics:** Visualized exam difficulty levels using Recharts.
* **Discussion Hub:** Real-time comments on specific papers.

## 🛠️ Tech Stack
* **Frontend:** React.js, Recharts, CSS3 |||| Uploaded at versel 
* **Backend:** Node.js, Express.js |||| uploaded at render 
* **Database:** MongoDB ||| uploaded at mongoDB atlas 

## Local Auth Setup Notes

Create `client/.env` from `client/.env.example` and set `REACT_APP_GOOGLE_CLIENT_ID` to a Google Cloud Web OAuth client ID ending with `.apps.googleusercontent.com`.

Create `server/.env` from `server/.env.example` and set the matching `GOOGLE_CLIENT_ID`, `JWT_SECRET`, and `MONGODB_URI`.

Create React App only reads environment variables when the dev server starts. Restart `npm start` in `client` after changing any `REACT_APP_` value.
