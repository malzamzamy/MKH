import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const settings = {
    identity: process.env.U_MAIL || 'your_email@example.com',
    secret: process.env.U_PASS || 'your_password',
    taskGroupId: 81889058,
    depositGroupId: 81889058
};

const MY_INFO = {
    myId: "80055399" // العضوية المستهدفة
};

const service = new WOLF();

// دالة مساعدة لتجهيز الرموز (Escape) كي لا تسبب مشاكل في Regex
const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

service.on('groupMessage', async (message) => {
    try {
        const content = message.body;

        // التحقق من المجموعة
        const isTargetGroup = message.targetGroupId === settings.taskGroupId || message.targetGroupId === settings.depositGroupId;
        if (!isTargetGroup) return;

        // التحقق من أن الرسالة فخ + مطابقة العضوية
        if (content.includes("اختبار تحقق سريع للاعب") && content.includes(MY_INFO.myId)) {
            
            // 1. استخراج العلامات (الرموز) من نص السؤال
            // يبحث عن نمط "بين العلامتين [رمز] و [رمز]" أو "الواقع بين العلامتين [رمز] و [رمز]"
            const symbolMatch = content.match(/(?:بين|الواقع بين) العلامتين\s*([^\s])\s*و?\s*([^\s])/u);

            if (symbolMatch) {
                const sym1 = symbolMatch[1]; // الرمز الأول
                const sym2 = symbolMatch[2]; // الرمز الثاني

                // 2. التركيز فقط على السطر (أو الجزء) الذي بعد النقطتين (:)
                const parts = content.split(':');
                const targetLine = parts.pop().trim(); // نأخذ آخر جزء بعد النقطتين

                // 3. البحث عما يقع بين الرموز المستخرجة داخل هذا الجزء
                const pattern = new RegExp(`${escapeRegExp(sym1)}(.*?)${escapeRegExp(sym2)}`, 'u');
                const result = targetLine.match(pattern);

                if (result && result[1]) {
                    const answer = result[1].trim();
                    
                    console.log(`تم استخراج الرمز بنجاح: ${answer}`);
                    
                    // إرسال الإجابة
                    setTimeout(async () => {
                        await service.messaging.sendGroupMessage(message.targetGroupId, `#${answer}`);
                    }, 3000);
                }
            }
        }
    } catch (err) {
        console.error("خطأ في معالجة الفخ:", err);
    }
});

// --- قسم المهام الدورية (كما طلبت) ---
service.on('ready', async () => {
    console.log(`🚀 البوت يعمل: نظام استخراج الرموز الذكي نشط.`);
    
    try {
        await service.group.joinById(settings.taskGroupId);
        await service.group.joinById(settings.depositGroupId);

        setInterval(async () => {
            await service.messaging.sendGroupMessage(settings.taskGroupId, "!مد مهام");
            setTimeout(async () => {
                await service.messaging.sendGroupMessage(settings.depositGroupId, "!مد تحالف ايداع كل");
            }, 2000);
        }, 60000); 

        setInterval(async () => {
            await service.messaging.sendGroupMessage(settings.taskGroupId, "!مد صندوق فتح");
        }, 180000); 

    } catch (e) {
        console.error("خطأ في بدء المهام:", e);
    }
});

service.login(settings.identity, settings.secret);
