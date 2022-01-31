const { Telegraf, Scenes } = require('telegraf');
const { session } = require('telegraf-session-mongodb');
const { Stage } = Scenes;
const TOKEN = process.env.BOT_TOKEN;

const {getDb} = require('./lib/database');

const onlyPrivateMiddleware = require('./lib/middlewares/onlyPrivate');
const dbMiddleware = require('./lib/middlewares/database');
const saveUsersMiddleware = require('./lib/middlewares/saveUsers');
const saveRefsMiddleware = require('./lib/middlewares/saveRef');

const adminScene = require('./scenes/admin');
const buyerScene = require('./scenes/buyer');
const sellerScene = require('./scenes/seller');
const menuScene = require('./scenes/menu');

(async () => {
    let db = await getDb();
    let bot = new Telegraf(TOKEN);

    bot.use(onlyPrivateMiddleware());
    bot.use(dbMiddleware(db));
    bot.use(session(db, { collectionName: 'sessions' }));
    bot.use(saveUsersMiddleware());
    bot.use(saveRefsMiddleware());

    let stage = new Stage();
    stage.register(adminScene());
    stage.register(buyerScene());
    stage.register(sellerScene());
    stage.register(menuScene());
    bot.use(stage.middleware());

    bot.start(ctx => ctx.scene.enter('menu'));
    bot.action('buyer', ctx => ctx.scene.enter('buyer'));
    bot.action('seller', ctx => ctx.scene.enter('seller'));

    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))

    await bot.launch();
})();

