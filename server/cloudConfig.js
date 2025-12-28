const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

// 1. Configure with your dashboard details
cloudinary.config({
    cloud_name:'dioehptuo',
    api_key:'918583146159685',
    api_secret:'opP8RW_dQNhe9AQcYB8bA_bNhWU'
});

// 2. Configure Storage Settings
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'iiit_surat_archive', 
        allowedFormats: ['png', 'jpg', 'jpeg', 'pdf'],
        resource_type: 'auto'
    },
});

module.exports = { cloudinary ,storage };