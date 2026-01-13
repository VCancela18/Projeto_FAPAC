const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Storage configuration - save uploads to public/uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', 'public', 'uploads'));
  },
  filename: function (req, file, cb) {
    // Keep original name but prefix with timestamp to avoid collisions
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9\.\-_]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  }
});

// Only accept .ifc files
function fileFilter (req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.ifc') {
    cb(null, true);
  } else {
    cb(new Error('Only .ifc files are allowed'), false);
  }
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 200 * 1024 * 1024 } }); // up to 200MB

// Serve the viewer page
router.get('/ifc-viewer', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'html', 'ifc.html'));
});

// Upload endpoint
router.post('/api/ifc/upload', upload.single('ifcFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: 'No file uploaded or invalid file type' });
  }

  // Return URL that can be used by the frontend to load the model
  const url = `/uploads/${req.file.filename}`;
  res.json({ ok: true, url });
});

module.exports = router;
