const makeListScene = require('./list');
const moment = require('moment');

async function acceptPayment(ctx, payment, userType) {
    await ctx.db.collection('payments').updateOne({_id: payment._id}, {$set: {
            payed: moment().unix(),
            payedBy: ctx.from,
        }});

    return ctx.db.collection('payments').findOne({_id: payment._id});
}

module.exports = function () {
    let actions = [
        {
            code: 'accept',
            buttonText(item) {
                return item.payed > 0
                    ? '☑ Оплачено'
                    : 'Оплатить';
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
       return {messageText: `Сумма: ${payment.amount}\nРеквизиты: ${payment.details}`}
    }

    let getItemList = ctx => {
        return ctx.db.collection('payments').find({paymentType: 'request', payed: {$in: [null, false]}}).toArray();
    }

    const scene = makeListScene('adminRequests', actions, getItemText, getItemList);

    return scene;
}