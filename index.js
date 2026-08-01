const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();

// --- الإعدادات الأساسية ---
const OWNER_ID = '1151179063122214963'; 
const CLIENT_ID = '1508569205941735465'; 
const CLIENT_SECRET = process.env.SECRET || 'J7OBhcI9jlbT0GEg9sTUOpBtbZz9dnDG'; 
const BOT_TOKEN = process.env.TOKEN || 'MTUwODU2OTIwNTk0MTczNTQ2NQ.GEvn0f.I6Erz5iYQHgcFf2PmBX0VdFaNHUqAIEXh9tQgQ'; 

const DOMAIN = process.env.RAILWAY_STATIC_URL 
    ? 'https://' + process.env.RAILWAY_STATIC_URL 
    : 'https://ma7shyterms-production.up.railway.app';

const REDIRECT_URI = DOMAIN + '/callback';
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// تحميل البيانات أو إنشاء ملف جديد إذا لم يكن موجوداً
let usersDatabase = [];
if (fs.existsSync(DB_FILE)) {
    try {
        usersDatabase = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch (e) {
        usersDatabase = [];
    }
}

function saveDatabase() {
    fs.writeFileSync(DB_FILE, JSON.stringify(usersDatabase, null, 2));
}

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// وقت بدء تشغيل البوت لحساب الـ Uptime
const bootTime = Date.now();

bot.on('ready', () => {
    console.log(`Logged in as ${bot.user.tag}!`);
    console.log(`Current Redirect URI: ${REDIRECT_URI}`);
    
    // تفعيل الكاستوم ستاتوس للبوت
    bot.user.setPresence({
        activities: [{ 
            name: 'custom', 
            type: 4, 
            state: 'Eren Is The best' 
        }],
        status: 'online',
    });
});

bot.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('+')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. أمر المساعدة المطور
    if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('🤖 Bot Commands List')
            .setColor('#5865F2')
            .setDescription('قائمة الأوامر المتاحة للتحكم بالبوت والنظام:')
            .addFields(
                { name: '⚙️ الأوامر العامة', value: '`+help` - يعرض هذه القائمة.\n`+stats` - يعرض إحصائيات البوت والتوثيق.' },
                { name: '👑 أوامر المطور (Owner Only)', value: '`+panel` - إنشاء رابط التوثيق المحدث.\n`+check [User_ID]` - فحص حالة توثيق عضو معين.\n`+pullguild [Server_ID]` - سحب الأعضاء الموثقين إلى سيرفر محدد.' }
            )
            .setFooter({ text: 'Ma7shy Bot System' });
        return message.reply({ embeds: [helpEmbed] });
    }

    // 2. أمر الإحصائيات (Stats)
    if (command === 'stats') {
        const uptimeMs = Date.now() - bootTime;
        const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
        const uptimeMins = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

        const statsEmbed = new EmbedBuilder()
            .setTitle('📊 Bot System Statistics')
            .setColor('#2ed573')
            .addFields(
                { name: '👥 إجمالي الموثقين:', value: `${usersDatabase.length} عضو`, inline: true },
                { name: '⏳ وقت التشغيل:', value: `${uptimeHours} ساعة و ${uptimeMins} دقيقة`, inline: true },
                { name: '🟢 حالة الاتصال:', value: 'مستقر ومتصل', inline: true }
            );
        return message.reply({ embeds: [statsEmbed] });
    }

    // 3. أمر لوحة التحكم (Panel)
    if (command === 'panel') {
        if (message.author.id !== OWNER_ID) return message.reply('❌ هذا الأمر مخصص لمالك البوت فقط.');

        const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds.join`;

        const panelEmbed = new EmbedBuilder()
            .setTitle('🔐 لوحة تحكم الإدارة')
            .setColor('#ED4245')
            .setDescription('استخدم الرابط أدناه لتوجيه الأعضاء لإتمام عملية التوثيق القياسية.')
            .addFields(
                { name: '🔗 رابط التوثيق المباشر:', value: `[اضغط هنا للتوثيق](${oauthUrl})` },
                { name: '📊 الإحصائية الحالية:', value: `يوجد حالياً **${usersDatabase.length}** عضو جاهز للنقل.` }
            );
        return message.reply({ embeds: [panelEmbed] });
    }

    // 4. أمر فحص عضو محدد (Check)
    if (command === 'check') {
        if (message.author.id !== OWNER_ID) return message.reply('❌ هذا الأمر مخصص لمالك البوت فقط.');
        
        const targetId = args[0];
        if (!targetId) return message.reply('❌ يرجى إدخال الـ ID الخاص بالعضو المراد فحصه.');

        const isVerified = usersDatabase.find(u => u.id === targetId);
        if (isVerified) {
            return message.reply(`✅ العضو **@${isVerified.username}** موثق بالفعل وموجود في قاعدة البيانات.`);
        } else {
            return message.reply('❌ هذا العضو غير موجود في قاعدة بيانات التوثيق.');
        }
    }

    // 5. أمر سحب الأعضاء (Pull Guild)
    if (command === 'pullguild') {
        if (message.author.id !== OWNER_ID) return message.reply('❌ هذا الأمر مخصص لمالك البوت فقط.');
        
        const targetGuildId = args[0];
        if (!targetGuildId) return message.reply('❌ يرجى تزويد أمر السحب بـ ID السيرفر المستهدف.');

        if (usersDatabase.length === 0) return message.reply('❌ لا يوجد أعضاء موثقين في قاعدة البيانات للقيام بنقلهم.');

        message.reply(`⏳ جاري بدء عملية نقل ${usersDatabase.length} عضو إلى السيرفر المحدد...`);

        let successCount = 0;
        for (const user of usersDatabase) {
            try {
                await axios.put(
                    `https://discord.com/api/v10/guilds/${targetGuildId}/members/${user.id}`,
                    { access_token: user.token },
                    { headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' } }
                );
                successCount++;
            } catch (err) {
                console.error(`Failed to pull ${user.username || user.id}:`, err.message);
            }
        }
        return message.channel.send(`✅ اكملت العملية بنجاح! تم إضافة ${successCount} من أصل ${usersDatabase.length} عضو إلى السيرفر.`);
    }
});

