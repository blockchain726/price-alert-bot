const { getBalance, getTokenPriceUSD } = require('./balance');

const alert_price_diff = 0.00001;
const premium_amount = 250;

// const alert_price_diff = 0.1;
// const premium_amount = 0.1;

var moment = require('moment');
const mysql = require('mysql');
var pool = mysql.createPool({
    connectionLimit: 10,
    host: '127.0.0.1',
    user: 'lifeteam_foxgirlcom',
    password: 'o9VnAzxIZpVKL388VBfiMEeoQ82k34PPwW',
    database: 'lifeteam_foxgirl'
});
const TelegramBot = require('node-telegram-bot-api');

const token = '5398867244:AAGHWWmoSxKFa_3okxpEfWhgn9GltwOVd-c'
const bot = new TelegramBot(token, { polling: true });
var nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    switch (msg.text) {
        case '/start':
            bot.sendMessage(
                chatId,
                `🔹 Welcome to foxgirl price alert bot\n
                To register user link id, please send message like... \n
                /register [user email address of foxgirl sites]`
            )
            break;
        case '/help':
            bot.sendMessage(
                chatId,
                `🔹 Foxgirl price alert bot\n
                To register user link id, please send message like... \n
                /register [user email address of foxgirl sites]`
            )
            break;
        default:
            break;
    }
});

bot.onText(/\/register (.+)/, (msg, data) => {
    const chatId = msg.chat.id;
    const user_email_address = data[1];
    checkUserAddLinkAction(user_email_address, chatId);
});

const foxgirl_address = "0x599beec263fa6ea35055011967597b259fc012a4";

var checkUserAddLinkAction = async function (email_address, chatId) {
    pool.query("SELECT id, wallet_address FROM users WHERE email = '" + email_address + "'", async (error, rows) => {
        if (error) { throw error }
        if (rows == undefined || rows.length == 0) {
            bot.sendMessage(chatId, 'Your email address does not exist!');
        } else {
            let userId = rows[0].id;
            let wallet_address = rows[0].wallet_address;
            if (wallet_address == null) {
                bot.sendMessage(chatId, 'Your wallet address does not exist!');
            } else {
                let foxgirl_balance = await getBalance(foxgirl_address, wallet_address);
                let foxgirl_priceUSD = await getTokenPriceUSD('foxgirl');
                if (foxgirl_balance * foxgirl_priceUSD < premium_amount) {
                    bot.sendMessage(chatId, 'Sorry, the wallet does not currently hold enough $FOXGIRL Tokens');
                } else {
                    pool.query("UPDATE users SET teleBotChatId='' WHERE teleBotChatId=" + chatId, async (error, rows) => {
                        if (error) { throw error }
                        // bot.sendMessage(chatId, 'Removed old link action!');
                        pool.query("UPDATE users SET teleBotChatId='" + chatId + "' WHERE id=" + userId, async (error, rows) => {
                            if (error) { throw error }
                            bot.sendMessage(chatId, 'Congratulations! The link action is succeeded!');
                        })
                    })
                }

            }
        }
    })
}

const base_sql = "SELECT aa.*, bb.token_alert, bb.browser, bb.telegram, bb.email FROM (" +
    "SELECT aa.*, bb.email AS user_email, bb.wallet_address, bb.teleBotChatId FROM (" +
    "SELECT aa.*, bb.token_name, bb.bsc, bb.coingecko_id, bb.baseCurrency FROM (SELECT aa.*, bb.token_symbol FROM "+
    "(SELECT id, user_id, token_id, b_price_usd, price_usd FROM ax_alerts WHERE is_active = 0) AS aa LEFT JOIN ("+
    " SELECT id, token_symbol FROM ax_tokens) AS bb ON aa.token_id = bb.id) AS aa LEFT JOIN (SELECT DISTINCT token_id, token_name, coingecko_id, bsc, baseCurrency FROM ax_favorites) AS bb " +
    "ON aa.token_id = bb.token_id) AS aa LEFT JOIN (SELECT id, email, wallet_address, teleBotChatId FROM users) AS bb " +
    "ON aa.user_id = bb.id) AS aa LEFT JOIN(SELECT user_id, token_alert, browser, telegram, email FROM settings) AS bb ON aa.user_id=bb.user_id";
