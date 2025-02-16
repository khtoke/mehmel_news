// Variables and default settings
let members = JSON.parse(localStorage.getItem('users') || '[]');
let publishPassword = localStorage.getItem('publishPassword') || '1234';

const defaultAvatar = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#6B7280">
  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
</svg>
`)}`;

// Authentication and Modal Toggles
const toggleAuthModal = () => {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.toggle('hidden');
  } else {
    console.error('authModal element not found');
  }
};

const toggleAuthType = () => {
  const title = document.getElementById('modalTitle');
  const toggleText = document.getElementById('toggleAuthText');
  const submitButton = document.getElementById('submitAuthButton');
  const registerFields = document.getElementById('registerFields');
  const isLogin = title.textContent === 'تسجيل الدخول';

  if (isLogin) {
    title.textContent = 'إنشاء حساب';
    toggleText.textContent = 'تسجيل الدخول';
    submitButton.textContent = 'إنشاء حساب';
    if (registerFields) registerFields.classList.remove('hidden');
  } else {
    title.textContent = 'تسجيل الدخول';
    toggleText.textContent = 'إنشاء حساب جديد';
    submitButton.textContent = 'تسجيل الدخول';
    if (registerFields) registerFields.classList.add('hidden');
  }
  document.getElementById('authForm').reset();
};

const toggleProfileModal = () => {
  const modal = document.getElementById('profileModal');
  if (modal) {
    modal.classList.toggle('hidden');
  } else {
    console.error('profileModal element not found');
  }
};

const togglePasswordModal = () => {
  const modal = document.getElementById('passwordModal');
  if (modal) {
    modal.classList.toggle('hidden');
  } else {
    console.error('passwordModal element not found');
  }
};

const toggleNewsModal = () => {
  const modal = document.getElementById('newsModal');
  if (modal) {
    modal.classList.toggle('hidden');
  } else {
    console.error('newsModal element not found');
  }
};

const togglePublishMenu = () => {
  const menu = document.getElementById('publishMenu');
  if (menu) {
    menu.classList.toggle('hidden');
  } else {
    console.error('publishMenu element not found');
  }
};

// Authentication Handler
const handleAuth = async (e) => {
  e.preventDefault();
  const form = e.target;
  const isLogin = document.getElementById('modalTitle').textContent === 'تسجيل الدخول';
  const phone = form.elements[0].value;

  if (isLogin) {
    const user = members.find(u => u.phone === phone);
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      updateProfileUI(user);
    }
    user ? showSuccessMessage('تم تسجيل الدخول') : showErrorMessage('المستخدم غير موجود');
    toggleAuthModal();
  } else {
    try {
      let avatarData = null;
      const avatarFile = form.elements[2].files[0];
      
      if (avatarFile) {
        avatarData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(avatarFile);
        });
      }

      const newUser = {
        phone,
        name: form.elements[1].value,
        avatar: avatarData || defaultAvatar,
        joinDate: new Date().toLocaleDateString('ar-EG')
      };

      if (members.some(u => u.phone === phone)) {
        return showErrorMessage('رقم الهاتف مسجل مسبقاً');
      }

      members.push(newUser);
      localStorage.setItem('users', JSON.stringify(members));
      updateMemberCount();
      showSuccessMessage('تم إنشاء الحساب بنجاح');
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      updateProfileUI(newUser);
      toggleAuthModal();
    } catch (error) {
      console.error('Error handling avatar:', error);
      showErrorMessage('حدث خطأ أثناء معالجة الصورة');
    }
  }
};

const updateMemberCount = () => {
  members = JSON.parse(localStorage.getItem('users') || '[]');
  document.querySelectorAll('#memberCount').forEach(el => el.textContent = members.length);
};

const showSuccessMessage = (text) => {
  const existingMsg = document.querySelector('.success-message');
  if (existingMsg) existingMsg.remove();

  const message = document.createElement('div');
  message.className =
    'success-message fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-in';
  message.textContent = text;

  document.body.appendChild(message);
  setTimeout(() => message.remove(), 3000);
};

function showErrorMessage(text) {
  const message = document.createElement('div');
  message.className =
    'error-message fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-in';
  message.textContent = text;

  document.body.appendChild(message);
  setTimeout(() => message.remove(), 3000);
}

