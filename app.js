import { 
  db, auth, collection, addDoc, query, orderBy, 
  onSnapshot, updateDoc, arrayUnion, arrayRemove,
  signInAnonymously, onAuthStateChanged, doc, getDoc, setDoc, signInWithPhoneNumber, limit
} from './firebase.js';

// Initialize Firebase Auth
let currentUser = null;
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = {
      uid: user.uid,
      phone: user.phoneNumber,
      name: user.displayName,
      avatar: user.photoURL,
      following: []
    };
    updateProfileUI(currentUser);
  } else {
    signInAnonymously(auth);
  }
});

// Update news loading to use Firestore
const loadNews = async (page) => {
  const q = query(collection(db, "news"), orderBy("timestamp", "desc"));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const allNews = [];
    querySnapshot.forEach((doc) => {
      allNews.push({ id: doc.id, ...doc.data() });
    });
    
    const start = (page - 1) * 10; // assuming 10 articles per page
    const newsToShow = allNews.slice(0, start + 10);
    renderNews(newsToShow);
  });
};

// Updated handleNewsSubmission
const handleNewsSubmission = async (e) => {
  e.preventDefault();
  const form = e.target;
  
  try {
    const newsData = {
      title: form.newsTitle.value,
      content: form.newsContent.value,
      author: currentUser.name,
      authorUID: currentUser.uid,
      timestamp: new Date(),
      likes: [],
      comments: []
    };

    const docRef = await addDoc(collection(db, "news"), newsData);
    showSuccessMessage('تم نشر الخبر بنجاح');
    form.reset();
    toggleNewsModal();
  } catch (error) {
    console.error("Error adding news:", error);
    showErrorMessage('حدث خطأ أثناء النشر');
  }
};

// Updated addComment function
const addComment = async (postId, postType, commentText) => {
  try {
    const commentData = {
      author: currentUser.name,
      authorUID: currentUser.uid,
      content: commentText.trim(),
      timestamp: new Date(),
      avatar: currentUser.avatar
    };

    const docRef = doc(db, "news", postId);
    await updateDoc(docRef, {
      comments: arrayUnion(commentData)
    });
    
    showSuccessMessage('تمت إضافة التعليق بنجاح');
  } catch (error) {
    console.error("Error adding comment:", error);
    showErrorMessage('حدث خطأ أثناء إضافة التعليق');
  }
};

// Updated handleLike function
const handleLike = async (postId, type) => {
  try {
    const docRef = doc(db, "news", postId);
    if (type === 'news') {
      const postDoc = await getDoc(docRef);
      const likes = postDoc.data().likes || [];
      
      if (likes.includes(currentUser.uid)) {
        await updateDoc(docRef, {
          likes: arrayRemove(currentUser.uid)
        });
      } else {
        await updateDoc(docRef, {
          likes: arrayUnion(currentUser.uid)
        });
      }
    }
  } catch (error) {
    console.error("Error updating likes:", error);
    showErrorMessage('حدث خطأ أثناء تحديث الإعجابات');
  }
};

// Update products handling
const getProducts = async () => {
  const q = query(collection(db, "products"), orderBy("timestamp", "desc"));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const productsList = document.getElementById('products-list');
    productsList.innerHTML = '';
    
    querySnapshot.forEach((doc) => {
      const product = { id: doc.id, ...doc.data() };
      const productEl = createProductElement(product);
      productsList.appendChild(productEl);
    });
  });
};

// Update user authentication
const handleAuth = async (e) => {
  e.preventDefault();
  const form = e.target;
  const phone = form.phone.value;
  
  try {
    const userCredential = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
    const verificationCode = prompt('أدخل رمز التحقق المرسل إليك');
    await userCredential.confirm(verificationCode);
    
    const user = userCredential.user;
    await setDoc(doc(db, "users", user.uid), {
      phone: phone,
      name: form.name.value,
      avatar: currentUser.avatar,
      joinDate: new Date(),
      following: []
    });
    
    showSuccessMessage('تم تسجيل الدخول بنجاح');
    toggleAuthModal();
  } catch (error) {
    console.error("Authentication error:", error);
    showErrorMessage('فشل في المصادقة: ' + error.message);
  }
};

