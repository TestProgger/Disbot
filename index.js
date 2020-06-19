const {
  token,
  filter,
  admins,
  preflog,
  code,
  interval_to_backup,
} = require("./config.json");

const Discord = require("discord.js");
const client = new Discord.Client();
const fs = require("fs");

const gzip = require("zlib").createGzip();

const UrlReg = /.*((https?|ftps?|ssh):\/\/)?\w{2,255}[.]\w{2,12}.*$/;

let logfile = "";

client.once("ready", () => {
  console.log(` ${client.user.tag} `);
  const time = new Date();
  logfile = ` ${preflog}_${time.getFullYear()}_${time.getMonth()}_${time.getDate()}.log`;

  fs.access("backups", (error) => {
    if (error) {
      fs.mkdirSync("backups");
    }
  });
  
  fs.access(logfile, (error) => {
    if (error) {
      fs.writeFile(logfile, "", (error) => {
        if (error) {
          console.log(error);
        }
      });
    }
  });

  setInterval(backup_log, interval_to_backup * 3600 * 1000, logfile);
});

client.on("disconnect", () => {
  console.log("Disconected");
});

client.on("message", async (message) => {
  if (message.author.bot) {
    return;
  }
  if (!message.guild) {
    return;
  }

  ///// Moderation Module ->  BEGIN

  const MessageText = message.content.toLowerCase();

  // [ Проверяем сообщение на наличие в нем мата { Проверка выполняется с помошью регулярных выражений } ]
  filter.forEach((re) => {
    if (RegExp(re).test(MessageText)) {
      message
        .delete({
          timeout: 100,
          reason: "Мат"
        })
        .then((msg) => {
          ///message.reply(" Please don`t use this word ")
          logger(message, code["MATTER"]);
        })
        .catch(console.error);
    }
  });

  // [ Проверяем сообщение на наличие в нем ссылок { Проверка выполняется с помошью регулярных выражений } ]
  if (UrlReg.test(MessageText)) {
    // [ Проверяем является ли пользователь отправивший сообщение администратором ]
    let perm = admins.forEach((value) => {
      return value.id == message.author.id ? 1 : 0;
    });

    if (!perm) {
      message
        .delete({
          timeout: 100,
          reason: "URL can post only Admins"
        })
        .then((msg) => {
          message.reply("URL can post only Admins");
          logger(message, code["URL"]);
        })
        .catch(console.error);
    }
  }
  //// Moderation Module -> END
});

async function logger(message, code) {
  const time = new Date();
  let obj = {
    timestamp: `${time.getHours()}:${time.getMinutes()}`,
    user_code: code,
    user_id: message.author.id,
    user_name: message.author.username,
    user_discr: message.author.discriminator,
    user_content: Buffer.from(message.content).toString("base64")
  };
  fs.appendFileSync(logfile, `${JSON.stringify(obj)}\n`);
}

async function backup_log(logfile_old) {
  const time = new Date();
  const backup_time = `${time.getHours()}_${time.getMinutes()}_${time.getSeconds()}`;
  console.log(`Time To Backup : ${backup_time};  `);
  fs.stat(logfile_old, (error, stats) => {
    if (!error && stats.size) {
      fs.createReadStream(logfile_old)
        .pipe(gzip)
        .pipe(fs.createWriteStream(`${__dirname}/backups/backup_${backup_time}_${logfile_old}.gz`));
      fs.unlinkSync(logfile_old);

      logfile = ` ${preflog}_${time.getFullYear()}_${time.getMonth()}_${time.getDate()}.log`;

      fs.writeFile(logfile, "", (error) => {
        if (error) {
          console.log(error);
        }
      });
    }
    if (!error && !stats.size) {
      logfile = ` ${preflog}_${time.getFullYear()}_${time.getMonth()}_${time.getDate()}.log`;
      if (logfile != logfile_old) {
        fs.renameSync(logfile_old, logfile);
      }
      console.log("Log file is EMPTY");
    }
  });
}

client.login(token);
