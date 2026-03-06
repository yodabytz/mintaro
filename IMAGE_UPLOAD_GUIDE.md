# Mintaro Editor - Image Upload & Resize Guide

## 🖼️ Complete Image Management System

Mintaro now includes professional image upload, embedding, and resizing capabilities - making it perfect for sports journalism, blog articles, and content-rich publications.

---

## Quick Start

### Drag & Drop Upload
1. Find an image on your computer
2. Drag it directly into the editor
3. The editor area will highlight in mint green
4. Drop the image - it appears instantly!

### Click to Upload
1. Click the **⬆** button in the toolbar
2. Select an image file from your computer
3. Image inserts at the cursor position

### Resize an Image
1. Click on the image you want to resize
2. Press **Ctrl+Shift+R**
3. Enter a width value (e.g., `50` for 50%)
4. Click OK - image resizes automatically

---

## Features

### 1. Drag & Drop Upload ⭐

**What it does:**
- Drag any image from your file explorer directly into the editor
- Automatically embeds the image as base64 data
- Multiple images can be dragged at once
- Visual feedback: mint green highlight when dragging

**Supported Formats:**
- JPEG / JPG
- PNG
- GIF (animated GIFs work too!)
- WebP
- SVG
- Any browser-supported image format

**How it works:**
```
1. Start dragging image
2. Editor background turns mint green
3. Drop image
4. FileReader API converts to base64
5. Image embeds in editor with styling
```

**Base64 Embedding:**
Images are converted to base64 data URLs, which means:
- ✅ No server upload needed
- ✅ Images stay with the content
- ✅ Works offline
- ⚠️ Makes HTML larger (embed images wisely)

### 2. Click Upload Button ⭐

Located in the Media group of the toolbar:
- **🔗** Insert Link
- **🖼** Insert Image from URL
- **⬆** Upload Image (NEW!)

**How it works:**
```javascript
editor.pickImageFile();
```

Opens a native file picker dialog where you can select one image at a time.

### 3. Image Resizing ⭐

**Resize any uploaded or URL image:**
- Keyboard shortcut: **Ctrl+Shift+R**
- Set width as percentage: 25%, 50%, 75%, 100%
- Height automatically maintains aspect ratio
- Supports both percentage and pixel values

**Example usage:**
```javascript
// Programmatic resize
editor.resizeImage(75, '%');  // 75% width
editor.resizeImage(600, 'px'); // 600 pixels width
```

**How to resize:**
1. Click on an image in the editor
2. Press **Ctrl+Shift+R**
3. Enter width: `50` (for 50%)
4. Click OK
5. Image instantly resizes

### 4. Automatic Image Styling ⭐

All uploaded images automatically receive:
```css
max-width: 100%;      /* Responsive - never breaks layout */
height: auto;         /* Maintains aspect ratio */
margin: 12px 0;       /* Spacing above/below */
border-radius: 6px;   /* Rounded corners */
```

This ensures images always look good and fit responsively.

---

## API Reference

### Image Upload Methods

```javascript
// Open file picker for manual upload
editor.pickImageFile();

// Handle image file (from drag/drop or manual selection)
editor.handleImageUpload(file);

// Insert image from base64 data
editor.insertImageFromBase64(base64Data, filename);
// Example:
editor.insertImageFromBase64('data:image/png;base64,...', 'photo.png');
```

### Image Resizing

```javascript
// Resize image by percentage
editor.resizeImage(50, '%');   // 50% width

// Resize image by pixels
editor.resizeImage(600, 'px'); // 600px width

// Default is percentage
editor.resizeImage(75);         // Same as resizeImage(75, '%')
```

### Image Statistics

```javascript
const stats = editor.getImageStats();
// Returns:
// {
//   count: 2,                    // Number of images
//   images: [
//     {
//       src: "data:image/png...", // Full data URL (truncated in output)
//       alt: "photo.jpg",         // Filename as alt text
//       width: 800,               // Current width in pixels
//       height: 600               // Current height in pixels
//     }
//   ]
// }
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+U` | Underline |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+H` | Find & Replace |
| `Ctrl+Shift+R` | Resize selected image |
| `Tab` | Indent |
| `Shift+Tab` | Outdent |

---

## Technical Details

### Drag & Drop Implementation

```javascript
// When user drags over editor
dragover event → editor.style.backgroundColor = 'mint green'

