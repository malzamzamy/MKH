import wolfjs from 'wolf.js';
import axios from 'axios';
import Tesseract from 'tesseract.js';

const { WOLF } = wolfjs;
const service = new WOLF();

// دالة قراءة الصورة مجاناً وبدون API
async function solveCaptchaLocally(imageUrl) {
    try {
        console.log("🔍 جاري معالجة الصورة محلياً...");
        
        // قراءة الصورة باستخدام Tesseract
        const { data: { text } } = await Tesseract.recognize(imageUrl, 'eng', {
            logger: m => console.log(m) // اختياري: لمتابعة التقدم في السجلات
        });

        // تنظيف النص: نأخذ الأرقام فقط ونحذف أي رموز أخرى
        const cleanText = text.replace(/[^0-9]/g, '');
        return cleanText.trim();
    } catch (err) {
        console.error("❌ خطأ في القراءة:", err.message);
        return null;
    }
}

service.on('groupMessage', async (message) => {
    // الفلتر للمجموعة المطلوبة فقط
    if (message.targetGroupId !== 81889058) return;

    let imageUrl = null;
    
    // التقاط الصورة
    if (message.body && message.body.startsWith('http')) imageUrl = message.body;
    else if (message.attachments && message.attachments.length > 0) imageUrl = message.attachments[0].link;

    if (imageUrl) {
        console.log(`✅ صورة مكتشفة، جاري التحليل المحلي...`);
        const solution = await solveCaptchaLocally(imageUrl);
        
        // التحقق أن الحل مكون من أرقام (مثلاً طوله 4)
        if (solution && solution.length >= 4) {
            console.log(`🔑 الحل المستخرج محلياً: ${solution}`);
            await service.messaging.sendGroupMessage(message.targetGroupId, `#${solution}`);
        } else {
            console.log("⚠️ فشل في قراءة الأرقام من الصورة.");
        }
    }
});

service.on('ready', () => console.log("🚀 البوت متصل (الخطة المجانية نشطة)!"));

service.login(process.env.U_MAIL, process.env.U_PASS);
