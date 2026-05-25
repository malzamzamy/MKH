import 'dotenv/config';
import wolfjs from 'wolf.js';

const { WOLF } = wolfjs;
const client = new WOLF();

const CHANNEL_ID = 81889058;

client.on('ready', async () => {
    console.log("🚀 البوت متصل وجاهز للعمل!");
    
    // الانضمام للقناة
    await client.group.joinById(CHANNEL_ID);
    console.log(`✅ تم الانضمام للقناة: ${CHANNEL_ID}`);

    // إرسال المهام كل دقيقة
    setInterval(async () => {
        try {
            await client.messaging.sendGroupMessage(CHANNEL_ID, "!مد مهام");
            console.log("تم إرسال !مد مهام");
        } catch (error) {
            console.error("خطأ في إرسال الرسالة:", error);
        }
    }, 60 * 1000);
});

client.login(process.env.U_MAIL, process.env.U_PASS);
