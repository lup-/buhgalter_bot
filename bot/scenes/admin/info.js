const makeListScene = require('./list');
const moment = require('moment');

async function acceptPayment(ctx, payment, userType) {
    await ctx.db.collection('payments').updateOne({_id: payment._id}, {$set: {
            accepted: moment().unix(),
            acceptedBy: ctx.from,
        }});

    return ctx.db.collection('payments').findOne({_id: payment._id});
}

module.exports = function () {
    let actions = [
        {
            code: 'accept',
            buttonText(item) {
                return item.accepted > 0
                    ? '☑ Принято'
                    : 'Принять';
            },
            async handler(ctx) {
                let currentItemIndex = ctx.scene.state.index || 0;
                let items = ctx.scene.state.items || [];
                let payment = items[currentItemIndex];

                let newPayment = await acceptPayment(ctx, payment);
                ctx.scene.state.items[currentItemIndex] = newPayment;
            }
        }
    ]

    let getItemText = payment => {
        return {
            messageText: `Сумма: ${payment.amount}\nКуда: ${payment.destination}\nСкриншот: ${payment.screenshot ? payment.screenshot.file_name || 'фото' : 'нет'}`,
            photo: payment.screenshot ? payment.screenshot : null
        };
    }

    let getItemList = ctx => {
        return ctx.db.collection('payments').find({paymentType: 'info', accepted: {$in: [null, false]}}).toArray();
    }

    const scene = makeListScene('adminInfos', actions, getItemText, getItemList);

    return scene;
}