// Update follow system
const handleFollow = async (userId) => {
  try {
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      following: arrayUnion(userId)
    });
    showSuccessMessage('تمت المتابعة بنجاح');
  } catch (error) {
    console.error("Error following user:", error);
    showErrorMessage('حدث خطأ أثناء المتابعة');
  }
};

// Real-time updates instead of localStorage events
const setupRealtimeUpdates = () => {
  updateStats();
  onSnapshot(collection(db, "news"), () => loadNews());
  onSnapshot(collection(db, "products"), () => getProducts());
  onSnapshot(collection(db, "users"), () => updateMemberCount());
};

// Update initial load
document.addEventListener('DOMContentLoaded', () => {
  setupRealtimeUpdates(); 
  applyTheme();
  signInAnonymously(auth);
  loadHomeNews();
});

// Remove all localStorage references and update related functions...

// Update createProductElement
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

// Update deleteProduct
const deleteProduct = async (id) => {
  try {
    await updateDoc(doc(db, "products", id), {
      deleted: true
    });
    showSuccessMessage('تم حذف المنتج بنجاح');
  } catch (error) {
    console.error("Error deleting product:", error);
    showErrorMessage('حدث خطأ أثناء حذف المنتج');
  }
};

// Update renderNewsArticle
const renderNewsArticle = async (newsData, prepend = false) => {
  if (!newsData?.id) return;
  
  const newsCard = document.createElement('article');
  newsCard.className = 'news-card bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-transform hover:scale-[1.01]';
  newsCard.innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-semibold dark:text-white">${newsData.title}</h3>
        <span class="text-sm text-gray-500 dark:text-gray-400">${newsData.date}</span>
      </div>
      
      ${newsData.image ? `
      <div class="relative mb-4 aspect-video">
        <img src="${newsData.image}" 
             class="w-full h-full object-cover rounded-lg" 
             alt="${newsData.title}"
             loading="lazy">
      </div>` : ''}
      
      <p class="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">${newsData.content}</p>
      
      <div class="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
        <button onclick="handleLike(${newsData.id}, 'news')" class="flex items-center text-red-500 hover:text-red-600">
          <svg class="w-5 h-5 mr-1" fill="${newsData.likes?.includes(currentUser.uid) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
          <span class="like-count">${newsData.likes?.length || 0}</span>
        </button>
        <button onclick="deleteNews(${newsData.id})" class="text-gray-500 hover:text-gray-700 dark:text-gray-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
      
      <!-- قسم التعليقات المحسّن -->
      <div class="comments-section mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 class="font-semibold mb-4 dark:text-white">التعليقات (${newsData.comments?.length || 0})</h4>
        <div class="space-y-4">
          ${(newsData.comments || []).map(c => `
            <div class="comment flex items-start gap-3">
              <img src="${c.avatar || defaultAvatar}" 
                   class="w-8 h-8 rounded-full object-cover flex-shrink-0"
                   alt="${c.author}">
              <div class="flex-1">
                <div class="flex items-baseline gap-2">
                  <span class="font-medium text-sm dark:text-gray-200">${c.author}</span>
                  <span class="text-xs text-gray-500">${c.date}</span>
                </div>
                <p class="text-gray-700 dark:text-gray-300 text-sm mt-1">${c.content}</p>
              </div>
            </div>
          `).join('')}
        </div>
        
        <form onsubmit="event.preventDefault(); addComment(${newsData.id}, 'news', this.comment.value, this)" 
              class="mt-4 ${currentUser ? '' : 'hidden'}">
          <div class="flex gap-2">
            <textarea name="comment" 
                      class="flex-1 p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      placeholder="أضف تعليقاً..." 
                      rows="1"
                      style="min-height: 40px"
                      required></textarea>
            <button class="self-end bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm">
              نشر
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const container = document.getElementById('news-container');
  if (container) {
    prepend ? container.prepend(newsCard) : container.appendChild(newsCard);
  }
};

