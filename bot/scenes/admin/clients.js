const makeListScene = require('./list');
const moment = require('moment');

async function acceptRequest(ctx, request, userType) {
    await ctx.db.collection('requests').updateOne({_id: request._id}, {$set: {
        status: 'accepted',
        type: userType,
        accepted: moment().unix(),
    }});
    await ctx.db.collection('users').updateOne({id: request.user.id}, {$set: {role: userType}});

    try {
        ctx.tg.sendMessage(request.userId, 'Ваш запрос одобрен. Нажмите /start для начала работы');
    }
    catch (e) {}

    return ctx.db.collection('requests').findOne({_id: request._id});
}

async function denyRequest(ctx, request) {
    await ctx.db.collection('requests').updateOne({id: request.id}, {$set: {
        status: 'denied',
        denied: moment().unix(),
    }});

    try {
        ctx.tg.sendMessage(request.userId, 'Ваш запрос отклонен');
    }
    catch (e) {}

    return ctx.db.collection('requests').findOne({id: request.id});
}

module.exports = function () {
    let actions = [
        {
            code: 'client',
            buttonText(item) {
                return item.type === 'client'
                    ? '☑ Клиент'
                    : 'Клиент';
            },
            async handler(ctx) {
                let currentItemIndex = ctx.scene.state.index || 0;
                let items = ctx.scene.state.items || [];
                let request = items[currentItemIndex];

                let newItem = await acceptRequest(ctx, request, 'client');
                ctx.scene.state.items[currentItemIndex] = newItem;
            }
        },
        {
            code: 'buyer',
            buttonText(item) {
                return item.type === 'buyer'
                    ? '☑ Закупщик'
                    : 'Закупщик';
            },
            async handler(ctx) {
                let currentItemIndex = ctx.scene.state.index || 0;
                let items = ctx.scene.state.items || [];
                let request = items[currentItemIndex];

                let newItem = await acceptRequest(ctx, request, 'buyer');
                ctx.scene.state.items[currentItemIndex] = newItem;
            }
        },
        {
            code: 'deny',
            buttonText(item) {
                return item.status === 'denied'
                    ? '☑ Отказано'
                    : 'Отказ';
            },
            async handler(ctx) {
                let currentItemIndex = ctx.scene.state.index || 0;
                let items = ctx.scene.state.items || [];
                let request = items[currentItemIndex];

                let newItem = await denyRequest(ctx, request);
                ctx.scene.state.items[currentItemIndex] = newItem;
            }
        },
    ]
    
    let getItemText = item => {
        let user = item.user;
        let userName = [user.first_name, user.last_name].join(' ');
        let userLink = user.username
            ? `${userName} @${user.username}`
            : `<a href="tg://user?id=${user.userId}">${userName}</a>`;
        return {messageText: `Запрос ${item.userId}\n\nПользователь: ${userLink}`}
    }

    let getItemList = ctx => {
        return ctx.db.collection('requests').find({status: 'pending'}).toArray();
    }

    const scene = makeListScene('adminClients', actions, getItemText, getItemList);

    return scene;
}