import wolfjs from 'wolf.js';
import axios from 'axios';
import Tesseract from 'tesseract.js';
import Jimp from 'jimp';

const { WOLF } = wolfjs;
const service = new WOLF();

// --- الإعدادات ---
const CONFIG = {
    MONITOR_GROUP: 81889058, // معرف الروم الذي تراقب فيه
    RESULT_ROOM: 9969        // معرف الروم الذي ترسل فيه الحل
};

// القيم المستهدفة للون الإطار المتقطع (الذهبي/الأصفر)
const TARGET_COLOR = { r: 247, g: 194, b: 70 }; 

async function solveCaptcha(imageUrl) {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const image = await Jimp.read(response.data);

        let minX = image.bitmap.width, maxX = 0;
        let minY = image.bitmap.height, maxY = 0;
        let found = false;

        // البحث عن الإطار
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
            const r = image.bitmap.data[idx];
            const g = image.bitmap.data[idx + 1];
            const b = image.bitmap.data[idx + 2];

            // سماحية 50 درجة لتجاوز تغيرات الإضاءة
            if (Math.abs(r - TARGET_COLOR.r) < 50 && 
                Math.abs(g - TARGET_COLOR.g) < 50 && 
                Math.abs(b - TARGET_COLOR.b) < 50) {
                
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
                found = true;
            }
        });

        if (!found) return null;

        // قص الصورة (إضافة هامش بسيط 5 بكسل للداخل لضمان نظافة النص)
        const cropWidth = (maxX - minX) + 10;
        const cropHeight = (maxY - minY) + 10;
        const finalBlock = image.clone().crop(minX - 5, minY - 5, cropWidth, cropHeight);

        // تحسين التباين ليقرأ Tesseract النص بوضوح
        await finalBlock.greyscale().contrast(1).normalize();
        const buffer = await finalBlock.getBufferAsync(Jimp.MIME_PNG);

        // القراءة
        const { data: { text } } = await Tesseract.recognize(buffer, 'ara+eng');

        return text.replace(/[^a-zA-Z0-9\u0621-\u064A]/g, '').trim();
    } catch (err) {
        console.error("❌ خطأ:", err.message);
        return null;
    }
}

// --- المراقبة ---
service.on('groupMessage', async (message) => {
    // التأكد من الروم
    if (message.targetGroupId !== CONFIG.MONITOR_GROUP) return;

    let imageUrl = null;
    if (message.attachments && message.attachments.length > 0) imageUrl = message.attachments[0].link;
    else if (message.body && message.body.match(/\.(jpg|jpeg|png)$/)) imageUrl = message.body;

    if (imageUrl) {
        console.log("📸 جاري حل الكابتشا...");
        const result = await solveCaptcha(imageUrl);
        
        if (result && result.length > 0) {
            console.log(`🔑 النتيجة: ${result}`);
            await service.messaging.sendGroupMessage(CONFIG.RESULT_ROOM, `# ${result}`);
        }
    }
});

service.login(process.env.U_MAIL, process.env.U_PASS);
