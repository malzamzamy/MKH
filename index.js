import 'dotenv/config';
import wolfjs from 'wolf.js';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

const { WOLF } = wolfjs;
const client = new WOLF();

const TARGET_USER_ID = 51660277;
const CHANNEL_ID = 81889058;
const INTERVAL_MS = 63000;

client.on('ready', async () => {
    console.log("🚀 البوت متصل! يعتمد الآن على تحليل اللون الأحمر (بدون قراءة نصوص).");
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

// دالة فحص نسبة اللون الأحمر
async function isCaptchaByColor(buffer) {
    const { data, info } = await sharp(buffer).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    
    let redPixels = 0;
    const totalPixels = info.width * info.height;

    // المرور على كل بكسل في الصورة
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // شرط: إذا كان اللون أحمر داكن (خلفية الكابتشا)
        // يمكنك تعديل الأرقام (120 مثلاً) إذا وجدت دقة أكبر
        if (r > 120 && r > (g + 30) && r > (b + 30)) {
            redPixels++;
        }
    }

    const percentage = (redPixels / totalPixels) * 100;
    console.log(`📊 نسبة اللون الأحمر في الصورة: ${percentage.toFixed(2)}%`);

    // إذا كانت النسبة أعلى من 40% فهي كابتشا (يمكنك تعديل هذه النسبة)
    return percentage > 40;
}

client.on('groupMessage', async (message) => {
    if (message.targetGroupId != CHANNEL_ID || message.sourceSubscriberId != TARGET_USER_ID) return;
    if (message.type !== 'text/image_link') return;

    const imageUrl = message.body;
    
    try {
        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());

        // 1. الفحص: هل هي صورة كابتشا (بناءً على اللون)؟
        const isCaptcha = await isCaptchaByColor(buffer);
        
        if (!isCaptcha) {
            console.log("⏭️ تم تجاهل الصورة (نسبة اللون الأحمر منخفضة).");
            return;
        }

        // 2. إذا كانت كابتشا، نحللها
        console.log("🛡️ كابتشا مكتشفة باللون! جاري الحل...");
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
    // هذه الدالة ستبقى كما هي لأنها المتخصصة باستخراج النص
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
    
    if (!found) throw new Error("لا يوجد إطار أصفر للحل");

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