// --- سيرفر الويب وواجهة المستخدم المحدثة ---
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    
    if (!code) {
        return res.send(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>خطأ في التوثيق</title>
                <style>
                    body { background-color: #0f111a; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
                    .card { background: #1a1d29; padding: 30px; border-radius: 15px; border: 1px solid #ff4757; max-width: 400px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
                    h1 { color: #ff4757; font-size: 22px; }
                    p { color: #a0a5b5; font-size: 15px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>❌ فشل الاتصال المباشر</h1>
                    <p>يرجى استخدام الرابط الذي يوفره البوت الرسمي داخل تطبيق ديسكورد لإتمام عملية التحقق بشكل صحيح.</p>
                </div>
            </body>
            </html>
        `);
    }

    try {
        const tokenResponse = await axios.post('https://discord.com/api/v10/oauth2/token', new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const userData = userResponse.data;

        // التحقق وتحديث التوكن أو إضافة مستخدم جديد
        const userIndex = usersDatabase.findIndex(u => u.id === userData.id);
        if (userIndex > -1) {
            usersDatabase[userIndex].token = accessToken;
            usersDatabase[userIndex].username = userData.username;
        } else {
            usersDatabase.push({
                id: userData.id,
                username: userData.username,
                token: accessToken
            });
        }
        saveDatabase();

        res.send(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>تم التوثيق بنجاح</title>
                <style>
                    body { background-color: #0c0e17; color: #fff; font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
                    .card { background: #161925; padding: 40px 30px; border-radius: 20px; border: 1px solid #2ed573; max-width: 450px; box-shadow: 0 12px 35px rgba(0,0,0,0.5); }
                    .check-icon { font-size: 55px; color: #2ed573; margin-bottom: 20px; }
                    h1 { color: #2ed573; font-size: 24px; margin: 0 0 10px 0; }
                    p { color: #b3b9c9; font-size: 16px; line-height: 1.6; }
                    .user-box { background: #5865F2; padding: 8px 15px; border-radius: 30px; font-weight: bold; display: inline-block; margin-top: 15px; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="check-icon">✓</div>
                    <h1>تمت عملية التحقق بنجاح!</h1>
                    <p>أهلاً بك، تم ربط حسابك بنظام التوثيق القياسي بنجاح ومزامنة الإعدادات الخاصة بك. يمكنك إغلاق هذه الصفحة والعودة إلى تطبيق ديسكورد الآن.</p>
                    <div class="user-box">@${userData.username}</div>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error(error.response ? error.response.data : error.message);
        res.status(500).send('حدث خطأ أثناء معالجة البيانات.');
    }
});

app.listen(PORT, () => console.log(`Web Server running on port ${PORT}`));
bot.login(BOT_TOKEN);
