// Local development runner for the API (Vercel does not use this file).
//   npm run api   ->  http://localhost:5000/api/contact
const app = require('./api/index.js');
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Contact API running on http://localhost:${PORT}`));
