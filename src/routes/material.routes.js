const { Router } = require('express');
const { createMaterial, getMaterials, updateMaterial, deleteMaterial } = require('../controllers/material.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticateToken, authorizeRole(['teacher']));
router.route('/').post(createMaterial).get(getMaterials);
router.route('/:id').put(updateMaterial).delete(deleteMaterial);

module.exports = router;
