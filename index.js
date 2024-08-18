require("dotenv").config();
const express = require("express");
const multer = require("multer");
const multerS3 = require("multer-s3");
const aws = require("aws-sdk");

const app = express();

//lets configure the aws configuration
aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_ACCESS_SECRET,
  region: process.env.REGION_NAME,
});
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;
console.log(`Bucket ${BUCKET_NAME}`);
const s3 = new aws.S3();
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: BUCKET_NAME,
    // acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically set content type
    key: (req, file, cb) => {
      console.log("Uploading file:", file.originalname);
      cb(null, `${Date.now().toString()}-${file.originalname}`); // Unique filename
    },
  }),
});

app.get("/", (req, res) => {
  s3.listObjectsV2({ Bucket: BUCKET_NAME }, (err, data) => {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data);
    }
  });
  res.status(200).json({ message: "Welcome to AWS S3 Upload" });
});

//Upload file to AWS S3
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    res.status(200).json({ message: "file uploaded successfully" });
  } catch (err) {
    console.log("Failed to upload file", err.stack);
  }
});

//List file from AWS S3
app.get("/list", async (req, res, next) => {
  try {
    let r = await s3.listObjectsV2({ Bucket: BUCKET_NAME }).promise();
    let x = r.Contents.map((item) => item.Key);
    res.status(200).json(x);
  } catch (err) {
    console.log("Failed to list", err.stack);
    next(err);
  }
});

//Download file from AWS S3
app.get("/download:filename", async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const x = await s3
      .getObject({ Bucket: BUCKET_NAME, Key: filename })
      .promise();
    res.send(x.Body);
  } catch (err) {
    console.log("failed to dowload the file ", err.stack);
    next(err);
  }
});

//Delete file in S3
app.delete("/delete:filename", async (req, res, next) => {
  try {
    const filename = req.params.filename;
    await s3.deleteObject({ Bucket: BUCKET_NAME, Key: filename }).promise();
    console.log("Deleted file successfully");
    res.status(204).send("Deleted successfully");
  } catch (err) {
    console.log("Failed to delete the file", err.stack);
    next(err);
  }
});

//Handling Error Globally 404 OR 500
app.all("*", (req, res, next) => {
  const err = new Error(`Requested URL ${req.path} not found!`);
  err.statusCode = 404;
  next(err);
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.response?.status || 500;

  res.status(statusCode).json({
    success: 0,
    message: err?.message || "Internal Server Error",
  });
});

app.listen(3494, () => {
  console.log("Server is listening on port 3494");
});
