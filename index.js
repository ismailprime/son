require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AuditLogEvent
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
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember
  ]
});

// ================= IDS =================

const OWNER_ID = "1003708560728920165";
const LOG_CHANNEL_ID = "1512629605830496257";
const MEMBER_ROLE = "1506370448814899280";
const SENOR_ROLE = "1515780264779841689";

// ================= RANK ROLES =================

const ROLES = {
  caylak: "1515752720433152050",
  aktif: "1515752883600232538",
  sadik: "1515753054912118796",
  daimi: "1515770549870264330",
  special: "1515779632761143540"
};

// ================= CACHE =================

const messageCache = new Map();

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

// ================= BAD WORDS =================

const BAD_WORDS = [
  "amk","aq","oç","piç","sik","yarak","göt","orospu",
  "fuck","shit","bitch","asshole","nigger","faggot"
];

// ================= LINK =================

const LINK_REGEX = /(https?:\/\/|www\.|discord\.gg|discord\.com\/invite)/i;

// ================= ROLE SYSTEM =================

async function updateRoles(member, xpValue) {

  const allRoles = Object.values(ROLES)
    .map(id => member.guild.roles.cache.get(id))
    .filter(Boolean);

  await member.roles.remove(allRoles).catch(()=>{});

  if (xpValue >= 50000) return member.roles.add(ROLES.special).catch(()=>{});
  if (xpValue >= 25000) return member.roles.add(ROLES.daimi).catch(()=>{});
  if (xpValue >= 14000) return member.roles.add(ROLES.sadik).catch(()=>{});
  if (xpValue >= 6500) return member.roles.add(ROLES.aktif).catch(()=>{});
  if (xpValue >= 1000) return member.roles.add(ROLES.caylak).catch(()=>{});
}

// ================= READY =================

client.once("ready", () => {
  console.log(`${client.user.tag} aktif!`);
});

// ================= WELCOME =================

client.on("guildMemberAdd", async (member) => {

  member.roles.add(MEMBER_ROLE).catch(()=>{});

  const channel = member.guild.channels.cache.find(c => c.name === "💬│genel-sohbet");

  if (channel) {
    channel.send(`👋 Hoşgeldin <@${member.id}>!`);
  }

  const log = member.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (log) log.send(`📥 Yeni üye: <@${member.id}>`);
});

// ================= MESSAGE DELETE =================

client.on("messageDelete", async (message) => {

  if (!message.guild) return;

  const log = message.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;

  const cached = messageCache.get(message.id);

  let executor = "Bilinmiyor";

  try {
    const audit = await message.guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.MessageDelete
    });

    const entry = audit.entries.first();

    if (entry) {
      executor = entry.executor?.tag || "Bilinmiyor";
    }

  } catch {}

  log.send(
    `🗑️ MESAJ SİLİNDİ\n\n` +
    `👤 Yazan: ${cached?.author || message.author?.tag || "unknown"}\n` +
    `🛠️ Silen: ${executor}\n` +
    `💬 Mesaj: ${cached?.content || message.content || "boş"}`
  );

  messageCache.delete(message.id);
});

// ================= MESSAGE EDIT =================

client.on("messageUpdate", async (oldMessage, newMessage) => {

  if (!oldMessage.guild) return;
  if (oldMessage.content === newMessage.content) return;

  const log = oldMessage.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;

  log.send(
    `✏️ MESAJ DÜZENLENDİ\n\n` +
    `👤 Kullanıcı: ${oldMessage.author?.tag}\n` +
    `📌 Eski: ${oldMessage.content}\n` +
    `📌 Yeni: ${newMessage.content}`
  );
});

// ================= MESSAGE =================

client.on("messageCreate", async (message) => {

  messageCache.set(message.id, {
    content: message.content,
    author: message.author?.tag,
    authorId: message.author?.id
  });

  if (message.author.bot) return;
  if (!message.guild) return;

  const id = message.author.id;
  const now = Date.now();
  const txt = message.content.toLowerCase();

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;
  if (!cooldown[id]) cooldown[id] = 0;
  if (!curse[id]) curse[id] = 0;

  const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

  // LINK
  if (LINK_REGEX.test(txt)) {
    if (isAdmin) return;
    await message.delete().catch(()=>{});
    message.member.timeout(3600000).catch(()=>{});
    return message.channel.send("🔗 Link → 1 saat mute");
  }

  // SWEAR
  if (BAD_WORDS.some(w => txt.includes(w))) {
    if (isAdmin) return;
    await message.delete().catch(()=>{});

    curse[id]++;

    if (curse[id] >= 3) {
      curse[id] = 0;
      message.member.timeout(300000).catch(()=>{});
      return message.channel.send("⚠️ 3 küfür → 5 dk mute");
    }

    return message.channel.send(`⚠️ Küfür (${curse[id]}/3)`);
  }

  // XP
  if (now - cooldown[id] >= 120000) {

    let xpGain = Math.floor(Math.random()*21)+10;
    let moneyGain = Math.floor(Math.random()*901)+100;

    if (message.member.roles.cache.has(SENOR_ROLE)) {
      xpGain = Math.floor(xpGain * 1.3);
      moneyGain = Math.floor(moneyGain * 1.3);
    }

    xp[id] += xpGain;
    money[id] += moneyGain;

    cooldown[id] = now;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    updateRoles(message.member, xp[id]);
  }

  // COMMANDS
  if (message.content === "!xp")
    return message.reply(`⭐ XP: ${xp[id]}`);

  if (message.content === "!param")
    return message.reply(`💰 Para: ${money[id]}`);

});

// ================= LOGIN =================

client.login(process.env.TOKEN);
