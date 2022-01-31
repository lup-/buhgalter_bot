const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;

module.exports = function () {
    const scene = new BaseScene('buyer');

    scene.enter(async ctx => {
        return ctx.reply('buyer');
    });

    return scene;
}