const { Scenes } = require('telegraf');
const menu = require("../../lib/menu");
const { BaseScene } = Scenes;
const moment = require('moment');

module.exports = function () {
    const scene = new BaseScene('adminStat');

    scene.enter(async ctx => {
        return ctx.reply('Какая статистика нужна?', menu([
            {code: 'type_info', text: 'Сообщения об оплате'},
            {code: 'type_request', text: 'Запросы оплаты'},
            {code: 'type_all', text: 'Все'},
            {code: 'back', text: 'Назад'},
        ], 1));
    });

    scene.action(/type_(.*)/, async ctx => {
        let type = ctx.match && ctx.match[1] ? ctx.match[1] : null;
        if (!type) {
            return ctx.scene.reenter();
        }

        ctx.scene.state.type = type;
        return ctx.reply('Период?', menu([
            {code: 'period_0w', text: 'Текущая неделя'},
            {code: 'period_0m', text: 'Текущий месяц'},
            {code: 'period_1m', text: 'Предыдущий месяц'},
            {code: 'period_1y', text: 'Год'},
            {code: 'period_all', text: 'Все'},
        ], 1));
    });

    scene.action(/period_(.*)/, async ctx => {
        let period = ctx.match && ctx.match[1] ? ctx.match[1] : null;
        if (!period) {
            return ctx.scene.reenter();
        }

        ctx.scene.state.period = period;
        let clients = await ctx.db.collection('users').find({role: 'client'}).toArray();
        let buttons = clients.map(client => {
            return {
                code: 'client_'+client.id,
                text: [client.user.first_name, client.user.last_name, client.user.username].filter(name => Boolean(name)).join(' '),
            }
        });
        buttons.unshift({code: 'client_all', text: 'Все'});

        return ctx.reply('Период?', menu(buttons, 1));
    });

    scene.action(/client_(.*)/, async ctx => {
        let clientId = ctx.match && ctx.match[1] ? ctx.match[1] : null;
        let type = ctx.scene.state.type;
        let period = ctx.scene.state.period;

        let startTime = null;
        let endTime = null;
        switch (period) {
            case '0w':
                startTime = moment().startOf('w');
                endTime = moment();
            break;
            case '0m':
                startTime = moment().startOf('m');
                endTime = moment();
            break;
            case '1m':
                startTime = moment().subtract(1, 'm').startOf('m');
                endTime = moment().subtract(1, 'm').endOf('m');
            break;
            case '1y':
                startTime = moment().startOf('y');
                endTime = moment();
            break;
        }

        let filter = {
            paymentType: type === 'all' ? {$nin: [null, false]} : type
        }

        if (clientId && clientId !== 'all') {
            filter['user.id'] = parseInt( clientId );
        }

        if (startTime) {
            filter['created'] = {$gte: startTime.unix(), $lte: endTime.unix()};
        }

        let payments = await ctx.db.collection('payments').find(filter).toArray();
        let csv = payments.map(payment => {
            let changedBy = null;
            let changedTimestamp = null;
            if (payment.acceptedBy) {
                changedBy = payment.acceptedBy;
                changedTimestamp = payment.accepted;
            }

            if (payment.payedBy) {
                changedBy = payment.payedBy;
                changedTimestamp = payment.payed;
            }

            return [
                moment.unix(payment.created).format('DD.MM.YYYY HH:mm'),
                changedTimestamp ? moment.unix(changedTimestamp).format('DD.MM.YYYY HH:mm') : '',
                payment.paymentType === 'info' ? 'Сообщение об оплате' : 'Запрос оплаты',
                payment.amount,
                payment.paymentType === 'info' ? payment.destination : payment.details,
                payment.accepted ? moment.unix(payment.accepted).format('DD.MM.YYYY HH:mm') : '',
                payment.payed ? moment.unix(payment.payed).format('DD.MM.YYYY HH:mm') : '',
                changedBy ? [changedBy.first_name, changedBy.last_name, changedBy.username].filter(item => Boolean(item)).join(' ') : ''
            ].join(';');
        }).join('\n');

        let head = [
            'Создан',
            'Проведен',
            'Тип',
            'Сумма',
            'Реквизиты/Куда отправлено',
            'Время подтверждения',
            'Время оплаты',
            'Кем проведено'
        ].join(';');

        csv = head+'\n'+csv;
        await ctx.replyWithDocument({
            source: Buffer.from(csv, 'utf8'),
            filename: `report_${type}_${period}_${moment().unix()}.csv`
        });

        return ctx.scene.enter('admin');
    });

    scene.action('client', ctx => ctx.scene.enter('client'));
    scene.action('buyer', ctx => ctx.scene.enter('buyer'));

    scene.command('admin', ctx => ctx.scene.enter('admin'));
    scene.command('start', ctx => ctx.scene.reenter());

    return scene;
}