import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, FacebookAuthProvider } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, query, orderBy, where, limit, startAfter, deleteDoc, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";
import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.min.js";

// Firebase configuration (updated for Websim)
const firebaseConfig = {
  apiKey: "AIzaSyC_rjwk9ZPyj-_hPC9d1h8989LN5nKL_TY",
  authDomain: "game-b469c.firebaseapp.com",
  projectId: "game-b469c",
  storageBucket: "game-b469c.appspot.com",
  messagingSenderId: "965997841866",
  appId: "1:965997841866:web:a2a6c2159fbc949a595333"
};

// Initialize Firebase
const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);
const db = getFirestore(appFirebase);
const storage = getStorage(appFirebase);

// OpenAI API key (replace with your actual key)
const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY";

let currentUser = null;
let isAdmin = false;
const adminEmails = ["admin@example.com"];

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user && adminEmails.includes(user.email)) {
    isAdmin = true;
  } else {
    isAdmin = false;
  }
  // Reload news to update admin controls if on index page
  if (document.querySelector('.news-cards')) {
    loadNews(true);
  }
  // Create news modal if admin and not already created
  if (isAdmin && !document.getElementById('newsModal')) {
    createNewsModal();
  }
  // Load users table if on settings page and isAdmin
  if (document.querySelector('.settings-section') && isAdmin) {
    loadUsersTable();
  }
  // Show settings link in navbar if admin
  const settingsLink = document.getElementById('settingsLink');
  if (settingsLink) {
    settingsLink.style.display = isAdmin ? 'block' : 'none';
  }
});

function playClickSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (error) {
    console.warn("AudioContext error:", error);
  }
}

function showToast(message) {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.classList.add('toast');
  toast.innerText = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    if (toastContainer.contains(toast)) {
      toastContainer.removeChild(toast);
    }
  }, 3000);
}

function showLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.display = 'flex';
  }
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.display = 'none';
  }
}

// Global variables for smart filtering and pagination
let newsLimit = 6;
let lastVisible = null;
let currentFilter = "all";
let currentSort = "latest";
let loadingNews = false;

async function loadNews(reset = false) {
  if (loadingNews) return;
  loadingNews = true;
  const newsContainer = document.querySelector('.news-cards');
  if (!newsContainer) return;
  if (reset) {
    newsContainer.innerHTML = "";
    lastVisible = null;
  }
  // Show skeleton placeholders
  const skeletons = [];
  for (let i = 0; i < newsLimit; i++) {
    const skeleton = document.createElement('div');
    skeleton.classList.add('skeleton-card');
    skeleton.style.height = '200px';
    skeleton.style.margin = '10px';
    skeletons.push(skeleton);
    newsContainer.appendChild(skeleton);
  }
  try {
    let newsRef = collection(db, "news");
    let constraints = [];
    if (currentFilter !== "all") {
      constraints.push(where("classification", "==", currentFilter));
    }
    if (currentSort === "latest") {
      constraints.push(orderBy("createdAt", "desc"));
    } else if (currentSort === "mostInteractive") {
      constraints.push(orderBy("interactions", "desc"));
    } else {
      constraints.push(orderBy("createdAt", "desc"));
    }
    constraints.push(limit(newsLimit));
    if (lastVisible) {
      constraints.push(startAfter(lastVisible));
    }
    const newsQuery = query(newsRef, ...constraints);
    const querySnapshot = await getDocs(newsQuery);
    
    // Remove skeletons
    skeletons.forEach(sk => sk.remove());
    
    querySnapshot.forEach(docSnap => {
      const newsData = docSnap.data();
      const card = document.createElement('article');
      card.className = 'news-card';
      card.setAttribute('data-title', newsData.title);
      card.innerHTML = `
        <div class="card-content">
          <h2>${newsData.title}</h2>
          <p>${newsData.summary ? newsData.summary : newsData.content.substring(0, 100) + "..."}</p>
          <a href="news-detail.html?id=${docSnap.id}" class="read-more">قراءة المزيد</a>
          ${isAdmin ? `<button class="delete-news-btn" data-id="${docSnap.id}"><i class="fa-solid fa-trash action-icon"></i>حذف</button>` : ''}
        </div>
        ${newsData.imageUrl ? `
          <div class="news-image">
            <img src="${newsData.imageUrl}" alt="${newsData.title}" style="width:100%; border-radius:8px;">
          </div>` : ''}
      `;
      newsContainer.appendChild(card);
    });
    
    if (querySnapshot.docs.length > 0) {
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    }
    
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
      if (querySnapshot.docs.length < newsLimit) {
        loadMoreBtn.style.display = 'none';
      } else {
        loadMoreBtn.style.display = 'block';
      }
    }
    
    if (isAdmin) {
      document.querySelectorAll('.delete-news-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const newsId = btn.getAttribute('data-id');
          if (confirm("هل أنت متأكد من حذف الخبر؟")) {
            try {
              await deleteDoc(doc(db, "news", newsId));
              showToast("تم حذف الخبر بنجاح");
              loadNews(true);
            } catch (err) {
              console.error("Error deleting news: ", err);
              showToast("فشل حذف الخبر: " + err.message);
            }
          }
        });
      });
    }
    
  } catch (err) {
    console.error("Error loading news: ", err);
    showToast("فشل تحميل الأخبار: " + err.message);
  } finally {
    loadingNews = false;
  }
}

