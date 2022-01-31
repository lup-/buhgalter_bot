const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;

module.exports = function () {
    const scene = new BaseScene('admin');

    scene.enter(async ctx => {
        return ctx.reply('admin');
    });

    return scene;
}