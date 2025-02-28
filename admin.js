document.addEventListener('DOMContentLoaded', () => {
    // Initialize admin dashboard
    initializeDashboard();
    initializeCharts();
    initCommentModeration();
    initMediaUpload();

    // Fix TinyMCE initialization 
    try {
        tinymce.init({
            selector: '#article-editor',
            directionality: 'rtl',
            plugins: 'link image media table lists',
            toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | link image media | numlist bullist',
            height: 400,
            language: 'ar',
            setup: function(editor) { 
                editor.on('KeyUp', function() { 
                    const content = editor.getContent();
                    ArticleManager.categorizeArticle(content)
                        .then(function(categories) { 
                            updateCategoryPreview(categories);
                        })
                        .catch(function(err) { 
                            console.error('Category analysis failed:', err);
                        });
                });
            }
        });
    } catch(err) {
        console.error('TinyMCE initialization failed:', err);
        const editorEl = document.getElementById('article-editor');
        if(editorEl) {
            editorEl.style.display = 'block';
        }
    }

    // Fix handleFiles function
    async function handleFiles(files) {
        if (!files || !files.length) return;

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                console.warn('Skipping non-image file:', file.name);
                continue;
            }

            try {
                const result = await readFileAsDataURL(file);
                addMediaItem(result);
            } catch(err) {
                handleError(err, `processing file ${file.name}`);
            }
        }
    }

    // Schedule toggle functionality
    document.getElementById('schedule-toggle').addEventListener('change', function() {
        document.getElementById('schedule-time').disabled = !this.checked;
    });

    // Article form submission
    document.getElementById('article-form').addEventListener('submit', function(e) {
        e.preventDefault();
        try {
            const editor = tinymce.get('article-editor');
            if (!editor) throw new Error('Editor not initialized');
            
            const content = editor.getContent();
            const scheduleTime = document.getElementById('schedule-time').value;
            
            submitArticle({content, scheduleTime}).catch(err => {
                handleError(err, 'article submission');
            });
        } catch(err) {
            handleError(err, 'form submission');
        }
    });

    // Centralized error handling
    function handleError(error, context) {
        console.error(`Error in ${context}:`, error);
        // Could add user-facing error message here
    }

    // Admin dashboard initialization
    async function initializeDashboard() {
        try {
            // Load initial stats
            await updateStats();
            // Set up periodic updates
            setInterval(updateStats, 60000);
        } catch(err) {
            handleError(err, 'dashboard initialization');
        }
    }

    // Stats update with error handling
    async function updateStats() {
        try {
            const response = await fetch('/api/admin-stats.php');
            if (!response.ok) throw new Error('Stats fetch failed');
            const data = await response.json();
            
            updateStatElement('articles-count', data.articles);
            updateStatElement('comments-count', data.comments); 
            updateStatElement('today-donations', data.donations);
        } catch(err) {
            handleError(err, 'stats update');
        }
    }

    // Safe element updates
    function updateStatElement(id, value) {
        const element = document.getElementById(id);
        if(element) {
            element.textContent = value;
        }
    }

    // Chart initialization with fallbacks
    function initializeCharts() {
        try {
            initDonationsChart();
            initCampaignChart();
        } catch(err) {
            handleError(err, 'chart initialization');
            // Could add placeholder/fallback visualization
        }
    }

    function initDonationsChart() {
        const ctx = document.getElementById('monthly-chart');
        if(!ctx) return;
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
                datasets: [{
                    label: 'التبرعات الشهرية',
                    data: [12000, 19000, 15000, 25000, 22000, 30000],
                    borderColor: '#1a237e',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });
    }

    function initCampaignChart() {
        const ctx = document.getElementById('campaign-chart');
        if(!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['مساعدة المحتاجين', 'دعم التعليم', 'الرعاية الصحية'],
                datasets: [{
                    data: [45, 30, 25],
                    backgroundColor: ['#1a237e', '#3949ab', '#7986cb']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    // Media upload handling
    function initMediaUpload() {
        const uploadZone = document.getElementById('upload-zone');
        if(!uploadZone) return;

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            
            try {
                await handleFiles(e.dataTransfer.files);
            } catch(err) {
                handleError(err, 'file upload');
            }
        });
    }

    // Add helper function for file reading
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error('File read failed'));
            reader.readAsDataURL(file);
        });
    }

    function addMediaItem(src) {
        const div = document.createElement('div');
        div.className = 'media-item';
        div.innerHTML = `
            <img src="${src}" alt="Uploaded media">
            <div class="media-actions">
                <button onclick="copyUrl(this)"><i class="fas fa-link"></i></button>
                <button onclick="deleteMedia(this)"><i class="fas fa-trash"></i></button>
            </div>
        `;
        const mediaGrid = document.getElementById('media-grid');
        mediaGrid.appendChild(div);
    }

    function updateCategoryPreview(categories) {
        try {
            const preview = document.getElementById('category-preview');
            if (!preview) return;

            preview.innerHTML = categories.map(cat => 
                `<span class="category-tag">${cat}</span>`
            ).join('');
        } catch(err) {
            handleError(err, 'updating category preview');
        }
    }

    function initCommentModeration() {
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;

        commentsList.addEventListener('click', async function(e) {
            if (e.target.classList.contains('ban-user')) {
                const userId = e.target.dataset.userId;
                const reason = prompt('سبب الحظر:');
                if (reason) {
                    try {
                        await CommentSystem.banUser(userId, reason);
                        alert('تم حظر المستخدم بنجاح');
                        loadComments();
                    } catch (error) {
                        alert('فشل حظر المستخدم');
                    }
                }
            }
        });
    }

    async function submitArticle(data) {
        const response = await fetch('/api/articles.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to submit article');
        }

        return response.json();
    }

    function logout() {
        try {
            fetch('/api/logout.php')
                .then(() => {
                    window.location.href = '/login.html';
                });
        } catch(err) {
            handleError(err, 'logout');
            // Force redirect on error
            window.location.href = '/login.html';
        }
    }
});