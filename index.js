const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot online 24/7!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor web escuchando en el puerto ${PORT}`);
});

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
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const ms = require('ms');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Coloca aquí el ID del rol que quieres entregar con el botón
const ID_DEL_ROL = '1550356193220759612';

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
    .setDescription('Crea un sorteo en el canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('premio')
        .setDescription('El premio del sorteo')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('duracion')
        .setDescription('Duración del sorteo (ejemplo: 1m, 1h, 1d)')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('ganadores')
        .setDescription('Número de ganadores')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('rol-boton')
    .setDescription('Envía el mensaje con el botón para obtener el rol')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    console.log('Registrando slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Slash commands registrados correctamente.');
  } catch (error) {
    console.error('Error registrando comandos:', error);
  }
}

client.once('ready', async () => {
  console.log(`Bot conectado como ${client.user.tag}`);
  await registerCommands();
});

const sorteos = new Map();

client.on('interactionCreate', async interaction => {
  // Manejo de Comandos Slash
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    if (commandName === 'ping') {
      await interaction.reply('🏓 ¡Pong!');
    }

    if (commandName === 'ip') {
      const embed = new EmbedBuilder()
        .setTitle('🌐 IPs de Ultracore Network')
        .setColor(0x00FF00)
        .addFields(
          { name: 'Java:', value: '`mc.ultracore.net`', inline: true },
          { name: 'Bedrock:', value: '`bedrock.ultracore.net` (Puerto: 19132)', inline: true }
        )
        .setFooter({ text: 'Ultracore Network' });

      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('📋 Lista de Comandos')
        .setColor(0x0099FF)
        .setDescription(
          '`/ping` - Revisa la latencia\n' +
          '`/ip` - Muestra la IP del servidor\n' +
          '`/sorteo` - Inicia un sorteo (Solo Admins)\n' +
          '`/rol-boton` - Envía botón para rol (Solo Admins)'
        );

      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'sorteo') {
      const premio = interaction.options.getString('premio');
      const duracionStr = interaction.options.getString('duracion');
      const ganadoresCount = interaction.options.getInteger('ganadores');

      const tiempoMs = ms(duracionStr);
      if (!tiempoMs) {
        return interaction.reply({ content: 'Formato de tiempo inválido. Usa opciones como 1m, 1h o 1d.', flags: MessageFlags.Ephemeral });
      }

      const tiempoFinal = Date.now() + tiempoMs;

      const embed = new EmbedBuilder()
        .setTitle(`🎉 ¡SORTEO: ${premio}! 🎉`)
        .setDescription(
          `¡Haz clic en el botón de abajo para participar!\n\n` +
          `• **Ganadores:** ${ganadoresCount}\n` +
          `• **Organizado por:** ${interaction.user}\n` +
          `• **Termina:** <t:${Math.floor(tiempoFinal / 1000)}:R>`
        )
        .setColor(0xFFD700)
        .setTimestamp(tiempoFinal);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('participar_sorteo')
          .setLabel('Participar 🎉')
          .setStyle(ButtonStyle.Primary)
      );

      const mensaje = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

      const datosSorteo = {
        premio,
        ganadoresCount,
        participantes: new Set(),
        mensajeId: mensaje.id,
        canalId: interaction.channelId
      };

      sorteos.set(mensaje.id, datosSorteo);

      setTimeout(async () => {
        const sorteo = sorteos.get(mensaje.id);
        if (!sorteo) return;

        const participantesArray = Array.from(sorteo.participantes);
        
        if (participantesArray.length === 0) {
          await interaction.channel.send(`🎉 El sorteo de **${sorteo.premio}** ha finalizado, pero nadie participó.`);
        } else {
          const ganadores = [];
          const copiaParticipantes = [...participantesArray];

          for (let i = 0; i < Math.min(sorteo.ganadoresCount, participantesArray.length); i++) {
            const indexAleatorio = Math.floor(Math.random() * copiaParticipantes.length);
            ganadores.push(copiaParticipantes.splice(indexAleatorio, 1)[0]);
          }

          const mencionesGanadores = ganadores.map(id => `<@${id}>`).join(', ');

          const embedFinal = new EmbedBuilder()
            .setTitle(`🎉 ¡SORTEO FINALIZADO: ${sorteo.premio}! 🎉`)
            .setDescription(`**Ganador(es):** ${mencionesGanadores}\n**Organizado por:** ${interaction.user}`)
            .setColor(0x00FF00);

          await interaction.editReply({ embeds: [embedFinal], components: [] });
          await interaction.channel.send(`¡Felicidades ${mencionesGanadores}! Ganaste **${sorteo.premio}** 🎉`);
        }

        sorteos.delete(mensaje.id);
      }, tiempoMs);
    }

    if (commandName === 'rol-boton') {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('obtener_rol')
          .setLabel('Obtener Rol 🔔')
          .setStyle(ButtonStyle.Success)
      );

      const embed = new EmbedBuilder()
        .setTitle('🎭 Roles de la Comunidad')
        .setDescription('Haz clic en el botón de abajo para obtener o quitarte el rol de notificaciones para Alianzas.')
        .setColor(0x5865F2);

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  // Manejo de Clics en Botones
  if (interaction.isButton()) {
    if (interaction.customId === 'participar_sorteo') {
      const sorteo = sorteos.get(interaction.message.id);
      if (!sorteo) {
        return interaction.reply({ content: 'Este sorteo ya ha terminado.', flags: MessageFlags.Ephemeral });
      }

      if (sorteo.participantes.has(interaction.user.id)) {
        sorteo.participantes.delete(interaction.user.id);
        await interaction.reply({ content: 'Has salido del sorteo.', flags: MessageFlags.Ephemeral });
      } else {
        sorteo.participantes.add(interaction.user.id);
        await interaction.reply({ content: '¡Estás participando en el sorteo! 🎉', flags: MessageFlags.Ephemeral });
      }
    }

    if (interaction.customId === 'obtener_rol') {
      const role = interaction.guild.roles.cache.get(ID_DEL_ROL);

      if (!role) {
        return interaction.reply({ content: 'No se encontró el rol. Revisa si el ID configurado es correcto.', flags: MessageFlags.Ephemeral });
      }

      const member = interaction.member;

      if (member.roles.cache.has(ID_DEL_ROL)) {
        await member.roles.remove(role);
        await interaction.reply({ content: `Te he quitado el rol **${role.name}**.`, flags: MessageFlags.Ephemeral });
      } else {
        await member.roles.add(role);
        await interaction.reply({ content: `¡Te he dado el rol **${role.name}**!`, flags: MessageFlags.Ephemeral });
      }
    }
  }
});

client.login(process.env.TOKEN);
