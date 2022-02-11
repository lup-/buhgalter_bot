const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;
const menu = require("../lib/menu");

module.exports = function () {
    const scene = new BaseScene('admin');

    scene.enter(async ctx => {
        let hasAdminRoles = ctx.dbUser && ctx.dbUser.adminRoles;
        if (!hasAdminRoles) {
            return ctx.scene.enter('menu');
        }

        let buttons = [];
        if (ctx.dbUser.adminRoles.includes('users')) {
            buttons.push({code: 'clients', text: 'Новые пользователи'});
        }

        if (ctx.dbUser.adminRoles.includes('payments')) {
            buttons = buttons.concat([
                {code: 'infos', text: 'Сообщения об оплате'},
                {code: 'requests', text: 'Запросы оплаты'},
                {code: 'stat', text: 'Экспорт статистики'},
            ]);
        }

        return ctx.reply('Управление ботом', menu(buttons, 1));
    });

    scene.action('clients', ctx => ctx.scene.enter('adminClients'));
    scene.action('infos', ctx => ctx.scene.enter('adminInfos'));
    scene.action('requests', ctx => ctx.scene.enter('adminRequests'));
    scene.action('stat', ctx => ctx.scene.enter('adminStat'));

    return scene;
}