import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadPath = path.join(__dirname, "../uploads/employees"); // src/uploads/employees

// const uploadPath = "uploads/employees"; // /uploads/employees

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());

    if (ext) {
      cb(null, true);
    } else {
      cb(new Error("Only images or pdf allowed"));
    }
  }
});

export const employeeDocsUpload = upload.fields([
  { name: "pan_card_image", maxCount: 1 },
  { name: "aadhar_front_image", maxCount: 1 },
  { name: "aadhar_back_image", maxCount: 1 },
  { name: "bank_passbook_image", maxCount: 1 },
  { name: "marksheet_10_image", maxCount: 1 },
  { name: "marksheet_12_image", maxCount: 1 },
  { name: "college_marksheet_image", maxCount: 1 },
]);