let canvas;
let currentMode = 'select';
let history = [];
let historyIndex = -1;
let isDrawing = false;
let startPoint = null;
let currentShape = null;
let croppingRect = null;
let blurFilter = new fabric.Image.filters.Blur({
  blur: 0.1
});

// Initialize the editor
window.onload = function() {
  canvas = new fabric.Canvas('canvas', {
    selection: true,
    selectionColor: 'rgba(100, 100, 255, 0.3)',
    selectionBorderColor: 'blue',
    selectionLineWidth: 1,
    preserveObjectStacking: true
  });

  // Load the screenshot from Chrome storage
  chrome.storage.local.get(['screenshot'], (result) => {
    if (result.screenshot) {
      loadImage(result.screenshot);
    } else {
      // For testing outside Chrome extension
      loadImage('https://via.placeholder.com/800x600');
    }
  });

  // Set up event listeners
  setupEventListeners();
  updateToolButtons();
  saveState();
};

function loadImage(src) {
  fabric.Image.fromURL(src, function(img) {
    canvas.setWidth(img.width);
    canvas.setHeight(img.height);
    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
      originX: 'left',
      originY: 'top',
      left: 0,
      top: 0
    });
    updateImageSize();
  });
}

function setupEventListeners() {
  // Tool buttons
  document.getElementById('select-btn').addEventListener('click', () => setMode('select'));
  document.getElementById('draw-btn').addEventListener('click', () => setMode('draw'));
  document.getElementById('arrow-btn').addEventListener('click', () => setMode('arrow'));
  document.getElementById('rect-btn').addEventListener('click', () => setMode('rectangle'));
  document.getElementById('circle-btn').addEventListener('click', () => setMode('circle'));
  document.getElementById('line-btn').addEventListener('click', () => setMode('line'));
  document.getElementById('text-btn').addEventListener('click', () => addText());
  document.getElementById('highlight-btn').addEventListener('click', () => setMode('highlight'));
  document.getElementById('blur-btn').addEventListener('click', () => setMode('blur'));
  document.getElementById('crop-btn').addEventListener('click', () => toggleCrop());
  document.getElementById('share-btn').addEventListener('click', () => generateShareLink());
  
  // Action buttons
  document.getElementById('undo-btn').addEventListener('click', undo);
  document.getElementById('redo-btn').addEventListener('click', redo);
  document.getElementById('clear-btn').addEventListener('click', clearCanvas);
  document.getElementById('save-btn').addEventListener('click', downloadImage);
  document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
  
  // Tool controls
  document.getElementById('color-picker').addEventListener('change', (e) => updateBrushColor(e.target.value));
  document.getElementById('brush-size').addEventListener('input', (e) => updateBrushSize(e.target.value));
  
  // Canvas events
  canvas.on('mouse:move', function(options) {
    const pointer = canvas.getPointer(options.e);
    document.getElementById('cursor-position').textContent = 
      `${Math.round(pointer.x)}, ${Math.round(pointer.y)}`;
    
    if (currentMode === 'blur' && isDrawing) {
      updateBlurArea(pointer);
    }
  });

  canvas.on('mouse:down', function(options) {
    
    if (currentMode === 'select' || currentMode === 'text') return;
    
    const pointer = canvas.getPointer(options.e);
    startPoint = pointer;
    isDrawing = true;
    
    switch(currentMode) {
      case 'rectangle':
        drawRectangle(pointer);
        break;
      case 'circle':
        drawCircle(pointer);
        break;
      case 'line':
      case 'arrow':
        drawLine(pointer);
        break;
      case 'blur':
        startBlurArea(pointer);
        break;
    }
  });

  canvas.on('mouse:up', function() {
    if (isDrawing && currentShape) {
      saveState();
    }
    isDrawing = false;
    startPoint = null;
    currentShape = null;
  });

  canvas.on('mouse:move', function(options) {
    if (!isDrawing || !startPoint) return;
    
    const pointer = canvas.getPointer(options.e);
    
    switch(currentMode) {
      case 'rectangle':
        updateRectangle(pointer);
        break;
      case 'circle':
        updateCircle(pointer);
        break;
      case 'line':
      case 'arrow':
        updateLine(pointer);
        break;
    }
  });

  // Text editing events
  canvas.on('text:editing:exited', function() {
    saveState();
    setMode('select');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.key === 'v') setMode('select');
    if (e.key === 'd') setMode('draw');
    if (e.key === 'a') setMode('arrow');
    if (e.key === 'r') setMode('rectangle');
    if (e.key === 'c') setMode('circle');
    if (e.key === 'l') setMode('line');
    if (e.key === 't') addText();
    if (e.key === 'h') setMode('highlight');
    if (e.key === 'b') setMode('blur');
    if (e.key === 'x') toggleCrop();
    
    if (e.ctrlKey) {
      if (e.key === 'z') undo();
      if (e.key === 'y') redo();
      if (e.key === 's') {
        e.preventDefault();
        downloadImage();
      }
      if (e.key === 'c') copyToClipboard();
    }
    
    if (e.key === 'Delete') {
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects && activeObjects.length > 0) {
        canvas.remove(...activeObjects);
        saveState();
      }
    }
  });
}