function createNewsModal() {
  if (document.getElementById('newsModal')) return;
  const modal = document.createElement('div');
  modal.id = 'newsModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-button" id="closeNewsModal">&times;</span>
      <h2>إنشاء خبر جديد</h2>
      <form id="newsForm">
        <label for="newsTitle">عنوان الخبر</label>
        <input type="text" id="newsTitle" name="newsTitle" required>
        <label for="newsContent">محتوى الخبر</label>
        <textarea id="newsContent" name="newsContent" required></textarea>
        <label for="newsImage">صورة الخبر</label>
        <input type="file" id="newsImage" name="newsImage" accept="image/*">
        <button type="submit"><i class="fa-solid fa-plus action-icon"></i>إنشاء الخبر</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('closeNewsModal').addEventListener('click', () => {
    modal.style.display = 'none';
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
  
  const newsForm = document.getElementById('newsForm');
  newsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Advanced Email Verification Check before publishing news
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      showToast("يرجى تفعيل بريدك الإلكتروني قبل السماح بالنشر");
      return;
    }
    const title = document.getElementById('newsTitle').value;
    const content = document.getElementById('newsContent').value;
    const fileInput = document.getElementById('newsImage');
    let imageUrl = "";
    try {
      showLoader();
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const storageRef = ref(storage, 'news/' + Date.now() + '-' + file.name);
        const snapshot = await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(snapshot.ref);
      }
      let classification = "";
      let summary = "";
      try {
        classification = await classifyNews(title, content);
        summary = await generateSummary(title, content);
      } catch (aiError) {
        console.error("AI processing error:", aiError);
      }
      await addDoc(collection(db, "news"), {
        title: title,
        content: content,
        imageUrl: imageUrl,
        classification: classification,
        summary: summary,
        createdAt: new Date()
      });
      hideLoader();
      modal.style.display = 'none';
      showToast("تم إنشاء الخبر بنجاح");
      if (document.querySelector('.news-cards')) {
        loadNews(true);
      }
    } catch (err) {
      hideLoader();
      console.error("Error adding news: ", err);
      showToast("فشل إنشاء الخبر: " + err.message);
    }
  });
}

