// src/controllers/AirtableController.js

const fetch = global.fetch || require('node-fetch');
const { AIRTABLE_API_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME = 'Materiais' } = process.env;

if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID) {
  console.error('Missing AIRTABLE_API_TOKEN or AIRTABLE_BASE_ID in .env');
}

const makeUrl = (path = '') => `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}${path}`;

const commonHeaders = {
  'Authorization': `Bearer ${AIRTABLE_API_TOKEN}`,
  'Content-Type': 'application/json'
};

exports.getMateriais = async (req, res, next) => {
  try {
    if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID) {
      return res.status(500).json({ error: 'Missing Airtable credentials' });
    }

    const response = await fetch(makeUrl(), { method: 'GET', headers: commonHeaders });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    const materials = (data.records || []).map(r => ({ id: r.id, ...r.fields }));
    res.json({ ok: true, count: materials.length, data: materials });
  } catch (err) {
    next(err);
  }
};

exports.getMaterialById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing id param' });

    if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID) {
      return res.status(500).json({ error: 'Missing Airtable credentials' });
    }

    const response = await fetch(makeUrl(`/${id}`), { method: 'GET', headers: commonHeaders });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const record = await response.json();
    res.json({ ok: true, data: { id: record.id, ...record.fields } });
  } catch (err) {
    next(err);
  }
};