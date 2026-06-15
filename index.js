require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");

// ================= CLIENT =================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// ================= OWNER =================

const OWNER_ID = "1003708560728920165";

// ================= LOG CHANNEL =================

const LOG_CHANNEL_ID = "1512629605830496257";

// ================= DATA =================

function load(file, def) {
  return fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file))
    : def;
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let xp = load("./data/xp.json", {});
let money = load("./data/money.json", {});
let cooldown = {};
let curse = {};
let giveaways = {};

// ================= CONFIG =================

const ROLES = {
  caylak: "1515752720433152050",
  aktif: "1515752883600232538",
  sadik: "1515753054912118796",
  daimi: "1515770549870264330",
  special: "1515779632761143540"
};

const LINK_REGEX = /(https?:\/\/|www\.)/i;

const BAD_WORDS = [
  "amk","oç","siktir","fuck","shit","piç","aq","amq","yarrak",
  "orospu","mal","salak","gerizekalı","aptal","bitch",
  "ass","bok","gavat","pezevenk","ibne","dick","wtf"
];

// ================= ROLE SYSTEM =================

async function updateRoles(member, xpValue) {

  const roles = Object.values(ROLES)
    .map(id => member.guild.roles.cache.get(id))
    .filter(Boolean);

  await member.roles.remove(roles).catch(()=>{});

  if (xpValue >= 50000) return member.roles.add(ROLES.special).catch(()=>{});
  if (xpValue >= 25000) return member.roles.add(ROLES.daimi).catch(()=>{});
  if (xpValue >= 14000) return member.roles.add(ROLES.sadik).catch(()=>{});
  if (xpValue >= 6500) return member.roles.add(ROLES.aktif).catch(()=>{});
  if (xpValue >= 1000) return member.roles.add(ROLES.caylak).catch(()=>{});
}

// ================= HOŞGELDİN =================

client.on("guildMemberAdd", async (member) => {
  const channel =
    member.guild.systemChannel ||
    member.guild.channels.cache.get(LOG_CHANNEL_ID);

  if (!channel) return;

  channel.send(`👋 Hoşgeldin <@${member.id}>! Sunucuya katıldın 🎉`);
});

// ================= MESSAGE DELETE =================

client.on("messageDelete", async (message) => {
  if (!message.guild) return;

  const log = message.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;

  log.send(`🗑️ MESAJ SİLİNDİ
👤 ${message.author?.tag || "Bilinmiyor"}
💬 ${message.content || "Boş"}`);
});

// ================= MESSAGE UPDATE =================

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (!oldMessage.guild) return;
  if (oldMessage.content === newMessage.content) return;

  const log = oldMessage.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;

  log.send(`✏️ MESAJ DÜZENLENDİ
👤 ${oldMessage.author?.tag}
📌 Eski: ${oldMessage.content}
📌 Yeni: ${newMessage.content}`);
});

// ================= MESSAGE =================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  const id = message.author.id;
  const now = Date.now();
  const txt = message.content.toLowerCase();
  const args = message.content.trim().split(/\s+/);

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;
  if (!cooldown[id]) cooldown[id] = 0;
  if (!curse[id]) curse[id] = 0;

  // LINK
  if (LINK_REGEX.test(txt)) {
    await message.delete().catch(()=>{});
    if (message.member?.moderatable)
      message.member.timeout(3600000);
    return message.channel.send("🔗 Link → 1 saat mute");
  }

  // CURSE
  if (BAD_WORDS.some(w => txt.includes(w))) {
    await message.delete().catch(()=>{});
    curse[id]++;

    if (curse[id] >= 3) {
      curse[id] = 0;
      if (message.member?.moderatable)
        message.member.timeout(300000);
      return message.channel.send("⚠️ 3 küfür → 5 dk mute");
    }

    return message.channel.send(`⚠️ Küfür: ${curse[id]}/3`);
  }

  // XP + MONEY
  if (now - cooldown[id] >= 120000) {

    xp[id] += Math.floor(Math.random() * 21) + 10;
    money[id] += Math.floor(Math.random() * 901) + 100;

    cooldown[id] = now;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    updateRoles(message.member, xp[id]);
  }

  // COMMANDS
  if (message.content === "!xp")
    return message.reply(`⭐ XP: ${xp[id] || 0}`);

  if (message.content === "!param")
    return message.reply(`💰 Para: ${money[id] || 0}`);

  // OWNER XP
  if (message.content.startsWith("!xpver")) {
    if (message.author.id !== OWNER_ID) return;

    const user = message.mentions.members.first();
    const amount = Number(args[2]);

    if (!user || !amount) return;

    xp[user.id] = (xp[user.id] || 0) + amount;
    save("./data/xp.json", xp);
    updateRoles(user, xp[user.id]);

    return message.channel.send(`⭐ XP verildi`);
  }

  // OWNER MONEY
  if (message.content.startsWith("!paraver")) {
    if (message.author.id !== OWNER_ID) return;

    const user = message.mentions.members.first();
    const amount = Number(args[2]);

    if (!user || !amount) return;

    money[user.id] = (money[user.id] || 0) + amount;
    save("./data/money.json", money);

    return message.channel.send(`💰 para verildi`);
  }

  // GIVEAWAY (aynı bırakıldı)
  if (message.content.startsWith("!cekilis")) {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return;

    let time = args[1] || "1d";
    let ms = 86400000;

    if (time.endsWith("m")) ms = parseInt(time) * 60000;
    else if (time.endsWith("h")) ms = parseInt(time) * 3600000;
    else if (time.endsWith("d")) ms = parseInt(time) * 86400000;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("join_giveaway")
        .setLabel("🎉 Katıl")
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await message.channel.send({
      content: `🎉 ÇEKİLİŞ\n⏰ ${time}`,
      components: [row]
    });

    giveaways[msg.id] = [];

    setTimeout(() => {
      const list = giveaways[msg.id];
      if (!list?.length) return;

      const winner = list[Math.floor(Math.random() * list.length)];
      message.channel.send(`🎉 Kazanan: <@${winner}>`);
    }, ms);
  }
});

// ================= BUTTON =================

client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;
  if (i.customId !== "join_giveaway") return;

  if (!giveaways[i.message.id])
    giveaways[i.message.id] = [];

  if (giveaways[i.message.id].includes(i.user.id))
    return i.reply({ content: "Zaten katıldın", ephemeral: true });

  giveaways[i.message.id].push(i.user.id);

  return i.reply({ content: "🎉 Katıldın!", ephemeral: true });
});

// ================= LOGIN =================

client.login(process.env.TOKEN);
