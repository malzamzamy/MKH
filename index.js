import wolfjs from 'wolf.js';
import axios from 'axios';
import Tesseract from 'tesseract.js';
import Jimp from 'jimp';

const { WOLF } = wolfjs;
const service = new WOLF();

// إعدادات المراقبة والإرسال
const CONFIG = {
    MONITOR_GROUP: 81889058, // الروم الذي يراقب فيه العضو
    TARGET_MEMBER: 51660277, // العضو المستهدف
    RESULT_ROOM: 9969        // الروم الذي يتم إرسال الحل فيه
};

async function solveCaptcha(imageUrl) {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const image = await Jimp.read(response.data);

        const width = image.bitmap.width;
        const height = image.bitmap.height;
        const blockWidth = Math.floor(width / 6); // عرض كل بطاقة من البطاقات الست

        let darkestBlockIndex = 0;
        let lowestBrightness = 255;

        // 1. البحث عن أغمق بطاقة
        for (let i = 0; i < 6; i++) {
            // عمل نسخة من البطاقة الحالية لتحليلها
            const currentBlock = image.clone().crop(i * blockWidth, 0, blockWidth, height);
            
            // حساب معدل سطوع البطاقة
            let currentBrightness = 0;
            currentBlock.scan(0, 0, currentBlock.bitmap.width, currentBlock.bitmap.height, function(x, y, idx) {
                // نجمع قيم الألوان الأحمر والأخضر والأزرق (RGB)
                currentBrightness += (this.bitmap.data[idx] + this.bitmap.data[idx+1] + this.bitmap.data[idx+2]) / 3;
            });
            // تقسيم المجموع على عدد البكسلات للحصول على المعدل
            currentBrightness = currentBrightness / (currentBlock.bitmap.width * currentBlock.bitmap.height);

            // إذا كانت هذه البطاقة أغمق من السابقة، نحتفظ بموقعها
            if (currentBrightness < lowestBrightness) {
                lowestBrightness = currentBrightness;
                darkestBlockIndex = i;
            }
        }

        console.log(`🎯 تم تحديد البطاقة الأغمق: رقم ${darkestBlockIndex + 1}`);

        // 2. قص البطاقة الأغمق حصرياً
        const finalBlock = image.crop(darkestBlockIndex * blockWidth, 0, blockWidth, height);

        // 3. تحسين البطاقة للقراءة
        await finalBlock.greyscale().contrast(1).normalize();
        const buffer = await finalBlock.getBufferAsync(Jimp.MIME_PNG);

        // 4. قراءة النص (بدعم العربية والإنجليزية)
        const { data: { text } } = await Tesseract.recognize(buffer, 'eng+ara');
        
        // تنظيف النص
        return text.trim();
    } catch (err) {
        console.error("❌ خطأ في المعالجة:", err.message);
        return null;
    }
}

// المهام المتكررة (كما هي)
service.on('ready', () => {
    console.log("🚀 البوت جاهز ويعمل!");
    setInterval(async () => {
        try {
            await service.messaging.sendGroupMessage(CONFIG.MONITOR_GROUP, "!مد مهام");
            setTimeout(async () => {
                await service.messaging.sendGroupMessage(CONFIG.MONITOR_GROUP, "!مد تحالف ايداع كل");
            }, 2000);
        } catch (err) { console.error("❌ خطأ دوري"); }
    }, 60000);
});

// مراقبة الرسائل
service.on('groupMessage', async (message) => {
    if (message.targetGroupId !== CONFIG.MONITOR_GROUP || message.senderId !== CONFIG.TARGET_MEMBER) return;

    let imageUrl = message.attachments?.[0]?.link;

    if (imageUrl) {
        console.log("📸 صورة اختبار مكتشفة، جاري تحليل أغمق منطقة...");
        const result = await solveCaptcha(imageUrl);
        
        if (result && result.length > 0) {
            console.log(`🔑 الحل المقترح: ${result}`);
            await service.messaging.sendGroupMessage(CONFIG.RESULT_ROOM, `# ${result}`);
        }
    }
});

service.login(process.env.U_MAIL, process.env.U_PASS);
