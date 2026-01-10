import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure folder exists
const uploadDir = "src/uploads/bank-qr";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      "QR-" + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// File filter (image only)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const uploadBankQR = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
});

export default uploadBankQR;
