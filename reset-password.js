import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, updatePassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Firebase configuration (updated for Websim)
const firebaseConfig = {
  apiKey: "AIzaSyC_rjwk9ZPyj-_hPC9d1h8989LN5nKL_TY",
  authDomain: "game-b469c.firebaseapp.com",
  projectId: "game-b469c",
  storageBucket: "game-b469c.appspot.com",
  messagingSenderId: "965997841866",
  appId: "1:965997841866:web:a2a6c2159fbc949a595333"
};

const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);

let confirmationResult = null;

window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
  'size': 'normal',
  'callback': (response) => {
    // reCAPTCHA solved - allow sendCode
  }
}, auth);

document.getElementById('sendCodeBtn').addEventListener('click', async () => {
  const phoneNumber = document.getElementById('phone').value;
  try {
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
    showToast("تم إرسال رمز التحقق إلى رقم الهاتف");
  } catch (err) {
    console.error("Error during signInWithPhoneNumber", err);
    showToast("فشل إرسال رمز التحقق: " + err.message);
  }
});

document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const verificationCode = document.getElementById('verificationCode').value;
  const newPassword = document.getElementById('newPassword').value;
  if (!confirmationResult) {
    showToast("يرجى إرسال رمز التحقق أولاً");
    return;
  }
  try {
    const result = await confirmationResult.confirm(verificationCode);
    // Update the password for the signed-in user
    await updatePassword(result.user, newPassword);
    showToast("تم تعيين كلمة المرور بنجاح");
    // Optionally sign out after password reset
    // auth.signOut();
  } catch (err) {
    console.error("Error verifying code or updating password", err);
    showToast("فشل إعادة تعيين كلمة المرور: " + err.message);
  }
});

function showToast(message) {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.classList.add('toast');
  toast.innerText = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toastContainer.removeChild(toast);
  }, 3000);
}