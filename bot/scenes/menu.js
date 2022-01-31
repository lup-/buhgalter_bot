const { Scenes } = require('telegraf');
const menu = require("../lib/menu");
const { BaseScene } = Scenes;

module.exports = function () {
    const scene = new BaseScene('menu');

    scene.enter(async ctx => {
        return ctx.reply('Ты кто?', menu([
            {code: 'buyer', text: 'Прием'},
            {code: 'seller', text: 'Отправка'},
        ]))
    });

    return scene;
}