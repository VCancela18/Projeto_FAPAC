const Airtable = require('airtable');

const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_TOKEN
});

const base = airtable.base(process.env.AIRTABLE_BASE_ID);

const TABELA_MATERIAIS = 'Materiais';

const getMateriais = async () => {
  try {
    const records = await base(TABELA_MATERIAIS).select().all();
    return records.map(record => ({
      id: record.id,
      ...record.fields
    }));
  } catch (error) {
    console.error('Erro ao buscar materiais:', error);
    throw error;
  }
};

const getMaterialById = async (id) => {
  try {
    const record = await base(TABELA_MATERIAIS).find(id);
    return {
      id: record.id,
      ...record.fields
    };
  } catch (error) {
    console.error('Erro ao buscar material:', error);
    throw error;
  }
};

module.exports = {
  getMateriais,
  getMaterialById
};