async function loadUsersTable() {
  const usersTableBody = document.querySelector('#usersTable tbody');
  if (!usersTableBody) return;

  usersTableBody.innerHTML = '<tr><td colspan="3">Loading users...</td></tr>';
  showLoader();

  const usersRef = collection(db, "users");
  const q = query(usersRef, orderBy("joinedAt", "desc"));

  onSnapshot(q, (snapshot) => {
    hideLoader();
    usersTableBody.innerHTML = ''; // Clear existing rows
    if (snapshot.empty) {
      usersTableBody.innerHTML = '<tr><td colspan="3">No users found.</td></tr>';
      return;
    }
    snapshot.forEach(docSnap => {
      const userData = docSnap.data();
      const row = usersTableBody.insertRow();
      const nameCell = row.insertCell(0);
      const emailCell = row.insertCell(1);
      const joinedAtCell = row.insertCell(2);

      nameCell.textContent = userData.username || 'N/A';
      emailCell.textContent = userData.email;
      joinedAtCell.textContent = userData.joinedAt ? new Date(userData.joinedAt.seconds * 1000).toLocaleDateString('ar-EG') : 'N/A';
    });
  }, (error) => {
    hideLoader();
    console.error("Error loading users:", error);
    usersTableBody.innerHTML = `<tr><td colspan="3">Error loading users: ${error.message}</td></tr>`;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) {
      playClickSound();
    }
  });

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const queryStr = searchInput.value.trim().toLowerCase();
      document.querySelectorAll('.news-card').forEach(card => {
        const title = card.getAttribute('data-title').toLowerCase();
        card.style.display = title.includes(queryStr) ? 'block' : 'none';
      });
    });
  }
  
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginForm.email.value;
      const password = loginForm.password.value;
      signInWithEmailAndPassword(auth, email, password)
        .then((cred) => {
          showToast("تم تسجيل الدخول بنجاح");
          window.location.href = "dashboard.html";
        })
        .catch((err) => {
          console.error(err);
          showToast("خطأ في تسجيل الدخول: " + err.message);
        });
    });
  }

  // Advanced Social Login: Google and Facebook
  const googleSignInBtn = document.getElementById('googleSignInBtn');
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async () => {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
        showToast("تم تسجيل الدخول باستخدام جوجل");
        window.location.href = "dashboard.html";
      } catch (err) {
        console.error(err);
        showToast("خطأ في تسجيل الدخول باستخدام جوجل: " + err.message);
      }
    });
  }
  
  const facebookSignInBtn = document.getElementById('facebookSignInBtn');
  if (facebookSignInBtn) {
    facebookSignInBtn.addEventListener('click', async () => {
      const provider = new FacebookAuthProvider();
      try {
        await signInWithPopup(auth, provider);
        showToast("تم تسجيل الدخول باستخدام فيسبوك");
        window.location.href = "dashboard.html";
      } catch (err) {
        console.error(err);
        showToast("خطأ في تسجيل الدخول باستخدام فيسبوك: " + err.message);
      }
    });
  }
  
  const newNewsBtn = document.getElementById('newNewsBtn');
  if (newNewsBtn) {
    newNewsBtn.addEventListener('click', () => {
      if (!isAdmin) {
        showToast("ليس لديك صلاحية لإنشاء خبر");
        return;
      }
      const newsModal = document.getElementById("newsModal");
      if (newsModal) {
        newsModal.style.display = "block";
      } else {
        createNewsModal();
        document.getElementById("newsModal").style.display = "block";
      }
    });
  }
  
  if (document.querySelector('.news-cards')) {
    loadNews(true);
  }
  
  if (document.querySelector('.news-detail')) {
    loadNewsDetail();
  }
  
  const commentForm = document.getElementById('commentForm');
  if(commentForm) {
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const commentText = document.getElementById('commentText').value;
      let sentiment = "";
      try {
        sentiment = await analyzeSentiment(commentText);
      } catch(e) {
        console.error("Sentiment analysis error:", e);
      }
      const params = new URLSearchParams(window.location.search);
      const newsId = params.get('id');
      if(!newsId) {
        showToast("معرّف الخبر غير موجود");
        return;
      }
      try {
        showLoader();
        await addDoc(collection(db, "comments"), {
           newsId: newsId,
           comment: commentText,
           sentiment: sentiment,
           createdAt: new Date()
        });
        hideLoader();
        showToast("تم إرسال التعليق");
        document.getElementById('commentText').value = "";
        loadComments(newsId);
      } catch (err) {
        hideLoader();
        console.error("Error adding comment: ", err);
        showToast("فشل إضافة التعليق: " + err.message);
      }
    });
    const params = new URLSearchParams(window.location.search);
    const newsId = params.get('id');
    if(newsId) {
      loadComments(newsId);
    }
  }
  
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', () => {
      const navLinks = document.querySelector('.nav-links');
      if (navLinks) {
        navLinks.classList.toggle('active');
      }
    });
  }
  
  const arToggleBtn = document.getElementById('arToggleBtn');
  if (arToggleBtn) {
    arToggleBtn.addEventListener('click', toggleARMode);
  }

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.getAttribute('data-category');
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadNews(true);
    });
  });
  
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSort = btn.getAttribute('data-sort');
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadNews(true);
    });
  });
  
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', async () => {
      loadMoreBtn.disabled = true;
      const originalText = loadMoreBtn.innerHTML;
      loadMoreBtn.innerHTML = `<span class="skeleton-inline"></span>`;
      await loadNews();
      loadMoreBtn.disabled = false;
      loadMoreBtn.innerHTML = originalText;
    });
  }
  
  document.addEventListener('click', function(e) {
    const card = e.target.closest('.news-card');
    if(card && !e.target.closest('a') && !e.target.closest('button')) {
      card.classList.add('open');
      setTimeout(() => {
        card.classList.remove('open');
      }, 500);
    }
  });

  if (document.getElementById('progressBar')) {
    window.addEventListener('scroll', updateProgressBar);
    updateProgressBar();
  }
  
  const addUserBtn = document.getElementById('addUserBtn');
  if (addUserBtn) {
    addUserBtn.addEventListener('click', () => {
      alert('سيتم توفير نموذج إضافة مستخدم في التحديثات القادمة. حاليًا، يمكن للمستخدمين التسجيل بأنفسهم.');
      // In future implementations, you might open a modal form for adding users.
    });
  }
});

