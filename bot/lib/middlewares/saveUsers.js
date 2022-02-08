const moment = require('moment');

function isStartCommand(ctx) {
    return ctx.update && ctx.update.message && ctx.update.message.text && ctx.update.message.text.toLowerCase().indexOf('/start') === 0;
}

module.exports = function () {
    return async (ctx, next) => {
        let from = ctx.from;
        let chat = ctx.chat;
        let id = from.id || chat.id || false;
        let botId = ctx.botInfo.id;
        const users = ctx.db.collection('users');

        if (!id) {
            return next();
        }

        if (!isStartCommand(ctx)) {
            let user = await users.findOne({id, botId});
            ctx.dbUser = user;
            return next();
        }

        ctx.dbUser = null;

        try {
            let user = await users.findOne({id, botId});
            if (user) {
                user.user = from;
                user.chat = chat;
                user.botId = botId;
                user.updated = moment().unix();
                if (user.blocked) {
                    user.blocked = null;
                }
            }
            else {
                user = {id, botId, user: from, chat, registered: moment().unix(), updated: moment().unix()};
            }

            await users.findOneAndReplace({id, botId}, user, {upsert: true, returnOriginal: false});
            ctx.dbUser = user;
        }
        finally {
        }

        return next();
    }
}