// Tool mode functions
function setMode(mode) {
  currentMode = mode;
  canvas.isDrawingMode = (mode === 'draw' || mode === 'highlight');
  
  if (mode === 'draw') {
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = document.getElementById('color-picker').value;
    canvas.freeDrawingBrush.width = parseInt(document.getElementById('brush-size').value);
  } 
  else if (mode === 'highlight') {
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = 'rgba(255, 255, 0, 0.5)';
    canvas.freeDrawingBrush.width = 15;
  }
  
  updateToolButtons();
  
  // Cancel any ongoing crop operation
  if (mode !== 'crop' && croppingRect) {
    canvas.remove(croppingRect);
    croppingRect = null;
  }
}

function updateToolButtons() {
  // Reset all buttons
  document.querySelectorAll('#toolbar button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Activate current mode button
  const activeButton = document.getElementById(`${currentMode}-btn`);
  if (activeButton) {
    activeButton.classList.add('active');
  }
}

// Drawing functions
function drawRectangle(pointer) {
  currentShape = new fabric.Rect({
    left: pointer.x,
    top: pointer.y,
    width: 1,
    height: 1,
    fill: 'transparent',
    stroke: document.getElementById('color-picker').value,
    strokeWidth: parseInt(document.getElementById('brush-size').value),
    selectable: false
  });
  canvas.add(currentShape);
}

function updateRectangle(pointer) {
  if (!currentShape) return;
  
  currentShape.set({
    width: Math.abs(pointer.x - startPoint.x),
    height: Math.abs(pointer.y - startPoint.y),
    left: Math.min(pointer.x, startPoint.x),
    top: Math.min(pointer.y, startPoint.y)
  });
  canvas.renderAll();
}

function drawCircle(pointer) {
  currentShape = new fabric.Ellipse({
    left: pointer.x,
    top: pointer.y,
    rx: 1,
    ry: 1,
    fill: 'transparent',
    stroke: document.getElementById('color-picker').value,
    strokeWidth: parseInt(document.getElementById('brush-size').value),
    selectable: false
  });
  canvas.add(currentShape);
}

function updateCircle(pointer) {
  if (!currentShape) return;
  
  const radiusX = Math.abs(pointer.x - startPoint.x) / 2;
  const radiusY = Math.abs(pointer.y - startPoint.y) / 2;
  
  currentShape.set({
    rx: radiusX,
    ry: radiusY,
    left: startPoint.x,
    top: startPoint.y,
    originX: 'center',
    originY: 'center'
  });
  canvas.renderAll();
}

function drawLine(pointer) {
  currentShape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
    stroke: document.getElementById('color-picker').value,
    strokeWidth: parseInt(document.getElementById('brush-size').value),
    selectable: false
  });
  
  if (currentMode === 'arrow') {
    currentShape.strokeLineCap = 'round';
    currentShape.strokeLineJoin = 'round';
    // Add arrowhead (we'll update it in updateLine)
  }
  
  canvas.add(currentShape);
}

function updateLine(pointer) {
  if (!currentShape) return;
  
  currentShape.set({
    x2: pointer.x,
    y2: pointer.y
  });
  
  if (currentMode === 'arrow') {
    // Remove existing arrowhead if it exists
    if (currentShape.arrow) {
      canvas.remove(currentShape.arrow);
    }
    
    // Calculate angle for arrowhead
    const angle = Math.atan2(pointer.y - startPoint.y, pointer.x - startPoint.x) * 180 / Math.PI;
    const size = parseInt(document.getElementById('brush-size').value) * 3;
    
    // Create arrowhead
    const arrow = new fabric.Triangle({
      left: pointer.x,
      top: pointer.y,
      width: size,
      height: size,
      fill: document.getElementById('color-picker').value,
      angle: angle,
      originX: 'center',
      originY: 'center',
      selectable: false
    });
    
    canvas.add(arrow);
    currentShape.arrow = arrow;
  }
  
  canvas.renderAll();
}

