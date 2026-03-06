/**
 * Mintaro - Professional Rich Text Editor
 * A lightweight, dependency-free WYSIWYG editor
 * Built for FightPulse story publishing
 */

class Mintaro {
    constructor(config = {}) {
        this.config = {
            containerId: config.containerId || 'mintaro-editor',
            toolbarId: config.toolbarId || 'mintaro-toolbar',
            previewId: config.previewId || 'mintaro-preview',
            height: config.height || '500px',
            placeholder: config.placeholder || 'Start writing your story...',
            enablePreview: config.enablePreview !== false,
            autosave: config.autosave !== false,
            autosaveInterval: config.autosaveInterval || 30000,
            autosaveKey: config.autosaveKey || 'mintaro_autosave',
            maxHistory: config.maxHistory || 100,
            onSave: config.onSave || null,
            onChange: config.onChange || null,
            uploadUrl: config.uploadUrl || null,
            ...config
        };

        this.editor = null;
        this.toolbar = null;
        this.container = null;
        this.preview = null;
        this.history = [];
        this.historyIndex = -1;
        this.isComposing = false;
        this.saveStateTimeout = null;
        this.lastSavedState = null;
        this.lastKeyWasEnter = false;
        this.savedSelection = null;
        this.autosaveTimer = null;
        this.isFullscreen = false;
        this.activeDropdown = null;
        this.isDirty = false;

        this.init();
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    init() {
        this.editor = document.getElementById(this.config.containerId);
        this.toolbar = document.getElementById(this.config.toolbarId);
        if (this.config.enablePreview) {
            this.preview = document.getElementById(this.config.previewId);
        }

        if (!this.editor) {
            console.error('Mintaro: Container not found');
            return;
        }

        this.container = this.editor.closest('.mintaro-container');

        // Setup editor
        this.editor.contentEditable = true;
        this.editor.spellcheck = true;
        this.editor.style.minHeight = this.config.height;
        this.editor.className = 'mintaro-editor-content';
        this.editor.setAttribute('data-placeholder', this.config.placeholder);
        this.editor.setAttribute('role', 'textbox');
        this.editor.setAttribute('aria-multiline', 'true');
        this.editor.setAttribute('aria-label', 'Rich text editor');

        if (this.toolbar) this.setupToolbar();

        this.setupImageUpload();
        this.setupImageResizeHandles();
        this.attachEventListeners();
        this.saveState();

        if (this.config.autosave) {
            this.restoreAutosave();
            this.startAutosave();
        }

        document.addEventListener('click', (e) => {
            if (this.activeDropdown && !e.target.closest('.mintaro-dropdown')) {
                this.closeDropdowns();
            }
        });

        console.log('Mintaro editor initialized');
    }

    // ========================================
    // TOOLBAR SETUP
    // ========================================

    setupToolbar() {
        const buttons = this.toolbar.querySelectorAll('[data-command]');
        buttons.forEach(button => {
            const command = button.dataset.command;
            const value = button.dataset.value || null;

            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.restoreSelection();
                this.executeCommand(command, value);
                this.editor.focus();
            });
        });

        this.setupSpecialButtons();

