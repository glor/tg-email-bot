"use strict";
const Telegraf = require('telegraf');
const emailjs = require("emailjs/email");
const jsonfile = require('jsonfile');

let config = jsonfile.readFileSync("./config.json");

// handle different chats and hold current emails states
let handler = {};

const debug = function (x) {
    console.log("DEBUG: ", x);
};

// register bot
const bot = new Telegraf(config.tgtoken);

// connect to the email server
let mailserver = emailjs.server.connect({
    user: config.mail.username,
    password: config.mail.password,
    host: "email.stud.uni-goettingen.de",
    port: 587,
    ssl: false,
    tls: true,
    authentication: ['LOGIN'],
});
let g;
bot.use((ctx, next) => {
    g = ctx;
    if (config.whitelist[ctx.chat.id] === undefined) {
        console.log("rejected request from " + ctx.chat.id + ctx.chat);
        return false;
    } else {
        return next();
    }
});

bot.start((ctx) => {
    console.log('start: ' + ctx.chat.id);
    return ctx.reply('Welcome!\nSee /help for more information about me.');
});

bot.command(['help', 'help@tg_email_bot'], (ctx) => {
    console.log('help: ' + ctx.chat.id);
    ctx.reply('This bot can currently write emails to student email adresses of the university of Göttingen.' +
        'Commands:\n' +
        '/status check if you are currently writing an email\n' +
        '/write start writing an email\n' +
        '/discard discard your current email\n' +
        '/send ADRESS send an email')
});

bot.command(['status', 'status@tg_email_bot'], (ctx) => {
    console.log('status: ' + ctx.chat.id);
    if (handler[ctx.chat.id] === undefined) {
        ctx.reply("You are not writing an email.");
    } else {
        ctx.reply("You are currently writing an email.");
    }
});

bot.command(['discard', 'discard@tg_email_bot'], (ctx) => {
    console.log('discard: ' + ctx.chat.id);
    if(handler[ctx.chat.id]===undefined) {
        ctx.reply("You are not writing an email.")
    } else {
        handler[ctx.chat.id] = undefined;
        ctx.reply("You stopped writing and threw your old email over your shoulder. Unfortunatly you are to lazy to ever retrieve it.");
    }
});

bot.command(['write', 'write@tg_email_bot'], (ctx) => {
    console.log('write: ' + ctx.chat.id);
    handler[ctx.chat.id] = {"message": ""};
    ctx.reply("You are now writing an Email\nEnter /send ADDRESS once you are done.");
});

bot.command(['send', 'send@tg_email_bot'], (ctx) => {
    console.log('send: ' + ctx.chat.id);

    if (!handler[ctx.chat.id]) {
        ctx.reply("Error: You have to write an email first.\nUse /write [adress]");
        return;
    }
    if (ctx.message.text.length < 6) {
        ctx.reply("Pleasy supply an email adress.\nusage: /send ADDRESS");
        return;
    }
    let email = ctx.message.text.substr(13);
    if (!email.match("^[^@]+@stud\.uni-goettingen\.de$")) {
        ctx.reply("Error: not a valid student email adress: " + email);
        return;
    }
    let chatname = "someone";
    if (ctx.chat.type === 'group')
        chatname = ctx.chat.title;
    if (ctx.chat.type === 'private')
        chatname = ctx.chat.first_name + " (" + ctx.chat.username + ")";
    mailserver.send({
        text: handler[ctx.chat.id].message,
        from: config.default_sender,
        to: "<" + email + ">",
        subject: "tg-email from " + chatname,
    }, function (err, message) {
        if (err) {
            ctx.reply("Could not send mail because of:\n" + message);
        } else {
            ctx.reply("Mail sent.");
        }
    });
    handler[ctx.chat.id] = undefined;
});

bot.on('text', (ctx) => {
    if (handler[ctx.chat.id] === undefined) {
        if(ctx.message.text.match("abbot|abbit"))
            ctx.reply("Klappe du Arsch.");
        return;
    }
    console.log('appended to mail: ' + ctx.chat.id);
    handler[ctx.chat.id].message += "\n" + ctx.message.text;
});

/*bot.hears(["abbot", "abbit", "Abbot", "Abbit"], (ctx) => {
    ctx.reply("Klappe du Arsch.");
});*/

bot.startPolling();