// Product Handlers
const handleSell = (e) => {
  e.preventDefault();
  const form = e.target;
  const productData = {
    id: Date.now(),
    name: form.elements[0].value,
    price: form.elements[1].value,
    description: form.elements[2].value,
    category: form.elements[3].value,
    image: form.elements[4].files[0],
    likes: [],
    comments: [],
    date: new Date().toLocaleDateString('ar-EG')
  };

  const existingProducts = JSON.parse(localStorage.getItem('productsData') || '[]');
  const updatedProducts = [productData, ...existingProducts];
  localStorage.setItem('productsData', JSON.stringify(updatedProducts));

  createProductElement(productData);
  form.reset();
  showSuccessMessage('تم إضافة المنتج بنجاح');
};

const createProductElement = (productData) => {
  const productEl = document.createElement('div');
  productEl.className = 'bg-white p-4 rounded-lg shadow mb-4';
  productEl.dataset.productId = productData.id;
  productEl.innerHTML = `
    <div class="flex justify-between items-start">
      <div>
        <h3 class="text-xl font-bold">${productData.name}</h3>
        <p class="text-gray-600 mt-2">${productData.description}</p>
        <div class="mt-2 text-blue-600 font-bold">${productData.price} ريال</div>
        <span class="text-sm bg-gray-100 px-2 py-1 rounded">${productData.category}</span>
      </div>
      <button onclick="deleteProduct(${productData.id})" class="text-red-500 hover:text-red-700">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    </div>
    ${productData.image ? `<img src="${URL.createObjectURL(productData.image)}" class="mt-4 w-32 h-32 object-cover rounded-lg">` : ''}
    ${generateProductActions(productData)}
    ${generateCommentsSection(productData, 'product')}
  `;
  const container = document.getElementById('products-list');
  if (container) {
    container.prepend(productEl);
  } else {
    console.error("Container with id 'products-list' not found.");
  }
};

const deleteProduct = (id) => {
  const existingProducts = JSON.parse(localStorage.getItem('productsData') || '[]');
  const updatedProducts = existingProducts.filter(p => p.id !== id);
  localStorage.setItem('productsData', JSON.stringify(updatedProducts));
  
  const product = document.querySelector(`[data-product-id="${id}"]`);
  if (product) product.remove();
  showSuccessMessage('تم حذف المنتج بنجاح');
};

const generateProductActions = (product) => `
  <div class="product-actions flex items-center justify-between mt-4">
    <button onclick="handleLike(${product.id}, 'product')" class="flex items-center text-red-500 hover:text-red-700">
      <svg class="w-5 h-5 mr-1" fill="${product.likes?.includes(JSON.parse(localStorage.getItem('currentUser'))?.phone) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
      </svg>
      <span class="like-count">${product.likes?.length || 0}</span>
    </button>
    <button onclick="deleteProduct(${product.id})" class="text-gray-500 hover:text-gray-700">
      حذف
    </button>
  </div>
`;

const generateCommentsSection = (itemData, type) => `
  <div class="comments-section mt-6">
    <h4 class="font-semibold mb-3">التعليقات (${itemData.comments?.length || 0})</h4>
    <div class="comments-container space-y-4">
      ${(itemData.comments || []).map(c => `
        <div class="comment bg-gray-50 p-3 rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <img src="${c.avatar || defaultAvatar}" class="comment-avatar rounded-full">
            <span class="font-medium">${c.author}</span>
            <span class="text-sm text-gray-500">${c.date}</span>
          </div>
          <p class="text-gray-700">${c.content}</p>
        </div>
      `).join('')}
    </div>
    
    <form onsubmit="event.preventDefault(); addComment(${itemData.id}, '${type}', this.elements[0].value)" 
          class="mt-4 ${localStorage.getItem('currentUser') ? '' : 'hidden'}">
      <textarea name="content" class="w-full p-2 border rounded-lg" placeholder="أضف تعليقاً..." required></textarea>
      <button class="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
        نشر التعليق
      </button>
    </form>
  </div>
`;

