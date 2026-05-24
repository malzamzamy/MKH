import 'dotenv/config';
import wolfjs from 'wolf.js';
import axios from 'axios';

const { WOLF } = wolfjs;
const service = new WOLF();

const settings = {
    taskGroupId: 81889058,
    verificationGroupId: 9969,
    minuteInterval: 60 * 1000
};

// دالة الحل عبر API OCR.space
async function solveCaptcha(imageUrl) {
    try {
        console.log("جاري إرسال الصورة للتحليل...");
        const response = await axios.post('https://api.ocr.space/parse/image', null, {
            params: {
                apikey: process.env.API_KEY,
                url: imageUrl,
                language: 'eng',
                OCREngine: 2
            }
        });

        if (response.data.ParsedResults && response.data.ParsedResults.length > 0) {
            return response.data.ParsedResults[0].ParsedText.trim();
        }
        return null;
    } catch (err) {
        console.error("خطأ في الاتصال بـ API:", err.message);
        return null;
    }
}

// مراقبة الرسائل لاكتشاف الصور
service.on('groupMessage', async (message) => {
    // التحقق من وجود مرفقات (صور)
    if (message.attachments && message.attachments.length > 0) {
        const imageUrl = message.attachments[0].link; // رابط الصورة
        
        console.log("تم اكتشاف صورة في القناة، جاري المعالجة...");
        
        const solution = await solveCaptcha(imageUrl);
        
        if (solution) {
            console.log(`تم استخراج الرمز: ${solution}`);
            // إرسال الحل
            setTimeout(async () => {
                await service.messaging.sendGroupMessage(settings.verificationGroupId, `#${solution}`);
            }, 2000); 
        }
    }
});

// المهام الدورية
const runTasks = async () => {
    try {
        await service.messaging.sendGroupMessage(settings.taskGroupId, "!مد مهام");
        setTimeout(async () => {
            await service.messaging.sendGroupMessage(settings.taskGroupId, "!مد تحالف ايداع كل");
        }, 3000);
    } catch (e) {}
};

service.on('ready', async () => {
    console.log("✅ البوت متصل ويراقب الصور...");
    setInterval(runTasks, settings.minuteInterval);
});

service.login(process.env.U_MAIL, process.env.U_PASS);
