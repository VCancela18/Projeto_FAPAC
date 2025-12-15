// src/controllers/AirtableController.js

const { AIRTABLE_API_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;

const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

exports.getMaterials = async (req, res, next) => {
    try {
        const response = await fetch(AIRTABLE_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`Airtable API failed: ${response.status} - ${errorText}`);
            error.status = response.status;
            throw error;
        }

        const data = await response.json();

        const materials = data.records.map(record => {
            const f = record.fields;

            return {
                id: record.id,
                name: f['Nome do Material'] || null,
                description: f['Descrição'] || null,
                category: f['Categoria'] || null,

                // fotos
                photoUrl: Array.isArray(f['Foto do Material'])
                    ? f['Foto do Material'][0]?.thumbnails?.small?.url || null
                    : null,

                // fornecedor
                supplier: Array.isArray(f['Nome do Utilizador'])
                    ? f['Nome do Utilizador'][0]
                    : f['Nome do Utilizador'] || null,

                // parâmetros técnicos
                technical: f['Parâmetros Técnicos'] || null,
                technicalSummary: f['Parâmetros Técnicos Resumidos (AI)']?.value || null,

                // sugestão de aplicação
                suggestedUse: f['Sugestão de Aplicação (AI)']?.value || null,

                // datas
                createdAt: f['Data de Adição'] || null,
                updatedAt: f['Última Modificação'] || null,

                // fallback BIM ID
                bimId: f['BIM_ID'] || record.id
            };
        });

        res.json({
            ok: true,
            count: materials.length,
            data: materials
        });

    } catch (error) {
        next(error);
    }
};
