// Article categorization and suggestion system
class ArticleManager {
    static keywords = {
        urgent: ['عاجل', 'خطير', 'حصري', 'الآن', 'طارئ'],
        sports: ['مباراة', 'دوري', 'كرة', 'لاعب', 'منتخب'],
        charity: ['تبرع', 'مساعدة', 'خيري', 'دعم', 'إغاثة']
    };

    static async categorizeArticle(content) {
        try {
            const categories = [];
            for (const [category, words] of Object.entries(this.keywords)) {
                const matches = words.filter(function(word) { 
                    return content.toLowerCase().includes(word.toLowerCase());
                });
                if (matches.length >= 2) {
                    categories.push(category);
                }
            }
            return categories;
        } catch (error) {
            console.error('Error in categorization:', error);
            return [];
        }
    }

    static async getRelatedArticles(currentArticle, allArticles) {
        try {
            const currentCategories = await this.categorizeArticle(currentArticle.content);
            return allArticles
                .filter(article => article.id !== currentArticle.id)
                .map(article => ({
                    article,
                    relevance: this.calculateRelevance(
                        currentCategories,
                        await this.categorizeArticle(article.content)
                    )
                }))
                .sort((a, b) => b.relevance - a.relevance)
                .slice(0, 3)
                .map(item => item.article);
        } catch (error) {
            console.error('Error getting related articles:', error);
            return [];
        }
    }

    static calculateRelevance(cat1, cat2) {
        try {
            return cat1.filter(c => cat2.includes(c)).length;
        } catch (error) {
            console.error('Error calculating relevance:', error);
            return 0;
        }
    }
}

// Comment management system with error handling
class CommentSystem {
    static bannedWords = new Set(['حظر1', 'حظر2', 'حظر3']);
    static bannedUsers = new Set();
    static lastFetchTime = 0;
    static cacheDuration = 5 * 60 * 1000; // 5 minutes cache

    static async loadModerationData() {
        try {
            const now = Date.now();
            if (now - this.lastFetchTime > this.cacheDuration) {
                const response = await fetch('/api/moderation-data.php');
                if (!response.ok) throw new Error('Failed to fetch moderation data');
                const data = await response.json();
                this.bannedWords = new Set(data.bannedWords);
                this.bannedUsers = new Set(data.bannedUsers);
                this.lastFetchTime = now;
            }
        } catch (error) {
            console.error('Error loading moderation data:', error);
            // Use cached data if available
        }
    }

    static filterComment(comment) {
        try {
            let filteredText = comment;
            this.bannedWords.forEach(word => {
                const regex = new RegExp(word, 'gi');
                filteredText = filteredText.replace(regex, '***');
            });
            return filteredText;
        } catch (error) {
            console.error('Error filtering comment:', error);
            return comment; // Return original if filtering fails
        }
    }

    static async submitComment(userId, articleId, commentText) {
        try {
            await this.loadModerationData();
            
            if (this.bannedUsers.has(userId)) {
                throw new Error('تم حظر هذا المستخدم من التعليق');
            }

            const filteredComment = this.filterComment(commentText);
            
            const response = await fetch('/api/comments.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    articleId: articleId,
                    comment: filteredComment
                })
            });

            if (!response.ok) {
                throw new Error('فشل إضافة التعليق');
            }

            return await response.json();
        } catch (error) {
            console.error('Error submitting comment:', error);
            throw error; // Re-throw to handle in UI
        }
    }
}

// Initialize event listeners with error handling
document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeNewsScroll();
        initializeCommentSystem();
        initializeImageLoading();

        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        
        const nav = document.querySelector('.main-nav');
        const menu = nav.querySelector('ul');
        
        nav.insertBefore(menuToggle, menu);
        
        menuToggle.addEventListener('click', () => {
            menu.classList.toggle('show');
            menuToggle.innerHTML = menu.classList.contains('show') ? 
                '<i class="fas fa-times"></i>' : 
                '<i class="fas fa-bars"></i>';
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && menu.classList.contains('show')) {
                menu.classList.remove('show');
                menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });

        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            menu.classList.remove('show');
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        });

    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

function initializeNewsScroll() {
    try {
        const newsScroll = document.querySelector('.news-scroll');
        if (newsScroll) {
            const clone = newsScroll.cloneNode(true);
            newsScroll.parentNode.appendChild(clone);
        }
    } catch (error) {
        console.error('Error initializing news scroll:', error);
    }
}

function initializeCommentSystem() {
    try {
        document.querySelectorAll('.comment-form').forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    const commentText = e.target.querySelector('textarea').value;
                    const currentUserId = form.dataset.userId;
                    await CommentSystem.submitComment(
                        currentUserId,
                        form.dataset.articleId,
                        commentText
                    );
                    loadComments(form.dataset.articleId);
                } catch (error) {
                    alert(error.message);
                }
            });
        });
    } catch (error) {
        console.error('Error initializing comment system:', error);
    }
}

function initializeImageLoading() {
    try {
        const images = document.querySelectorAll('.image-placeholder');
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('loaded');
                        imageObserver.unobserve(entry.target);
                    }
                });
            });

            images.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            images.forEach(img => img.classList.add('loaded'));
        }
    } catch (error) {
        console.error('Error initializing image loading:', error);
    }
}

function loadComments(articleId) {
    fetch(`/api/comments.php?articleId=${articleId}`)
        .then((response) => response.json())
        .then((comments) => {
            const commentsContainer = document.querySelector(`[data-article-id="${articleId}"] .comments-container`);
            if (commentsContainer) {
                commentsContainer.innerHTML = comments.map((comment) => `
                    <div class="comment">
                        <strong>${comment.username}</strong>
                        <p>${comment.content}</p>
                    </div>
                `).join('');
            }
        })
        .catch((error) => console.error('Error loading comments:', error));
}

window.addEventListener('scroll', function() {
    const nav = document.querySelector('.main-nav');
    if (window.scrollY > 50) {
        nav.style.padding = '10px 5%';
    } else {
        nav.style.padding = '15px 5%';
    }
});