const renderNewsArticle = (newsData, prepend = false) => {
  if (!newsData?.id) return;
  
  const newsCard = document.createElement('div');
  newsCard.dataset.newsId = newsData.id;
  newsCard.className =
    'news-card bg-white rounded-xl shadow-md overflow-hidden transform transition hover:scale-[1.01]';
  newsCard.innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-semibold">${newsData.title}</h3>
        <span class="text-sm text-gray-500">${newsData.date || 'تاريخ غير محدد'}</span>
      </div>
      ${newsData.image ? `
      <div class="relative mb-4">
        <img src="${newsData.image}" 
             class="w-full h-64 object-cover rounded-lg shadow-sm hover:opacity-95 transition-all"
             alt="${newsData.title}">
      </div>` : ''}
      <p class="text-gray-600 mb-4 leading-relaxed">${newsData.content}</p>
      ${generateNewsActions(newsData)}
      ${generateCommentsSection(newsData, 'news')}
    </div>
  `;

  const container = document.getElementById('news-container');
  if (container) {
    prepend ? container.prepend(newsCard) : container.appendChild(newsCard);
  }
};

const generateNewsActions = (news) => `
  <div class="flex items-center justify-between mt-4">
    <button onclick="handleLike(${news.id}, 'news')" class="flex items-center text-red-500 hover:text-red-700">
      <svg class="w-5 h-5 mr-1" fill="${news.likes?.includes(JSON.parse(localStorage.getItem('currentUser'))?.phone) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
      </svg>
      <span class="like-count">${news.likes?.length || 0}</span>
    </button>
    <button onclick="deleteNews(${news.id})" class="text-gray-500 hover:text-gray-700">
      حذف
    </button>
  </div>
`;

const deleteNews = (id) => {
  const existingNews = JSON.parse(localStorage.getItem('communityNews') || '[]');
  const updatedNews = existingNews.filter(news => news.id !== id);
  localStorage.setItem('communityNews', JSON.stringify(updatedNews));
  
  const newsElement = document.querySelector(`[data-news-id="${id}"]`);
  if (newsElement) newsElement.remove();
  showSuccessMessage('تم حذف الخبر بنجاح');
};

const addComment = (postId, postType, commentText) => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) return showErrorMessage('يجب تسجيل الدخول أولاً');
  if (!commentText.trim()) return showErrorMessage('اكتب محتوى التعليق قبل النشر');

  const storageKey = postType === 'news' ? 'communityNews' : 'productsData';
  const items = JSON.parse(localStorage.getItem(storageKey)) || [];
  const item = items.find(i => i.id === postId);

  const newComment = {
    id: Date.now(),
    author: currentUser.name || 'مجهول',
    avatar: currentUser.avatar,
    content: commentText,
    date: new Date().toLocaleDateString('ar-EG', { 
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };

  if (!item.comments) item.comments = [];
  item.comments.unshift(newComment);
  localStorage.setItem(storageKey, JSON.stringify(items));

  // تحديث الواجهة
  document.querySelectorAll(`[data-${postType}-id="${postId}"] .comments-container`)
    .forEach(container => {
      container.prepend(createCommentElement(newComment));
      container.closest('.comments-section').querySelector('form').reset();
    });
  
  showSuccessMessage('تمت إضافة التعليق بنجاح');
};

const createCommentElement = (comment) => {
  const commentElement = document.createElement('div');
  commentElement.className = 'comment';
  commentElement.innerHTML = `
    <div class="comment-header">
      <img src="${comment.avatar || defaultAvatar}" 
           class="comment-avatar" 
           alt="${comment.author}">
      <div>
        <div class="comment-author">${comment.author}</div>
        <div class="comment-date">${comment.date}</div>
      </div>
    </div>
    <div class="comment-content">${comment.content}</div>
  `;
  return commentElement;
};

const handleProfileUpdate = async (e) => {
  e.preventDefault();
  const form = e.target;

  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    const getValue = (name) => form.querySelector(`[name="${name}"]`)?.value || '';
    
    let avatarUrl = currentUser.avatar;
    const avatarInput = form.querySelector('[name="avatar"]');
    
    if (avatarInput?.files[0]) {
      avatarUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(avatarInput.files[0]);
      });
    }

    const newData = {
      ...currentUser,
      name: getValue('name'),
      location: getValue('location'),
      bio: getValue('bio'),
      socialLinks: getValue('socialLinks').split(',').map(s => s.trim()),
      avatar: avatarUrl
    };

    updateProfile(newData);
    showSuccessMessage('تم تحديث الملف الشخصي');
    toggleProfileModal();
  } catch (error) {
    console.error('Error updating profile:', error);
    showErrorMessage('حدث خطأ أثناء تحديث الملف الشخصي');
  }
};

const updateProfile = (newData) => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) return;

  members = members.map(u => {
    if (u.phone === currentUser.phone) {
      const updatedUser = {
        ...u,
        ...newData,
        likes: u.likes || [],
        comments: u.comments || []
      };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      return updatedUser;
    }
    return u;
  });

  localStorage.setItem('users', JSON.stringify(members));
  updateProfileUI(JSON.parse(localStorage.getItem('currentUser')));
};

// Updated updateProfileUI to always show the persisted avatar
const updateProfileUI = (user) => {
  document.querySelectorAll('.profile-button').forEach(btn => {
    btn.innerHTML = `
      <img src="${user?.avatar ? user.avatar : defaultAvatar}" 
           class="w-8 h-8 rounded-full object-cover">
      <span class="mr-2">${user?.name || 'مستخدم'}</span>
    `;
  });

  const modal = document.getElementById('profileModal');
  if (modal) {
    const preview = modal.querySelector('.avatar-preview');
    if (preview) {
      preview.src = user?.avatar ? user.avatar : defaultAvatar;
    }
    modal.querySelector('[name="name"]').value = user?.name || '';
    modal.querySelector('[name="location"]').value = user?.location || '';
    modal.querySelector('[name="bio"]').value = user?.bio || '';
    modal.querySelector('[name="socialLinks"]').value = user?.socialLinks?.join(',') || '';
  }
};

// Updated handleAvatarUpload to persist the profile image immediately
const handleAvatarUpload = async (input) => {
  if (!input.files || !input.files[0]) return;

  try {
    const file = input.files[0];
    if (file.size > 1024 * 1024) { // 1MB limit
      showErrorMessage('حجم الصورة يجب أن يكون أقل من 1 ميجابايت');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      // Update the avatar preview in the profile modal
      const preview = document.querySelector('.avatar-preview');
      if (preview) {
        preview.src = e.target.result;
      }
      // Persist the avatar for the current user in localStorage
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      if (currentUser) {
        currentUser.avatar = e.target.result;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateProfileUI(currentUser);
      }
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error('Error handling avatar upload:', error);
    showErrorMessage('เหต خطأ أثناء معالجة الصورة');
  }
};

const previewImage = (event, previewId) => {
  const preview = document.getElementById(previewId);
  if (event.target.files && event.target.files[0] && preview) {
    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(event.target.files[0]);
  } else if (preview) {
    preview.style.display = 'none';
  }
};

(function attachPreviewListeners(){
  const newsImageInput = document.getElementById('newsImage');
  if (newsImageInput) {
    newsImageInput.addEventListener('change', (e) => previewImage(e, 'newsImagePreview'));
  }
  
  const productImageInput = document.getElementById('fileInput');
  if (productImageInput) {
    productImageInput.addEventListener('change', (e) => previewImage(e, 'productImagePreview'));
  }
})();

function handleLike(itemId, itemType) {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) {
    showErrorMessage('يجب تسجيل الدخول لتقييم الإعجاب');
    return;
  }
  
  let storageKey;
  if (itemType === 'news') {
    storageKey = 'communityNews';
  } else if (itemType === 'product') {
    storageKey = 'productsData';
  } else {
    console.error('Unsupported type in handleLike:', itemType);
    return;
  }
  
  let items = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const itemIndex = items.findIndex(item => item.id === itemId);
  if (itemIndex === -1) {
    showErrorMessage('العنصر غير موجود');
    return;
  }
  let item = items[itemIndex];
  if (!item.likes) item.likes = [];
  
  const userPhone = currentUser.phone;
  const likedIndex = item.likes.indexOf(userPhone);
  let isLiked = false;
  
  if (likedIndex === -1) {
    // Add like
    item.likes.push(userPhone);
    isLiked = true;
  } else {
    // Remove like
    item.likes.splice(likedIndex, 1);
    isLiked = false;
  }
  
  items[itemIndex] = item;
  localStorage.setItem(storageKey, JSON.stringify(items));
  
  // Update UI: update like count and svg fill
  let card;
  if (itemType === 'news') {
    card = document.querySelector(`[data-news-id="${itemId}"]`);
  } else if (itemType === 'product') {
    card = document.querySelector(`[data-product-id="${itemId}"]`);
  }
  
  if (card) {
    const likeBtn = card.querySelector('button.flex.items-center.text-red-500');
    if (likeBtn) {
      const likeCountSpan = likeBtn.querySelector('.like-count');
      if (likeCountSpan) {
        likeCountSpan.textContent = item.likes.length;
      }
      const svg = likeBtn.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', isLiked ? 'currentColor' : 'none');
      }
    }
  }
}

function handleNewsSubmission(e) {
  e.preventDefault();
  const form = e.target;
  const inputPassword = form.elements["newsPassword"].value;
  
  if (inputPassword !== publishPassword) {
    showErrorMessage('كلمة المرور غير صحيحة');
    return;
  }
  
  const file = form.elements["newsImage"].files[0];
  
  const processSubmission = (imageData) => {
    const newsData = {
      id: Date.now(),
      title: form.elements["newsTitle"].value,
      content: form.elements["newsContent"].value,
      image: imageData,
      likes: [],
      comments: [],
      date: new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      author: "مستخدم جديد"
    };

    const existingNews = JSON.parse(localStorage.getItem('communityNews') || '[]');
    const updatedNews = [newsData, ...existingNews];
    localStorage.setItem('communityNews', JSON.stringify(updatedNews));

    renderNewsArticle(newsData, true);
    form.reset();
    toggleNewsModal();
    showSuccessMessage('تم نشر الخبر بنجاح');
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = () => processSubmission(reader.result);
    reader.readAsDataURL(file);
  } else {
    processSubmission(null);
  }
}

function handleChangePassword(e) {
  e.preventDefault();

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (currentPassword !== publishPassword) {
    showErrorMessage('كلمة المرور الحالية غير صحيحة');
    return;
  }

  if (newPassword !== confirmPassword) {
    showErrorMessage('كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقتين');
    return;
  }

  publishPassword = newPassword;
  localStorage.setItem('publishPassword', publishPassword);
  showSuccessMessage('تم تغيير كلمة المرور بنجاح');
  togglePasswordModal();
}

window.toggleAuthModal = toggleAuthModal;
window.toggleAuthType = toggleAuthType;
window.handleAuth = handleAuth;
window.deleteProduct = deleteProduct;
window.handleSell = handleSell;
window.togglePublishMenu = togglePublishMenu;
window.handleNewsSubmission = handleNewsSubmission;
window.toggleNewsModal = toggleNewsModal;
window.deleteNews = deleteNews;
window.toggleProfileModal = toggleProfileModal;
window.handleProfileUpdate = handleProfileUpdate;
window.handleLike = handleLike;
window.addComment = addComment;
window.handleAvatarUpload = handleAvatarUpload;
window.updateProfileUI = updateProfileUI;
window.togglePasswordModal = togglePasswordModal;
window.handleChangePassword = handleChangePassword;

document.addEventListener('DOMContentLoaded', () => {
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    updateProfileUI(JSON.parse(storedUser));
  }
  updateMemberCount();
  
  const savedNews = JSON.parse(localStorage.getItem('communityNews') || '[]')
    .filter(news => news?.id && news.title);
  savedNews.forEach(news => renderNewsArticle(news));
  
  const homeContainer = document.getElementById('home-news');
  if (homeContainer) {
    homeContainer.innerHTML = savedNews.slice(0, 3)
      .filter(news => !!news)
      .map(news => `
        <div class="news-card bg-white rounded-lg shadow-md overflow-hidden">
          <div class="p-6">
            <h3 class="text-xl font-semibold mb-2 truncate">${news.title}</h3>
            ${news.image ? `
            <div class="relative mb-4">
              <img src="${news.image}" 
                   class="w-full h-48 object-cover rounded-lg shadow-sm hover:opacity-95 transition-all"
                   alt="${news.title}">
            </div>` : ''}
            <p class="text-gray-600 mb-4 line-clamp-3">${news.content}</p>
            <div class="text-sm text-blue-600">${news.date}</div>
          </div>
        </div>
      `).join('');
  }
  
  const savedProducts = JSON.parse(localStorage.getItem('productsData') || '[]');
  savedProducts.forEach(p => createProductElement(p));
  
  document.querySelectorAll('#memberCount').forEach(el => el.textContent = members.length);
});