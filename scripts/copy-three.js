const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '../node_modules/three/build');
const destDir = path.join(__dirname, '../client/vendor/three');

if (!fs.existsSync(buildDir)) {
  console.error('three is not installed. Run: npm install three');
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });

const files = ['three.module.js', 'three.core.js'];

for (const file of files) {
  const src = path.join(buildDir, file);
  if (!fs.existsSync(src)) {
    console.error(`Missing ${file} in three/build`);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(destDir, file));
}

console.log('Copied Three.js modules to client/vendor/three');
