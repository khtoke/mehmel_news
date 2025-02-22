// استيراد الوظائف اللازمة من SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInAnonymously,
  signInWithPhoneNumber,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// تكوين Firebase مع بيانات المشروع الفعلية
const firebaseConfig = {
  apiKey: "AIzaSyC_rjwk9ZPyj-_hPC9d1h8989LN5nKL_TY",
  authDomain: "game-b469c.firebaseapp.com",
  databaseURL: "https://game-b469c-default-rtdb.firebaseio.com",
  projectId: "game-b469c",
  storageBucket: "game-b469c.appspot.com",
  messagingSenderId: "965997841866",
  appId: "1:965997841866:web:a2a6c2159fbc949a595333",
  measurementId: "G-0KL9B57D5J"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);

// التأكد من تفعيل المصادقة المجهولة
onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch(error => {
      console.error("Firebase Auth Error:", error);
    });
  }
});
