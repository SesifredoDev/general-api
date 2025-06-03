const User = require('../models/userModel');
const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
const { createCanvas } = require('canvas');
const { JSDOM } = require('jsdom');
const gl = require('gl');

// Simulate window & document for Three.js
const { window } = new JSDOM();
global.window = window;
global.document = window.document;

const width = 512;
const height = 512;

let context;
try {
  context = require('gl')(width, height, { preserveDrawingBuffer: true });
  if (!context) throw new Error('Failed to create WebGL context');
} catch (e) {
  console.error('WebGL context creation failed:', e);
  throw e;
}

const renderer = new THREE.WebGLRenderer({ context });

async function renderHeadshot(avatarURL, outputPath) {
  const width = 512;
  const height = 512;

  const context = gl(width, height, { preserveDrawingBuffer: true });

  const renderer = new THREE.WebGLRenderer({ context });
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0); // transparent background

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
  camera.position.set(0, 1.5, 2);
  camera.lookAt(0, 1.5, 0);

  // Lighting (same as in your Angular viewer)
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  hemiLight.position.set(0, 2, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xfff0e0, 2.0);
  dirLight.position.set(1, 1, -2);
  scene.add(dirLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const backLight = new THREE.DirectionalLight(0xffffff, 1.0);
  backLight.position.set(0, 2, -6);
  scene.add(backLight);

  // Load model
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) =>
    loader.load(avatarURL, resolve, undefined, reject)
  );

  const avatar = gltf.scene;
  avatar.position.set(0, 0.25, 0);
  avatar.scale.set(1.25, 1.25, 1.25);
  avatar.rotation.y = Math.PI; // Face the camera

  scene.add(avatar);

  // Render
  renderer.render(scene, camera);

  // Get pixel buffer
  const pixels = new Uint8Array(width * height * 4);
  renderer.readRenderTargetPixels(renderer.getRenderTarget(), 0, 0, width, height, pixels);

  // Draw to canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);

  // Flip Y-axis and copy pixels
  for (let y = 0; y < height; y++) {
    const row = height - y - 1;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const j = (row * width + x) * 4;
      imageData.data[i] = pixels[j];
      imageData.data[i + 1] = pixels[j + 1];
      imageData.data[i + 2] = pixels[j + 2];
      imageData.data[i + 3] = pixels[j + 3];
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Save to file or base64
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  return buffer.toString('base64');
}
exports.updateAvatar = async (req, res) => {
  const { avatarURL, id } = req.body;

  if (!avatarURL.includes("readyplayer.me")) {
    return res.status(400).json({ message: 'Invalid Avatar URL' });
  }

  try {
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.avatar = avatarURL;

    // Render headshot
    const headshotBase64 = await renderHeadshot(avatarURL, `./tmp/headshot-${id}.png`);
    user.icon = `data:image/png;base64,${headshotBase64}`;

    await user.save();
    res.status(200).json({ message: 'Avatar updated with headshot', avatar: user.avatar, icon: user.icon });

  } catch (err) {
    console.error('Error updating avatar:', err);
    res.status(500).json({ message: 'Server error during avatar render' });
  }
};
