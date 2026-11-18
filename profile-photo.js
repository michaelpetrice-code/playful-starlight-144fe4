const maxSize = 12 * 1024 * 1024;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The photo couldn’t be read. Save a copy on your phone and select it again.'));
    reader.onabort = reader.onerror;
    reader.readAsDataURL(file);
  });
}

async function decodePhoto(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Some browsers decode additional image formats through an image element.
    }
  }

  const source = await readAsDataUrl(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('This photo couldn’t be opened. Choose a JPG, PNG or WebP, or take a screenshot of the photo and select that.'));
    image.src = source;
  });
}

export async function prepareProfilePhoto(file) {
  if (!file.size) throw new Error('This photo is empty or hasn’t downloaded. Save it to your phone and try again.');
  if (file.size > maxSize) throw new Error('Choose a photo under 12 MB.');
  if (/\.svgz?$/i.test(file.name || '') || file.type === 'image/svg+xml') {
    throw new Error('Choose a JPG, PNG or WebP photo.');
  }
  const image = await decodePhoto(file);
  try {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const side = Math.min(width, height);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 240;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context || !side) throw new Error('This photo couldn’t be prepared. Choose a JPG, PNG or WebP.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 240, 240);
    context.drawImage(image, (width - side) / 2, (height - side) / 2, side, side, 0, 0, 240, 240);
    const preview = canvas.toDataURL('image/jpeg', 0.82);
    if (!preview.startsWith('data:image/jpeg;base64,')) throw new Error('The photo couldn’t be converted to JPG.');
    const bytes = Uint8Array.from(atob(preview.split(',')[1]), character => character.charCodeAt(0));
    return { preview, blob: new Blob([bytes], { type: 'image/jpeg' }) };
  } finally {
    image.close?.();
  }
}
