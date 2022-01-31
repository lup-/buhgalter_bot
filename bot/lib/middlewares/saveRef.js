const {getDb} = require('../database');
const moment = require('moment');

function isStartCommand(ctx) {
    return ctx.update && ctx.update.message && ctx.update.message.text && ctx.update.message.text.toLowerCase().indexOf('/start') === 0;
}

module.exports = function () {
    return async (ctx, next) => {

        if (!isStartCommand(ctx)) {
            return next();
        }

        let ref = ctx.update.message.text.indexOf(' ') !== -1
            ? ctx.update.message.text.replace('/start ', '')
            : false;
        let message = ctx.update.message;
        let botId = ctx.botInfo.id;
        let userId = message && message.from
            ? message.from.id
            : false;

        let hasRef = userId && ref;
        let subref = false;

        if (!hasRef) {
            return next();
        }

        let hasSubrefs = ref.indexOf('=') !== -1;
        if (hasSubrefs) {
            let parts = ref.split('=');
            ref = parts.shift();
            subref = parts.join('=');
        }

        const refs = ctx.db.collection('refs');

        let refId = `${botId}:${userId}:${ref}`;

        let refFields = {
            refId,
            userId,
            botId,
            ref,
            date: moment().unix(),
        }

        if (subref) {
            refFields.subref = subref;
        }

        if (!ctx.session.ref) {
            ctx.session.ref = refFields;
        }

        try {
            await refs.findOneAndReplace({refId}, refFields, {upsert: true, returnOriginal: false});
        }
        finally {
        }

        return next();
    }
}