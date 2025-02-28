// إدارة نموذج التبرع
function openDonationForm(campaignId) {
    document.getElementById('donation-modal').style.display = 'block';
    currentCampaignId = campaignId;
}

// إغلاق النموذج
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('donation-modal').style.display = 'none';
});

// اختيار المبلغ
document.querySelectorAll('.amount-btn').forEach((btn) => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.amount-btn').forEach((b) => b.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('custom-amount').value = '';
    });
});

// معالجة نموذج التبرع
document.getElementById('donation-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // محاكاة عملية الدفع
    alert('تم التبرع بنجاح! جاري إنشاء شهادة التبرع...');
    
    // إنشاء شهادة التبرع
    generateCertificate();
    
    // إغلاق النموذج
    document.getElementById('donation-modal').style.display = 'none';
});

let currentCampaignId;

// PayPal integration
paypal.Buttons({
    createOrder: (data, actions) => {
        const amount = document.querySelector('.amount-btn.active')?.dataset.amount || 
                      document.getElementById('custom-amount').value;
        
        return actions.order.create({
            purchase_units: [{
                amount: {
                    value: amount,
                    currency_code: 'USD'
                }
            }]
        });
    },
    onApprove: (data, actions) => {
        return actions.order.capture().then((details) => {
            // Record donation in database
            fetch('/api/record-donation.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaign_id: currentCampaignId,
                    amount: details.purchase_units[0].amount.value,
                    donor_email: details.payer.email_address,
                    transaction_id: details.id,
                    status: 'completed'
                })
            })
            .then((response) => response.json())
            .then((data) => {
                if(data.success) {
                    generateCertificate(details);
                    alert('شكراً لتبرعك! تم إرسال إيصال إلى بريدك الإلكتروني.');
                }
            });
        });
    }
}).render('#paypal-button-container');

function generateCertificate(details) {
    // إنشاء رابط تحميل الشهادة
    const link = document.createElement('a');
    link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent('شهادة تبرع\n\nنشكركم على مساهمتكم الكريمة');
    link.download = 'شهادة_تبرع.txt';
    link.click();
}

// إغلاق النموذج عند النقر خارجه
window.onclick = function(event) {
    if (event.target == document.getElementById('donation-modal')) {
        document.getElementById('donation-modal').style.display = 'none';
    }
}