        document.addEventListener('selectionchange', () => {
            if (document.activeElement === this.editor || this.editor.contains(document.activeElement)) {
                this.updateButtonStates();
            }
        });
    }

    setupSpecialButtons() {
        const handlers = {
            'formats-btn': () => this.openFormatsDropdown(),
            'font-color-btn': () => this.openColorPicker('foreColor', 'Font Color'),
            'bg-color-btn': () => this.openColorPicker('backColor', 'Background Color'),
            'font-family-btn': () => this.openFontFamilyDropdown(),
            'font-size-btn': () => this.openFontSizeDropdown(),
            'line-height-btn': () => this.openLineHeightDropdown(),
            'checklist-btn': () => this.insertChecklist(),
            'inline-code-btn': () => { this.wrapSelectionWithTag('code'); },
            'link-btn': () => this.openLinkDialog(),
            'image-btn': () => this.openImageDialog(),
            'upload-btn': () => this.openImageUploadDialog(),
            'video-btn': () => this.openVideoEmbedDialog(),
            'table-btn': () => this.openTableDialog(),
            'emoji-btn': () => this.openEmojiPicker(),
            'html-source-btn': () => this.openHTMLSourceEditor(),
            'fullscreen-btn': () => this.toggleFullscreen(),
            'print-btn': () => this.printContent(),
            'help-btn': () => this.showHelp(),
            'hr-btn': () => { document.execCommand('insertHorizontalRule'); this.saveState(); },
            'find-replace-btn': () => this.openFindReplaceBar(),
            'preview-btn': () => this.openPreview(),
        };

        Object.entries(handlers).forEach(([id, handler]) => {
            const btn = this.toolbar.querySelector('#' + id);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.saveSelection();
                    handler();
                });
            }
        });
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================

    attachEventListeners() {
        this.editor.addEventListener('input', () => {
            if (!this.isComposing) {
                this.isDirty = true;
                this.updatePreview();
                this.updateWordCount();
                this.debouncedSaveState();
                if (typeof this.config.onChange === 'function') {
                    this.config.onChange(this.getHTML());
                }
            }
        });

        this.editor.addEventListener('compositionstart', () => { this.isComposing = true; });
        this.editor.addEventListener('compositionend', () => {
            this.isComposing = false;
            this.saveState();
            this.updatePreview();
            this.updateWordCount();
        });

        this.editor.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
            this.handleBlockElementExit(e);
            this.handleTabKey(e);
        });

        this.editor.addEventListener('paste', (e) => {
            e.preventDefault();
            this.handlePaste(e);
        });

        const updatePlaceholder = () => {
            if (this.editor.textContent.trim() === '' && !this.editor.querySelector('img')) {
                this.editor.classList.add('placeholder-active');
            } else {
                this.editor.classList.remove('placeholder-active');
            }
        };
        this.editor.addEventListener('focus', updatePlaceholder);
        this.editor.addEventListener('blur', updatePlaceholder);
        this.editor.addEventListener('input', updatePlaceholder);

        this.editor.addEventListener('mouseup', () => this.saveSelection());
        this.editor.addEventListener('keyup', () => this.saveSelection());

        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) { e.preventDefault(); e.returnValue = ''; }
        });
    }

    // ========================================
    // KEYBOARD SHORTCUTS
    // ========================================

    handleKeyboardShortcuts(e) {
        if (!e.ctrlKey && !e.metaKey) return;

        const key = e.key.toLowerCase();

        if (e.shiftKey) {
            if (key === 'z') { e.preventDefault(); this.redo(); return; }
            if (key === 'x') { e.preventDefault(); document.execCommand('strikethrough'); this.saveState(); return; }
            return;
        }

        const shortcuts = {
            'b': () => { document.execCommand('bold'); this.saveState(); },
            'i': () => { document.execCommand('italic'); this.saveState(); },
            'u': () => { document.execCommand('underline'); this.saveState(); },
            's': () => { this.save(); },
            'k': () => { this.saveSelection(); this.openLinkDialog(); },
            'h': () => { this.openFindReplaceBar(); },
            'y': () => { this.redo(); },
        };

        if (key === 'z') { e.preventDefault(); this.undo(); return; }

        if (shortcuts[key]) {
            e.preventDefault();
            shortcuts[key]();
        }
    }

    handleTabKey(e) {
        if (e.key !== 'Tab') return;

        const listItem = this.getClosestBlock('li');
        if (listItem) {
            e.preventDefault();
            document.execCommand(e.shiftKey ? 'outdent' : 'indent');
            this.saveState();
            return;
        }

        const cell = this.getClosestBlock('td') || this.getClosestBlock('th');
        if (cell) {
            e.preventDefault();
            const nextCell = e.shiftKey ? this.getPreviousCell(cell) : this.getNextCell(cell);
            if (nextCell) this.selectCellContents(nextCell);
            return;
        }
    }

    handleBlockElementExit(e) {
        const blockElements = ['blockquote', 'pre', 'code'];
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        let node = selection.getRangeAt(0).commonAncestorContainer;
        while (node && node !== this.editor) {
            if (blockElements.includes(node.nodeName.toLowerCase())) break;
            node = node.parentNode;
        }

        if (node && node !== this.editor && blockElements.includes(node.nodeName.toLowerCase())) {
            if ((e.ctrlKey && e.key === 'Enter') || (e.key === 'Enter' && this.lastKeyWasEnter)) {
                e.preventDefault();
                const newP = document.createElement('p');
                newP.innerHTML = '<br>';
                node.parentNode.insertBefore(newP, node.nextSibling);
                const range = document.createRange();
                range.setStart(newP, 0);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                this.saveState();
                this.lastKeyWasEnter = false;
            } else if (e.key === 'Enter') {
                this.lastKeyWasEnter = true;
                setTimeout(() => { this.lastKeyWasEnter = false; }, 500);
            }
        } else {
            this.lastKeyWasEnter = false;
        }
    }

    // ========================================
    // SELECTION MANAGEMENT
    // ========================================

    saveSelection() {
        const sel = window.getSelection();
        if (sel.rangeCount > 0 && this.editor.contains(sel.anchorNode)) {
            this.savedSelection = sel.getRangeAt(0).cloneRange();
        }
    }

    restoreSelection() {
        if (this.savedSelection) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            try { sel.addRange(this.savedSelection); } catch (e) {}
        }
        this.editor.focus();
    }

    getSelectedText() {
        return window.getSelection().toString();
    }

    getClosestBlock(tagName) {
        const sel = window.getSelection();
        if (!sel.rangeCount) return null;
        let node = sel.getRangeAt(0).commonAncestorContainer;
        while (node && node !== this.editor) {
            if (node.nodeName && node.nodeName.toLowerCase() === tagName) return node;
            node = node.parentNode;
        }
        return null;
    }

    // ========================================
    // COMMAND EXECUTION
    // ========================================

    executeCommand(command, value = null) {
        if (command === 'save') { this.save(); return; }
        if (command === 'undo') { this.undo(); return; }
        if (command === 'redo') { this.redo(); return; }

        document.execCommand(command, false, value);
        this.saveState();
        this.updatePreview();
    }

    wrapSelectionWithTag(tagName) {
        this.restoreSelection();
        const sel = window.getSelection();
        if (!sel.rangeCount || !sel.toString()) return;
        const range = sel.getRangeAt(0);
        const el = document.createElement(tagName);
        try { range.surroundContents(el); } catch (e) {
            const contents = range.extractContents();
            el.appendChild(contents);
            range.insertNode(el);
        }
        this.saveState();
    }

    // ========================================
    // PASTE HANDLING
    // ========================================

    handlePaste(e) {
        const clipboardData = e.clipboardData;
        const items = clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                if (file) { this.handleImageUpload(file); return; }
            }
        }

        let html = clipboardData.getData('text/html');
        if (html) {
            html = this.cleanPastedHTML(html);
            document.execCommand('insertHTML', false, html);
        } else {
            document.execCommand('insertText', false, clipboardData.getData('text/plain'));
        }
        this.saveState();
    }

    cleanPastedHTML(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        temp.querySelectorAll('script, style, iframe, object, embed, form, input, textarea, select, button, meta, link').forEach(el => el.remove());

        temp.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                const name = attr.name.toLowerCase();
                if (name.startsWith('on') || name === 'srcdoc' || name === 'data-bind') {
                    el.removeAttribute(attr.name);
                }
                if (['href', 'src', 'action'].includes(name)) {
                    const val = attr.value.toLowerCase().trim();
                    if (val.startsWith('javascript:') || val.startsWith('vbscript:') || val.startsWith('data:text/html')) {
                        el.removeAttribute(attr.name);
                    }
                }
            });

            if (el.className && typeof el.className === 'string') {
                el.className = el.className.replace(/Mso\w+/g, '').trim();
                if (!el.className) el.removeAttribute('class');
            }

            if (el.getAttribute('style')) {
                const cleaned = el.getAttribute('style').replace(/mso-[^;]+;?/gi, '').trim();
                if (cleaned) el.setAttribute('style', cleaned);
                else el.removeAttribute('style');
            }
        });

        temp.querySelectorAll('span').forEach(span => {
            if (!span.getAttribute('style') && !span.className) {
                span.replaceWith(...span.childNodes);
            }
        });

        return temp.innerHTML;
    }

    // ========================================
    // UNDO / REDO
    // ========================================

    debouncedSaveState() {
        clearTimeout(this.saveStateTimeout);
        this.saveStateTimeout = setTimeout(() => this.saveState(), 300);
    }

    saveState() {
        const currentState = this.editor.innerHTML;
        if (this.lastSavedState === currentState) return;
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(currentState);
        this.historyIndex++;
        this.lastSavedState = currentState;
        if (this.history.length > this.config.maxHistory) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.editor.innerHTML = this.history[this.historyIndex];
            this.lastSavedState = this.history[this.historyIndex];
            this.updatePreview();
            this.updateWordCount();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.editor.innerHTML = this.history[this.historyIndex];
            this.lastSavedState = this.history[this.historyIndex];
            this.updatePreview();
            this.updateWordCount();
        }
    }

    // ========================================
    // AUTOSAVE
    // ========================================

    startAutosave() {
        this.autosaveTimer = setInterval(() => {
            if (this.isDirty) this.autosaveContent();
        }, this.config.autosaveInterval);
    }

    autosaveContent() {
        try {
            localStorage.setItem(this.config.autosaveKey, JSON.stringify({
                html: this.getHTML(),
                timestamp: Date.now()
            }));
            this.showAutosaveIndicator();
        } catch (e) {}
    }

    restoreAutosave() {
        try {
            const saved = localStorage.getItem(this.config.autosaveKey);
            if (saved) {
                const data = JSON.parse(saved);
                if (Date.now() - data.timestamp < 86400000 && this.editor.textContent.trim() === '') {
                    const age = Math.round((Date.now() - data.timestamp) / 60000);
                    if (age > 0) {
                        this.showNotification('Autosaved draft found (' + age + ' min ago). Click to restore.', 'info', () => {
                            this.setContent(data.html, true);
                        }, 8000);
                    }
                }
            }
        } catch (e) {}
    }

    clearAutosave() { localStorage.removeItem(this.config.autosaveKey); }

    showAutosaveIndicator() {
        const el = this.container && this.container.querySelector('.mintaro-autosave-indicator');
        if (el) {
            el.textContent = 'Autosaved';
            el.classList.add('visible');
            setTimeout(() => el.classList.remove('visible'), 2000);
        }
    }

    // ========================================
    // CONTENT MANAGEMENT
    // ========================================

    getHTML() { return this.editor.innerHTML; }
    getText() { return this.editor.textContent; }

    setContent(content, isHTML = true) {
        if (isHTML) this.editor.innerHTML = content;
        else this.editor.textContent = content;
        this.saveState();
        this.updatePreview();
        this.updateWordCount();
        this.isDirty = false;
    }

    insertHTML(html) {
        this.restoreSelection();
        document.execCommand('insertHTML', false, html);
        this.saveState();
        this.editor.focus();
    }

    clear() {
        this.editor.innerHTML = '';
        this.history = [];
        this.historyIndex = -1;
        this.saveState();
        this.updatePreview();
        this.updateWordCount();
        this.isDirty = false;
    }

    updatePreview() {
        if (this.preview) this.preview.innerHTML = this.editor.innerHTML;
    }

    updateWordCount() {
        const text = this.editor.textContent || '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        const chars = text.length;
        const wc = document.getElementById('mintaro-word-count');
        const cc = document.getElementById('mintaro-char-count');
        if (wc) wc.textContent = 'Words: ' + words;
        if (cc) cc.textContent = 'Characters: ' + chars;
    }

    updateButtonStates() {
        if (!this.toolbar) return;
        ['bold', 'italic', 'underline', 'strikethrough', 'insertUnorderedList', 'insertOrderedList',
         'superscript', 'subscript', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].forEach(cmd => {
            const btn = this.toolbar.querySelector('[data-command="' + cmd + '"]');
            if (btn) {
                try { btn.classList.toggle('active', document.queryCommandState(cmd)); } catch (e) {}
            }
        });
    }

    // ========================================
    // SAVE & EXPORT
    // ========================================

    save() {
        const content = this.getHTML();
        const text = this.getText();
        const saveData = {
            html: content,
            text: text,
            timestamp: new Date().toISOString(),
            wordCount: text.trim().split(/\s+/).filter(w => w.length > 0).length
        };
        if (typeof this.config.onSave === 'function') this.config.onSave(saveData);
        this.isDirty = false;
        this.autosaveContent();
        const saveBtn = this.toolbar && this.toolbar.querySelector('[data-command="save"]');
        if (saveBtn) {
            var orig = saveBtn.innerHTML;
            saveBtn.innerHTML = '<span style="color:#10b981">Saved!</span>';
            setTimeout(function() { saveBtn.innerHTML = orig; }, 2000);
        }
        return saveData;
    }

    exportAsHTML(filename) {
        filename = filename || 'document.html';
        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + this.escapeHTML(filename) + '</title>' +
            '<style>body{font-family:Arial,sans-serif;line-height:1.6;max-width:900px;margin:0 auto;padding:20px}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}blockquote{border-left:3px solid #10b981;padding-left:1em;margin-left:0;background:#f0fdf4;padding:1em}</style>' +
            '</head><body>' + this.getHTML() + '</body></html>';
        this.downloadFile(html, filename, 'text/html');
    }

    downloadFile(content, filename, mimeType) {
        var blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    }

    // ========================================
    // MODAL SYSTEM
    // ========================================

    createModal(options) {
        var title = options.title || '';
        var content = options.content || '';
        var width = options.width;
        var onClose = options.onClose;
        var className = options.className || '';

        var overlay = document.createElement('div');
        overlay.className = 'mintaro-modal-overlay' + (className ? ' ' + className : '');

        var dialog = document.createElement('div');
        dialog.className = 'mintaro-modal-dialog';
        if (width) dialog.style.maxWidth = width;

        dialog.innerHTML = '<div class="mintaro-modal-header"><h3>' + title + '</h3><button class="mintaro-modal-close" type="button" aria-label="Close">&times;</button></div><div class="mintaro-modal-body">' + content + '</div>';

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        setTimeout(function() {
            var firstInput = dialog.querySelector('input, select, textarea, button:not(.mintaro-modal-close)');
            if (firstInput) firstInput.focus();
        }, 50);

        var self = this;
        var close = function() {
            overlay.classList.add('closing');
            setTimeout(function() {
                overlay.remove();
                if (typeof onClose === 'function') onClose();
                self.restoreSelection();
                self.editor.focus();
            }, 150);
        };

        overlay.querySelector('.mintaro-modal-close').addEventListener('click', close);
        overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
        var escHandler = function(e) {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
        };
        document.addEventListener('keydown', escHandler);

        return { overlay: overlay, dialog: dialog, close: close };
    }

    // ========================================
    // DROPDOWN SYSTEM
    // ========================================

    createDropdown(button, content) {
        this.closeDropdowns();
        var dropdown = document.createElement('div');
        dropdown.className = 'mintaro-dropdown';
        dropdown.innerHTML = content;

        var rect = button.getBoundingClientRect();
        var toolbarRect = this.toolbar.getBoundingClientRect();
        dropdown.style.position = 'absolute';
        dropdown.style.top = (rect.bottom - toolbarRect.top + 4) + 'px';
        dropdown.style.left = Math.max(0, rect.left - toolbarRect.left) + 'px';
        dropdown.style.zIndex = '10000';

        this.toolbar.style.position = 'relative';
        this.toolbar.appendChild(dropdown);
        this.activeDropdown = dropdown;

        var self = this;
        var escHandler = function(e) {
            if (e.key === 'Escape') { self.closeDropdowns(); document.removeEventListener('keydown', escHandler); }
        };
        document.addEventListener('keydown', escHandler);
        return dropdown;
    }

    closeDropdowns() {
        if (this.activeDropdown) { this.activeDropdown.remove(); this.activeDropdown = null; }
    }

    // ========================================
    // LINK DIALOG
    // ========================================

    openLinkDialog() {
        var sel = window.getSelection();
        var existingLink = null;
        var selectedText = '';

        if (sel.rangeCount > 0) {
            selectedText = sel.toString();
            var node = sel.anchorNode;
            while (node && node !== this.editor) {
                if (node.tagName === 'A') { existingLink = node; break; }
                node = node.parentNode;
            }
        }

        var url = existingLink ? existingLink.href : '';
        var text = existingLink ? existingLink.textContent : selectedText;
        var target = existingLink ? (existingLink.target === '_blank') : true;
        var linkTitle = existingLink ? (existingLink.title || '') : '';

        var self = this;
        var result = this.createModal({
            title: existingLink ? 'Edit Link' : 'Insert Link',
            width: '480px',
            content: '<div class="mintaro-form-group"><label class="mintaro-form-label">URL</label><input type="url" id="mintaro-link-url" class="mintaro-form-input" placeholder="https://example.com" value="' + this.escapeAttr(url) + '"></div>' +
                '<div class="mintaro-form-group"><label class="mintaro-form-label">Display Text</label><input type="text" id="mintaro-link-text" class="mintaro-form-input" placeholder="Link text" value="' + this.escapeAttr(text) + '"></div>' +
                '<div class="mintaro-form-group"><label class="mintaro-form-label">Title (tooltip)</label><input type="text" id="mintaro-link-title" class="mintaro-form-input" placeholder="Optional tooltip" value="' + this.escapeAttr(linkTitle) + '"></div>' +
                '<div class="mintaro-form-group"><label class="mintaro-form-checkbox"><input type="checkbox" id="mintaro-link-newtab" ' + (target ? 'checked' : '') + '><span>Open in new tab</span></label></div>' +
                '<div class="mintaro-modal-footer"><button type="button" class="mintaro-btn mintaro-btn-primary" id="mintaro-link-insert">' + (existingLink ? 'Update' : 'Insert') + '</button>' +
                (existingLink ? '<button type="button" class="mintaro-btn mintaro-btn-danger" id="mintaro-link-remove">Remove Link</button>' : '') +
                '<button type="button" class="mintaro-btn" id="mintaro-link-cancel">Cancel</button></div>'
        });

        var dialog = result.dialog;
        var close = result.close;

        var urlInput = dialog.querySelector('#mintaro-link-url');
        var textInput = dialog.querySelector('#mintaro-link-text');
        var titleInput = dialog.querySelector('#mintaro-link-title');
        var newtabInput = dialog.querySelector('#mintaro-link-newtab');

        dialog.querySelector('#mintaro-link-insert').addEventListener('click', function() {
            var linkUrl = urlInput.value.trim();
            if (!linkUrl) { urlInput.focus(); urlInput.classList.add('mintaro-input-error'); return; }
            var linkText = textInput.value.trim() || linkUrl;
            var lt = titleInput.value.trim();
            var newTab = newtabInput.checked;

            if (existingLink) {
                existingLink.href = linkUrl;
                existingLink.textContent = linkText;
                existingLink.title = lt;
                existingLink.target = newTab ? '_blank' : '';
                if (newTab) existingLink.rel = 'noopener noreferrer';
            } else {
                self.restoreSelection();
                var a = document.createElement('a');
                a.href = linkUrl;
                a.textContent = linkText;
                if (lt) a.title = lt;
                if (newTab) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
                var range = window.getSelection().getRangeAt(0);
                range.deleteContents();
                range.insertNode(a);
                var afterRange = document.createRange();
                afterRange.setStartAfter(a);
                afterRange.collapse(true);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(afterRange);
            }
            self.saveState();
            close();
        });

        var removeBtn = dialog.querySelector('#mintaro-link-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                if (existingLink) {
                    existingLink.parentNode.replaceChild(document.createTextNode(existingLink.textContent), existingLink);
                    self.saveState();
                }
                close();
            });
        }

        dialog.querySelector('#mintaro-link-cancel').addEventListener('click', close);

        [urlInput, textInput, titleInput].forEach(function(input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') { e.preventDefault(); dialog.querySelector('#mintaro-link-insert').click(); }
            });
        });
    }

    // ========================================
    // FIND & REPLACE BAR
    // ========================================

    openFindReplaceBar() {
        var existing = this.container && this.container.querySelector('.mintaro-findbar');
        if (existing) { existing.remove(); return; }

        var bar = document.createElement('div');
        bar.className = 'mintaro-findbar';
        bar.innerHTML = '<div class="mintaro-findbar-row">' +
            '<input type="text" class="mintaro-findbar-input" id="mintaro-find-input" placeholder="Find...">' +
            '<input type="text" class="mintaro-findbar-input" id="mintaro-replace-input" placeholder="Replace with...">' +
            '<label class="mintaro-findbar-option"><input type="checkbox" id="mintaro-find-case"> Case</label>' +
            '<span class="mintaro-findbar-count" id="mintaro-find-count"></span>' +
            '<button class="mintaro-findbar-btn" id="mintaro-find-prev" title="Previous">&lsaquo;</button>' +
            '<button class="mintaro-findbar-btn" id="mintaro-find-next" title="Next">&rsaquo;</button>' +
            '<button class="mintaro-findbar-btn" id="mintaro-replace-one" title="Replace">Replace</button>' +
            '<button class="mintaro-findbar-btn" id="mintaro-replace-all" title="Replace All">All</button>' +
            '<button class="mintaro-findbar-close" id="mintaro-findbar-close">&times;</button></div>';

        this.editor.parentNode.insertBefore(bar, this.editor);

        var findInput = bar.querySelector('#mintaro-find-input');
        var replaceInput = bar.querySelector('#mintaro-replace-input');
        var caseCheck = bar.querySelector('#mintaro-find-case');
        var countSpan = bar.querySelector('#mintaro-find-count');
        var matches = [];
        var currentMatchIndex = -1;
        var self = this;

        var clearHighlights = function() {
            self.editor.querySelectorAll('.mintaro-highlight').forEach(function(el) {
                el.parentNode.replaceChild(document.createTextNode(el.textContent), el);
            });
            self.editor.normalize();
        };

        var highlightMatches = function() {
            clearHighlights();
            matches = [];
            currentMatchIndex = -1;
            var query = findInput.value;
            if (!query) { countSpan.textContent = ''; return; }
            var caseSensitive = caseCheck.checked;
            var walker = document.createTreeWalker(self.editor, NodeFilter.SHOW_TEXT, null, false);
            var textNodes = [];
            while (walker.nextNode()) textNodes.push(walker.currentNode);

            textNodes.forEach(function(textNode) {
                var text = textNode.textContent;
                var searchText = caseSensitive ? text : text.toLowerCase();
                var searchQuery = caseSensitive ? query : query.toLowerCase();
                var idx = searchText.indexOf(searchQuery);
                if (idx === -1) return;
                var fragment = document.createDocumentFragment();
                var lastIdx = 0;
                while (idx !== -1) {
                    if (idx > lastIdx) fragment.appendChild(document.createTextNode(text.substring(lastIdx, idx)));
                    var mark = document.createElement('span');
                    mark.className = 'mintaro-highlight';
                    mark.textContent = text.substring(idx, idx + query.length);
                    fragment.appendChild(mark);
                    matches.push(mark);
                    lastIdx = idx + query.length;
                    idx = searchText.indexOf(searchQuery, lastIdx);
                }
                if (lastIdx < text.length) fragment.appendChild(document.createTextNode(text.substring(lastIdx)));
                textNode.parentNode.replaceChild(fragment, textNode);
            });

            countSpan.textContent = matches.length ? matches.length + ' found' : 'No matches';
            if (matches.length) navigateMatch(0);
        };

        var navigateMatch = function(index) {
            matches.forEach(function(m) { m.classList.remove('mintaro-highlight-active'); });
            if (matches.length === 0) return;
            currentMatchIndex = ((index % matches.length) + matches.length) % matches.length;
            matches[currentMatchIndex].classList.add('mintaro-highlight-active');
            matches[currentMatchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            countSpan.textContent = (currentMatchIndex + 1) + '/' + matches.length;
        };

        var replaceOne = function() {
            if (currentMatchIndex < 0 || !matches[currentMatchIndex]) return;
            matches[currentMatchIndex].parentNode.replaceChild(document.createTextNode(replaceInput.value), matches[currentMatchIndex]);
            matches.splice(currentMatchIndex, 1);
            self.saveState();
            if (matches.length) navigateMatch(currentMatchIndex % matches.length);
            else countSpan.textContent = 'No matches';
        };

        var replaceAll = function() {
            if (matches.length === 0) return;
            var count = matches.length;
            matches.forEach(function(m) { m.parentNode.replaceChild(document.createTextNode(replaceInput.value), m); });
            matches = [];
            currentMatchIndex = -1;
            self.saveState();
            countSpan.textContent = count + ' replaced';
        };

        var closeBar = function() { clearHighlights(); bar.remove(); };

        findInput.addEventListener('input', highlightMatches);
        caseCheck.addEventListener('change', highlightMatches);
        bar.querySelector('#mintaro-find-next').addEventListener('click', function() { navigateMatch(currentMatchIndex + 1); });
        bar.querySelector('#mintaro-find-prev').addEventListener('click', function() { navigateMatch(currentMatchIndex - 1); });
        bar.querySelector('#mintaro-replace-one').addEventListener('click', replaceOne);
        bar.querySelector('#mintaro-replace-all').addEventListener('click', replaceAll);
        bar.querySelector('#mintaro-findbar-close').addEventListener('click', closeBar);

        findInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); navigateMatch(currentMatchIndex + (e.shiftKey ? -1 : 1)); }
            if (e.key === 'Escape') closeBar();
        });
        replaceInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); replaceOne(); }
            if (e.key === 'Escape') closeBar();
        });

        findInput.focus();
    }

    openFindReplace() { this.openFindReplaceBar(); }

    findAndReplace(findText, replaceText, replaceAll) {
        var content = this.editor.innerHTML;
        var flags = replaceAll ? 'g' : '';
        var regex = new RegExp(this.escapeRegex(findText), flags);
        var count = (content.match(new RegExp(this.escapeRegex(findText), 'g')) || []).length;
        if (count > 0) { this.editor.innerHTML = content.replace(regex, replaceText); this.saveState(); }
        return count;
    }

    // ========================================
    // TABLE SYSTEM
    // ========================================

    openTableDialog() {
        this.saveSelection();
        var self = this;
        var result = this.createModal({
            title: 'Insert Table',
            width: '360px',
            content: '<div class="mintaro-table-grid-container"><div class="mintaro-table-grid" id="mintaro-table-grid"></div><div class="mintaro-table-grid-label" id="mintaro-table-grid-label">Select size</div></div>' +
                '<div class="mintaro-form-row" style="margin-top:12px"><div class="mintaro-form-group" style="flex:1"><label class="mintaro-form-label">Rows</label><input type="number" id="mintaro-table-rows" class="mintaro-form-input" value="3" min="1" max="20"></div><div class="mintaro-form-group" style="flex:1"><label class="mintaro-form-label">Columns</label><input type="number" id="mintaro-table-cols" class="mintaro-form-input" value="3" min="1" max="20"></div></div>' +
                '<div class="mintaro-form-group"><label class="mintaro-form-checkbox"><input type="checkbox" id="mintaro-table-header" checked><span>First row as header</span></label></div>' +
                '<div class="mintaro-modal-footer"><button type="button" class="mintaro-btn mintaro-btn-primary" id="mintaro-table-insert">Insert Table</button><button type="button" class="mintaro-btn" id="mintaro-table-cancel">Cancel</button></div>'
        });

        var dialog = result.dialog;
        var close = result.close;
        var grid = dialog.querySelector('#mintaro-table-grid');
        var label = dialog.querySelector('#mintaro-table-grid-label');
        var rowsInput = dialog.querySelector('#mintaro-table-rows');
        var colsInput = dialog.querySelector('#mintaro-table-cols');

        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                var cell = document.createElement('div');
                cell.className = 'mintaro-grid-cell';
                cell.dataset.row = r + 1;
                cell.dataset.col = c + 1;
                cell.addEventListener('mouseenter', function() {
                    var row = parseInt(this.dataset.row);
                    var col = parseInt(this.dataset.col);
                    rowsInput.value = row;
                    colsInput.value = col;
                    label.textContent = row + ' x ' + col;
                    grid.querySelectorAll('.mintaro-grid-cell').forEach(function(c2) {
                        c2.classList.toggle('active', parseInt(c2.dataset.row) <= row && parseInt(c2.dataset.col) <= col);
                    });
                });
                cell.addEventListener('click', function() { dialog.querySelector('#mintaro-table-insert').click(); });
                grid.appendChild(cell);
            }
        }

        dialog.querySelector('#mintaro-table-insert').addEventListener('click', function() {
            var rows = parseInt(rowsInput.value) || 3;
            var cols = parseInt(colsInput.value) || 3;
            var hasHeader = dialog.querySelector('#mintaro-table-header').checked;
            var html = '<table style="border-collapse:collapse;width:100%;margin:12px 0"><tbody>';
            for (var r = 0; r < rows; r++) {
                html += '<tr>';
                for (var c = 0; c < cols; c++) {
                    var tag = (r === 0 && hasHeader) ? 'th' : 'td';
                    var style = (r === 0 && hasHeader) ? 'border:1px solid #d1d5db;padding:10px;background:#f3f4f6;font-weight:600;text-align:left' : 'border:1px solid #d1d5db;padding:10px;text-align:left';
                    html += '<' + tag + ' style="' + style + '"><br></' + tag + '>';
                }
                html += '</tr>';
            }
            html += '</tbody></table><p><br></p>';
            close();
            self.restoreSelection();
            document.execCommand('insertHTML', false, html);
            self.saveState();
        });

        dialog.querySelector('#mintaro-table-cancel').addEventListener('click', close);
    }

    insertTableRow(position) {
        position = position || 'after';
        var cell = this.getClosestBlock('td') || this.getClosestBlock('th');
        var row = cell && cell.parentElement;
        if (!row) return;
        var colCount = row.children.length;
        var newRow = document.createElement('tr');
        for (var i = 0; i < colCount; i++) {
            var td = document.createElement('td');
            td.innerHTML = '<br>';
            td.style.cssText = 'border:1px solid #d1d5db;padding:10px;text-align:left';
            newRow.appendChild(td);
        }
        if (position === 'before') row.parentNode.insertBefore(newRow, row);
        else row.parentNode.insertBefore(newRow, row.nextSibling);
        this.saveState();
    }

    deleteTableRow() {
        var cell = this.getClosestBlock('td') || this.getClosestBlock('th');
        var row = cell && cell.parentElement;
        if (!row) return;
        var tbody = row.parentElement;
        if (tbody.children.length <= 1) { var t = tbody.closest('table'); if (t) t.remove(); }
        else row.remove();
        this.saveState();
    }

    insertTableColumn(position) {
        position = position || 'after';
        var cell = this.getClosestBlock('td') || this.getClosestBlock('th');
        if (!cell) return;
        var colIndex = Array.from(cell.parentElement.children).indexOf(cell);
        var table = cell.closest('table');
        if (!table) return;
        table.querySelectorAll('tr').forEach(function(row) {
            var ref = row.children[colIndex];
            var newCell = document.createElement(ref.tagName.toLowerCase() === 'th' ? 'th' : 'td');
            newCell.innerHTML = '<br>';
            newCell.style.cssText = ref.tagName.toLowerCase() === 'th' ? 'border:1px solid #d1d5db;padding:10px;background:#f3f4f6;font-weight:600;text-align:left' : 'border:1px solid #d1d5db;padding:10px;text-align:left';
            if (position === 'before') row.insertBefore(newCell, ref);
            else row.insertBefore(newCell, ref.nextSibling);
        });
        this.saveState();
    }

    deleteTableColumn() {
        var cell = this.getClosestBlock('td') || this.getClosestBlock('th');
        if (!cell) return;
        var colIndex = Array.from(cell.parentElement.children).indexOf(cell);
        var table = cell.closest('table');
        if (!table) return;
        var firstRow = table.querySelector('tr');
        if (firstRow && firstRow.children.length <= 1) table.remove();
        else table.querySelectorAll('tr').forEach(function(row) { if (row.children[colIndex]) row.children[colIndex].remove(); });
        this.saveState();
    }

    deleteTable() {
        var cell = this.getClosestBlock('td') || this.getClosestBlock('th');
        var table = cell ? cell.closest('table') : this.editor.querySelector('table');
        if (table) { table.remove(); this.saveState(); }
    }

    getNextCell(cell) {
        if (cell.nextElementSibling) return cell.nextElementSibling;
        var nextRow = cell.parentElement.nextElementSibling;
        return nextRow ? nextRow.firstElementChild : null;
    }

    getPreviousCell(cell) {
        if (cell.previousElementSibling) return cell.previousElementSibling;
        var prevRow = cell.parentElement.previousElementSibling;
        return prevRow ? prevRow.lastElementChild : null;
    }

    selectCellContents(cell) {
        var range = document.createRange();
        range.selectNodeContents(cell);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    getTableInfo() {
        var tables = this.editor.querySelectorAll('table');
        return { count: tables.length, tables: Array.from(tables).map(function(t) {
            return { rows: t.querySelectorAll('tr').length, cols: (t.querySelector('tr') || {}).children ? t.querySelector('tr').children.length : 0 };
        })};
    }

    insertTable() { this.openTableDialog(); }

    // ========================================
    // IMAGE SYSTEM
    // ========================================

    setupImageUpload() {
        var self = this;
        this.editor.addEventListener('dragover', function(e) {
            e.preventDefault(); e.stopPropagation();
            self.editor.classList.add('mintaro-dragover');
        });
        this.editor.addEventListener('dragleave', function(e) {
            e.preventDefault(); e.stopPropagation();
            self.editor.classList.remove('mintaro-dragover');
        });
        this.editor.addEventListener('drop', function(e) {
            e.preventDefault(); e.stopPropagation();
            self.editor.classList.remove('mintaro-dragover');
            var files = e.dataTransfer.files;
            for (var i = 0; i < files.length; i++) {
                if (files[i].type.startsWith('image/')) self.handleImageUpload(files[i]);
            }
        });
    }

    setupImageResizeHandles() {
        var self = this;
        this.editor.addEventListener('click', function(e) {
            self.editor.querySelectorAll('.mintaro-img-wrapper.selected').forEach(function(w) { w.classList.remove('selected'); });
            self.editor.querySelectorAll('.mintaro-img-toolbar').forEach(function(t) { t.remove(); });

            var img = e.target.closest('img');
            if (img && self.editor.contains(img)) {
                e.stopPropagation();
                self.selectImage(img);
            }
        });
    }

    selectImage(img) {
        var wrapper = img.parentElement;
        if (!wrapper || !wrapper.classList.contains('mintaro-img-wrapper')) {
            wrapper = document.createElement('span');
            wrapper.className = 'mintaro-img-wrapper';
            wrapper.contentEditable = 'false';
            img.parentNode.insertBefore(wrapper, img);
            wrapper.appendChild(img);
        }
        wrapper.classList.add('selected');
        this.showImageToolbar(img, wrapper);
    }

    showImageToolbar(img, wrapper) {
        this.editor.querySelectorAll('.mintaro-img-toolbar').forEach(function(t) { t.remove(); });

        var toolbar = document.createElement('div');
        toolbar.className = 'mintaro-img-toolbar';
        toolbar.contentEditable = 'false';
        toolbar.innerHTML = '<button data-action="size-25" title="25%">25%</button>' +
            '<button data-action="size-50" title="50%">50%</button>' +
            '<button data-action="size-75" title="75%">75%</button>' +
            '<button data-action="size-100" title="100%">100%</button>' +
            '<span class="mintaro-img-toolbar-sep"></span>' +
            '<button data-action="align-left" title="Float Left">Left</button>' +
            '<button data-action="align-center" title="Center">Center</button>' +
            '<button data-action="align-right" title="Float Right">Right</button>' +
            '<span class="mintaro-img-toolbar-sep"></span>' +
            '<button data-action="alt" title="Alt Text">Alt</button>' +
            '<button data-action="delete" title="Delete">&times;</button>';

        wrapper.appendChild(toolbar);

        var self = this;
        toolbar.addEventListener('click', function(e) {
            e.stopPropagation();
            var action = e.target.dataset.action;
            if (!action) return;

            if (action === 'delete') { wrapper.remove(); }
            else if (action.startsWith('size-')) {
                img.style.width = action.split('-')[1] + '%';
                img.style.height = 'auto';
                img.style.float = '';
            } else if (action === 'align-left') {
                img.style.float = 'left'; img.style.marginRight = '16px'; img.style.marginBottom = '8px';
                wrapper.style.display = 'block'; wrapper.style.textAlign = '';
            } else if (action === 'align-right') {
                img.style.float = 'right'; img.style.marginLeft = '16px'; img.style.marginBottom = '8px';
                wrapper.style.display = 'block'; wrapper.style.textAlign = '';
            } else if (action === 'align-center') {
                img.style.float = ''; img.style.display = 'block'; img.style.marginLeft = 'auto'; img.style.marginRight = 'auto';
                wrapper.style.display = 'block'; wrapper.style.textAlign = 'center';
            } else if (action === 'alt') {
                var alt = prompt('Alt text:', img.alt || '');
                if (alt !== null) img.alt = alt;
            }
            self.saveState();
        });
    }

    handleImageUpload(file) {
        if (this.config.uploadUrl) {
            this.uploadImageToServer(file);
        } else {
            var self = this;
            var reader = new FileReader();
            reader.onload = function(e) { self.insertImageElement(e.target.result, file.name); };
            reader.onerror = function() { self.showNotification('Error reading file', 'error'); };
            reader.readAsDataURL(file);
        }
    }

    uploadImageToServer(file) {
        var formData = new FormData();
        formData.append('image', file);
        var self = this;
        this.showNotification('Uploading image...', 'info');
        fetch(this.config.uploadUrl, { method: 'POST', body: formData })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.url) { self.insertImageElement(data.url, file.name); self.showNotification('Image uploaded', 'success'); }
                else throw new Error(data.error || 'Upload failed');
            })
            .catch(function(err) {
                self.showNotification('Upload failed, embedding inline', 'error');
                var reader = new FileReader();
                reader.onload = function(e) { self.insertImageElement(e.target.result, file.name); };
                reader.readAsDataURL(file);
            });
    }

    insertImageElement(src, alt) {
        alt = alt || '';
        var img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.classList.add('mintaro-image');

        this.restoreSelection();
        var sel = window.getSelection();
        if (sel.rangeCount > 0) {
            var range = sel.getRangeAt(0);
            range.collapse(false);
            range.insertNode(img);
            var after = document.createRange();
            after.setStartAfter(img);
            after.collapse(true);
            sel.removeAllRanges();
            sel.addRange(after);
        } else {
            this.editor.appendChild(img);
        }
        this.saveState();
        this.editor.focus();
    }

    openImageDialog() {
        this.saveSelection();
        var self = this;
        var result = this.createModal({
            title: 'Insert Image',
            width: '480px',
            content: '<div class="mintaro-tab-bar"><button class="mintaro-tab active" data-tab="url">From URL</button><button class="mintaro-tab" data-tab="upload">Upload File</button></div>' +
                '<div class="mintaro-tab-content" id="tab-url"><div class="mintaro-form-group"><label class="mintaro-form-label">Image URL</label><input type="url" id="mintaro-img-url" class="mintaro-form-input" placeholder="https://example.com/image.jpg"></div><div class="mintaro-form-group"><label class="mintaro-form-label">Alt Text</label><input type="text" id="mintaro-img-alt" class="mintaro-form-input" placeholder="Describe the image"></div><div id="mintaro-img-preview-container" style="display:none;margin-top:8px"><img id="mintaro-img-preview" style="max-width:100%;max-height:200px;border-radius:6px"></div></div>' +
                '<div class="mintaro-tab-content" id="tab-upload" style="display:none"><div class="mintaro-upload-zone" id="mintaro-upload-zone"><p>Drag an image here or click to browse</p><input type="file" id="mintaro-img-file" accept="image/*" style="display:none"></div></div>' +
                '<div class="mintaro-modal-footer"><button type="button" class="mintaro-btn mintaro-btn-primary" id="mintaro-img-insert">Insert</button><button type="button" class="mintaro-btn" id="mintaro-img-cancel">Cancel</button></div>'
        });

        var dialog = result.dialog;
        var close = result.close;

        dialog.querySelectorAll('.mintaro-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                dialog.querySelectorAll('.mintaro-tab').forEach(function(t) { t.classList.remove('active'); });
                dialog.querySelectorAll('.mintaro-tab-content').forEach(function(c) { c.style.display = 'none'; });
                tab.classList.add('active');
                dialog.querySelector('#tab-' + tab.dataset.tab).style.display = '';
            });
        });

        var urlInput = dialog.querySelector('#mintaro-img-url');
        var previewImg = dialog.querySelector('#mintaro-img-preview');
        var previewContainer = dialog.querySelector('#mintaro-img-preview-container');
        urlInput.addEventListener('input', function() {
            var url = urlInput.value.trim();
            if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i) || url.startsWith('data:image')) {
                previewImg.src = url; previewContainer.style.display = '';
            } else { previewContainer.style.display = 'none'; }
        });

        var uploadZone = dialog.querySelector('#mintaro-upload-zone');
        var fileInput = dialog.querySelector('#mintaro-img-file');
        var uploadedFile = null;
        uploadZone.addEventListener('click', function() { fileInput.click(); });
        uploadZone.addEventListener('dragover', function(e) { e.preventDefault(); uploadZone.classList.add('active'); });
        uploadZone.addEventListener('dragleave', function() { uploadZone.classList.remove('active'); });
        uploadZone.addEventListener('drop', function(e) {
            e.preventDefault(); uploadZone.classList.remove('active');
            var file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) { uploadedFile = file; uploadZone.innerHTML = '<p>Selected: ' + self.escapeHTML(file.name) + '</p>'; }
        });
        fileInput.addEventListener('change', function() {
            var file = fileInput.files[0];
            if (file) { uploadedFile = file; uploadZone.innerHTML = '<p>Selected: ' + self.escapeHTML(file.name) + '</p>'; }
        });

        dialog.querySelector('#mintaro-img-insert').addEventListener('click', function() {
            var activeTab = dialog.querySelector('.mintaro-tab.active').dataset.tab;
            if (activeTab === 'url') {
                var url = urlInput.value.trim();
                var alt = dialog.querySelector('#mintaro-img-alt').value.trim();
                if (!url) { urlInput.focus(); return; }
                close();
                self.insertImageElement(url, alt);
            } else if (uploadedFile) {
                close();
                self.handleImageUpload(uploadedFile);
            }
        });

        dialog.querySelector('#mintaro-img-cancel').addEventListener('click', close);
    }

    openImageUploadDialog() {
        var self = this;
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', function() { if (input.files[0]) self.handleImageUpload(input.files[0]); });
        input.click();
    }

    // ========================================
    // VIDEO EMBED
    // ========================================

    openVideoEmbedDialog() {
        this.saveSelection();
        var self = this;
        var result = this.createModal({
            title: 'Embed Video',
            width: '480px',
            content: '<div class="mintaro-form-group"><label class="mintaro-form-label">Video URL</label><input type="url" id="mintaro-video-url" class="mintaro-form-input" placeholder="Paste YouTube, Vimeo, or video URL"><small class="mintaro-form-hint">Supports YouTube, Vimeo, Twitter/X, Instagram</small></div>' +
                '<div id="mintaro-video-preview" style="margin-top:12px;display:none"></div>' +
                '<div class="mintaro-modal-footer"><button type="button" class="mintaro-btn mintaro-btn-primary" id="mintaro-video-insert">Embed</button><button type="button" class="mintaro-btn" id="mintaro-video-cancel">Cancel</button></div>'
        });

        var dialog = result.dialog;
        var close = result.close;
        var urlInput = dialog.querySelector('#mintaro-video-url');
        var preview = dialog.querySelector('#mintaro-video-preview');

        urlInput.addEventListener('input', function() {
            var embed = self.detectAndConvertEmbed(urlInput.value.trim());
            if (embed) { preview.innerHTML = embed; preview.style.display = ''; }
            else preview.style.display = 'none';
        });

        dialog.querySelector('#mintaro-video-insert').addEventListener('click', function() {
            var url = urlInput.value.trim();
            if (!url) { urlInput.focus(); return; }
            var embed = self.detectAndConvertEmbed(url);
            if (embed) {
                close();
                self.restoreSelection();
                document.execCommand('insertHTML', false, '<div class="mintaro-embed">' + embed + '</div><p><br></p>');
                self.saveState();
            } else { self.showNotification('Could not detect video type', 'error'); }
        });

        dialog.querySelector('#mintaro-video-cancel').addEventListener('click', close);
    }

    detectAndConvertEmbed(url) {
        if (!url) return null;
        var ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) return '<iframe width="560" height="315" src="https://www.youtube.com/embed/' + ytMatch[1] + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="max-width:100%"></iframe>';
        var vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
        if (vimeoMatch) return '<iframe src="https://player.vimeo.com/video/' + vimeoMatch[1] + '" width="560" height="315" frameborder="0" allow="autoplay; fullscreen" allowfullscreen style="max-width:100%"></iframe>';
        if (url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/\d+/)) return '<blockquote class="twitter-tweet"><a href="' + this.escapeAttr(url) + '">Tweet</a></blockquote>';
        if (url.includes('instagram.com/p/') || url.includes('instagram.com/reel/')) return '<blockquote class="instagram-media" data-instgrm-permalink="' + this.escapeAttr(url) + '"><a href="' + this.escapeAttr(url) + '">Instagram</a></blockquote>';
        if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) return '<video controls style="max-width:100%;height:auto"><source src="' + this.escapeAttr(url) + '"></video>';
        return null;
    }

    insertSmartEmbed() { this.openVideoEmbedDialog(); }

    // ========================================
    // FORMAT DROPDOWNS
    // ========================================

    openFormatsDropdown() {
        var btn = this.toolbar.querySelector('#formats-btn');
        if (!btn) return;
        var self = this;
        var items = [
            { label: 'Paragraph', tag: 'p' },
            { label: 'Heading 1', tag: 'h1' },
            { label: 'Heading 2', tag: 'h2' },
            { label: 'Heading 3', tag: 'h3' },
            { label: 'Heading 4', tag: 'h4' },
            { label: 'Preformatted', tag: 'pre' },
        ];
        var html = items.map(function(item) {
            return '<button class="mintaro-dropdown-item" data-tag="' + item.tag + '">' + item.label + '</button>';
        }).join('');
        var dropdown = this.createDropdown(btn, html);
        dropdown.querySelectorAll('.mintaro-dropdown-item').forEach(function(item) {
            item.addEventListener('click', function() {
                self.restoreSelection();
                document.execCommand('formatBlock', false, '<' + item.dataset.tag + '>');
                self.saveState();
                self.closeDropdowns();
                self.editor.focus();
            });
        });
    }

    openFormatsMenu() { this.openFormatsDropdown(); }

    openFontFamilyDropdown() {
        var btn = this.toolbar.querySelector('#font-family-btn');
        if (!btn) return;
        var self = this;
        var fonts = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS', 'Tahoma', 'Palatino'];
        var html = fonts.map(function(f) { return '<button class="mintaro-dropdown-item" data-font="' + f + '" style="font-family:\'' + f + '\'">' + f + '</button>'; }).join('');
        var dropdown = this.createDropdown(btn, html);
        dropdown.querySelectorAll('.mintaro-dropdown-item').forEach(function(item) {
            item.addEventListener('click', function() {
                self.restoreSelection();
                document.execCommand('fontName', false, item.dataset.font);
                self.saveState(); self.closeDropdowns(); self.editor.focus();
            });
        });
    }

    openFontFamilyMenu() { this.openFontFamilyDropdown(); }

    openFontSizeDropdown() {
        var btn = this.toolbar.querySelector('#font-size-btn');
        if (!btn) return;
        var self = this;
        var sizes = [
            { label: '10px', value: '1' }, { label: '12px', value: '2' }, { label: '14px', value: '3' },
            { label: '16px', value: '4' }, { label: '18px', value: '5' }, { label: '24px', value: '6' }, { label: '32px', value: '7' }
        ];
        var html = sizes.map(function(s) { return '<button class="mintaro-dropdown-item" data-size="' + s.value + '">' + s.label + '</button>'; }).join('');
        var dropdown = this.createDropdown(btn, html);
        dropdown.querySelectorAll('.mintaro-dropdown-item').forEach(function(item) {
            item.addEventListener('click', function() {
                self.restoreSelection();
                document.execCommand('fontSize', false, item.dataset.size);
                self.saveState(); self.closeDropdowns(); self.editor.focus();
            });
        });
    }

    openFontSizeMenu() { this.openFontSizeDropdown(); }

    openLineHeightDropdown() {
        var btn = this.toolbar.querySelector('#line-height-btn');
        if (!btn) return;
        var self = this;
        var heights = ['1', '1.15', '1.5', '1.75', '2', '2.5', '3'];
        var html = heights.map(function(h) { return '<button class="mintaro-dropdown-item" data-height="' + h + '">Line height: ' + h + '</button>'; }).join('');
        var dropdown = this.createDropdown(btn, html);
        dropdown.querySelectorAll('.mintaro-dropdown-item').forEach(function(item) {
            item.addEventListener('click', function() {
                self.restoreSelection();
                var sel = window.getSelection();
                if (sel.rangeCount > 0) {
                    var block = sel.getRangeAt(0).commonAncestorContainer;
                    while (block && block !== self.editor && block.nodeType !== 1) block = block.parentNode;
                    if (block && block !== self.editor) block.style.lineHeight = item.dataset.height;
                }
                self.saveState(); self.closeDropdowns(); self.editor.focus();
            });
        });
    }

    openLineHeightMenu() { this.openLineHeightDropdown(); }

    // ========================================
    // COLOR PICKER
    // ========================================

    openColorPicker(command, title) {
        this.saveSelection();
        var self = this;
        var presetColors = [
            '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
            '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
            '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
            '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
            '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
            '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
        ];
        var swatches = presetColors.map(function(c) { return '<button class="mintaro-color-swatch" data-color="' + c + '" style="background:' + c + '" title="' + c + '"></button>'; }).join('');

        var result = this.createModal({
            title: title,
            width: '340px',
            content: '<div class="mintaro-color-grid">' + swatches + '</div>' +
                '<div class="mintaro-form-group" style="margin-top:12px"><div class="mintaro-color-custom-row"><div class="mintaro-color-preview-box" id="mintaro-color-prev"></div><input type="text" id="mintaro-color-hex" class="mintaro-form-input" placeholder="#000000" style="flex:1"><input type="color" id="mintaro-color-native" value="#000000" style="width:40px;height:36px;padding:2px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer"></div></div>' +
                '<div class="mintaro-modal-footer"><button type="button" class="mintaro-btn mintaro-btn-primary" id="mintaro-color-apply">Apply</button><button type="button" class="mintaro-btn" id="mintaro-color-cancel">Cancel</button></div>'
        });

        var dialog = result.dialog;
        var close = result.close;
        var hexInput = dialog.querySelector('#mintaro-color-hex');
        var nativeInput = dialog.querySelector('#mintaro-color-native');
        var preview = dialog.querySelector('#mintaro-color-prev');
        var selectedColor = '#000000';

        var setColor = function(color) {
            selectedColor = color;
            hexInput.value = color;
            try { nativeInput.value = color; } catch(e) {}
            preview.style.backgroundColor = color;
        };

        dialog.querySelectorAll('.mintaro-color-swatch').forEach(function(swatch) {
            swatch.addEventListener('click', function() { setColor(swatch.dataset.color); });
            swatch.addEventListener('dblclick', function() { setColor(swatch.dataset.color); dialog.querySelector('#mintaro-color-apply').click(); });
        });

        nativeInput.addEventListener('input', function() { setColor(nativeInput.value); });
        hexInput.addEventListener('input', function() {
            var hex = hexInput.value.trim();
            if (!hex.startsWith('#')) hex = '#' + hex;
            if (/^#[0-9a-f]{6}$/i.test(hex)) { selectedColor = hex; try { nativeInput.value = hex; } catch(e) {} preview.style.backgroundColor = hex; }
        });

        dialog.querySelector('#mintaro-color-apply').addEventListener('click', function() {
            close();
            self.restoreSelection();
            document.execCommand(command, false, selectedColor);
            self.saveState();
        });
        dialog.querySelector('#mintaro-color-cancel').addEventListener('click', close);
    }

    openFontColorPicker() { this.openColorPicker('foreColor', 'Font Color'); }
    openBackgroundColorPicker() { this.openColorPicker('backColor', 'Background Color'); }

    // ========================================
    // EMOJI PICKER
    // ========================================

    openEmojiPicker() {
        this.saveSelection();
        var self = this;
        var categories = {
            'Smileys': {
                icon: '😀',
                emojis: [
                    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚',
                    '😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏',
                    '😒','🙄','😬','🤥','🫨','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯',
                    '🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','☹️','😮','😯','😲','😳','🥺','🥹','😦','😧','😨',
                    '😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️',
                    '💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾'
                ]
            },
            'People': {
                icon: '👋',
                emojis: [
                    '👋','🤚','🖐','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉',
                    '👆','🖕','👇','☝️','🫵','👍','👎','👊','✊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅',
                    '🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁','👅','👄','🫦','💋',
                    '👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇',
                    '🤦','🤷','👮','🕵','💂','🥷','👷','🫅','🤴','👸','👳','👲','🧕','🤵','👰','🤰','🫃','🫄','🤱','👼',
                    '🎅','🤶','🦸','🦹','🧙','🧚','🧛','🧜','🧝','🧞','🧟','🧌','💆','💇','🚶','🧍','🧎','🏃','💃','🕺',
                    '👯','🧖','🧗','🤸','⛹️','🏋','🤼','🤽','🤾','🤺','🏇','⛷','🏂','🏌','🏄','🚣','🏊','🚴','🚵','🧘',
                    '👭','👫','👬','💏','💑','👪','🗣','👤','👥','🫂','👣'
                ]
            },
            'Hearts': {
                icon: '❤️',
                emojis: [
                    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','❤️‍🔥',
                    '❤️‍🩹','♥️','🩷','🩵','🩶','💌','💒','💍','💎','💐','🌹','🥀','🫶','🤗','🫂'
                ]
            },
            'Animals': {
                icon: '🐶',
                emojis: [
                    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊',
                    '🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌',
                    '🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷','🕸','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀',
                    '🪸','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🦭','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪',
                    '🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛',
                    '🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿','🦔',
                    '🐾','🐉','🐲'
                ]
            },
            'Nature': {
                icon: '🌸',
                emojis: [
                    '🌸','💮','🪷','🏵','🌹','🥀','🌺','🌻','🌼','🌷','🪻','🌱','🪴','🌲','🌳','🌴','🌵','🎋','🎍','🍀',
                    '☘️','🍃','🍂','🍁','🌾','🌿','🪹','🪺','🍄','🐚','🪨','🌎','🌍','🌏','🌕','🌖','🌗','🌘','🌑','🌒',
                    '🌓','🌔','🌙','🌚','🌛','🌜','☀️','🌝','🌞','⭐','🌟','🌠','✨','💫','☁️','⛅','⛈','🌤','🌥','🌦',
                    '🌧','🌨','🌩','🌪','🌫','🌬','🌀','🌈','🔥','💧','🌊','❄️','☃️','⛄','⚡','💥','☄️','🫧'
                ]
            },
            'Food': {
                icon: '🍔',
                emojis: [
                    '🍇','🍈','🍉','🍊','🍋','🍌','🍍','🥭','🍎','🍏','🍐','🍑','🍒','🍓','🫐','🥝','🍅','🫒','🥥','🥑',
                    '🍆','🥔','🥕','🌽','🌶','🫑','🥒','🥬','🥦','🧄','🧅','🥜','🫘','🌰','🫚','🫛','🍞','🥐','🥖','🫓',
                    '🥨','🥯','🥞','🧇','🧀','🍖','🍗','🥩','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🫔','🥙','🧆','🥚',
                    '🍳','🥘','🍲','🫕','🥣','🥗','🍿','🧈','🧂','🥫','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣',
                    '🍤','🍥','🥮','🍡','🥟','🥠','🥡','🦀','🦞','🦐','🦑','🦪','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁',
                    '🥧','🍫','🍬','🍭','🍮','🍯','🍼','🥛','☕','🫖','🍵','🍶','🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥃',
                    '🫗','🥤','🧋','🧃','🧉','🧊','🥢','🍽','🍴','🥄','🔪','🫙','🏺'
                ]
            },
            'Activities': {
                icon: '⚽',
                emojis: [
                    '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎳','🏏','🏑','🏒','🥍','🏓','🏸','🥊','🥋','🥅','⛳',
                    '⛸','🎣','🤿','🎽','🎿','🛷','🥌','🎯','🪀','🪁','🔫','🎱','🔮','🪄','🎮','🕹','🎰','🎲','🧩','🪅',
                    '♟','🎭','🖼','🎨','🧵','🪡','🧶','🪢','🎪','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕',
                    '🎻','🎬','🏆','🥇','🥈','🥉','🏅','🎖','🏵','🎗','🎫','🎟','🎠','🎡','🎢'
                ]
            },
            'Travel': {
                icon: '✈️',
                emojis: [
                    '🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍','🛵','🦽','🦼','🛺','🚲',
                    '🛴','🛹','🛼','🚏','🛣','🛤','⛽','🛞','🚨','🚥','🚦','🚧','⚓','🛟','⛵','🛶','🚤','🛳','⛴','🛥',
                    '🚢','✈️','🛩','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛰','🚀','🛸','🗿','🗽','🗼','🏰','🏯','🏟',
                    '🎡','🎢','🎠','⛲','⛱','🏖','🏝','🏜','🌋','⛰','🏔','🗻','🏕','⛺','🛖','🏠','🏡','🏘','🏚','🏗',
                    '🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏩','💒','🏛','⛪','🕌','🛕','🕍','⛩','🕋',
                    '🌁','🌃','🏙','🌄','🌅','🌆','🌇','🌉','🗾','🧭','🌐'
                ]
            },
            'Objects': {
                icon: '💡',
                emojis: [
                    '⌚','📱','📲','💻','⌨️','🖥','🖨','🖱','🖲','🕹','🗜','💽','💾','💿','📀','📼','📷','📸','📹','🎥',
                    '📽','🎞','📞','☎️','📟','📠','📺','📻','🎙','🎚','🎛','🧭','⏱','⏲','⏰','🕰','⌛','⏳','📡','🔋',
                    '🪫','🔌','💡','🔦','🕯','🪔','🧯','🗑','🛢','🛒','💰','💴','💵','💶','💷','🪙','💳','💎','⚖️','🪜',
                    '🧰','🪛','🔧','🔨','⚒','🛠','⛏','🪚','🔩','⚙️','🗜','🧲','🪤','🔫','💣','🧨','🪓','🔪','🗡','⚔️',
                    '🛡','🚬','⚰️','🪦','⚱️','🏺','🔭','🔬','💊','💉','🩸','🩹','🩺','🩻','🧬','🦠','🧫','🧪','🌡','🧹',
                    '🪠','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🧼','🪥','🪒','🧽','🪣','🧴','🔑','🗝','🚪','🪑','🛋','🛏',
                    '🛌','🧸','🪆','🖼','🪞','🪟','🛍','👜','👛','👝','🎒','🩴','👞','👟','🥾','🥿','👠','👡','🩰','👢',
                    '👑','👒','🎩','🎓','🧢','🪖','⛑','📿','💄','💍','💎','📕','📗','📘','📙','📚','📖','🔗','📎','🖇',
                    '📐','📏','🧮','📌','📍','✂️','🖊','🖋','✒️','🖌','🖍','📝','✏️','🔍','🔎','🔏','🔐','🔒','🔓'
                ]
            },
            'Flags': {
                icon: '🏁',
                emojis: [
                    '🏳️','🏴','🏁','🚩','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️',
                    '🇺🇸','🇬🇧','🇨🇦','🇦🇺','🇩🇪','🇫🇷','🇪🇸','🇮🇹','🇧🇷','🇯🇵','🇰🇷','🇨🇳','🇮🇳',
                    '🇷🇺','🇲🇽','🇦🇷','🇨🇴','🇵🇪','🇨🇱','🇻🇪','🇪🇨','🇵🇹','🇮🇪','🇳🇱','🇧🇪','🇸🇪','🇳🇴','🇩🇰','🇫🇮','🇵🇱','🇨🇿','🇦🇹','🇨🇭',
                    '🇬🇷','🇹🇷','🇸🇦','🇦🇪','🇮🇱','🇪🇬','🇿🇦','🇳🇬','🇰🇪','🇹🇭','🇻🇳','🇵🇭','🇮🇩','🇲🇾','🇸🇬','🇳🇿','🇺🇦','🇷🇴','🇭🇺','🇭🇷',
                    '🇷🇸','🇧🇬','🇸🇰','🇱🇹','🇱🇻','🇪🇪','🇮🇸','🇱🇺','🇲🇹','🇨🇾','🇬🇪','🇦🇲','🇦🇿','🇰🇿','🇺🇿','🇵🇰','🇧🇩','🇱🇰','🇲🇲','🇰🇭',
                    '🇱🇦','🇹🇼','🇭🇰','🇲🇴','🇲🇳','🇰🇵','🇳🇵','🇧🇹','🇦🇫','🇮🇶','🇮🇷','🇸🇾','🇯🇴','🇱🇧','🇰🇼','🇶🇦','🇧🇭','🇴🇲','🇾🇪','🇲🇦',
                    '🇹🇳','🇩🇿','🇱🇾','🇸🇩','🇪🇹','🇬🇭','🇨🇲','🇨🇩','🇹🇿','🇺🇬','🇷🇼','🇲🇿','🇲🇬','🇲🇺','🇯🇲','🇹🇹','🇧🇸','🇧🇧','🇩🇴','🇵🇷',
                    '🇨🇺','🇭🇹','🇭🇳','🇬🇹','🇸🇻','🇳🇮','🇨🇷','🇵🇦','🇧🇴','🇵🇾','🇺🇾','🇬🇾','🇸🇷','🇫🇯','🇵🇬','🇼🇸','🇹🇴','🇻🇺','🇸🇧','🇰🇮'
                ]
            },
            'Symbols': {
                icon: '⚠️',
                emojis: [
                    '⚠️','🚸','⛔','🚫','🚳','🚭','🚯','🚱','🚷','📵','🔞','☢️','☣️','⬆️','↗️','➡️','↘️','⬇️','↙️','⬅️',
                    '↖️','↕️','↔️','↩️','↪️','⤴️','⤵️','🔃','🔄','🔙','🔚','🔛','🔜','🔝','🔀','🔁','🔂','▶️','⏩','⏭',
                    '⏯','◀️','⏪','⏮','🔼','⏫','🔽','⏬','⏸','⏹','⏺','⏏','📳','📴','♀️','♂️','⚧','✖️','➕','➖',
                    '➗','🟰','♾','‼️','⁉️','❓','❔','❕','❗','〰️','💱','💲','⚕','♻️','⚜','🔱','📛','🔰','⭕','✅',
                    '☑️','✔️','❌','❎','➰','➿','〽️','✳️','✴️','❇️','©️','®️','™️','#️⃣','*️⃣','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣',
                    '5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔠','🔡','🔢','🔣','🔤','🅰️','🆎','🅱️','🆑','🆒','🆓','ℹ️','🆔','Ⓜ️',
                    '🆕','🆖','🅾️','🆗','🅿️','🆘','🆙','🆚','🔴','🟠','🟡','🟢','🔵','🟣','🟤','⚫','⚪','🟥',
                    '🟧','🟨','🟩','🟦','🟪','🟫','⬛','⬜','◼️','◻️','▪️','▫️','🔶','🔷','🔸','🔹','🔺','🔻','💠','🔘',
                    '🔳','🔲'
                ]
            }
        };

        // Search terms for common emoji lookups
        var searchTerms = {
            '😀': 'grinning face happy smile', '😃': 'smiley face happy', '😄': 'smile grin happy', '😁': 'beaming grin teeth', '😆': 'laughing squint lol',
            '😅': 'sweat smile nervous laugh', '🤣': 'rofl rolling floor laughing', '😂': 'tears joy crying laughing lol', '🙂': 'slightly smiling', '😉': 'wink winking',
            '😊': 'blush smiling blushing', '😇': 'angel innocent halo', '🥰': 'love hearts face smiling', '😍': 'heart eyes love', '🤩': 'star struck excited',
            '😘': 'kiss blowing kissing', '😎': 'cool sunglasses', '🤓': 'nerd glasses geek', '🤔': 'thinking hmm', '🤫': 'shush quiet secret',
            '😏': 'smirk smirking', '😴': 'sleeping zzz tired', '🤮': 'vomit sick throw up', '🤯': 'mind blown exploding head', '🥳': 'party celebrate birthday',
            '😡': 'angry mad rage', '😠': 'angry face mad', '😭': 'crying sad tears sobbing', '😱': 'scream fear shocked horror', '💀': 'skull dead death skeleton',
            '💩': 'poop shit', '👻': 'ghost boo halloween', '🤖': 'robot', '👽': 'alien ufo extraterrestrial', '😈': 'devil horns evil',
            '👍': 'thumbs up yes good like approve ok', '👎': 'thumbs down no bad dislike', '👊': 'fist bump punch', '✊': 'raised fist power solidarity',
            '👏': 'clap clapping applause bravo', '🙏': 'pray please thanks namaste folded hands', '💪': 'muscle strong bicep flex power arm',
            '❤️': 'red heart love', '💔': 'broken heart', '🔥': 'fire hot flame lit trending', '⭐': 'star', '✨': 'sparkles magic shine glitter',
            '💯': 'hundred percent perfect score', '👀': 'eyes looking see watch', '🎉': 'party tada celebration confetti',
            '🐶': 'dog puppy pet woof', '🐱': 'cat kitty pet meow', '🐻': 'bear teddy', '🦁': 'lion king jungle', '🐯': 'tiger stripe',
            '🐸': 'frog toad kermit', '🐵': 'monkey face', '🦊': 'fox', '🐼': 'panda bear', '🐨': 'koala australia',
            '🐮': 'cow moo', '🐷': 'pig oink', '🐔': 'chicken hen', '🐧': 'penguin', '🦋': 'butterfly insect',
            '🐢': 'turtle tortoise slow', '🐍': 'snake serpent', '🐙': 'octopus tentacle', '🐬': 'dolphin', '🦈': 'shark jaws',
            '🐳': 'whale ocean sea', '🐘': 'elephant trunk', '🦒': 'giraffe tall', '🐴': 'horse pony', '🦄': 'unicorn magic horn',
            '⚽': 'soccer football ball sport', '🏀': 'basketball ball sport nba', '🏈': 'football american nfl sport', '⚾': 'baseball ball sport mlb',
            '🥊': 'boxing gloves mma fight punch', '🥋': 'martial arts karate judo belt', '🏆': 'trophy winner champion cup gold',
            '🥇': 'gold medal first place winner', '🥈': 'silver medal second place', '🥉': 'bronze medal third place',
            '🏅': 'medal sports award', '🎯': 'bullseye target dart', '🎮': 'gaming controller video game play',
            '🇺🇸': 'usa america united states flag', '🇬🇧': 'uk united kingdom britain england flag', '🇨🇦': 'canada flag maple',
            '🇦🇺': 'australia flag', '🇩🇪': 'germany flag', '🇫🇷': 'france flag', '🇪🇸': 'spain flag', '🇮🇹': 'italy flag',
            '🇧🇷': 'brazil flag', '🇯🇵': 'japan flag', '🇰🇷': 'korea south flag', '🇨🇳': 'china flag', '🇮🇳': 'india flag',
            '🇷🇺': 'russia flag', '🇲🇽': 'mexico flag', '🇮🇪': 'ireland flag irish', '🇺🇦': 'ukraine flag', '🇹🇷': 'turkey flag',
            '🇦🇷': 'argentina flag', '🇨🇴': 'colombia flag', '🇵🇹': 'portugal flag', '🇳🇱': 'netherlands holland dutch flag',
            '🇸🇪': 'sweden flag', '🇳🇴': 'norway flag', '🇵🇱': 'poland flag', '🇨🇭': 'switzerland flag', '🇦🇹': 'austria flag',
            '🇬🇷': 'greece flag', '🇿🇦': 'south africa flag', '🇳🇬': 'nigeria flag', '🇪🇬': 'egypt flag', '🇳🇿': 'new zealand flag',
            '🇵🇭': 'philippines flag', '🇹🇭': 'thailand flag', '🇻🇳': 'vietnam flag', '🇸🇬': 'singapore flag', '🇮🇩': 'indonesia flag',
            '💻': 'laptop computer tech', '📱': 'phone mobile cell smartphone', '📸': 'camera photo picture', '🎬': 'movie film clapperboard cinema',
            '🍕': 'pizza slice food', '🍔': 'burger hamburger food', '🍺': 'beer mug drink alcohol', '☕': 'coffee cup drink hot', '🍷': 'wine glass drink',
            '🚗': 'car automobile drive', '✈️': 'airplane plane travel flight fly', '🚀': 'rocket space launch ship', '🏠': 'house home building',
            '🌍': 'earth globe world africa europe', '🌎': 'earth globe world americas', '🌏': 'earth globe world asia australia',
            '🎸': 'guitar music rock instrument', '🎹': 'piano keyboard music keys', '🎤': 'microphone singing karaoke mic',
            '🎧': 'headphones music listening audio', '🥁': 'drum music beat percussion',
            '💍': 'ring diamond engagement wedding', '👑': 'crown king queen royal', '🎓': 'graduation cap school education',
            '💎': 'gem diamond jewel crystal', '🔑': 'key lock security', '🌸': 'cherry blossom flower spring pink',
            '🌹': 'rose flower red love', '🌻': 'sunflower flower yellow', '🌺': 'hibiscus flower tropical', '🌷': 'tulip flower spring',
            '🌈': 'rainbow colors sky', '☀️': 'sun sunny bright hot', '🌙': 'moon crescent night', '⚡': 'lightning bolt electric zap thunder',
            '❄️': 'snowflake cold winter ice frozen', '🌊': 'wave ocean water sea surf', '💧': 'droplet water tear rain',
            '🍉': 'watermelon fruit summer', '🍎': 'apple red fruit', '🍌': 'banana fruit yellow', '🍓': 'strawberry fruit red berry',
            '🍒': 'cherry fruit red', '🥑': 'avocado fruit green', '🍗': 'chicken leg drumstick meat food', '🍟': 'french fries food mcdonalds',
            '🌮': 'taco mexican food', '🍣': 'sushi japanese food fish', '🍩': 'donut doughnut sweet food', '🎂': 'birthday cake celebration',
            '🍰': 'cake slice dessert sweet', '🍪': 'cookie biscuit sweet', '🍫': 'chocolate bar candy sweet',
            '🚕': 'taxi cab yellow car', '🚌': 'bus public transit', '🏎': 'race car formula racing', '🚁': 'helicopter chopper fly',
            '🛸': 'ufo flying saucer alien spaceship', '⛵': 'sailboat sailing boat', '🚢': 'ship cruise boat ocean',
            '🏰': 'castle medieval palace', '🗽': 'statue liberty new york usa', '🗼': 'tokyo tower japan',
            '⚠️': 'warning caution alert', '⛔': 'no entry forbidden stop', '🚫': 'prohibited banned forbidden no', '✅': 'check mark yes done correct',
            '❌': 'cross mark no wrong error delete', '♻️': 'recycle green environment', '💲': 'dollar money cash sign',
            '🔴': 'red circle dot', '🟢': 'green circle dot', '🔵': 'blue circle dot', '⚫': 'black circle dot', '⚪': 'white circle dot'
        };

        var catKeys = Object.keys(categories);
        var firstCat = catKeys[0];
        var tabs = catKeys.map(function(cat, i) {
            return '<button class="mintaro-emoji-tab ' + (i === 0 ? 'active' : '') + '" data-cat="' + cat + '" title="' + cat + '">' + categories[cat].icon + '</button>';
        }).join('');
        var emojiList = categories[firstCat].emojis;
        var emojisHtml = emojiList.map(function(e) { return '<button class="mintaro-emoji-btn" data-emoji="' + e + '">' + e + '</button>'; }).join('');

        var result = this.createModal({
            title: 'Insert Emoji',
            width: '440px',
            className: 'mintaro-emoji-modal-overlay',
            content:
                '<div class="mintaro-emoji-search-wrap"><input type="text" class="mintaro-emoji-search" id="mintaro-emoji-search" placeholder="Search emojis..." autocomplete="off" spellcheck="false"></div>' +
                '<div class="mintaro-emoji-tabs">' + tabs + '</div>' +
                '<div class="mintaro-emoji-grid" id="mintaro-emoji-grid">' + emojisHtml + '</div>' +
                '<div class="mintaro-emoji-count" id="mintaro-emoji-count">' + emojiList.length + ' emojis</div>'
        });

        var dialog = result.dialog;
        var close = result.close;
        var grid = dialog.querySelector('#mintaro-emoji-grid');
        var countEl = dialog.querySelector('#mintaro-emoji-count');
        var searchInput = dialog.querySelector('#mintaro-emoji-search');

        var renderEmojis = function(list) {
            // Build DOM safely from our hardcoded emoji arrays
            grid.textContent = '';
            list.forEach(function(e) {
                var btn = document.createElement('button');
                btn.className = 'mintaro-emoji-btn';
                btn.dataset.emoji = e;
                btn.textContent = e;
                btn.addEventListener('click', function() {
                    close();
                    self.restoreSelection();
                    document.execCommand('insertText', false, e);
                    self.saveState();
                });
                grid.appendChild(btn);
            });
            if (countEl) countEl.textContent = list.length + ' emojis';
        };

        var bindEmojiButtons = function() {
            grid.querySelectorAll('.mintaro-emoji-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    close();
                    self.restoreSelection();
                    document.execCommand('insertText', false, btn.dataset.emoji);
                    self.saveState();
                });
            });
        };

        // Category tabs
        dialog.querySelectorAll('.mintaro-emoji-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                dialog.querySelectorAll('.mintaro-emoji-tab').forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                searchInput.value = '';
                var cat = categories[tab.dataset.cat];
                renderEmojis(cat ? cat.emojis : []);
            });
        });

        // Search across all categories
        var searchTimer = null;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(function() {
                var query = searchInput.value.toLowerCase().trim();
                if (!query) {
                    var activeCat = dialog.querySelector('.mintaro-emoji-tab.active');
                    var catName = activeCat ? activeCat.dataset.cat : firstCat;
                    renderEmojis(categories[catName].emojis);
                    return;
                }
                var matches = [];
                var seen = {};
                catKeys.forEach(function(cat) {
                    categories[cat].emojis.forEach(function(e) {
                        if (seen[e]) return;
                        var terms = searchTerms[e] || '';
                        if (terms.indexOf(query) !== -1 || cat.toLowerCase().indexOf(query) !== -1) {
                            matches.push(e);
                            seen[e] = true;
                        }
                    });
                });
                renderEmojis(matches);
            }, 150);
        });

        bindEmojiButtons();
        setTimeout(function() { searchInput.focus(); }, 100);
    }

    insertEmoji(emoji) {
        document.execCommand('insertText', false, emoji);
        this.saveState();
        this.editor.focus();
    }

    // ========================================
    // HTML SOURCE EDITOR
    // ========================================

    openHTMLSourceEditor() {
        var currentHTML = this.getHTML();
        var self = this;
        var result = this.createModal({
            title: 'HTML Source',
            width: '700px',
            content: '<textarea class="mintaro-source-textarea" id="mintaro-source-textarea" spellcheck="false">' + this.escapeHTML(currentHTML) + '</textarea>' +
                '<div class="mintaro-modal-footer"><button type="button" class="mintaro-btn mintaro-btn-primary" id="mintaro-source-apply">Apply</button><button type="button" class="mintaro-btn" id="mintaro-source-cancel">Cancel</button></div>'
        });
        result.dialog.querySelector('#mintaro-source-apply').addEventListener('click', function() {
            self.setContent(result.dialog.querySelector('#mintaro-source-textarea').value, true);
            result.close();
        });
        result.dialog.querySelector('#mintaro-source-cancel').addEventListener('click', result.close);
    }

    // ========================================
    // FULLSCREEN
    // ========================================

    toggleFullscreen() {
        if (!this.container) return;
        this.isFullscreen = !this.isFullscreen;
        if (this.isFullscreen) {
            this.container.classList.add('mintaro-fullscreen');
            document.body.style.overflow = 'hidden';
            this.editor.style.height = 'calc(100vh - 200px)';
        } else {
            this.container.classList.remove('mintaro-fullscreen');
            document.body.style.overflow = '';
            this.editor.style.height = '';
            this.editor.style.minHeight = this.config.height;
        }
        var btn = this.toolbar && this.toolbar.querySelector('#fullscreen-btn');
        if (btn) btn.classList.toggle('active', this.isFullscreen);
    }

    // ========================================
    // PREVIEW & PRINT
    // ========================================

    openPreview() {
        var content = this.getHTML();
        var win = window.open('', '_blank');
        win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Preview</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding:40px;max-width:800px;margin:0 auto;line-height:1.7;color:#333}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}blockquote{border-left:3px solid #10b981;padding-left:1em;margin:1em 0;background:#f0fdf4;padding:1em}h1,h2,h3{color:#1f2937}a{color:#10b981}</style></head><body>' + content + '</body></html>');
        win.document.close();
    }

    printContent() {
        var frame = document.createElement('iframe');
        frame.style.display = 'none';
        document.body.appendChild(frame);
        frame.contentDocument.write('<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;padding:20px}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}</style></head><body>' + this.getHTML() + '</body></html>');
        frame.contentDocument.close();
        frame.contentWindow.print();
        setTimeout(function() { frame.remove(); }, 1000);
    }

    // ========================================
    // HELP DIALOG
    // ========================================

    showHelp() {
        this.createModal({
            title: 'Keyboard Shortcuts',
            width: '520px',
            content: '<div class="mintaro-help-content">' +
                '<h4>Text Formatting</h4><div class="mintaro-help-grid"><kbd>Ctrl+B</kbd> <span>Bold</span><kbd>Ctrl+I</kbd> <span>Italic</span><kbd>Ctrl+U</kbd> <span>Underline</span><kbd>Ctrl+Shift+X</kbd> <span>Strikethrough</span></div>' +
                '<h4>Editing</h4><div class="mintaro-help-grid"><kbd>Ctrl+Z</kbd> <span>Undo</span><kbd>Ctrl+Y</kbd> <span>Redo</span><kbd>Ctrl+Shift+Z</kbd> <span>Redo</span><kbd>Ctrl+S</kbd> <span>Save</span></div>' +
                '<h4>Content</h4><div class="mintaro-help-grid"><kbd>Ctrl+K</kbd> <span>Insert Link</span><kbd>Ctrl+H</kbd> <span>Find &amp; Replace</span><kbd>Tab</kbd> <span>Indent / Next cell</span><kbd>Shift+Tab</kbd> <span>Outdent / Prev cell</span></div>' +
                '<h4>Tips</h4><ul style="font-size:13px;line-height:1.8;margin:0;padding-left:18px"><li>Drag images directly into the editor</li><li>Paste images from clipboard</li><li>Click an image to show alignment &amp; resize toolbar</li><li>Tab through table cells</li><li>Content is auto-saved every 30 seconds</li></ul></div>'
        });
    }

    // ========================================
    // CHECKLIST
    // ========================================

    insertChecklist() {
        this.restoreSelection();
        document.execCommand('insertHTML', false, '<ul class="mintaro-checklist"><li><label><input type="checkbox"> Item 1</label></li><li><label><input type="checkbox"> Item 2</label></li><li><label><input type="checkbox"> Item 3</label></li></ul>');
        this.saveState();
    }

    // ========================================
    // STATISTICS
    // ========================================

    getStatistics() {
        var text = this.getText();
        var words = text.trim().split(/\s+/).filter(function(w) { return w.length > 0; });
        var sentences = text.split(/[.!?]+/).filter(function(s) { return s.trim().length > 0; });
        var paragraphs = Math.max(1, this.editor.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li').length);
        var images = this.editor.querySelectorAll('img').length;
        var links = this.editor.querySelectorAll('a').length;
        var avgWordsPerSentence = sentences.length > 0 ? (words.length / sentences.length).toFixed(1) : 0;
        var readabilityScore = 0;
        if (words.length > 0 && sentences.length > 0) {
            var syllableCount = this.estimateSyllables(text);
            readabilityScore = Math.max(0, Math.min(100, 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllableCount / words.length))).toFixed(1);
        }
        return {
            words: words.length, characters: text.length, charactersNoSpaces: text.replace(/\s/g, '').length,
            sentences: sentences.length, paragraphs: paragraphs, images: images, links: links,
            avgWordsPerSentence: avgWordsPerSentence, readabilityScore: readabilityScore,
            readingTime: Math.max(1, Math.ceil(words.length / 200)) + ' min read'
        };
    }

    estimateSyllables(text) {
        var words = text.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 0; });
        var total = 0;
        words.forEach(function(word) {
            word = word.replace(/[^a-z]/g, '');
            if (word.length <= 2) { total += 1; return; }
            word = word.replace(/e$/, '');
            var matches = word.match(/[aeiouy]+/g);
            total += matches ? Math.max(1, matches.length) : 1;
        });
        return total;
    }

    getWordCountProgress(goal) {
        var stats = this.getStatistics();
        var percentage = Math.min(100, (stats.words / goal) * 100);
        return { current: stats.words, goal: goal, percentage: percentage.toFixed(1), remaining: Math.max(0, goal - stats.words) };
    }

    insertSpecialChar(char) {
        document.execCommand('insertText', false, char);
        this.saveState();
    }

    // ========================================
    // NOTIFICATIONS
    // ========================================

    showNotification(message, type, onClick, duration) {
        type = type || 'info';
        duration = duration || 4000;
        var notification = document.createElement('div');
        notification.className = 'mintaro-notification mintaro-notification-' + type;
        notification.textContent = message;
        if (onClick) {
            notification.style.cursor = 'pointer';
            notification.addEventListener('click', function() { onClick(); notification.remove(); });
        }
        var container = this.container || document.body;
        container.appendChild(notification);
        requestAnimationFrame(function() { notification.classList.add('visible'); });
        setTimeout(function() {
            notification.classList.remove('visible');
            setTimeout(function() { notification.remove(); }, 300);
        }, duration);
    }

    // ========================================
    // UTILITY
    // ========================================

    escapeHTML(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    escapeAttr(str) {
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Legacy compatibility
    pickImageFile() { this.openImageUploadDialog(); }
    resizeImage(w, unit) {
        var img = this.editor.querySelector('img');
        if (img) { img.style.width = w + unit; img.style.height = 'auto'; this.saveState(); }
    }
    linkImage() {
        var img = this.editor.querySelector('img');
        if (!img) return;
        var url = prompt('Link URL:', 'https://');
        if (!url) return;
        var a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        img.parentNode.insertBefore(a, img); a.appendChild(img);
        this.saveState();
    }
    editImageProperties() {
        var img = this.editor.querySelector('img');
        if (!img) return;
        var alt = prompt('Alt text:', img.alt || '');
        if (alt !== null) img.alt = alt;
        this.saveState();
    }
    getImageStats() {
        var images = this.editor.querySelectorAll('img');
        return { count: images.length, images: Array.from(images).map(function(img) { return { src: img.src.substring(0, 50), alt: img.alt, width: img.width, height: img.height }; }) };
    }
    getLinkedImages() {
        return Array.from(this.editor.querySelectorAll('a')).filter(function(a) { return a.querySelector('img'); }).map(function(a) { return { linkUrl: a.href, alt: a.querySelector('img').alt }; });
    }

    rgbToHex(r, g, b) { return '#' + [r, g, b].map(function(x) { return Math.round(x).toString(16).padStart(2, '0'); }).join(''); }
    hexToRgb(hex) { var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 }; }

    destroy() {
        if (this.autosaveTimer) clearInterval(this.autosaveTimer);
        if (this.saveStateTimeout) clearTimeout(this.saveStateTimeout);
        this.editor.contentEditable = false;
        this.editor.removeAttribute('data-placeholder');
        if (this.container) this.container.classList.remove('mintaro-fullscreen');
        document.body.style.overflow = '';
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Mintaro;
}
