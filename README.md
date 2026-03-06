<p align="center">
  <img src="mintaro-logo.png" alt="Mintaro" height="80">
</p>

<h1 align="center">Mintaro</h1>

<p align="center">
  <strong>A full-featured, zero-dependency WYSIWYG editor.</strong><br>
  Clean. Fast. Free. Just two files.
</p>

<p align="center">
  <a href="#features">Features</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#quick-start">Quick Start</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#toolbar-reference">Toolbar</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#api">API</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#configuration">Config</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="Zero Dependencies">
  <img src="https://img.shields.io/badge/size-~30KB-blue" alt="~30KB">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License">
  <img src="https://img.shields.io/badge/emojis-1%2C276-orange" alt="1,276 Emojis">
</p>

---

## Why Mintaro?

Most rich text editors are either bloated frameworks with hundreds of dependencies, or stripped-down toys that can't handle real content. Mintaro sits in the sweet spot:

- **Two files** — `mintaro.js` + `mintaro.css`. Drop them in. Done.
- **Zero dependencies** — No jQuery, no React, no Node, no build step.
- **30+ features** — Everything you'd expect from a professional editor.
- **~30KB total** — Smaller than most hero images.
- **Just works** — One constructor call and you have a full editor.

---

## Features

### Text Formatting
Bold, italic, underline, strikethrough, superscript, subscript, font color, background highlight, font family, font size

### Block Formatting
Headings (H1–H6), paragraph, preformatted, blockquote, inline code

### Lists & Structure
Bullet lists, numbered lists, interactive checklists, indentation, horizontal rules

### Rich Content
- **Links** — Insert/edit with URL and target options
- **Images** — URL insertion, drag-and-drop, file upload, inline resize/align toolbar
- **Tables** — Visual grid picker (8x8), add/delete rows and columns, tab navigation
- **Video Embeds** — YouTube, Vimeo, Twitter/X, Instagram auto-detection
- **Emoji Picker** — 1,276 emojis across 11 categories with instant search

### Editing Tools
- **Find & Replace** — Inline bar with match highlighting
- **HTML Source Editor** — Direct HTML editing with syntax formatting
- **Undo/Redo** — Deep history (configurable depth)
- **Clear Formatting** — Strip all styles in one click

### Productivity
- **Autosave** — Saves to localStorage, restores on reload
- **Fullscreen Mode** — Distraction-free writing
- **Preview** — See rendered output in a clean window
- **Print** — Print-optimized output
- **Export** — Download content as an HTML file
- **Keyboard Shortcuts** — Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K, Ctrl+H, Ctrl+S, Ctrl+Z, Ctrl+Y

### Statistics
Live word count, character count, paragraph count, image count, link count, estimated reading time

### Design
- Professional toolbar with grouped SVG icons
- Light and dark mode
- Fully responsive (mobile-friendly)
- Print stylesheet
- Paste sanitization (strips Word junk, prevents XSS)

---

## Quick Start

### 1. Include the files

```html
<link rel="stylesheet" href="mintaro.css">
<script src="mintaro.js"></script>
```

### 2. Add the HTML

```html
<div class="mintaro-container">
  <div class="mintaro-toolbar" id="mintaro-toolbar">

    <div class="mintaro-toolbar-group">
      <button class="mintaro-button" data-command="bold" title="Bold"><strong>B</strong></button>
      <button class="mintaro-button" data-command="italic" title="Italic"><em>I</em></button>
      <button class="mintaro-button" data-command="underline" title="Underline"><u>U</u></button>
    </div>

    <div class="mintaro-toolbar-separator"></div>

    <div class="mintaro-toolbar-group">
      <button class="mintaro-button" id="link-btn" title="Link">Link</button>
      <button class="mintaro-button" id="image-btn" title="Image">Image</button>
      <button class="mintaro-button" id="emoji-btn" title="Emoji">Emoji</button>
      <button class="mintaro-button" id="table-btn" title="Table">Table</button>
    </div>

  </div>

  <div id="mintaro-editor"></div>
</div>
```

### 3. Initialize

```javascript
var editor = new Mintaro({
    containerId: 'mintaro-editor',
    toolbarId: 'mintaro-toolbar',
    height: '400px',
    placeholder: 'Start writing...',
    onSave: function(data) {
        console.log('Content saved:', data.html);
    }
});
```

That's it. You have a full editor.

---

## Toolbar Reference

Mintaro uses two types of toolbar buttons:

### Command Buttons

Add `data-command` to execute standard editing commands directly:

```html
<button class="mintaro-button" data-command="bold">B</button>
<button class="mintaro-button" data-command="italic">I</button>
<button class="mintaro-button" data-command="insertUnorderedList">List</button>
<button class="mintaro-button" data-command="justifyCenter">Center</button>
```

