const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', message => {
  if (message.author.bot) return;

  const prefix = '!';

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'ping') {
    message.reply('Pong!');
  }

  if (command === 'ip') {
    message.reply('☕ Java:\nultracorevip.servegame.com:26399');
    message.reply('📱 Bedrock:\nultracorevip.servegame.com');
    message.reply('🔌 Puerto:\n26399');
  }

  if (command === 'help') {
    message.reply('Comandos disponibles:\n!ping - Prueba el bot\n!ip - Muestra la IP del servidor\n!help - Muestra esta ayuda');
  }
});

client.login(process.env.TOKEN);

client.login(process.env.TOKEN);
