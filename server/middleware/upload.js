import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config.js';
import { badRequest } from './error.js';

const coverDir = path.join(config.storageDir, 'covers');
const fileDir = path.join(config.storageDir, 'digital');
fs.mkdirSync(coverDir, { recursive: true });
fs.mkdirSync(fileDir, { recursive: true });

const safeName = (name) => `${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)}`;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, file.fieldname === 'cover' ? coverDir : fileDir),
  filename: (req, file, cb) => cb(null, safeName(file.originalname)),
});

const allowed = {
  cover: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'],
  file: ['application/pdf', 'application/epub+zip', 'application/x-pdf', 'application/octet-stream'],
};

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const list = allowed[file.fieldname] || [];
    if (list.length && !list.includes(file.mimetype)) {
      return cb(new badRequest(`Unsupported ${file.fieldname} type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

export const uploadCatalogFiles = upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

export const publicFilePath = (file) => {
  if (!file) return '';
  const folder = file.fieldname === 'cover' ? 'covers' : 'digital';
  return `/storage/${folder}/${file.filename}`;
};
