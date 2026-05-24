import 'dotenv/config';
import wolfjs from 'wolf.js';
import axios from 'axios';

const { WOLF } = wolfjs;
const service = new WOLF();

// الإعدادات
const settings = {
    identity: process.env.U_MAIL || 'ايميلك',
    secret: process.env.U_PASS || 'كلمة_السر',
    taskGroupId: 81889058,       // قناة المهام
    depositGroupId: 81889058,    // قناة الإيداع
    verificationGroupId: 9969,   // القناة التي يرسل فيها البوت الحل
    apiKey: 'K83171079488957',   // مفتاح الـ API الخاص بك
    minuteInterval: 60 * 1000 
};

// دالة الحل عبر API
async function solveCaptcha(imageUrl) {
    try {
        console.log("جاري إرسال الصورة للتحليل...");
        const response = await axios.post('https://api.ocr.space/parse/image', null, {
            params: {
                apikey: settings.apiKey,
                url: imageUrl,
                language: 'eng',
                OCREngine: 2
            }
        });

        const result = response.data;
        if (result.ParsedResults && result.ParsedResults.length > 0) {
            return result.ParsedResults[0].ParsedText.trim();
        }
        return null;
    } catch (err) {
        console.error("خطأ في الاتصال بـ API:", err);
        return null;
    }
}

// دالة المهام الدورية
const sendRoutineCommands = async () => {
    try {
        await service.messaging.sendGroupMessage(settings.taskGroupId, "!مد مهام");
        setTimeout(async () => {
            await service.messaging.sendGroupMessage(settings.depositGroupId, "!مد تحالف ايداع كل");
        }, 3000);
    } catch (e) {}
};

// مراقبة الرسائل
service.on('groupMessage', async (message) => {
    if (message.targetGroupId !== settings.taskGroupId) return;

    // 1. التعامل مع الكابتشا (اختبار تحقق بشري)
    if (message.body.includes("اختبار تحقق بشري")) {
        // البحث عن رابط الصورة في المرفقات (Attachments)
        const attachment = message.attachments ? message.attachments[0] : null;
        
        if (attachment && attachment.link) {
            console.log("تم اكتشاف صورة كابتشا، جاري الحل...");
            const solution = await solveCaptcha(attachment.link);
            
            if (solution) {
                console.log(`تم الحل: ${solution}`);
                await service.messaging.sendGroupMessage(settings.verificationGroupId, `#${solution}`);
            } else {
                console.log("فشل البوت في استخراج النص من الصورة.");
            }
        }
    }
});

// تشغيل البوت
service.on('ready', async () => {
    console.log("🚀 البوت يعمل الآن ويراقب القناة...");
    await service.group.joinById(settings.taskGroupId);
    
    // تشغيل المهام فوراً ثم كل دقيقة
    sendRoutineCommands();
    setInterval(sendRoutineCommands, settings.minuteInterval);
});

service.login(settings.identity, settings.secret);