// Text functions
function addText() {
  const text = new fabric.IText('Type here', {
    left: 50,
    top: 50,
    fill: document.getElementById('color-picker').value,
    fontSize: 24,
    fontFamily: 'Arial',
    hasControls: true
  });

  canvas.add(text);
  canvas.setActiveObject(text);
  text.enterEditing();
  text.selectAll();
  setMode('select');
}

// Crop functions
function toggleCrop() {
  if (croppingRect) {
    applyCrop();
  } else {
    startCrop();
  }
}

function startCrop() {
  const width = canvas.width;
  const height = canvas.height;
  
  croppingRect = new fabric.Rect({
    left: width * 0.1,
    top: height * 0.1,
    width: width * 0.8,
    height: height * 0.8,
    fill: 'rgba(0,0,0,0)',
    stroke: 'white',
    strokeWidth: 1,
    hasBorders: true,
    hasControls: true,
    lockRotation: true,
    lockScalingFlip: true
  });
  
  canvas.add(croppingRect);
  croppingRect.bringToFront();
  canvas.setActiveObject(croppingRect);
  setMode('crop');
}

function applyCrop() {
  if (!croppingRect) return;
  
  const { left, top, width, height } = croppingRect;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  
  tempCtx.drawImage(
    canvas.lowerCanvasEl,
    left, top, width, height,
    0, 0, width, height
  );
  
  fabric.Image.fromURL(tempCanvas.toDataURL(), function(img) {
    canvas.clear();
    canvas.setWidth(width);
    canvas.setHeight(height);
    canvas.setBackgroundImage(img, () => {
      canvas.renderAll();
      updateImageSize();
      saveState();
    }, {
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top'
    });
    
    croppingRect = null;
    setMode('select');
  });
}

// Share function
async function generateShareLink() {
  const shareBtn = document.getElementById('share-btn');
  try {
    // Show loading state
    shareBtn.disabled = true;
    shareBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sharing...';

    // Convert canvas to blob
    const dataURL = canvas.toDataURL({ format: 'png', quality: 0.8 });
    const blob = await (await fetch(dataURL)).blob();
    
    // Create form data
    const formData = new FormData();
    formData.append('image', blob, `screenshot_${Date.now()}.png`);

    // Upload to your local WAMP server
    const response = await fetch('http://192.168.1.143/RCV/upload.php', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed with status: ' + response.status);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Upload failed');
    }

    // Create shareable link
    const shareableLink = `http://192.168.1.143/RCV/${result.filename}`;

    // Copy to clipboard
    await navigator.clipboard.writeText(shareableLink);
    
  } catch (err) {
    console.error('Error generating share link:', err);
    alert('Failed to share image: ' + err.message);
  } finally {
    // Reset button state
    if (shareBtn) {
      shareBtn.disabled = false;
      shareBtn.innerHTML = '<i class="fas fa-share"></i> Share';
    }
  }
}

// Blur functions
function startBlurArea(pointer) {
  isDrawing = true;
  startPoint = pointer;
  
  // Create a rectangle for the blur area
  currentShape = new fabric.Rect({
    left: pointer.x,
    top: pointer.y,
    width: 1,
    height: 1,
    fill: 'rgba(0,0,0,0.8)',
    filter: blur(6),
    selectable: false
  });
  canvas.add(currentShape);
}

function updateBlurArea(pointer) {
  if (!currentShape) return;
  
  currentShape.set({
    width: Math.abs(pointer.x - startPoint.x),
    height: Math.abs(pointer.y - startPoint.y),
    left: Math.min(pointer.x, startPoint.x),
    top: Math.min(pointer.y, startPoint.y)
  });
  canvas.renderAll();
}

