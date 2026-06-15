require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
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
let daily = {};
let streak = {};
let giveaways = {};

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

// ================= LOG SYSTEM =================

client.on("messageDelete", async (m) => {
  const log = m.guild?.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;
  log.send(`🗑️ Silinen mesaj: ${m.content || "boş"} | ${m.author?.tag || "unknown"}`);
});

client.on("messageUpdate", async (oldM, newM) => {
  const log = oldM.guild?.channels.cache.get(LOG_CHANNEL_ID);
  if (!log) return;
  log.send(`✏️ Edit: ${oldM.content} ➜ ${newM.content}`);
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
  if (!daily[id]) daily[id] = 0;
  if (!streak[id]) streak[id] = 0;

  // ================= LINK =================

  if (LINK_REGEX.test(txt)) {
    await message.delete().catch(()=>{});
    message.member.timeout(60 * 60 * 1000).catch(()=>{});
    return message.channel.send("🔗 Link yasak → 1 saat mute");
  }

  // ================= KÜFÜR =================

  const clean = txt.replace(/0/g,"o").replace(/1/g,"i").replace(/3/g,"e");

  if (BAD_WORDS.some(w => clean.includes(w))) {
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

  // ================= DAILY =================

  if (message.content === "!daily") {

    if (Date.now() - daily[id] < 86400000)
      return message.reply("⏳ 24 saat bekle");

    daily[id] = Date.now();
    streak[id]++;

    xp[id] += 500 + streak[id] * 50;
    money[id] += 1000;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    return message.reply(`🎁 Daily alındı | streak: ${streak[id]}`);
  }

  // ================= TOP10 =================

  if (message.content === "!top10") {

    const top = Object.entries(xp)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,10)
      .map((u,i)=>`#${i+1} <@${u[0]}> ⭐ ${u[1]}`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🏆 TOP 10")
      .setDescription(top || "veri yok");

    return message.channel.send({ embeds:[embed] });
  }

  // ================= SHOP =================

  if (message.content === "!shop") {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("buy_senor").setLabel("👑 SENOR").setStyle(ButtonStyle.Primary)
    );

    return message.channel.send({ content:"🛒 SHOP", components:[row] });
  }

  // ================= BASIC =================

  if (message.content === "!xp")
    return message.reply(`⭐ XP: ${xp[id]}`);

  if (message.content === "!param")
    return message.reply(`💰 Para: ${money[id]}`);
});

// ================= BUTTON =================

client.on("interactionCreate", async (i) => {

  if (!i.isButton()) return;

  const id = i.user.id;

  if (i.customId === "buy_senor") {

    if (money[id] < 50000)
      return i.reply({ content:"❌ yeterli para yok", ephemeral:true });

    money[id] -= 50000;

    const m = i.guild.members.cache.get(id);
    m.roles.add(SENOR_ROLE).catch(()=>{});

    save("./data/money.json", money);

    return i.reply({ content:"👑 SENOR alındı", ephemeral:true });
  }
});

// ================= LOGIN =================

client.login(process.env.TOKEN);
