const { Scenes } = require('telegraf');
const menu = require("../lib/menu");
const { BaseScene } = Scenes;
const moment = require('moment');

async function makeRequest(ctx) {
    let request = {
        created: moment().unix(),
        status: 'pending',
        user: ctx.from,
        userId: ctx.from.id,
    }

    return ctx.db.collection('requests').insertOne(request);
}

module.exports = function () {
    const scene = new BaseScene('menu');
    const requestMenu = menu([
        {code: 'request', text: 'Отправить запрос'}
    ]);

    scene.enter(async ctx => {
        if (ctx.dbUser) {
            if (ctx.dbUser.role === 'client') {
                return ctx.reply('Что дальше?', menu([{code: 'client', text: 'Новое уведомление об оплате'}]));
            }

            if (ctx.dbUser.role === 'buyer') {
                return ctx.reply('Что дальше?', menu([{code: 'buyer', text: 'Новый запрос оплаты'}]));
            }
        }

        let request = await ctx.db.collection('requests').findOne({userId: ctx.from.id});
        if (request) {
            switch (request.status) {
                case 'pending':
                    return ctx.reply('Ваш запрос рассматривается. Пожалуйста ожидайте сообщения. Проверить статус можно командой /start');
                break;
                case 'denied':
                    return ctx.reply('Ваш запрос отклонен. Вы можете попробовать отправить еще один', requestMenu);
                break;
                default:
                    return ctx.reply('Ошибка определения статуса запроса. Вы можете попробовать отправить еще один', requestMenu);
                break;
            }
        }

        return ctx.reply('Вы не зарегистрированы в системе. Вы можете отправить запрос на регистрацию', requestMenu);
    });

    scene.action('request', async ctx => {
        await makeRequest(ctx);
        return ctx.reply('Ваш запрос отправлен. Пожалуйста ожидайте сообщения. Проверить статус можно командой /start');
    });

    scene.action('client', ctx => ctx.scene.enter('client'));
    scene.action('buyer', ctx => ctx.scene.enter('buyer'));

    scene.command('admin', ctx => ctx.scene.enter('admin'));
    scene.command('start', ctx => ctx.scene.reenter());

    return scene;
}