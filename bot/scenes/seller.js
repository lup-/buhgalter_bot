const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;

module.exports = function () {
    const scene = new BaseScene('seller');

    scene.enter(async ctx => {
        return ctx.reply('seller');
    });

    return scene;
}