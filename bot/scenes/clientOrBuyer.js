const { Scenes } = require('telegraf');
const moment = require('moment');
const { BaseScene } = Scenes;
const menu = require("../lib/menu");

async function verify(ctx, sceneType) {
    let payment = getPaymentFromContextState(ctx, sceneType);
    let isBuyer = sceneType === 'buyer';

    let text = isBuyer
        ? `Сумма: ${payment.amount}\nРеквизиты: ${payment.details}`
        : `Сумма: ${payment.amount}\nКуда: ${payment.destination}\nСкриншот: ${payment.screenshot ? payment.screenshot.file_name || 'фото' : 'нет'}`;

    return ctx.reply(text, menu([
        {code: 'save', text: 'Отправить'},
        {code: 'cancel', text: 'Отмена'},
    ]));
}
async function savePayment(db, payment, user, type) {
    payment.created = moment().unix();
    payment.user = user;
    return db.collection('payments').insertOne(payment);
}
function getPaymentFromContextState(ctx, sceneType) {
    let isBuyer = sceneType === 'buyer';

    return {
        amount: ctx.scene.state.amount,
        destination: isBuyer ? null : ctx.scene.state.destination,
        details: isBuyer ? ctx.scene.state.destination : null,
        screenshot: isBuyer ? null : ctx.scene.state.screenshot || null,
        userType: sceneType,
        paymentType: isBuyer ? 'request' : 'info',
    }
}

module.exports = function (sceneType) {
    const scene = new BaseScene(sceneType);
    let isBuyer = sceneType === 'buyer';
    let cancelMenu = menu([
        {code: 'cancel', text: 'Отмена'}
    ]);

    scene.enter(async ctx => {
        ctx.scene.state.textType = 'summ';
        return ctx.reply('Пришлите сумму', cancelMenu);
    });

    scene.action('cancel', ctx => ctx.scene.enter('menu'));

    scene.command('admin', ctx => ctx.scene.enter('admin'));
    scene.command('start', ctx => ctx.scene.enter('menu'));

    scene.on('text', async ctx => {
        let text = ctx.message && ctx.message.text ? ctx.message.text : false;

        if (text) {
            switch (ctx.scene.state.textType) {
                case 'summ':
                    try {
                        ctx.scene.state.amount = parseFloat(text);
                        ctx.scene.state.textType = 'destination';
                        let message = isBuyer
                            ? 'Пришлите реквизиты оплаты'
                            : 'Куда отправлена оплата?'
                        return ctx.reply(message, cancelMenu);
                    }
                    catch (e) {
                        await ctx.reply('Ошибка распознования суммы. Попробуйте еще раз');
                    }
                break;
                case 'destination':
                    ctx.scene.state.destination = text;
                    ctx.scene.state.textType = 'destination';
                    if (isBuyer) {
                        return verify(ctx, sceneType);
                    }
                    else {
                        return ctx.reply('Пришлите скрин оплаты', menu([
                            {code: 'skip_screenshot', text: 'Пропустить'}
                        ]));
                    }
                break;
                default:
                    await ctx.reply('Не понял контекст. Попробуйте еще раз');
                    return ctx.scene.reenter();
                break;
            }
        }
        else {
            return ctx.reply('Не расслышал. Попробуйте еще раз');
        }
    });

    scene.action('skip_screenshot', ctx => verify(ctx, sceneType));
    scene.on('document', async ctx => {
        let hasDocument = ctx.message && ctx.message.document;

        if (!hasDocument) {
            return ctx.reply('Пожалуйста, пришлите скрин');
        }

        ctx.scene.state.screenshot = ctx.message.document;
        return verify(ctx, sceneType);
    });
    scene.on('photo', async ctx => {
        let hasPhoto = ctx.message && ctx.message.photo;

        if (!hasPhoto) {
            return ctx.reply('Пожалуйста, пришлите скрин');
        }

        let photos = ctx.message.photo;
        let photo = photos.reduce((maxPhoto, photo) => {
            if (!maxPhoto) {
                return photo;
            }

            if (photo.file_size > maxPhoto.file_size) {
                return photo;
            }

            return maxPhoto;
        }, false);
        ctx.scene.state.screenshot = photo;
        return verify(ctx, sceneType);
    });

    scene.action('save', async ctx => {
        let payment = getPaymentFromContextState(ctx, sceneType);
        try {
            await savePayment(ctx.db, payment, ctx.from, sceneType);
            await ctx.reply(isBuyer ? 'Запрос на оплату отправлен' : 'Уведомление об оплате отправлено');
        }
        catch (e) {
            await ctx.reply('Ошибка отправки. Попробуйте еще раз')
        }

        return ctx.scene.enter('menu');
    });

    return scene;
}