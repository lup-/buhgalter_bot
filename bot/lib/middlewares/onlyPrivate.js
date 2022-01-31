module.exports = function () {
    return async (ctx, next) => {
        let isPrivate = ctx.chat && ctx.chat.type === 'private';
        if (isPrivate) {
            return next();
        }
    }
}