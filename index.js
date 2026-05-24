import wolfjs from 'wolf.js';
import axios from 'axios';
import Tesseract from 'tesseract.js';
import Jimp from 'jimp';

const { WOLF } = wolfjs;
const service = new WOLF();

// إعدادات البوت
const CONFIG = {
    MONITOR_GROUP: 81889058, // الروم الذي يراقب فيه العضو
    TARGET_MEMBER: 51660277, // العضو المستهدف
    RESULT_ROOM: 9969        // الروم الذي يتم إرسال الحل فيه
};

// دالة حل الصور
async function solveImage(imageUrl) {
    try {
        console.log("🛠 جاري معالجة الصورة...");
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const image = await Jimp.read(response.data);
        
        // تحسين الصورة
        const buffer = await image
            .greyscale()
            .contrast(1)
            .getBufferAsync(Jimp.MIME_JPEG);

        // القراءة
        const { data: { text } } = await Tesseract.recognize(buffer, 'eng+ara');
        return text.trim();
    } catch (err) {
        console.error("❌ خطأ في القراءة:", err.message);
        return null;
    }
}

// 1. المهام المتكررة (كل دقيقة)
service.on('ready', () => {
    console.log("🚀 البوت جاهز ويعمل!");

    setInterval(async () => {
        try {
            await service.messaging.sendGroupMessage(CONFIG.MONITOR_GROUP, "!مد مهام");
            console.log("✅ تم إرسال: !مد مهام");
            
            setTimeout(async () => {
                await service.messaging.sendGroupMessage(CONFIG.MONITOR_GROUP, "!مد تحالف ايداع كل");
                console.log("✅ تم إرسال: !مد تحالف ايداع كل");
            }, 2000); // انتظار ثانيتين
        } catch (err) {
            console.error("❌ خطأ في إرسال الأوامر الدورية:", err.message);
        }
    }, 60000); // 60 ثانية
});

// 2. مراقبة الرسائل
service.on('groupMessage', async (message) => {
    // التحقق من الروم والعضو
    if (message.targetGroupId !== CONFIG.MONITOR_GROUP) return;
    if (message.senderId !== CONFIG.TARGET_MEMBER) return;

    // استخراج الصورة
    let imageUrl = null;
    
    // محاولة إيجاد الصورة في المرفقات
    if (message.attachments && message.attachments.length > 0) {
        imageUrl = message.attachments[0].link;
    }

    if (imageUrl) {
        console.log("📸 تم اكتشاف صورة من العضو المستهدف، جاري الحل...");
        const result = await solveImage(imageUrl);
        
        if (result && result.length > 0) {
            console.log(`🔑 النتيجة: ${result}`);
            await service.messaging.sendGroupMessage(CONFIG.RESULT_ROOM, `# ${result}`);
        } else {
            console.log("⚠️ لم يتم العثور على نص واضح في الصورة.");
        }
    }
});

service.login(process.env.U_MAIL, process.env.U_PASS);
