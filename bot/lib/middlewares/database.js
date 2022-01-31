module.exports = function (db) {
    return async (ctx, next) => {
        ctx.db = db;

        return next();
    }
}