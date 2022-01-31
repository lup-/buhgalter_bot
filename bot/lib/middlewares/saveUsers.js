const moment = require('moment');

function isStartCommand(ctx) {
    return ctx.update && ctx.update.message && ctx.update.message.text && ctx.update.message.text.toLowerCase().indexOf('/start') === 0;
}

module.exports = function () {
    return async (ctx, next) => {

        if (!isStartCommand(ctx)) {
            return next();
        }

        let message = ctx.update.message;
        let {from, chat} = message;
        let id = from.id || chat.id || false;
        let botId = ctx.botInfo.id;

        if (!id) {
            return next();
        }

        const users = ctx.db.collection('users');

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
        }
        finally {
        }

        return next();
    }
}