// When user drags away
dragleave event → editor.style.backgroundColor = 'white'

// When user drops
drop event →
  1. Prevent default browser behavior
  2. Get files from dataTransfer
  3. Filter for images only
  4. Read each file as base64
  5. Insert into editor
```

### Base64 Conversion

Uses the **FileReader API** to convert images:
```javascript
const reader = new FileReader();
reader.readAsDataURL(file);  // Converts to data:image/...
reader.onload = (e) => {
    const base64 = e.target.result;
    // Insert into editor
};
```

### Image Sizing

```javascript
// Find image in DOM
const img = container.querySelector('img');

// Set width style
img.style.width = `${value}${unit}`;  // e.g., "50%"

// Height auto maintains aspect ratio
img.style.height = 'auto';

// Save state for undo/redo
editor.saveState();
```

---

## Use Cases

### Sports Journalism (FightPulse)
```
1. Write article about a fight
2. Drag fighter photos into editor
3. Resize to 75% for featured image
4. Drag fight video thumbnail
5. Resize other images to 50%
6. Publish with complete formatting
```

### Product Description
```
1. Type product title and description
2. Drag product image
3. Resize to 100% for main product photo
4. Drag additional angles (resize to 40%)
5. Add pricing and details
6. Save article
```

### Blog Post with Gallery
```
1. Write blog introduction
2. Drag image 1
3. Type caption
4. Drag image 2 (resize to 50% for side-by-side)
5. Type more text
6. Continue with more images
7. Publish complete article
```

---

## File Size Considerations

Since images are embedded as base64:
- Small image (100KB) → ~133KB base64
- Medium image (500KB) → ~666KB base64
- Large image (2MB) → ~2.6MB base64

**Tips:**
- Resize images before uploading (smaller files)
- Use compression tools for better quality/size ratio
- Consider linking to hosted images for very large files
- For image galleries, embed thumbnails instead of originals

---

## Browser Compatibility

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+
✅ Mobile browsers (iOS Safari, Chrome Android)

All modern browsers support:
- Drag & Drop API
- FileReader API
- contenteditable
- Base64 encoding

---

## Troubleshooting

### Image won't drag and drop
- Make sure you're dragging an image file
- Try clicking the ⬆ button instead
- Check browser is recent version

### Image doesn't appear after upload
- Check browser console for errors
- Make sure file is a valid image
- Try uploading a different image format

### Resize not working
- Click on the image first
- Make sure you're pressing Ctrl+Shift+R (exact combination)
- Enter a number without symbols (just "50", not "50%")

### Images look blurry after resize
- You resized a small image to larger size
- Solution: Use higher quality original image
- Aspect ratio is maintained, so quality depends on original

---

## Advanced Tips

### Programmatic Upload
```javascript
// Create a file from a URL and upload
fetch('https://example.com/image.jpg')
  .then(r => r.blob())
  .then(blob => {
    const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
    editor.handleImageUpload(file);
  });
```

### Bulk Image Insert
```javascript
// Create file inputs for multiple images
const files = [file1, file2, file3];
files.forEach(file => {
  editor.handleImageUpload(file);
});
```

### Get Image Count for Statistics
```javascript
const stats = editor.getImageStats();
console.log(`Article contains ${stats.count} images`);

// Show all image info
stats.images.forEach(img => {
  console.log(`${img.alt}: ${img.width}x${img.height}`);
});
```

---

## Related Features

- **Smart Embed** - Insert YouTube, Twitter, Instagram, Vimeo videos
- **Table Editor** - Create tables for image galleries or comparisons
- **Image Resize** - Adjust image dimensions
- **Statistics** - Shows image count in real-time
- **Undo/Redo** - Goes back if you make a mistake

---

## Version Info

- **Feature Added:** Version 2.1
- **File:** mintaro.js (776 lines)
- **Test Page:** https://www.fightpulse.net/mintaro-test.php

---

## Next Features Coming Soon

- Image cropping
- Image filter effects
- Image compression before embedding
- Image library/gallery management
- Responsive image srcset support
