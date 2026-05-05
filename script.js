/* script.js */
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileUpload = document.getElementById('file-upload');
    const markdownViewer = document.getElementById('markdown-viewer');
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    const recentFilesBtn = document.getElementById('recent-files-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const recentSidebar = document.getElementById('recent-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const recentFilesList = document.getElementById('recent-files-list');

    // Recent Files Logic
    const MAX_RECENT_FILES = 10;
    const MAX_FILE_SIZE = 1024 * 500; // 500kb max

    const saveToRecent = (filename, content) => {
        if (content.length > MAX_FILE_SIZE) return;
        try {
            let recentFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
            recentFiles = recentFiles.filter(f => f.name !== filename);
            recentFiles.unshift({ name: filename, content: content, date: new Date().toISOString() });
            if (recentFiles.length > MAX_RECENT_FILES) recentFiles.pop();
            localStorage.setItem('recentFiles', JSON.stringify(recentFiles));
        } catch (e) {
            console.warn('Could not save recent file (localStorage full)', e);
        }
    };

    const renderRecentFiles = () => {
        let recentFiles = [];
        try {
            recentFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
        } catch (e) { }

        if (recentFiles.length === 0) {
            recentFilesList.innerHTML = '<div class="empty-state">No recent files yet.</div>';
            return;
        }

        recentFilesList.innerHTML = '';
        recentFiles.forEach(file => {
            const dateObj = new Date(file.date);
            const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const item = document.createElement('div');
            item.className = 'recent-file-item';
            item.innerHTML = `
                <div class="recent-file-name" title="${file.name}">${file.name}</div>
                <div class="recent-file-date">${dateStr}</div>
            `;

            item.addEventListener('click', () => {
                toggleSidebar();
                renderMarkdown(file.content);
            });

            recentFilesList.appendChild(item);
        });
    };

    const toggleSidebar = () => {
        recentSidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
        if (recentSidebar.classList.contains('open')) {
            renderRecentFiles();
        }
    };

    recentFilesBtn.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    const renderMarkdown = (markdownText) => {
        const rawHtml = marked.parse(markdownText);
        const cleanHtml = DOMPurify.sanitize(rawHtml);
        markdownViewer.innerHTML = cleanHtml;

        dropZone.classList.remove('active');
        setTimeout(() => {
            markdownViewer.style.display = 'block';
        }, 300);
    };

    // Configure marked.js to use highlight.js for syntax highlighting
    marked.setOptions({
        highlight: function (code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-',
        gfm: true,
        breaks: true
    });

    // Theme Management
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    };

    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        if (newTheme === 'dark') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    };

    themeToggle.addEventListener('click', toggleTheme);
    initTheme();

    // File Handling
    const processFile = (file) => {
        if (!file) return;

        // Check file type
        const isMarkdown = file.name.toLowerCase().endsWith('.md') ||
            file.name.toLowerCase().endsWith('.markdown') ||
            file.type === 'text/markdown';

        if (!isMarkdown) {
            alert('Please drop a Markdown file (.md or .markdown)');
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            const markdownText = e.target.result;

            saveToRecent(file.name, markdownText);
            renderMarkdown(markdownText);
        };

        reader.onerror = () => {
            alert('Error reading the file.');
        };

        reader.readAsText(file);
    };

    // Drag and Drop Events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        // Also prevent defaults on the whole window to avoid accidental browser navigation
        window.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        if (dropZone.classList.contains('active')) {
            dropZone.classList.add('dragover');
        }
    }

    function unhighlight(e) {
        dropZone.classList.remove('dragover');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    // For when dropping on the whole window
    window.addEventListener('drop', (e) => {
        if (dropZone.classList.contains('active') && e.target !== dropZone && !dropZone.contains(e.target)) {
            handleDrop(e);
        } else if (!dropZone.classList.contains('active')) {
            // Also handle it if we are already viewing a markdown file, we can drop a new one over the whole app
            handleDrop(e);
        }
    }, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    }

    // Input File selector
    fileUpload.addEventListener('change', function () {
        if (this.files && this.files.length > 0) {
            processFile(this.files[0]);
        }
    });
});
