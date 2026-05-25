import 'dotenv/config';
import wolfjs from 'wolf.js';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

const { WOLF } = wolfjs;
const client = new WOLF();

// المعرفات المحددة
const TARGET_USER_ID = 51660277;
const CHANNEL_ID = 81889058;
const INTERVAL_MS = 63000;

client.on('ready', async () => {
    console.log("🚀 البوت متصل! سيتجاهل أي صورة تحتوي على كلمات (مهمة/سرقة).");
    await client.group.joinById(CHANNEL_ID);
    startAutomation();
});

async function startAutomation() {
    setInterval(async () => {
        try {
            await client.messaging.sendGroupMessage(CHANNEL_ID, '!مد مهام');
            await new Promise(resolve => setTimeout(resolve, 2000));
            await client.messaging.sendGroupMessage(CHANNEL_ID, '!مد تحالف ايداع كل');
        } catch (err) {
            console.error("❌ خطأ في الأتمتة:", err.message);
        }
    }, INTERVAL_MS);
}

// دالة الفلتر (القائمة السوداء)
async function isTrashImage(buffer) {
    try {
        const worker = await createWorker('ara');
        // قراءة كامل النص في الصورة
        const { data: { text } } = await worker.recognize(buffer);
        await worker.terminate();

        const cleanText = text.replace(/\s+/g, ''); // إزالة المسافات
        
        // إذا وجد البوت هذه الكلمات، فهي صورة غير مرغوبة
        if (cleanText.includes('مهمةمكتملة') || cleanText.includes('عمليةسرقة') || cleanText.includes('ناجحة')) {
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

client.on('groupMessage', async (message) => {
    if (message.targetGroupId != CHANNEL_ID || message.sourceSubscriberId != TARGET_USER_ID) return;
    if (message.type !== 'text/image_link') return;

    const imageUrl = message.body;
    
    try {
        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());

        // 1. الفحص: هل هي صورة مهمة/سرقة؟
        const isTrash = await isTrashImage(buffer);
        
        if (isTrash) {
            console.log("⏭️ تجاهل الصورة: صورة مهمة أو سرقة.");
            return;
        }

        // 2. إذا لم تكن صورة مهمة، فهي كابتشا! ابدأ بالحل
        console.log("🛡️ كابتشا مكتشفة! جاري الحل...");
        const code = await solveCaptcha(buffer);
        
        if (code) {
            await client.messaging.sendGroupMessage(CHANNEL_ID, `#${code}`);
            console.log(`✅ تم الإرسال: #${code}`);
        }
    } catch (err) {
        console.error("⚠️ خطأ في معالجة الصورة:", err.message);
    }
});

async function solveCaptcha(buffer) {
    // هذه الدالة ستبقى كما هي لأنها المتخصصة باستخراج النص داخل الكابتشا
    const { data, info } = await sharp(buffer).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    let minX = info.width, minY = info.height, maxX = 0, maxY = 0, found = false;

    for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
            const idx = (y * info.width + x) * 4;
            if (data[idx] > 200 && data[idx + 1] > 200 && data[idx + 2] < 100) {
                minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
                found = true;
            }
        }
    }
    
    if (!found) throw new Error("لا يوجد كابتشا في الصورة");

    const margin = 10;
    const processedBuffer = await sharp(buffer)
        .extract({ left: minX + margin, top: minY + margin, width: (maxX - minX) - (margin * 2), height: (maxY - minY) - (margin * 2) })
        .greyscale()
        .normalize()
        .linear(1.5, -0.2)
        .sharpen()
        .toBuffer();

    const worker = await createWorker('eng+ara');
    await worker.setParameters({ tessedit_pageseg_mode: '7' });
    const { data: { text } } = await worker.recognize(processedBuffer);
    await worker.terminate();

    return text.replace(/[^a-zA-Z0-9\u0621-\u064A]/g, '').trim();
}

client.login(process.env.U_MAIL, process.env.U_PASS);
