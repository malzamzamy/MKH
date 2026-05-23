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

// --- قسم استقبال الرسائل (الاستجابة للفخاخ) ---
service.on('groupMessage', async (message) => {
    try {
        const content = message.body;

        // التحقق من المجموعة
        const isTargetGroup = message.targetGroupId === settings.taskGroupId || message.targetGroupId === settings.depositGroupId;
        if (!isTargetGroup) return;

        // التحقق من الفخ وتطابق العضوية
        if (content.includes("اختبار تحقق سريع للاعب") && content.includes(MY_INFO.myId)) {
            
            // استخراج الرموز ديناميكياً
            const symbolMatch = content.match(/بين العلامتين\s*([^\s])\s*و?\s*([^\s])/u);

            if (symbolMatch) {
                const sym1 = symbolMatch[1];
                const sym2 = symbolMatch[2];
                const escape = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                
                const pattern = new RegExp(`${escape(sym1)}(.*?)${escape(sym2)}`, 'u');
                const result = content.match(pattern);

                if (result && result[1]) {
                    const answer = result[1].trim();
                    setTimeout(async () => {
                        await service.messaging.sendGroupMessage(message.targetGroupId, `#${answer}`);
                    }, 3000);
                }
            }
        }
    } catch (err) {}
});

// --- قسم المهام الدورية ---
service.on('ready', async () => {
    console.log(`🚀 البوت يعمل: المهام الدورية مفعلة ونظام الفخاخ الذكي نشط.`);
    
    try {
        await service.group.joinById(settings.taskGroupId);
        await service.group.joinById(settings.depositGroupId);

        // 1. المهام الدورية (كل دقيقة)
        setInterval(async () => {
            await service.messaging.sendGroupMessage(settings.taskGroupId, "!مد مهام");
            // تأخير بسيط 2 ثانية بين الرسالتين لضمان عدم حظر البوت
            setTimeout(async () => {
                await service.messaging.sendGroupMessage(settings.depositGroupId, "!مد تحالف ايداع كل");
            }, 2000);
        }, 60000); // 60,000 مللي ثانية = دقيقة

        // 2. فتح الصناديق (كل 3 دقائق)
        setInterval(async () => {
            await service.messaging.sendGroupMessage(settings.taskGroupId, "!مد صندوق فتح");
        }, 180000); // 180,000 مللي ثانية = 3 دقائق

    } catch (e) {
        console.error("خطأ في بدء المهام:", e);
    }
});

service.login(settings.identity, settings.secret);