Available commands: `bold`, `italic`, `underline`, `strikethrough`, `superscript`, `subscript`, `insertUnorderedList`, `insertOrderedList`, `justifyLeft`, `justifyCenter`, `justifyRight`, `indent`, `outdent`, `undo`, `redo`, `removeFormat`

### Dialog Buttons

Add a specific `id` to trigger built-in dialogs and pickers:

| Button ID | Opens |
|-----------|-------|
| `formats-btn` | Heading / block format dropdown |
| `font-family-btn` | Font family selector |
| `font-size-btn` | Font size selector |
| `font-color-btn` | Font color picker with swatches |
| `bg-color-btn` | Background highlight picker |
| `link-btn` | Link insertion dialog |
| `image-btn` | Image insertion (URL / upload / drag-drop) |
| `video-btn` | Video embed (YouTube, Vimeo, Twitter, Instagram) |
| `table-btn` | Visual table grid picker |
| `emoji-btn` | Emoji picker with search (1,276 emojis) |
| `checklist-btn` | Interactive checklist |
| `hr-btn` | Horizontal rule |
| `inline-code-btn` | Inline code formatting |
| `find-replace-btn` | Find and replace bar |
| `html-source-btn` | HTML source code editor |
| `fullscreen-btn` | Fullscreen toggle |
| `preview-btn` | Content preview |
| `print-btn` | Print content |
| `help-btn` | Keyboard shortcuts help |

### Grouping & Separators

Wrap related buttons in groups, separated by vertical dividers:

```html
<div class="mintaro-toolbar-group">
  <!-- related buttons here -->
</div>
<div class="mintaro-toolbar-separator"></div>
```

You only need to include the buttons you want. The toolbar is fully customizable.

---

## API

### Getting Content

```javascript
editor.getHTML();           // Returns HTML string
editor.getText();           // Returns plain text
editor.getStatistics();     // Returns { words, characters, paragraphs, images, links, readingTime }
```

### Setting Content

```javascript
editor.setContent('<p>Hello world</p>', true);  // Set HTML content
editor.clear();                                  // Clear editor
```

### Saving & Exporting

```javascript
editor.save();                          // Triggers onSave callback
editor.exportAsHTML('article.html');     // Downloads as HTML file
```

### Form Integration

```html
<form method="POST" action="/save.php">
    <input type="hidden" name="content" id="content-field">

    <div class="mintaro-container">
        <div class="mintaro-toolbar" id="mintaro-toolbar">
            <!-- buttons -->
        </div>
        <div id="mintaro-editor"></div>
    </div>

    <button type="submit" onclick="document.getElementById('content-field').value = editor.getHTML();">
        Publish
    </button>
</form>
```

### Table Operations

```javascript
editor.insertTableRow('after');     // Add row below cursor
editor.insertTableRow('before');    // Add row above cursor
editor.deleteTableRow();            // Delete current row
editor.insertTableColumn('after');  // Add column right
editor.deleteTableColumn();         // Delete current column
editor.deleteTable();               // Remove entire table
```

### Programmatic Commands

```javascript
editor.undo();
editor.redo();
editor.toggleFullscreen();
editor.openFindReplaceBar();
editor.openHTMLSourceEditor();
editor.openPreview();
editor.printContent();
editor.destroy();               // Clean up and remove editor
```

---

## Configuration

```javascript
var editor = new Mintaro({
    containerId: 'mintaro-editor',         // Editor element ID
    toolbarId: 'mintaro-toolbar',          // Toolbar element ID
    height: '500px',                       // Minimum editor height
    placeholder: 'Start writing...',       // Placeholder text
    autosave: true,                        // Enable localStorage autosave
    autosaveInterval: 30000,               // Autosave interval in ms (default: 30s)
    autosaveKey: 'mintaro_autosave',        // localStorage key
    maxHistory: 100,                       // Undo/redo stack depth
    uploadUrl: '/api/upload-image',        // Server endpoint for image uploads
    onSave: function(data) { },            // Called on save (data.html, data.text)
    onChange: function() { }               // Called on any content change
});
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+B | Bold |
| Ctrl+I | Italic |
| Ctrl+U | Underline |
| Ctrl+K | Insert link |
| Ctrl+H | Find & replace |
| Ctrl+S | Save |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Tab | Indent / next table cell |
| Shift+Tab | Outdent / previous table cell |

---

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome / Edge | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| iOS Safari | 14+ |
| Chrome Android | 90+ |

---

## File Sizes

| File | Raw | Gzipped |
|------|-----|---------|
| mintaro.js | ~65 KB | ~18 KB |
| mintaro.css | ~27 KB | ~5 KB |
| **Total** | **~92 KB** | **~23 KB** |

---

## License

[MIT](LICENSE) — Use it however you want.
