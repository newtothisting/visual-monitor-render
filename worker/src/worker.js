const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const pixelmatch = require('pixelmatch');
const { PNG } = require('pngjs');

const S3_BUCKET = process.env.S3_BUCKET;
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION || 'us-east-1';

const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT || undefined,
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
  forcePathStyle: !!process.env.S3_FORCE_PATH_STYLE
});

async function upload(bucket, key, buffer, contentType) {
  if (!bucket) return;
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }));
}

async function takeScreenshot(url, destPath) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.screenshot({ path: destPath, fullPage: true });
  await browser.close();
}

function readPng(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG())
      .on('parsed', function () { resolve(this); })
      .on('error', reject);
  });
}

async function compareAndUpload(oldPath, newPath, diffPath) {
  const img1 = await readPng(oldPath);
  const img2 = await readPng(newPath);
  if (img1.width !== img2.width || img1.height !== img2.height) {
    // simple resize strategy: overwrite baseline if size changed
    fs.copyFileSync(newPath, oldPath);
    return 0;
  }
  const { width, height } = img1;
  const diff = new PNG({ width, height });
  const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
  await new Promise((res) => diff.pack().pipe(fs.createWriteStream(diffPath)).on('finish', res));
  await upload(S3_BUCKET, path.basename(oldPath), fs.readFileSync(oldPath), 'image/png');
  await upload(S3_BUCKET, path.basename(newPath), fs.readFileSync(newPath), 'image/png');
  await upload(S3_BUCKET, path.basename(diffPath), fs.readFileSync(diffPath), 'image/png');
  return numDiffPixels / (width * height);
}

(async () => {
  try {
    const url = process.env.TEST_URL || 'https://example.com';
    const tmpDir = '/tmp/visual-monitor';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const oldP = path.join(tmpDir, 'baseline.png');
    const newP = path.join(tmpDir, 'latest.png');
    const diffP = path.join(tmpDir, 'diff.png');

    if (!fs.existsSync(oldP)) {
      console.log('Baseline missing — creating baseline');
      await takeScreenshot(url, oldP);
      await upload(S3_BUCKET, 'baseline.png', fs.readFileSync(oldP), 'image/png');
      console.log('Baseline created');
      process.exit(0);
    }

    await takeScreenshot(url, newP);
    const percent = await compareAndUpload(oldP, newP, diffP);
    console.log('Percent changed:', percent);
    if (percent > 0.02) {
      console.log('Change detected — send email / enqueue event');
    } else {
      console.log('No significant change');
    }
    process.exit(0);
  } catch (err) {
    console.error('Worker error:', err);
    process.exit(1);
  }
})();
