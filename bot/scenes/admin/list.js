const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;
const menu = require("../../lib/menu");

function getActionButtons(actions, item) {
    let actionButtons = [];
    for (let action of actions) {
        let buttonText = typeof (action.buttonText) === 'function'
            ? action.buttonText(item)
            : action.buttonText;

        let button = {
            code: action.code,
            text: buttonText,
        };

        actionButtons.push(button);
    }

    return actionButtons;
}

async function sendItemReply(ctx, getItemText, actions) {
    let currentItemIndex = ctx.scene.state.index || 0;
    let items = ctx.scene.state.items || [];

    if (currentItemIndex > items.length-1) {
        currentItemIndex = items.length-1;
    }

    let item = items[currentItemIndex];
    let actionButtons = getActionButtons(actions, item);

    let hasPrev = currentItemIndex > 0;
    let hasNext = currentItemIndex < items.length-1;

    let prevButton = hasPrev
        ? {code: 'go_prev', text: '◀' }
        : {code: '_skip', text: '➖' };

    let nextButton = hasNext
        ? {code: 'go_next', text: '▶' }
        : {code: '_skip', text: '➖' };

    let counter = {code: '_skip', text: `${currentItemIndex+1}/${items.length}`};

    let menuButtons = [
        actionButtons,
        [
            prevButton,
            counter,
            nextButton
        ],
        [
            {code: 'back', text: 'Назад'}
        ]
    ]

    let {messageText, photo} = await getItemText(item);
    let menuMessage = null;
    if (photo) {
        let extra = menu(menuButtons, false);
        extra.caption = messageText;
        extra.parse_mode = 'HTML';

        menuMessage = await ctx.replyWithPhoto(photo.file_id, extra);
    }
    else {
        menuMessage = await ctx.replyWithHTML(messageText, menu(menuButtons, false));
    }

    if (ctx.scene.state.lastMenuMessageId) {
        await ctx.tg.deleteMessage(ctx.chat.id, ctx.scene.state.lastMenuMessageId);
    }

    ctx.session.lastMenuMessageId = menuMessage.message_id;
    return menuMessage;
}

module.exports = function (listType, actions, getItemText, getItemList) {
    const scene = new BaseScene(listType);

    scene.enter(async ctx => {
        ctx.scene.state.items = await getItemList(ctx);
        ctx.scene.state.index = 0;
        if (ctx.scene.state.items.length === 0) {
            await ctx.reply('Нет новых записей');
            return ctx.scene.enter('admin');
        }

        return sendItemReply(ctx, getItemText, actions);
    });

    scene.action('go_next', ctx => {
        if (!ctx.scene.state.index) {
            ctx.scene.state.index = 0;
        }

        ctx.scene.state.index++;
        return sendItemReply(ctx, getItemText, actions);
    });

    scene.action('go_prev', ctx => {
        if (ctx.scene.state.index > 0) {
            ctx.scene.state.index--;
        }
        return sendItemReply(ctx, getItemText, actions);
    });

    scene.action('back', ctx => {
        return ctx.scene.enter('admin');
    });

    for (let action of actions) {
        scene.action(action.code, async ctx => {
            await action.handler(ctx);
            return sendItemReply(ctx, getItemText, actions);
        });
    }

    return scene;
}