import 'dotenv/config';
import wolfjs from 'wolf.js';
import axios from 'axios';

const { WOLF } = wolfjs;
const service = new WOLF();

// الإعدادات
const settings = {
    allowedGroupIds: [ 81889058],
    verificationGroupId: 9969,
    apiKey: process.env.API_KEY || 'K83171079488957'
};

// دالة الحل عبر API - تم تحسين الطلب ليشمل User-Agent
async function solveCaptcha(imageUrl) {
    console.log("🔍 جاري إرسال الصورة للـ API...");
    
    // إعداد البيانات
    const params = new URLSearchParams();
    params.append('apikey', settings.apiKey);
    params.append('url', imageUrl);
    params.append('language', 'eng');
    params.append('OCREngine', '2');
    params.append('filetype', 'JPG'); 

    try {
        const response = await axios.post('https://api.ocr.space/parse/image', params, {
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                // هذه الترويسة تخدع الـ API وتجعل الرابط يبدو "آمناً" للتحميل
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 20000 // رفعنا وقت الانتظار لـ 20 ثانية
        });

        if (response.data.ParsedResults?.length > 0) {
            const text = response.data.ParsedResults[0].ParsedText.trim();
            console.log("📄 تم استخراج النص:", text);
            return text;
        } else {
            console.log("⚠️ API لم يرجع نص. الرد:", JSON.stringify(response.data));
            return null;
        }
    } catch (err) {
        console.error("❌ خطأ API:", err.message);
        return null;
    }
}

service.on('groupMessage', async (message) => {
    // 1. تصفية القنوات
    if (!settings.allowedGroupIds.includes(message.targetGroupId)) return;

    // 2. استخراج رابط الصورة
    let imageUrl = null;
    // السجلات أثبتت أن النوع هو text/image_link
    if (message.type === 'text/image_link') {
        imageUrl = message.body;
    } else if (message.attachments && message.attachments.length > 0) {
        imageUrl = message.attachments[0].link;
    }

    // 3. التنفيذ
    if (imageUrl) {
        console.log(`✅ صورة مكتشفة في ${message.targetGroupId}`);
        const solution = await solveCaptcha(imageUrl);
        
        if (solution) {
            console.log("🔑 سيتم إرسال:", solution);
            await service.messaging.sendGroupMessage(settings.verificationGroupId, `#${solution}`);
        }
    }
});

service.on('ready', () => {
    console.log("🚀 البوت متصل ومستعد!");
});

service.login(process.env.U_MAIL, process.env.U_PASS);
