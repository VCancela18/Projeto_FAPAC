require('dotenv').config();

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`;
const HEADERS = {
    'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
    'Content-Type': 'application/json'
};

// LER MATERIAIS (GET)
exports.getMateriais = async (req, res) => {
    try {
        const response = await fetch(AIRTABLE_API_URL, { headers: HEADERS });
        const data = await response.json();

        if (!response.ok) {
            console.error("Erro Airtable:", data);
            return res.status(response.status).json({ error: data });
        }

        res.json(data.records);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao conectar ao Airtable' });
    }
};

// CRIAR MATERIAL (POST)
exports.createMaterial = async (req, res) => {
    try {
        // Recebe os dados do Frontend
        const { name, category, brand, price, supplier, description, techParams } = req.body;

        // Prepara o corpo para o Airtable (Mapeamento de colunas)
        // ATENÇÃO: Os nomes à esquerda têm de ser IGUAIS às colunas no Airtable
        const recordData = {
            fields: {
                "Nome do Material": name,
                "Categoria": category,
                "Marca": brand,
                "Preço": parseFloat(price) || 0,
                "Fornecedor": supplier,
                "Descrição": description,
                "Parâmetros Técnicos": techParams // A coluna nova que pediste
            }
        };

        const response = await fetch(AIRTABLE_API_URL, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(recordData)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Erro ao criar:", data);
            return res.status(response.status).json({ error: data });
        }

        res.json(data); // Devolve o material criado com o ID novo
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar material' });
    }
};

// APAGAR MATERIAL (DELETE)
exports.deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const deleteUrl = `${AIRTABLE_API_URL}/${id}`;

        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: HEADERS
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data });
        }

        res.json({ message: 'Apagado com sucesso', id: data.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao apagar material' });
    }
};