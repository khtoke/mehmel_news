// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', function() {
        const input = this.previousElementSibling;
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
});

// Form validation
document.getElementById('register-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('كلمات المرور غير متطابقة');
        return;
    }
    
    // Here you would typically send the form data to your server
    console.log('Form submitted successfully');
    // Redirect to home page or show success message
    alert('تم إنشاء الحساب بنجاح!');
    window.location.href = 'index.html';
});

// Social login handlers
document.querySelector('.google-btn').addEventListener('click', function() {
    // Implement Google OAuth login
    console.log('Google login clicked');
});

document.querySelector('.facebook-btn').addEventListener('click', function() {
    // Implement Facebook OAuth login
    console.log('Facebook login clicked');
});