let isARModeActive = false;
let arScene, arCamera, arRenderer;
let arAnimationFrameId;

function toggleARMode() {
  if (!isARModeActive) {
    isARModeActive = true;
    const newsContainer = document.querySelector('.news-cards');
    if (newsContainer) newsContainer.style.display = 'none';
    const arContainer = document.getElementById('arContainer');
    if (arContainer) {
      arContainer.style.display = 'block';
    }
    initARScene();
  } else {
    isARModeActive = false;
    if (arRenderer) {
      cancelAnimationFrame(arAnimationFrameId);
      arRenderer.dispose();
      const arContainer = document.getElementById('arContainer');
      if (arContainer) {
        arContainer.innerHTML = "";
        arContainer.style.display = 'none';
      }
    }
    const newsContainer = document.querySelector('.news-cards');
    if (newsContainer) newsContainer.style.display = 'grid';
  }
}

async function initARScene() {
  const arContainer = document.getElementById('arContainer');
  if (!arContainer) return;
  arScene = new THREE.Scene();
  arCamera = new THREE.PerspectiveCamera(75, arContainer.clientWidth / arContainer.clientHeight, 0.1, 1000);
  
  arRenderer = new THREE.WebGLRenderer({ antialias: true });
  arRenderer.setSize(arContainer.clientWidth, arContainer.clientHeight);
  arContainer.appendChild(arRenderer.domElement);
  
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  arScene.add(ambientLight);
  
  const newsItems = await loadImportantNewsForAR();
  newsItems.forEach((news, index, array) => {
    const newsPlane = createNewsPlane(news, index, array.length);
    arScene.add(newsPlane);
  });
  
  arCamera.position.z = 5;
  animateARScene();
}

function createNewsPlane(news, index, total) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2A2F4F';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#ecf0f1';
  ctx.font = '28px "IBM Plex Sans Arabic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const title = news.title.length > 30 ? news.title.substring(0, 27) + '...' : news.title;
  ctx.fillText(title, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  const geometry = new THREE.PlaneGeometry(3, 1.5);
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(geometry, material);
  
  const angle = (index / total) * Math.PI * 2;
  const radius = 4;
  plane.position.x = Math.cos(angle) * radius;
  plane.position.y = Math.sin(angle) * radius;
  plane.lookAt(new THREE.Vector3(0, 0, 0));
  
  return plane;
}

function animateARScene() {
  arAnimationFrameId = requestAnimationFrame(animateARScene);
  arScene.rotation.y += 0.005;
  arRenderer.render(arScene, arCamera);
}