var price_alert = async function () {
    try {
        pool.query(base_sql, async (error, rows) => {
            if (error) { throw error }
            if (rows == undefined) return;
            for (let row of rows) {
                let alert_state = false;
                if ((row.telegram == 'on' && null != row.teleBotChatId && row.teleBotChatId != '') ||
                    (row.email == 'on' && null != row.user_email && row.user_email != '')) {
                    let target_price = parseFloat(row.price_usd);
                    let now_price = await getTokenPriceUSD(row.coingecko_id);
                    if (Math.abs((target_price - now_price) / now_price) < alert_price_diff) {
                        let chain_name = 'ETH';
                        if (row.bsc == 1) chain_name = 'BSC';
                        let b_price_usd = parseFloat(row.b_price_usd);
                        let change_percent = Math.floor((Math.abs(target_price - b_price_usd) / b_price_usd) * 10000) / 100;
                        if (isNaN(change_percent)) change_percent = 0
                        change_str = 'down';
                        if (target_price > b_price_usd) change_str = 'up';
                        console.log(change_percent + '% ' + change_str)
                        if (row.telegram == 'on' && null != row.teleBotChatId && row.teleBotChatId != '') {
                            // telegram price bot run
                            const adv_help = {
                                reply_markup: {
                                    inline_keyboard: [
                                        [
                                            { text: "Charts", url: "https://foxgirl.com/charts" },
                                            { text: "FoxGirl", url: "https://foxgirl.com" }
                                        ]
                                    ],
                                },
                                parse_mode: 'HTML'
                            }
                            bot.sendMessage(row.teleBotChatId, '<b>' + row.token_symbol.toUpperCase() + '</b>/' + chain_name + ' is ' + change_str + ' ' + change_percent + '% to $' + row.price_usd + '!', adv_help);
                            console.log('Telegram message sent to ' + row.teleBotChatId);
                        }
                        if (row.email == 'on' && null != row.user_email && row.user_email != '') {
                            //. email price alert
                            let chain_name = 'ethereum';
                            if (row.bsc == 1) chain_name = 'bsc';
                            var html_message = `<p><b>`+row.token_symbol.toUpperCase()+`</b> token's price is `+row.price_usd+`</p>`
                            html_message += `<p><a style="color:#0b6cda;" href="https://foxgirl.com/charts/`+chain_name+`/`+row.baseCurrency+`">View  `+row.token_symbol.toUpperCase()+`</a></p>`
                            html_message += `<a style="color:#0b6cda;" href="https://foxgirl.com">foxgirl.com</a>`
                            var mailOptions = {
                                from: {name: 'Foxgirl', address: 'help@foxgirl.com'},
                                to: row.user_email,
                                subject: 'Price Alerts',
                                html: html_message
                            }
                            transporter.sendMail(mailOptions, function (error, info) {
                                if (error) {
                                    console.log(error);
                                } else {
                                    console.log('Email sent to ' + row.user_email);
                                }
                            });
                        }
                        alert_state = true;
                    }
                }
                if (alert_state) {
                    let update_sql = "UPDATE ax_alerts set is_active = '1', issued = '" + moment().format("YYYY-MM-DD h:mm:ss") + "' WHERE id = " + row.id
                    pool.query(update_sql, async (error, rows) => {
                        if (error) { throw error }
                    })
                }
            }
        })
    } catch (error) {
        console.log(error)
    }
}

var event = async function (interval_ms) {
    setInterval(function () { price_alert() }, interval_ms);
}

event(30000);