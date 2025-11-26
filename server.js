const dotenv = require('dotenv');

// Lê as variáveis do .env
dotenv.config();

// Importa a configuração do Express
const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});