function applyBlur() {
  if (!currentShape) return;
  
  const bgImage = canvas.backgroundImage;
  if (!bgImage) return;
  
  // Get the blur area coordinates
  const blurArea = {
    left: currentShape.left,
    top: currentShape.top,
    width: currentShape.width,
    height: currentShape.height
  };
  
  // Create a new canvas for the blurred region
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = blurArea.width;
  tempCanvas.height = blurArea.height;
  const tempCtx = tempCanvas.getContext('2d');
  
  // Draw the background image region to the temp canvas
  tempCtx.drawImage(
    canvas.backgroundImage.getElement(),
    blurArea.left, blurArea.top, blurArea.width, blurArea.height,
    0, 0, blurArea.width, blurArea.height
  );
  
  // Apply blur to the temp canvas
  const imageData = tempCtx.getImageData(0, 0, blurArea.width, blurArea.height);
  const blurredData = applyBlurToImageData(imageData);
  tempCtx.putImageData(blurredData, 0, 0);
  
  // Create a fabric image from the blurred region
  fabric.Image.fromURL(tempCanvas.toDataURL(), function(img) {
    img.set({
      left: blurArea.left,
      top: blurArea.top,
      selectable: false
    });
    
    // Add the blurred image to canvas
    canvas.add(img);
    canvas.remove(currentShape);
    currentShape = null;
    isDrawing = false;
    saveState();
  });
}

function applyBlurToImageData(imageData) {
  // Simple box blur implementation
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const radius = 5;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const i = (ny * width + nx) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }
      }
      
      const i = (y * width + x) * 4;
      data[i] = r / count;
      data[i + 1] = g / count;
      data[i + 2] = b / count;
    }
  }
  
  return imageData;
}

// Crop functions
function cropImage() {
  if (croppingRect) {
    canvas.remove(croppingRect);
    croppingRect = null;
    return;
  }
  
  const width = canvas.width;
  const height = canvas.height;
  
  croppingRect = new fabric.Rect({
    left: width * 0.1,
    top: height * 0.1,
    width: width * 0.8,
    height: height * 0.8,
    fill: 'rgba(0,0,0,0.3)',
    stroke: 'white',
    strokeWidth: 1,
    hasBorders: true,
    hasControls: true,
    lockRotation: true,
    lockScalingFlip: true
  });
  
  canvas.add(croppingRect);
  croppingRect.bringToFront();
  canvas.setActiveObject(croppingRect);
}

function applyCrop() {
  if (!croppingRect) return;
  
  const { left, top, width, height } = croppingRect;
  
  // Create a new canvas with the cropped dimensions
  const dataURL = canvas.toDataURL({
    left: left,
    top: top,
    width: width,
    height: height,
    format: 'png'
  });
  
  // Reload the image with cropped dimensions
  fabric.Image.fromURL(dataURL, function(img) {
    canvas.clear();
    canvas.setWidth(width);
    canvas.setHeight(height);
    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top'
    });
    
    croppingRect = null;
    updateImageSize();
    saveState();
  });
}

// History functions
function saveState() {
  // Remove any states after current index (for redo)
  history = history.slice(0, historyIndex + 1);
  
  // Save current canvas state
  history.push(JSON.stringify(canvas));
  historyIndex++;
  
  // Limit history size
  if (history.length > 50) {
    history.shift();
    historyIndex--;
  }
}

function undo() {
  if (historyIndex <= 0) return;
  
  historyIndex--;
  loadState(history[historyIndex]);
}

function redo() {
  if (historyIndex >= history.length - 1) return;
  
  historyIndex++;
  loadState(history[historyIndex]);
}

function loadState(state) {
  canvas.clear();
  canvas.loadFromJSON(state, function() {
    canvas.renderAll();
    updateImageSize();
  });
}

function clearCanvas() {
  if (confirm('Are you sure you want to clear the canvas?')) {
    canvas.clear();
      loadImage(canvas.backgroundImage.src);
      saveState();
    
  }
}

// Export functions
function downloadImage() {
  const dataURL = canvas.toDataURL({
    format: 'png',
    quality: 1
  });
  
  const link = document.createElement('a');
  link.download = 'screenshot-' + new Date().toISOString().slice(0, 10) + '.png';
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function copyToClipboard() {
  try {
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1
    });
    
    const blob = await (await fetch(dataURL)).blob();
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    
    alert('Image copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy image: ', err);
    alert('Failed to copy image to clipboard');
  }
}

// Utility functions
function updateBrushColor(color) {
  document.getElementById('current-color').style.backgroundColor = color;
  
  if (currentMode === 'draw') {
    canvas.freeDrawingBrush.color = color;
  }
}

function updateBrushSize(size) {
  document.getElementById('brush-size-value').textContent = size + 'px';
  
  if (currentMode === 'draw' || currentMode === 'highlight') {
    canvas.freeDrawingBrush.width = parseInt(size);
  }
}

function updateImageSize() {
  document.getElementById('image-size').textContent = 
    `${canvas.width} x ${canvas.height} px`;
}