// Update deleteNews
const deleteNews = async (id) => {
  try {
    await updateDoc(doc(db, "news", id), {
      deleted: true
    });
    showSuccessMessage('تم حذف الخبر بنجاح');
  } catch (error) {
    console.error("Error deleting news:", error);
    showErrorMessage('حدث خطأ أثناء حذف الخبر');
  }
};

// Update generateProductActions
const generateProductActions = (product) => `
  <div class="product-actions flex items-center justify-between mt-4">
    <button onclick="handleLike(${product.id}, 'product')" class="flex items-center text-red-500 hover:text-red-600">
      <svg class="w-5 h-5 mr-1" fill="${product.likes?.includes(currentUser.uid) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
      </svg>
      <span class="like-count">${product.likes?.length || 0}</span>
    </button>
    <button onclick="deleteProduct(${product.id})" class="text-gray-500 hover:text-gray-700">
      حذف
    </button>
  </div>
`;

// Update generateCommentsSection
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
    
    <form onsubmit="event.preventDefault(); addComment(${itemData.id}, '${type}', this.elements[0].value, this)" 
          class="mt-4 ${currentUser ? '' : 'hidden'}">
      <textarea name="content" class="w-full p-2 border rounded-lg" placeholder="أضف تعليقاً..." required></textarea>
      <button class="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
        نشر التعليق
      </button>
    </form>
  </div>
`;

// Update updateMemberCount
const updateMemberCount = async () => {
  const userRef = collection(db, "users");
  const unsubscribe = onSnapshot(userRef, (querySnapshot) => {
    const count = querySnapshot.size;
    document.querySelectorAll('#memberCount').forEach(el => el.textContent = count);
  });
};

// Update showSuccessMessage
function showSuccessMessage(text) {
  const existingMsg = document.querySelector('.success-message');
  if (existingMsg) existingMsg.remove();

  const message = document.createElement('div');
  message.className =
    'success-message fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-in';
  message.textContent = text;

  document.body.appendChild(message);
  setTimeout(() => message.remove(), 3000);
}

// Update showErrorMessage
function showErrorMessage(text) {
  const message = document.createElement('div');
  message.className =
    'error-message fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-in';
  message.textContent = text;

  document.body.appendChild(message);
  setTimeout(() => message.remove(), 3000);
}

// Update handleSell
const handleSell = async (e) => {
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

  try {
    const docRef = await addDoc(collection(db, "products"), productData);
    showSuccessMessage('تم إضافة المنتج بنجاح');
    form.reset();
  } catch (error) {
    console.error("Error adding product:", error);
    showErrorMessage('حدث خطأ أثناء إضافة المنتج');
  }
};

// Update updateProfileUI
const updateProfileUI = (user) => {
  // تحديث الأزرار في كل الصفحات
  document.querySelectorAll('.profile-button').forEach(btn => {
    // المحافظة على بنية الزر الكاملة مع الأحداث
    btn.innerHTML = `
      <img src="${user?.avatar || defaultAvatar}" 
           class="w-8 h-8 rounded-full object-cover border-2 border-white/20 transition-all duration-300 hover:border-blue-500">
      <span class="text-white mr-2 font-medium">${user?.name || 'مرحبًا'}</span>
    `;
    btn.onclick = toggleProfileModal; // إعادة تعيين الحدث بعد التحديث
  });

  // التحديثات الحالية للمودال...
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

// Update handleProfileUpdate
const handleProfileUpdate = async (e) => {
  e.preventDefault();
  const form = e.target;
  
  try {
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      name: form.elements.name.value,
      location: form.elements.location.value,
      bio: form.elements.bio.value,
      socialLinks: form.elements.socialLinks.value.split(',').map(s => s.trim())
    });
    
    showSuccessMessage('تم تحديث الملف الشخصي بنجاح');
    toggleProfileModal();
  } catch (error) {
    console.error("Error updating profile:", error);
    showErrorMessage('حدث خطأ أثناء تحديث الملف الشخصي');
  }
};

// Update handleAvatarUpload
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
      // Persist the avatar for the current user in Firestore
      const userRef = doc(db, "users", currentUser.uid);
      updateDoc(userRef, {
        avatar: e.target.result
      });
      updateProfileUI(currentUser);
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error('Error handling avatar upload:', error);
    showErrorMessage('حدث خطأ أثناء معالجة الصورة');
  }
};

// Update previewImage
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

// Update applyTheme
function applyTheme() {
  document.documentElement.setAttribute('data-theme', 'light');
  const themeIcon = document.querySelector('.theme-toggle svg');
  if (themeIcon) {
    themeIcon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
    `;
  }
}

