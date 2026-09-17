const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Prueba si el bot está online'),
  
  new SlashCommandBuilder()
    .setName('ip')
    .setDescription('Muestra las IPs del servidor'),
  
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra los comandos disponibles')
].map(command => command.toJSON());

client.once('ready', async () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    console.log('Registrando slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Slash commands registrados correctamente.');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('¡Pong! 🏓');
  }

  if (commandName === 'ip') {
    const embed = new EmbedBuilder()
      .setTitle('🌐 IPs de Ultracore Network')
      .setColor(0xFF0000)
      .addFields(
        { name: '☕ Java', value: '`ultracorevip.servegame.com:26399`', inline: false },
        { name: '📱 Bedrock', value: '`ultracorevip.servegame.com`', inline: false },
        { name: '🔌 Puerto', value: '`26399`', inline: false }
      )
      .setFooter({ text: 'Ultracore Network' });

    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'help') {
    const embed = new EmbedBuilder()
      .setTitle('Comandos disponibles')
      .setColor(0xFF0000)
      .setDescription('`/ping` - Prueba el bot\n`/ip` - Muestra las IPs del servidor\n`/help` - Muestra esta ayuda')
      .setFooter({ text: 'Ultracore Network' });

    await interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
