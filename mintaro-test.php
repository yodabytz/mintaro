<?php
/**
 * Mintaro Editor - Test Page
 */
session_start();
$pageTitle = 'Mintaro Editor';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle; ?> - FightPulse</title>
    <link rel="stylesheet" href="/mintaro/mintaro.css?v=61">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #f0f2f5;
            color: #333;
        }

        header {
            background: linear-gradient(135deg, #87001b 0%, #6d0016 100%);
            color: white;
            padding: 24px 0;
            margin-bottom: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        header .container { max-width: 1400px; margin: 0 auto; padding: 0 24px; }
        header h1 { font-size: 24px; font-weight: 700; }
        header p { font-size: 13px; opacity: 0.85; margin-top: 4px; }

        .container { max-width: 1400px; margin: 0 auto; padding: 0 24px; }

        .layout {
            display: grid;
            grid-template-columns: 1fr 340px;
            gap: 24px;
            margin-bottom: 40px;
        }

        @media (max-width: 1024px) { .layout { grid-template-columns: 1fr; } }

        .editor-section {
            background: white;
            border-radius: 10px;
            padding: 24px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }

        .editor-section h2 {
            font-size: 18px;
            font-weight: 700;
            color: #87001b;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 2px solid #f0f0f0;
        }

        .mintaro-container {
            margin: 0;
            border-radius: 10px;
        }

        .sidebar { display: flex; flex-direction: column; gap: 16px; }

        .sidebar-section {
            background: white;
            border-radius: 10px;
            padding: 18px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            border: 1px solid #f0f0f0;
        }

        .sidebar-section h3 {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: #87001b;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }

        .btn-group { display: flex; flex-direction: column; gap: 6px; }

        .btn {
            padding: 10px 14px;
            border: 1px solid #e0e0e0;
            background: white;
            color: #333;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s ease;
            text-align: center;
            font-family: inherit;
        }
        .btn:hover { background: #f5f5f5; border-color: #87001b; }
        .btn-primary { background: #87001b; color: white; border-color: #87001b; }
        .btn-primary:hover { background: #6d0016; }

        .stats-box {
            background: #f9fafb;
            padding: 14px;
            border-radius: 6px;
            font-size: 13px;
            line-height: 2;
            border: 1px solid #f0f0f0;
        }
        .stats-box div { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f0f0f0; }
        .stats-box div:last-child { border-bottom: none; }
        .stats-box strong { color: #87001b; font-weight: 700; font-size: 12px; }

        .output-box {
            background: #f8f9fa;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
            font-size: 11px;
            line-height: 1.5;
            max-height: 200px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            color: #4b5563;
        }

        .info-box {
            background: #f0f7ff;
            border-left: 3px solid #2196F3;
            border-radius: 6px;
            padding: 12px;
            font-size: 12px;
            color: #1565c0;
            line-height: 1.6;
        }
        .info-box strong { display: block; margin-bottom: 6px; font-size: 13px; }

        .success-message {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 10px 14px;
            border-radius: 6px;
            margin-bottom: 12px;
            display: none;
            font-size: 13px;
            font-weight: 500;
        }
        .success-message.visible { display: block; }

        .editor-footer {
            display: flex;
            gap: 10px;
            padding-top: 14px;
            border-top: 1px solid #f0f0f0;
            margin-top: 14px;
        }

        .editor-footer .btn-save {
            flex: 1;
            padding: 11px 16px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            font-family: inherit;
            transition: background 0.2s;
        }
        .editor-footer .btn-save:hover { background: #059669; }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>Mintaro Editor</h1>
            <p>Professional Rich Text Editor for FightPulse</p>
        </div>
    </header>

    <div class="container">
        <div class="layout">
            <div class="editor-section">
                <h2>Editor</h2>

                <div class="success-message" id="saveMessage">Content saved successfully!</div>

                <div class="mintaro-container">
                    <div class="mintaro-header">
                        <img src="/mintaro/mintaro-logo.png" alt="Mintaro" class="mintaro-logo">
                    </div>

                    <!-- TOOLBAR - Organized by function group -->
                    <div class="mintaro-toolbar" id="mintaro-toolbar">

                        <!-- Text Style -->
                        <div class="mintaro-toolbar-group">
                            <button class="mintaro-button" data-command="bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
                            <button class="mintaro-button" data-command="italic" title="Italic (Ctrl+I)"><em>I</em></button>
                            <button class="mintaro-button" data-command="underline" title="Underline (Ctrl+U)"><u>U</u></button>
                            <button class="mintaro-button" data-command="strikethrough" title="Strikethrough (Ctrl+Shift+X)"><s>S</s></button>
                            <button class="mintaro-button" data-command="superscript" title="Superscript">X<sup>2</sup></button>
                            <button class="mintaro-button" data-command="subscript" title="Subscript">X<sub>2</sub></button>
                        </div>

                        <div class="mintaro-toolbar-separator"></div>

                        <!-- Block Format -->
                        <div class="mintaro-toolbar-group">
                            <button class="mintaro-button" id="formats-btn" title="Heading / Block Format">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 4v3h5.5v12h3V7H19V4H5z"/></svg>
                            </button>
                            <button class="mintaro-button" id="font-family-btn" title="Font Family">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9.93 13.5h4.14L12 7.98 9.93 13.5zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z"/></svg>
                            </button>
                            <button class="mintaro-button" id="font-size-btn" title="Font Size">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z"/></svg>
                            </button>
                        </div>

                        <div class="mintaro-toolbar-separator"></div>

                        <!-- Colors -->
                        <div class="mintaro-toolbar-group">
                            <button class="mintaro-button" id="font-color-btn" title="Font Color" style="position:relative">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11 2L5.5 16h2.25l1.12-3h6.25l1.12 3h2.25L13 2h-2zm-1.38 9L12 4.67 14.38 11H9.62z"/></svg>
                                <span style="position:absolute;bottom:2px;left:6px;right:6px;height:3px;background:#ef4444;border-radius:1px"></span>
                            </button>
                            <button class="mintaro-button" id="bg-color-btn" title="Highlight Color" style="position:relative">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z"/></svg>
                                <span style="position:absolute;bottom:2px;left:6px;right:6px;height:3px;background:#fbbf24;border-radius:1px"></span>
                            </button>
                        </div>

                        <div class="mintaro-toolbar-separator"></div>

                        <!-- Lists -->
                        <div class="mintaro-toolbar-group">
                            <button class="mintaro-button" data-command="insertUnorderedList" title="Bullet List">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
                            </button>
                            <button class="mintaro-button" data-command="insertOrderedList" title="Numbered List">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
                            </button>
                            <button class="mintaro-button" id="checklist-btn" title="Checklist">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17.99 9l-1.41-1.42-6.59 6.59-2.58-2.57-1.42 1.41 4 3.99z"/></svg>
                            </button>
                        </div>

                        <div class="mintaro-toolbar-separator"></div>

                        <!-- Alignment -->
                        <div class="mintaro-toolbar-group">
                            <button class="mintaro-button" data-command="justifyLeft" title="Align Left">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg>
                            </button>
                            <button class="mintaro-button" data-command="justifyCenter" title="Align Center">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/></svg>
                            </button>
                            <button class="mintaro-button" data-command="justifyRight" title="Align Right">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/></svg>
                            </button>
                        </div>

                        <div class="mintaro-toolbar-separator"></div>

                        <!-- Indent -->
                        <div class="mintaro-toolbar-group">
                            <button class="mintaro-button" data-command="indent" title="Indent">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 21h18v-2H3v2zM3 8v8l4-4-4-4zm8 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/></svg>
                            </button>
                            <button class="mintaro-button" data-command="outdent" title="Outdent">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11 17h10v-2H11v2zm-8-5l4 4V8l-4 4zm0 9h18v-2H3v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/></svg>
                            </button>
                        </div>

                        <div class="mintaro-toolbar-separator"></div>

                        <!-- Content -->
                        <div class="mintaro-toolbar-group">
                            <button class="mintaro-button" id="link-btn" title="Insert Link (Ctrl+K)">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
                            </button>
                            <button class="mintaro-button" id="image-btn" title="Insert Image">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                            </button>
                            <button class="mintaro-button" id="video-btn" title="Embed Video">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                            </button>
                            <button class="mintaro-button" id="table-btn" title="Insert Table">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z"/></svg>
                            </button>
                            <button class="mintaro-button" id="hr-btn" title="Horizontal Rule">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2 11h20v2H2z"/></svg>
                            </button>
                        </div>

                        <div class="mintaro-toolbar-separator"></div>

                        <!-- Block Format -->
                        <div class="mintaro-toolbar-group">
                            <button class="mintaro-button" data-command="formatBlock" data-value="blockquote" title="Blockquote">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
                            </button>
                            <button class="mintaro-button" id="inline-code-btn" title="Code">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
                            </button>
                            <button class="mintaro-button" id="emoji-btn" title="Insert Emoji">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
                            </button>
                        </div>

                        <div class="mintaro-toolbar-separator"></div>

                        <!-- Utilities -->
                        <div class="mintaro-toolbar-group">
                            <button class="mintaro-button" data-command="undo" title="Undo (Ctrl+Z)">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
                            </button>
                            <button class="mintaro-button" data-command="redo" title="Redo (Ctrl+Y)">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>
                            </button>
                            <button class="mintaro-button" data-command="removeFormat" title="Clear Formatting">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z"/></svg>
                            </button>
                        </div>

                        <div class="mintaro-toolbar-separator"></div>

                        <!-- Advanced -->
                        <div class="mintaro-toolbar-group">
                            <button class="mintaro-button" id="find-replace-btn" title="Find & Replace (Ctrl+H)">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                            </button>
                            <button class="mintaro-button" id="html-source-btn" title="HTML Source">&lt;/&gt;</button>
                            <button class="mintaro-button" id="fullscreen-btn" title="Full Screen">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                            </button>
                            <button class="mintaro-button" id="preview-btn" title="Preview">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                            </button>
                            <button class="mintaro-button" id="print-btn" title="Print">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
                            </button>
                            <button class="mintaro-button" id="help-btn" title="Help">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                            </button>
                        </div>

                    </div><!-- End toolbar -->

                    <div id="mintaro-editor"></div>

                    <div class="mintaro-status-bar">
                        <div class="mintaro-stats">
                            <div class="mintaro-stat">
                                <span id="mintaro-word-count">Words: 0</span>
                            </div>
                            <div class="mintaro-stat">
                                <span id="mintaro-char-count">Characters: 0</span>
                            </div>
                        </div>
                        <div style="display:flex;gap:12px;align-items:center">
                            <span class="mintaro-autosave-indicator"></span>
                            <span>Last saved: <span id="last-saved">Never</span></span>
                        </div>
                    </div>

                </div><!-- End mintaro-container -->

                <div class="editor-footer">
                    <button class="btn-save" id="save-doc-btn">Save Document</button>
                </div>
            </div>

            <!-- Sidebar -->
            <div class="sidebar">
                <div class="sidebar-section">
                    <div class="info-box">
                        <strong>Quick Start</strong>
                        Type content, use toolbar to format. Ctrl+S to save, Ctrl+K for links, Ctrl+H for find/replace. Drag images directly in.
                    </div>
                </div>

                <div class="sidebar-section">
                    <h3>Actions</h3>
                    <div class="btn-group">
                        <button class="btn btn-primary" onclick="loadSample()">Load Sample Article</button>
                        <button class="btn" onclick="clearAll()">Clear Editor</button>
                        <button class="btn" onclick="editor.exportAsHTML('article.html')">Export HTML</button>
                    </div>
                </div>

                <!-- Table Operations -->
                <div class="sidebar-section">
                    <h3>Table Operations</h3>
                    <div class="btn-group">
                        <button class="btn" onclick="editor.insertTableRow('after')">Add Row Below</button>
                        <button class="btn" onclick="editor.insertTableRow('before')">Add Row Above</button>
                        <button class="btn" onclick="editor.deleteTableRow()">Delete Row</button>
                        <button class="btn" onclick="editor.insertTableColumn('after')">Add Column Right</button>
                        <button class="btn" onclick="editor.deleteTableColumn()">Delete Column</button>
                        <button class="btn" onclick="if(confirm('Delete table?')) editor.deleteTable()">Delete Table</button>
                    </div>
                </div>

                <div class="sidebar-section">
                    <h3>Statistics</h3>
                    <div class="stats-box">
                        <div><strong>Words</strong> <span id="stat-words">0</span></div>
                        <div><strong>Characters</strong> <span id="stat-chars">0</span></div>
                        <div><strong>Paragraphs</strong> <span id="stat-paras">0</span></div>
                        <div><strong>Images</strong> <span id="stat-images">0</span></div>
                        <div><strong>Links</strong> <span id="stat-links">0</span></div>
                        <div><strong>Reading Time</strong> <span id="stat-reading-time">1 min</span></div>
                    </div>
                </div>

                <div class="sidebar-section">
                    <h3>HTML Output</h3>
                    <div class="output-box" id="htmlOutput"></div>
                </div>
            </div>
        </div>
    </div>

    <script src="/mintaro/mintaro.js?v=61"></script>
    <script>
        var editor = new Mintaro({
            containerId: 'mintaro-editor',
            toolbarId: 'mintaro-toolbar',
            height: '500px',
            placeholder: 'Start typing your story... Use the toolbar above to format. Ctrl+B bold, Ctrl+I italic, Ctrl+K link, Ctrl+H find/replace.',
            enablePreview: false,
            autosave: true,
            onSave: function(data) {
                showSaveMsg();
                updateOutput();
                updateStats();
            },
            onChange: function() {
                updateOutput();
                updateStats();
            }
        });

        function loadSample() {
            editor.setContent(
                '<h1>The Rise of MMA in 2025</h1>' +
                '<p>Mixed martial arts has evolved tremendously over the past decade, becoming one of the most watched sports globally. Athletes now combine multiple disciplines with incredible precision and athleticism.</p>' +
                '<h2>Key Trends This Year</h2>' +
                '<ul><li>Increased emphasis on striking fundamentals</li><li>Advanced wrestling techniques from international competitors</li><li>Growth of women\'s fighting divisions</li></ul>' +
                '<h3>Notable Achievements</h3>' +
                '<p>Champions across all weight classes have demonstrated <strong>remarkable skill</strong> and <em>dedication</em> to their craft. The level of competition has never been higher.</p>' +
                '<blockquote>"The sport is only going to get better from here." - A legendary fighter</blockquote>' +
                '<p>Looking ahead, we can expect continued growth and innovation in training methods and competition formats.</p>',
                true
            );
            updateOutput();
            updateStats();
        }

        function clearAll() {
            if (confirm('Clear all content?')) {
                editor.clear();
                updateOutput();
                updateStats();
            }
        }

        function updateOutput() {
            var el = document.getElementById('htmlOutput');
            if (el) el.textContent = editor.getHTML();
        }

        function updateStats() {
            var stats = editor.getStatistics();
            document.getElementById('mintaro-word-count').textContent = 'Words: ' + stats.words;
            document.getElementById('mintaro-char-count').textContent = 'Characters: ' + stats.characters;
            var sw = document.getElementById('stat-words');
            if (sw) {
                sw.textContent = stats.words;
                document.getElementById('stat-chars').textContent = stats.characters;
                document.getElementById('stat-paras').textContent = stats.paragraphs;
                document.getElementById('stat-images').textContent = stats.images;
                document.getElementById('stat-links').textContent = stats.links;
                document.getElementById('stat-reading-time').textContent = stats.readingTime;
            }
        }

        function showSaveMsg() {
            var msg = document.getElementById('saveMessage');
            if (msg) { msg.classList.add('visible'); setTimeout(function() { msg.classList.remove('visible'); }, 3000); }
            var ls = document.getElementById('last-saved');
            if (ls) ls.textContent = new Date().toLocaleTimeString();
        }

        document.getElementById('save-doc-btn').addEventListener('click', function() {
            editor.save();
        });

        // Initial stats
        updateStats();
    </script>
</body>
</html>