// Update toggleTheme
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', currentTheme === 'light' ? 'dark' : 'light');
}

// Update handleNewsSubmission event listener
document.getElementById('news-form')?.addEventListener('submit', handleNewsSubmission);

// Update loadMore event listener
document.getElementById('loadMore')?.addEventListener('click', () => {
  // loadNews(currentPage);
});

window.toggleAuthModal = () => {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.toggle('hidden');
  } else {
    console.error('authModal element not found');
  }
};

window.toggleAuthType = () => {
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

window.toggleProfileModal = () => {
  const modal = document.getElementById('profileModal');
  if (modal) {
    modal.classList.toggle('hidden');
  } else {
    console.error('profileModal element not found');
  }
};

window.togglePasswordModal = () => {
  const modal = document.getElementById('passwordModal');
  if (modal) {
    modal.classList.toggle('hidden');
  } else {
    console.error('passwordModal element not found');
  }
};

window.toggleNewsModal = () => {
  const modal = document.getElementById('newsModal');
  if (modal) {
    modal.classList.toggle('hidden');
  } else {
    console.error('newsModal element not found');
  }
};

window.togglePublishMenu = () => {
  const menu = document.getElementById('publishMenu');
  if (menu) {
    menu.classList.toggle('hidden');
  } else {
    console.error('publishMenu element not found');
  }
};

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

window.toggleMobileMenu = function() {
  document.getElementById('mobileMenu').classList.toggle('hidden');
};

window.addEventListener('resize', () => {
  if (window.innerWidth >= 768) {
    document.getElementById('mobileMenu').classList.add('hidden');
  }
});

document.addEventListener('click', (e) => {
  const menus = ['mobileMenu', 'publishMenu'];
  menus.forEach(menuId => {
    const menu = document.getElementById(menuId);
    if (menu && !menu.contains(e.target) && 
        !document.querySelector(`[aria-controls="${menuId}"]`).contains(e.target)) {
      menu.classList.add('hidden');
    }
  });
});

const loadHomeNews = () => {
  const q = query(collection(db, "news"), orderBy("timestamp", "desc"), limit(3));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const news = [];
    querySnapshot.forEach((doc) => {
      news.push({ id: doc.id, ...doc.data() });
    });
    renderHomeNews(news);
  });
};

const updateStats = () => {
  onSnapshot(collection(db, "users"), (snap) => {
    document.querySelectorAll('#memberCount').forEach(el => el.textContent = snap.size);
  });
  onSnapshot(collection(db, "news"), (snap) => {
    document.querySelectorAll('#newsCount').forEach(el => el.textContent = snap.size);
  });
  onSnapshot(collection(db, "products"), (snap) => {
    document.querySelectorAll('#productCount').forEach(el => el.textContent = snap.size);
  });
};