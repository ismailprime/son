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
let boostActive = {};
let curse = {};
let giveaways = {};

// ================= BAD WORDS =================

const BAD_WORDS = [
  "amk","oç","aq","amq","siktir","sik","orospu","piç",
  "mal","salak","gerizekalı","aptal",
  "fuck","shit","bitch","ass","dick","wtf"
];

// ================= ROLE SYSTEM =================

async function updateRoles(member, xpValue) {

  const roles = Object.values(ROLES)
    .map(id => member.guild.roles.cache.get(id))
    .filter(Boolean);

  await member.roles.remove(roles).catch(()=>{});

  if (xpValue >= 50000) {

    await member.roles.add(ROLES.special).catch(()=>{});

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

client.on("guildMemberAdd", (member) => {

  member.roles.add(MEMBER_ROLE).catch(()=>{});

  const ch = member.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (ch) ch.send(`👋 Hoşgeldin <@${member.id}>`);
});

// ================= MESSAGE =================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  const id = message.author.id;
  const now = Date.now();
  const txt = message.content.toLowerCase();

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;
  if (!inventory[id]) inventory[id] = [];
  if (!cooldown[id]) cooldown[id] = 0;
  if (!curse[id]) curse[id] = 0;

  // ================= LOG MESSAGE EDIT/DELETE =================
  client.on("messageDelete", (msg) => {
    const ch = msg.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (ch) ch.send(`🗑️ Silindi: ${msg.content}`);
  });

  client.on("messageUpdate", (oldM, newM) => {
    const ch = oldM.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (ch) ch.send(`✏️ Edit: ${oldM.content} → ${newM.content}`);
  });

  // ================= KÜFÜR =================

  const clean = txt
    .replace(/0/g,"o")
    .replace(/1/g,"i")
    .replace(/3/g,"e")
    .replace(/@/g,"a");

  if (BAD_WORDS.some(w => clean.includes(w))) {

    await message.delete().catch(()=>{});

    curse[id]++;

    if (curse[id] >= 3) {

      curse[id] = 0;

      if (message.member?.moderatable)
        message.member.timeout(5 * 60 * 1000);

      return message.channel.send("⚠️ 3 küfür → 5 dk mute");
    }

    return message.channel.send(`⚠️ Küfür ${curse[id]}/3`);
  }

  // ================= SHOP =================

  if (message.content === "!shop") {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("buy_xp").setLabel("💰 PARA→XP").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("buy_money").setLabel("⭐ XP→PARA").setStyle(ButtonStyle.Danger)
    );

    return message.channel.send({ content: "🛒 SHOP", components: [row] });
  }

  // ================= XP / PARA =================

  if (now - cooldown[id] >= 120000) {

    let xpGain = Math.floor(Math.random() * 21) + 10;
    let moneyGain = Math.floor(Math.random() * 901) + 100;

    if (message.member.roles.cache.has(SENOR_ROLE)) {
      xpGain *= 1.3;
      moneyGain *= 1.3;
    }

    if (message.member.roles.cache.has(ROLES.special)) {
      xpGain *= 1.6;
      moneyGain *= 1.6;
    }

    if (boostActive[id] && boostActive[id] > Date.now()) {
      xpGain *= 2;
      moneyGain *= 2;
    }

    xp[id] += Math.floor(xpGain);
    money[id] += Math.floor(moneyGain);

    cooldown[id] = now;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    updateRoles(message.member, xp[id]);
  }

  // ================= OWNER =================

  if (message.content.startsWith("!xpver")) {
    if (message.author.id !== OWNER_ID) return;

    const u = message.mentions.members.first();
    const a = Number(message.content.split(" ")[2]);

    xp[u.id] = (xp[u.id] || 0) + a;

    save("./data/xp.json", xp);
    updateRoles(u, xp[u.id]);

    return message.reply("⭐ XP verildi");
  }

  if (message.content.startsWith("!paraver")) {
    if (message.author.id !== OWNER_ID) return;

    const u = message.mentions.members.first();
    const a = Number(message.content.split(" ")[2]);

    money[u.id] = (money[u.id] || 0) + a;

    save("./data/money.json", money);

    return message.reply("💰 para verildi");
  }

  // ================= BASIC =================
  if (message.content === "!xp") return message.reply(`⭐ ${xp[id]}`);
  if (message.content === "!param") return message.reply(`💰 ${money[id]}`);

  // ================= TOP10 =================
  if (message.content === "!top10") {

    const topXP = Object.entries(xp)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,10)
      .map((u,i)=>`#${i+1} <@${u[0]}> ⭐ ${u[1]}`)
      .join("\n");

    const topMoney = Object.entries(money)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,10)
      .map((u,i)=>`#${i+1} <@${u[0]}> 💰 ${u[1]}`)
      .join("\n");

    return message.channel.send(`🏆 TOP10\n\n⭐ XP:\n${topXP}\n\n💰 PARA:\n${topMoney}`);
  }

  // ================= ÇEKİLİŞ =================
  if (message.content.startsWith("!cekilis")) {

    const time = message.content.split(" ")[1] || "1m";
    let ms = 60000;

    if (time.endsWith("h")) ms = parseInt(time) * 3600000;
    if (time.endsWith("d")) ms = parseInt(time) * 86400000;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("join").setLabel("🎉 Katıl").setStyle(ButtonStyle.Primary)
    );

    const msg = await message.channel.send({
      content: `🎉 ÇEKİLİŞ ${time}`,
      components: [row]
    });

    giveaways[msg.id] = [];

    setTimeout(() => {

      const list = giveaways[msg.id];
      if (!list?.length) return message.channel.send("❌ kimse katılmadı");

      const winner = list[Math.floor(Math.random()*list.length)];

      message.channel.send(`🏆 Kazanan: <@${winner}>`);

      const ch = message.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (ch) ch.send(`🎉 çekiliş bitti winner: ${winner}`);

    }, ms);
  }
});

// ================= BUTTONS =================

client.on("interactionCreate", async (i) => {

  if (!i.isButton()) return;

  const id = i.user.id;

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;

  if (i.customId === "buy_xp") {
    const g = Math.floor(money[id]/50);
    xp[id]+=g; money[id]-=g*50;
    save("./data/xp.json",xp);
    save("./data/money.json",money);
    return i.reply({content:`💰 ${g} XP`,ephemeral:true});
  }

  if (i.customId === "buy_money") {
    const g = Math.floor(xp[id]/10);
    money[id]+=g; xp[id]-=g*10;
    save("./data/xp.json",xp);
    save("./data/money.json",money);
    return i.reply({content:`⭐ ${g} para`,ephemeral:true});
  }

  if (i.customId === "join") {

    if (!giveaways[i.message.id])
      giveaways[i.message.id]=[];

    if (giveaways[i.message.id].includes(id))
      return i.reply({content:"katıldın",ephemeral:true});

    giveaways[i.message.id].push(id);

    return i.reply({content:"🎉 katıldın",ephemeral:true});
  }
});

// ================= LOGIN =================

client.login(process.env.TOKEN);