async function loadImportantNewsForAR() {
  try {
    const newsRef = collection(db, "news");
    const q = query(newsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const newsList = [];
    querySnapshot.forEach(docSnap => {
      const newsData = docSnap.data();
      newsList.push({ id: docSnap.id, ...newsData });
    });
    return newsList.slice(0, Math.min(newsList.length, 5));
  } catch (err) {
    console.error("Error loading news for AR:", err);
    return [];
  }
}

window.addEventListener('resize', () => {
  if (isARModeActive && arRenderer && arCamera) {
    const arContainer = document.getElementById('arContainer');
    if (arContainer) {
      arCamera.aspect = arContainer.clientWidth / arContainer.clientHeight;
      arCamera.updateProjectionMatrix();
      arRenderer.setSize(arContainer.clientWidth, arContainer.clientHeight);
    }
  }
});

async function loadNewsDetail() {
  const params = new URLSearchParams(window.location.search);
  const newsId = params.get('id');
  if (!newsId) return;
  try {
    showLoader();
    const docRef = doc(db, "news", newsId);
    const docSnap = await getDoc(docRef);
    hideLoader();
    if (docSnap.exists()) {
      const newsData = docSnap.data();
      const newsContainer = document.querySelector('.news-detail');
      newsContainer.innerHTML = `
        <h1>${newsData.title}</h1>
        <p class="news-meta">بواسطة <span>${newsData.author || "المحرر"}</span> | ${new Date(newsData.createdAt.seconds * 1000).toLocaleDateString('ar-EG')}</p>
        ${newsData.imageUrl ? `<div class="news-image"><img src="${newsData.imageUrl}" alt="${newsData.title}" style="width:100%; border-radius:8px;"></div>` : ''}
        <div class="news-content">
          <p>${newsData.content}</p>
        </div>
        <a href="index.html" class="back-link">العودة إلى القائمة</a>
      `;
    } else {
      showToast("الخبر غير موجود");
    }
  } catch (err) {
    hideLoader();
    console.error("Error loading news detail: ", err);
    showToast("فشل تحميل التفاصيل: " + err.message);
  }
}

async function loadComments(newsId) {
  const commentsContainer = document.getElementById('commentsContainer');
  if (!commentsContainer) return;
  commentsContainer.innerHTML = "";
  try {
    showLoader();
    const q = query(collection(db, "comments"), where("newsId", "==", newsId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    hideLoader();
    querySnapshot.forEach(docSnap => {
      const commentData = docSnap.data();
      const div = document.createElement('div');
      div.className = 'comments-comment';
      div.innerHTML = `
         <p>${commentData.comment}</p>
         <p class="comment-sentiment">المشاعر: ${commentData.sentiment}</p>
      `;
      commentsContainer.appendChild(div);
    });
  } catch (err) {
    hideLoader();
    console.error("Error loading comments: ", err);
    showToast("فشل تحميل التعليقات: " + err.message);
  }
}

async function callOpenAIApi(prompt, max_tokens) {
  const response = await fetch("https://api.openai.com/v1/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + OPENAI_API_KEY
    },
    body: JSON.stringify({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: max_tokens,
      temperature: 0.7
    })
  });
  const data = await response.json();
  return data.choices[0].text.trim();
}

async function classifyNews(title, content) {
  const prompt = `صنف الخبر التالي ضمن الفئات التالية: سياسة، اقتصاد، رياضة، تكنولوجيا، صحة، ترفيه.\n\nنص الخبر:\n${content}\n\nالفئة:`;
  return await callOpenAIApi(prompt, 10);
}

async function generateSummary(title, content) {
  const prompt = `أنشئ ملخصًا قصيرًا للخبر التالي:\n\nالعنوان: ${title}\n\nالمحتوى:\n${content}\n\nالملخص:`;
  return await callOpenAIApi(prompt, 60);
}

async function analyzeSentiment(comment) {
  const prompt = `حلل المشاعر للتعليق التالي:\n\n"${comment}"\n\nالمشاعر:`;
  return await callOpenAIApi(prompt, 10);
}

function updateProgressBar() {
  const progressBar = document.getElementById('progressBar');
  if (!progressBar) return;
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrollPercent = (scrollTop / scrollHeight) * 100;
  progressBar.style.width = scrollPercent + '%';
}