// encode-private-key.cjs

const fs = require('fs');
const path = require('path');

// Replace with your actual path or paste the key directly as a string
const privateKeyPath = path.resolve(__dirname, 'firebase-private-key.pem');

try {
  const key = fs.readFileSync(privateKeyPath, 'utf8');
  const base64 = Buffer.from(key).toString('base64');
  console.log('\n✅ Base64-encoded FIREBASE_PRIVATE_KEY:\n');
  console.log(`FIREBASE_PRIVATE_KEY_BASE64=${base64}\n`);
} catch (err) {
  console.error('❌ Failed to read or encode private key:', err.message);
}
