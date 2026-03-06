# Mintaro Development Guide

## Project Overview
Mintaro is a lightweight, zero-dependency WYSIWYG rich text editor. Two files (mintaro.js + mintaro.css) provide a complete editing experience comparable to TinyMCE or CKEditor.

## Key Files
- `mintaro.js` — Core editor class (~2,000 lines)
- `mintaro.css` — Complete styling with dark mode (~1,200 lines)
- `mintaro-test.php` — Working demo/test page
- `rewrite-api.php` — AI text rewrite endpoint (OpenAI/Claude)
- `mintaro-logo.png` — Logo asset

## Architecture
- Single `Mintaro` class, no build step, no dependencies
- `contentEditable` + `document.execCommand` for editing
- Custom modal/dropdown system (no browser prompt/alert)
- Selection save/restore pattern for dialog interactions
- Toolbar buttons: `data-command` for direct commands, `id` for built-in dialogs

## Button ID Map
| ID | Feature |
|----|---------|
| `link-btn` | Link dialog |
| `image-btn` | Image upload/URL |
| `video-btn` | Video embed |
| `table-btn` | Table grid picker |
| `emoji-btn` | Emoji picker (1,276 emojis, search) |
| `font-color-btn` | Font color |
| `bg-color-btn` | Highlight color |
| `formats-btn` | Heading/block dropdown |
| `font-family-btn` | Font family dropdown |
| `font-size-btn` | Font size dropdown |
| `find-replace-btn` | Find & replace bar |
| `html-source-btn` | HTML source editor |
| `fullscreen-btn` | Fullscreen toggle |
| `preview-btn` | Preview |
| `print-btn` | Print |
| `help-btn` | Help |
| `checklist-btn` | Checklist |
| `hr-btn` | Horizontal rule |
| `inline-code-btn` | Inline code |

## Code Conventions
- ES6 class syntax, but methods use `var` internally for broader compatibility
- No innerHTML with user-supplied data (XSS prevention)
- Paste sanitization strips event handlers, javascript: URLs, MSO styles
- All DOM building for dynamic content uses createElement
- CSS custom properties in :root for theming

## Testing
- Open mintaro-test.php in browser (requires web server with PHP)
- JS syntax check: `node -c mintaro.js`
- No automated test suite yet

## Repository
- GitHub: github.com/yodabytz/mintaro
- License: MIT
- Owner: yodabytz
