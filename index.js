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

// ================= IDS =================

const OWNER_ID = "1003708560728920165";

const LOG_CHANNEL_ID = "1512629605830496257";

const MEMBER_ROLE = "1506370448814899280";

const SENOR_ROLE = "1515780264779841689";

const ROLES = {
  caylak: "1515752720433152050",
  aktif: "1515752883600232538",
  sadik: "1515753054912118796",
  daimi: "1515770549870264330",
  special: "1515779632761143540"
};

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
let inventory = load("./data/inventory.json", {});
let cooldown = {};
let curse = {};
let giveaways = {};
let boostActive = {};

// ================= ROLE SYSTEM =================

async function updateRoles(member, xpValue) {

  const roles = Object.values(ROLES)
    .map(id => member.guild.roles.cache.get(id))
    .filter(Boolean);

  await member.roles.remove(roles).catch(()=>{});

  if (xpValue >= 50000) {

    await member.roles.add(ROLES.special).catch(()=>{});

    // 🔥 PRESTIGE RESET
    xp[member.id] = 0;
    money[member.id] = 0;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    return;
  }

  if (xpValue >= 25000) return member.roles.add(ROLES.daimi).catch(()=>{});
  if (xpValue >= 14000) return member.roles.add(ROLES.sadik).catch(()=>{});
  if (xpValue >= 6500) return member.roles.add(ROLES.aktif).catch(()=>{});
  if (xpValue >= 1000) return member.roles.add(ROLES.caylak).catch(()=>{});
}

// ================= WELCOME =================

client.on("guildMemberAdd", async (member) => {

  member.roles.add(MEMBER_ROLE).catch(()=>{});

  const channel =
    member.guild.systemChannel ||
    member.guild.channels.cache.get(LOG_CHANNEL_ID);

  if (!channel) return;

  channel.send(`👋 Hoşgeldin <@${member.id}>! Üye rolün verildi 🎉`);
});

// ================= LOGS =================

client.on("messageDelete", (message) => {
  if (!message.guild) return;

  const log = message.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;

  log.send(`🗑️ Silindi: ${message.author?.tag} → ${message.content || "boş"}`);
});

client.on("messageUpdate", (oldM, newM) => {
  if (!oldM.guild) return;
  if (oldM.content === newM.content) return;

  const log = oldM.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;

  log.send(`✏️ Düzenlendi: ${oldM.author?.tag}
Eski: ${oldM.content}
Yeni: ${newM.content}`);
});

// ================= MESSAGE =================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  const id = message.author.id;
  const now = Date.now();
  const txt = message.content.toLowerCase();
  const args = message.content.split(/\s+/);

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;
  if (!inventory[id]) inventory[id] = [];
  if (!cooldown[id]) cooldown[id] = 0;
  if (!curse[id]) curse[id] = 0;

  // LINK
  if (/(https?:\/\/|www\.)/i.test(txt)) {
    await message.delete().catch(()=>{});
    if (message.member?.moderatable)
      message.member.timeout(3600000);
    return;
  }

  // KÜFÜR
  const bad = ["amk","oç","fuck","shit","piç","aq","mal","salak"];

  if (bad.some(w => txt.includes(w))) {
    await message.delete().catch(()=>{});
    curse[id]++;

    if (curse[id] >= 3) {
      curse[id] = 0;
      message.member.timeout(300000);
    }
  }

  // XP + PARA
  if (now - cooldown[id] >= 120000) {

    let xpGain = Math.floor(Math.random() * 21) + 10;
    let moneyGain = Math.floor(Math.random() * 901) + 100;

    // BOOST
    if (boostActive[id] && boostActive[id] > Date.now()) {
      xpGain *= 2;
      moneyGain *= 2;
    }

    // SENOR
    if (message.member.roles.cache.has(SENOR_ROLE)) {
      xpGain = Math.floor(xpGain * 1.3);
      moneyGain = Math.floor(moneyGain * 1.3);
    }

    // SPECIAL
    if (message.member.roles.cache.has(ROLES.special)) {
      xpGain = Math.floor(xpGain * 1.6);
      moneyGain = Math.floor(moneyGain * 1.6);
    }

    xp[id] += xpGain;
    money[id] += moneyGain;

    cooldown[id] = now;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    updateRoles(message.member, xp[id]);
  }

  // XP
  if (message.content === "!xp")
    return message.reply(`⭐ XP: ${xp[id]}`);

  if (message.content === "!param")
    return message.reply(`💰 Para: ${money[id]}`);

  // XP AL
  if (message.content === "!xpal") {
    const gain = Math.floor(money[id] / 50);

    xp[id] += gain;
    money[id] -= gain * 50;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    return message.reply(`🔄 ${gain} XP alındı`);
  }

  // SHOP
  if (message.content === "!shop") {
    return message.channel.send("🛒 premium_pass 15000 | boost 10000 | king 25000");
  }

  if (message.content.startsWith("!satinal")) {

    const item = args[1];
    if (!inventory[id]) inventory[id] = [];

    const items = {
      premium_pass: 15000,
      boost: 10000,
      king: 25000
    };

    if (!items[item]) return;

    if (money[id] < items[item]) return;

    money[id] -= items[item];
    inventory[id].push(item);

    save("./data/money.json", money);
    save("./data/inventory.json", inventory);

    return message.reply("✅ alındı");
  }

  if (message.content === "!envanter") {
    return message.reply(inventory[id].join(", ") || "boş");
  }

  // BOOST USE
  if (message.content === "!use boost") {

    if (!inventory[id].includes("boost"))
      return message.reply("Boost yok");

    inventory[id] = inventory[id].filter(x => x !== "boost");
    boostActive[id] = Date.now() + 3600000;

    save("./data/inventory.json", inventory);

    return message.reply("⚡ Boost 1 saat aktif");
  }

  // OWNER
  if (message.content.startsWith("!xpver")) {
    if (id !== OWNER_ID) return;

    const user = message.mentions.members.first();
    const amount = Number(args[2]);

    xp[user.id] += amount;
    save("./data/xp.json", xp);

    updateRoles(user, xp[user.id]);
  }

  if (message.content.startsWith("!paraver")) {
    if (id !== OWNER_ID) return;

    const user = message.mentions.members.first();
    const amount = Number(args[2]);

    money[user.id] += amount;

    save("./data/money.json", money);
  }
});

// ================= LOGIN =================

client.login(process.env.TOKEN);
