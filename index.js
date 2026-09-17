const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');
const ms = require('ms');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Lista de comandos (Ping, IP, Help y Sorteo)
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Prueba si el bot está online'),
  
  new SlashCommandBuilder()
    .setName('ip')
    .setDescription('Muestra las IPs del servidor'),
  
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra los comandos disponibles'),

  new SlashCommandBuilder()
    .setName('sorteo')
    .setDescription('Crea un sorteo en el servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option => 
      option.setName('premio')
        .setDescription('El premio que se sorteará')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('duracion')
        .setDescription('Duración del sorteo (ej: 10m, 1h, 1d)')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('ganadores')
        .setDescription('Número de ganadores')
        .setRequired(true))
].map(command => command.toJSON());

// Función para registrar los comandos
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    console.log('Registrando slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('Slash commands registrados correctamente.');
  } catch (error) {
    console.error('Error registrando comandos:', error);
  }
}

client.once('ready', () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    // COMANDO /PING
    if (commandName === 'ping') {
      await interaction.reply('¡Pong! 🏓');
    }

    // COMANDO /IP
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

    // COMANDO /HELP
    if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('Comandos disponibles')
        .setColor(0xFF0000)
        .setDescription(
          '`/ping` - Prueba el bot\n' +
          '`/ip` - Muestra las IPs del servidor\n' +
          '`/help` - Muestra esta ayuda\n' +
          '`/sorteo` - Inicia un sorteo (solo Admins)'
        )
        .setFooter({ text: 'Ultracore Network' });

      await interaction.reply({ embeds: [embed] });
    }

    // COMANDO /SORTEO
    if (commandName === 'sorteo') {
      const premio = interaction.options.getString('premio');
      const duracionInput = interaction.options.getString('duracion');
      const numGanadores = interaction.options.getInteger('ganadores');

      const duracionMs = ms(duracionInput);

      if (!duracionMs) {
        return interaction.reply({ 
          content: '❌ Por favor ingresa un formato de tiempo válido (ejemplo: `10m`, `2h`, `1d`).', 
          ephemeral: true 
        });
      }

      const tiempoFin = Math.floor((Date.now() + duracionMs) / 1000);
      const participantes = new Set();

      const embed = new EmbedBuilder()
        .setTitle(`🎉 ¡SORTEO: ${premio}! 🎉`)
        .setColor(0x00FF00)
        .setDescription(
          `Haz clic en el botón de abajo para participar.\n\n` +
          `⏱️ **Finaliza:** <t:${tiempoFin}:R> (<t:${tiempoFin}:f>)\n` +
          `👑 **Organizado por:** ${interaction.user}\n` +
          `🏆 **Ganadores:** ${numGanadores}\n` +
          `👥 **Participantes:** 0`
        )
        .setFooter({ text: 'Ultracore Network' });

      const boton = new ButtonBuilder()
        .setCustomId('unirse_sorteo')
        .setLabel('Participar 🎉')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(boton);

      const mensaje = await interaction.reply({ 
        embeds: [embed], 
        components: [row], 
        fetchReply: true 
      });

      const collector = mensaje.createMessageComponentCollector({ time: duracionMs });

      collector.on('collect', async i => {
        if (i.customId === 'unirse_sorteo') {
          if (participantes.has(i.user.id)) {
            participantes.delete(i.user.id);
            await i.reply({ content: '❌ Has salido del sorteo.', ephemeral: true });
          } else {
            participantes.add(i.user.id);
            await i.reply({ content: '✅ ¡Te has inscrito correctamente al sorteo!', ephemeral: true });
          }

          const embedActualizado = EmbedBuilder.from(embed)
            .setDescription(
              `Haz clic en el botón de abajo para participar.\n\n` +
              `⏱️ **Finaliza:** <t:${tiempoFin}:R> (<t:${tiempoFin}:f>)\n` +
              `👑 **Organizado por:** ${interaction.user}\n` +
              `🏆 **Ganadores:** ${numGanadores}\n` +
              `👥 **Participantes:** ${participantes.size}`
            );

          await mensaje.edit({ embeds: [embedActualizado] });
        }
      });

      collector.on('end', async () => {
        const listaParticipantes = Array.from(participantes);

        if (listaParticipantes.length === 0) {
          const embedCancelado = EmbedBuilder.from(embed)
            .setColor(0xFF0000)
            .setDescription(`❌ **Sorteo Finalizado:** Sin ganadores (nadie participó).`);
          
          return mensaje.edit({ embeds: [embedCancelado], components: [] });
        }

        const ganadoresMezclados = listaParticipantes.sort(() => 0.5 - Math.random());
        const ganadoresSeleccionados = ganadoresMezclados
          .slice(0, Math.min(numGanadores, listaParticipantes.length))
          .map(id => `<@${id}>`);

        const embedFinal = EmbedBuilder.from(embed)
          .setColor(0xFEE75C)
          .setDescription(
            `🎉 **¡SORTEO FINALIZADO!** 🎉\n\n` +
            `🎁 **Premio:** ${premio}\n` +
            `🏆 **Ganador(es):** ${ganadoresSeleccionados.join(', ')}\n` +
            `👥 **Total de participantes:** ${participantes.size}`
          );

        await mensaje.edit({ embeds: [embedFinal], components: [] });
        await interaction.channel.send(`¡Felicidades ${ganadoresSeleccionados.join(', ')}! Has ganado **${premio}**. Contacta con el staff.`);
      });
    }

  } catch (error) {
    console.error(`Error ejecutando el comando ${commandName}:`, error);
    const errorMessage = { content: 'Hubo un error al ejecutar este comando.', ephemeral: true };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

(async () => {
  await registerCommands();
  client.login(process.env.TOKEN);
})();
