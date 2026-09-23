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

// ID del rol que entregará el botón
const ID_DEL_ROL = '1550356193220759612';

// Contador global de sugerencias
let numeroSugerencia = 1;
const sugerenciasData = new Map();

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
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('sugerir')
    .setDescription('Envía una sugerencia para el servidor')
    .addStringOption(option =>
      option.setName('texto')
        .setDescription('Escribe tu sugerencia aquí')
        .setRequired(true)
    )
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
        .setTitle('📋 Lista de Comandos')
        .setColor(0xFF0000)
        .setDescription(
          '`/ping` - Revisa la latencia\n' +
          '`/ip` - Muestra la IP del servidor\n' +
          '`/sugerir` - Envía una sugerencia para la comunidad\n' +
          '`/sorteo` - Crea un sorteo (Solo Admins)\n' +
          '`/rol-boton` - Envía botón para rol (Solo Admins)'
        );

      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'sugerir') {
      const texto = interaction.options.getString('texto');
      const num = numeroSugerencia++;

      const embed = new EmbedBuilder()
        .setTitle(`💡 Sugerencia #${num}`)
        .setDescription(texto)
        .setColor(0x8A2BE2) // Morado por defecto
        .addFields(
          { name: 'Autor', value: interaction.user.username, inline: true },
          { name: 'Estado', value: '🟣 Pendiente', inline: true },
          { name: 'Votos', value: '⬆️ 0 · ⬇️ 0', inline: true }
        )
        .setFooter({ text: `ID: ${interaction.user.id} • Sugerencia ${num}` })
        .setTimestamp();

      const rowVotos = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('voto_favor')
          .setLabel('Votar a favor')
          .setEmoji('⬆️')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('voto_contra')
          .setLabel('Votar en contra')
          .setEmoji('⬇️')
          .setStyle(ButtonStyle.Danger)
      );

      const rowAdmin = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('sug_aprobar')
          .setLabel('Aprobar')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('sug_considerar')
          .setLabel('Considerar')
          .setEmoji('🤔')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('sug_implementada')
          .setLabel('Implementada')
          .setEmoji('🎉')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('sug_rechazar')
          .setLabel('Rechazar')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger)
      );

      const mensaje = await interaction.reply({
        embeds: [embed],
        components: [rowVotos, rowAdmin],
        fetchReply: true
      });

      sugerenciasData.set(mensaje.id, {
        autor: interaction.user.username,
        texto,
        num,
        votosFavor: new Set(),
        votosContra: new Set(),
        estado: '🟣 Pendiente',
        color: 0x8A2BE2
      });
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
        .setDescription('Haz clic en el botón de abajo para obtener o quitarte el rol.')
        .setColor(0x5865F2);

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  // Manejo de Clics en Botones
  if (interaction.isButton()) {
    const sug = sugerenciasData.get(interaction.message.id);

    // Sistema de Votos de Sugerencias
    if (sug && (interaction.customId === 'voto_favor' || interaction.customId === 'voto_contra')) {
      const userId = interaction.user.id;

      if (interaction.customId === 'voto_favor') {
        sug.votosContra.delete(userId);
        if (sug.votosFavor.has(userId)) {
          sug.votosFavor.delete(userId);
        } else {
          sug.votosFavor.add(userId);
        }
      } else if (interaction.customId === 'voto_contra') {
        sug.votosFavor.delete(userId);
        if (sug.votosContra.has(userId)) {
          sug.votosContra.delete(userId);
        } else {
          sug.votosContra.add(userId);
        }
      }

      const embedNuevo = EmbedBuilder.from(interaction.message.embeds[0])
        .setFields(
          { name: 'Autor', value: sug.autor, inline: true },
          { name: 'Estado', value: sug.estado, inline: true },
          { name: 'Votos', value: `⬆️ ${sug.votosFavor.size} · ⬇️ ${sug.votosContra.size}`, inline: true }
        );

      await interaction.update({ embeds: [embedNuevo] });
      return;
    }

    // Sistema de Moderación de Sugerencias (Solo Admins)
    if (sug && interaction.customId.startsWith('sug_')) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: 'Solo los administradores pueden cambiar el estado de las sugerencias.', flags: MessageFlags.Ephemeral });
      }

      if (interaction.customId === 'sug_aprobar') {
        sug.estado = '✅ Aprobada';
        sug.color = 0x57F287; // Verde
      } else if (interaction.customId === 'sug_considerar') {
        sug.estado = '🤔 En consideración';
        sug.color = 0xFEE75C; // Amarillo
      } else if (interaction.customId === 'sug_implementada') {
        sug.estado = '🎉 Implementada';
        sug.color = 0x5865F2; // Azul
      } else if (interaction.customId === 'sug_rechazar') {
        sug.estado = '❌ Rechazada';
        sug.color = 0xED4245; // Rojo
      }

      const embedMod = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(sug.color)
        .setFields(
          { name: 'Autor', value: sug.autor, inline: true },
          { name: 'Estado', value: sug.estado, inline: true },
          { name: 'Votos', value: `⬆️ ${sug.votosFavor.size} · ⬇️ ${sug.votosContra.size}`, inline: true }
        );

      await interaction.update({ embeds: [embedMod] });
      return;
    }

    if (interaction.customId === 'participar_sorteo') {
      const sorteo = sorteos.get(interaction.message.id);
      if (!sorteo) {
        return interaction.reply({ content: 'Este sorteo ya ha terminado o expiró.', flags: MessageFlags.Ephemeral });
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
