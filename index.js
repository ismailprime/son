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

// ================= ROLES =================

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
let cooldown = {};
let curse = {};
let giveaways = {}; // ✅ GERİ EKLENDİ

// ================= RULES =================

const BAD_WORDS = [
  "amk","oç","aq","amq","siktir","sik","orospu","piç",
  "mal","salak","gerizekalı","aptal",
  "fuck","shit","bitch","ass","dick","wtf"
];

const LINK_REGEX = /(https?:\/\/|www\.)/i;

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

// ================= LOG SYSTEM =================

// 🗑️ MESAJ SİLME
client.on("messageDelete", async (message) => {

  const log = message.guild?.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;

  log.send(
    `🗑️ MESAJ SİLİNDİ\n` +
    `👤 Kullanıcı: ${message.author?.tag || "unknown"}\n` +
    `💬 Mesaj: ${message.content || "boş"}`
  );
});

// ✏️ MESAJ DÜZENLEME
client.on("messageUpdate", async (oldM, newM) => {

  const log = oldM.guild?.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;

  log.send(
    `✏️ MESAJ DÜZENLENDİ\n` +
    `👤 Kullanıcı: ${oldM.author?.tag || "unknown"}\n` +
    `📌 Eski: ${oldM.content}\n` +
    `📌 Yeni: ${newM.content}`
  );
});

// ================= WELCOME =================

client.on("guildMemberAdd", (member) => {

  member.roles.add(MEMBER_ROLE).catch(()=>{});

  const ch = member.guild.channels.cache.find(c => c.name === "💬│genel-sohbet");

  if (ch) {
    ch.send(`👋 Hoşgeldin <@${member.id}>!\n📊 Sen ${member.guild.memberCount}. üyesisin 🎉`);
  }

  const log = member.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (log) log.send(`📥 Yeni üye: <@${member.id}>`);
});

// ================= MESSAGE =================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  const id = message.author.id;
  const now = Date.now();
  const txt = message.content.toLowerCase();

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;
  if (!cooldown[id]) cooldown[id] = 0;
  if (!curse[id]) curse[id] = 0;

  const isAdmin = message.member?.permissions?.has(PermissionsBitField.Flags.Administrator);

  // ================= LINK =================

  if (LINK_REGEX.test(txt)) {

    if (isAdmin) return;

    await message.delete().catch(()=>{});
    message.member.timeout(60 * 60 * 1000).catch(()=>{});

    return message.channel.send("🔗 Link yasak → 1 saat mute");
  }

  // ================= KÜFÜR =================

  const clean = txt.replace(/0/g,"o").replace(/1/g,"i").replace(/3/g,"e");

  if (BAD_WORDS.some(w => clean.includes(w))) {

    if (isAdmin) return;

    await message.delete().catch(()=>{});
    curse[id]++;

    if (curse[id] >= 3) {
      curse[id] = 0;
      message.member.timeout(5 * 60 * 1000).catch(()=>{});
      return message.channel.send("⚠️ 3 küfür → 5 dk mute");
    }

    return message.channel.send(`⚠️ Küfür ${curse[id]}/3`);
  }

  // ================= XP + PARA =================

  if (now - cooldown[id] >= 120000) {

    let xpGain = Math.floor(Math.random() * 21) + 10;
    let moneyGain = Math.floor(Math.random() * 901) + 100;

    if (message.member.roles.cache.has(SENOR_ROLE)) {
      xpGain *= 1.3;
      moneyGain *= 1.3;
    }

    xp[id] += xpGain;
    money[id] += moneyGain;

    cooldown[id] = now;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    updateRoles(message.member, xp[id]);
  }

  // ================= TOP10 =================

  if (message.content === "!top10") {

    const top = Object.entries(xp)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,10)
      .map((u,i)=>`#${i+1} <@${u[0]}> ⭐ ${u[1]}`)
      .join("\n");

    return message.channel.send(`🏆 TOP10\n\n${top}`);
  }

  // ================= SHOP =================

  if (message.content === "!shop") {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy_senor")
        .setLabel("👑 SENOR")
        .setStyle(ButtonStyle.Primary)
    );

    return message.channel.send({ content:"🛒 SHOP", components:[row] });
  }

  // ================= ÇEKİLİŞ (GERİ EKLENDİ) =================

  if (message.content.startsWith("!cekilis")) {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return;

    const time = message.content.split(" ")[1] || "1m";

    let ms = 60000;
    if (time.endsWith("m")) ms = parseInt(time) * 60000;
    if (time.endsWith("h")) ms = parseInt(time) * 3600000;
    if (time.endsWith("d")) ms = parseInt(time) * 86400000;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("join_giveaway")
        .setLabel("🎉 Katıl")
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await message.channel.send({
      content: `🎉 ÇEKİLİŞ BAŞLADI!\n⏰ ${time}`,
      components: [row]
    });

    giveaways[msg.id] = [];

    setTimeout(() => {

      const list = giveaways[msg.id];

      if (!list || list.length === 0)
        return message.channel.send("❌ Katılım yok");

      const winner = list[Math.floor(Math.random() * list.length)];

      message.channel.send(`🏆 Kazanan: <@${winner}>`);

      const log = message.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (log) log.send(`🎉 ÇEKİLİŞ BİTTİ | Kazanan: <@${winner}>`);

    }, ms);
  }

  // ================= OWNER =================

  if (message.content.startsWith("!xpver")) {
    if (message.author.id !== OWNER_ID) return;

    const u = message.mentions.members.first();
    const a = Number(message.content.split(" ")[2]);

    xp[u.id] += a;

    save("./data/xp.json", xp);
    updateRoles(u, xp[u.id]);

    return message.reply("⭐ XP verildi");
  }

});

// ================= BUTTON =================

client.on("interactionCreate", async (i) => {

  if (!i.isButton()) return;

  const id = i.user.id;

  if (i.customId === "join_giveaway") {

    if (!giveaways[i.message.id])
      giveaways[i.message.id] = [];

    if (giveaways[i.message.id].includes(id))
      return i.reply({ content:"Zaten katıldın", ephemeral:true });

    giveaways[i.message.id].push(id);

    return i.reply({ content:"🎉 Katıldın!", ephemeral:true });
  }

  if (i.customId === "buy_senor") {

    if (money[id] < 250000)
      return i.reply({ content:"❌ 250K para lazım", ephemeral:true });

    money[id] -= 250000;

    const m = i.guild.members.cache.get(id);
    m.roles.add(SENOR_ROLE).catch(()=>{});

    save("./data/money.json", money);

    return i.reply({ content:"👑 SENOR alındı", ephemeral:true });
  }
});

// ================= LOGIN =================

client.login(process.env.TOKEN);
